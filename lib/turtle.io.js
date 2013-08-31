/**
 * turtle.io
 *
 * Easy to use web server with virtual hosts & RESTful proxies
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2013 Jason Mulligan
 * @license BSD-3 <https://raw.github.com/avoidwork/turtle.io/master/LICENSE>
 * @link http://turtle.io
 * @version 0.12.0
 */
"use strict";

var $             = require( "abaaso" ),
    crypto        = require( "crypto" ),
    defaultConfig = require( __dirname + "/../config.json" ),
    fs            = require( "fs" ),
    http          = require( "http" ),
    https         = require( "https" ),
    //http_auth     = require( "http-auth" ),
    mime          = require( "mime" ),
    moment        = require( "moment" ),
    syslog        = require( "node-syslog" ),
    toobusy       = require( "toobusy" ),
    zlib          = require( "zlib" ),
    REGEX_BODY    = /^(put|post|patch)$/i,
    //REGEX_CSV     = /text\/csv/,
    REGEX_HEAD    = /^(head|options)$/i,
    REGEX_HEAD2   = /head|options/i,
    REGEX_GET     = /^(get|head|options)$/i,
    REGEX_DEL     = /^(del)$/i,
    REGEX_DEF     = /deflate/,
    REGEX_DIR     = /\/$/,
    REGEX_GZIP    = /gzip/,
    REGEX_IE      = /msie/i,
    REGEX_NEXT    = /\..*/,
    REGEX_NVAL    = /;.*/,
    REGEX_RENAME  = /^rename$/,
    REGEX_SERVER  = /^\_server/,
    REGEX_SPACE   = /\s+/,
    REGEX_REWRITE;

// Hooking syslog output
syslog.init( "turtle_io", syslog.LOG_PID | syslog.LOG_ODELAY, syslog.LOG_LOCAL0 );

// Disabling abaaso observer
$.discard( true );

/**
 * TurtleIO
 *
 * @constructor
 */
function TurtleIO () {
	this.config       = {};
	this.etags        = $.lru( 1000 );
	this.handlers     = {all: {regex: [], routes: [], hosts: {}}, "delete": {regex: [], routes: [], hosts: {}}, get: {regex: [], routes: [], hosts: {}}, patch: {regex: [], routes: [], hosts: {}}, post: {regex: [], routes: [], hosts: {}}, put: {regex: [], routes: [], hosts: {}}};
	this.pages        = {all: {}};
	this.sessions     = {};
	this.server       = null;
	this.vhosts       = [];
	this.vhostsRegExp = [];
	this.watching     = {};
}

// Prototype loop
TurtleIO.prototype.constructor = TurtleIO;

/**
 * Verifies a method is allowed on a URI
 *
 * @method allowed
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @param  {String} host   Hostname
 * @return {Boolean}       Boolean indicating if method is allowed
 */
TurtleIO.prototype.allowed = function ( method, uri, host ) {
	host       = host || "all";
	var self   = this,
	    result = false,
	    exist  = false,
	    d, hosts;

	hosts = self.handlers[method].hosts;
	d     = hosts[self.config["default"]];
	exist = ( hosts[host] );

	this.handlers[method].regex.each( function ( i, idx ) {
		var route = self.handlers[method].routes[idx];

		if ( i.test( uri ) && ( ( exist && route in hosts[host] ) || route in d || route in hosts.all ) ) {
			return !( result = true );
		}
	});

	if ( !result ) {
		hosts = self.handlers.all.hosts;
		d     = hosts[self.config["default"]];
		exist = ( hosts[host] );

		this.handlers.all.regex.each( function ( i, idx ) {
			var route = self.handlers.all.routes[idx];

			if ( i.test( uri ) && ( ( exist && route in hosts[host] ) || route in d || route in hosts.all ) ) {
				return !( result = true );
			}
		});
	}

	return result;
};

/**
 * Determines which verbs are allowed against a URL
 *
 * @method allows
 * @param  {String} uri  URL to query
 * @param  {String} host Hostname
 * @return {String}      Allowed methods
 */
TurtleIO.prototype.allows = function ( uri, host ) {
	var self   = this,
	    result = [],
	    verbs  = ["delete", "get", "post", "put", "patch"];

	verbs.each( function ( i ) {
		if ( self.allowed( i, uri, host ) ) {
			result.push( i );
		}
	});

	result = result.join( ", " ).toUpperCase().replace( "GET", "GET, HEAD, OPTIONS" );

	return result;
};

/**
 * Creates a cipher from two input parameters
 *
 * @method cipher
 * @param  {String}  arg    String to encrypt
 * @param  {Boolean} encode [Optional] Encrypt or decrypt `arg` using `salt`, default is `true`
 * @param  {String}  salt   [Optional] Salt for encryption
 * @return {String}         Result of crypto operation
 */
TurtleIO.prototype.cipher = function ( arg, encode, salt ) {
	var cipher, crypted;

	encode   = ( encode !== false );
	salt     = salt || this.config.session.salt;
	cipher   = crypto[encode ? "createCipher" : "createDecipher"]( "aes-256-cbc", salt ),
	crypted  = encode ? cipher.update( arg, "utf8", "hex" ) : cipher.update( arg, "hex", "utf8" );
	crypted += cipher.final( encode ? "hex" : "utf8" );

	return crypted;
};

/**
 * HTTP status codes
 *
 * @type {Object}
 */
TurtleIO.prototype.codes = {
	CONTINUE            : 100,
	SWITCH_PROTOCOL     : 101,
	SUCCESS             : 200,
	CREATED             : 201,
	ACCEPTED            : 202,
	NON_AUTHORITATIVE   : 203,
	NO_CONTENT          : 204,
	RESET_CONTENT       : 205,
	PARTIAL_CONTENT     : 206,
	MULTIPLE_CHOICE     : 300,
	MOVED               : 301,
	FOUND               : 302,
	SEE_OTHER           : 303,
	NOT_MODIFIED        : 304,
	USE_PROXY           : 305,
	REDIRECT            : 307,
	BAD_REQUEST         : 400,
	UNAUTHORIZED        : 401,
	FORBIDDEN           : 403,
	NOT_FOUND           : 404,
	NOT_ALLOWED         : 405,
	NOT_ACCEPTABLE      : 406,
	PROXY_AUTH          : 407,
	REQUEST_TIMEOUT     : 408,
	CONFLICT            : 409,
	GONE                : 410,
	LENGTH_REQUIRED     : 411,
	FAILED              : 412,
	REQ_TOO_LARGE       : 413,
	URI_TOO_LONG        : 414,
	UNSUPPORTED_MEDIA   : 415,
	NOT_SATISFIABLE     : 416,
	EXPECTATION_FAILED  : 417,
	SERVER_ERROR        : 500,
	NOT_IMPLEMENTED     : 501,
	BAD_GATEWAY         : 502,
	SERVICE_UNAVAILABLE : 503,
	GATEWAY_TIMEOUT     : 504,
	HTTP_NOT_SUPPORTED  : 505
};

/**
 * Pipes compressed asset to Client
 *
 * @method compressed
 * @param  {Object}  body Response body
 * @param  {Object}  type gzip (gz) or deflate (df)
 * @param  {String}  etag Etag
 * @param  {Object}  res  HTTP(S) response Object
 * @return {Objet}        TurtleIO instance
 */
TurtleIO.prototype.compress = function ( body, type, etag, res ) {
	var self   = this,
	    method = REGEX_DEF.test( type ) ? "createDeflate" : "createGzip",
	    fn;

	if ( etag ) {
		fn = this.config.tmp + "/" + etag + "." + type;
		fs.exists( fn, function ( exist ) {
			if ( exist ) {
				fs.createReadStream( fn ).pipe( res );
			}
			else {
				if ( typeof body.pipe === "function" ) {
					body.pipe( zlib[method]() ).pipe( fs.createWriteStream( fn ) );
					body.pipe( zlib[method]() ).pipe( res );
				}
				else if ( body instanceof Buffer ) {
					type = type.replace( "create", "" ).toLowerCase();
					zlib[type]( body, function ( e, data ) {
						if ( e ) {
							self.log( e );
						}

						res.end( data );
					} );

					zlib[type]( body, function ( e, data ) {
						if ( e ) {
							self.log( e );
						}
						else {
							fs.writeFile( fn, data, "utf8", function ( e ) {
								if ( e ) {
									self.log( e );
								}
							} );
						}
					} );
				}
				else {
					fs.createReadStream( body ).pipe( zlib[method]() ).pipe( fs.createWriteStream( fn ) );
					fs.createReadStream( body ).pipe( zlib[method]() ).pipe( res );
				}
			}
		} );
	}
	else if ( body instanceof Buffer ) {
		type = type.replace( "create", "" ).toLowerCase();
		zlib[type]( body, function ( e, data ) {
			if ( e ) {
				self.log( e );
			}

			res.end( data );
		} );

		zlib[type]( body, function ( e, data ) {
			if ( e ) {
				self.log( e );
			}
			else {
				fs.writeFile( fn, data, "utf8", function ( e ) {
					if ( e ) {
						self.log( e );
					}
				} );
			}
		} );
	}
	else {
		zlib[type]( body ).pipe( res );
		zlib[type]( body ).pipe( fs.createWriteStream( fn ) );
	}

	return this;
};


/**
 * Determines what/if compression is supported for a request
 *
 * @method compression
 * @param  {String} agent    User-Agent header value
 * @param  {String} encoding Accept-Encoding header value
 * @param  {String} mimetype Mime type of response body
 * @return {Mixed}           Supported compression or null
 */
TurtleIO.prototype.compression = function ( agent, encoding, mimetype ) {
	var result    = null,
	    encodings = typeof encoding === "string" ? encoding.explode() : [];

	if ( /json|text/.test( mimetype ) && this.config.compress === true && !REGEX_IE.test( agent ) ) {
		// Iterating supported encodings
		encodings.each( function ( i ) {
			if ( REGEX_GZIP.test( i ) ) {
				result = "gzip";
			}
			else if ( REGEX_DEF.test( i ) ) {
				result = "deflate";
			}

			// Found a supported encoding
			if ( result !== null ) {
				return false;
			}
		});
	}

	return result;
};

/**
 * Cookies
 *
 * @class cookie
 */
TurtleIO.prototype.cookie = {
	/**
	 * Expires a cookie if it exists
	 *
	 * @method expire
	 * @param  {Object}  res    HTTP(S) response Object
	 * @param  {String}  name   Name of the cookie to expire
	 * @param  {String}  domain [Optional] Domain to set the cookie for
	 * @param  {Boolean} secure [Optional] Make the cookie only accessible via SSL
	 * @param  {String}  path   [Optional] Path the cookie is for
	 * @return {String}        Name of the expired cookie
	 */
	expire : function ( res, name, domain, secure, path ) {
		return $.cookie.expire( name, domain, secure, path, res );
	},

	/**
	 * Gets a cookie from the request headers
	 *
	 * @method get
	 * @param  {Object} req  HTTP(S) request Object
	 * @param  {String} name Name of the cookie to get
	 * @return {Mixed}       Cookie or undefined
	 */
	get : function ( req, name ) {
		return this.list( req )[name];
	},

	/**
	 * Gets a list cookies from the request headers
	 *
	 * @method list
	 * @param  {Object} req  HTTP(S) request Object
	 * @param  {String} name Cookie name
	 * @return {Object}      Collection of cookies
	 */
	list : function ( req ) {
		return $.cookie.list( req.headers.cookie || "" );
	},

	/**
	 * Sets a cookie in the response headers
	 *
	 * @method set
	 * @param  {Object}  res    HTTP(S) response Object
	 * @param  {String}  name   Name of the cookie to create
	 * @param  {String}  value  Value to set
	 * @param  {String}  offset A positive or negative integer followed by "d", "h", "m" or "s"
	 * @param  {String}  domain [Optional] Domain to set the cookie for
	 * @param  {Boolean} secure [Optional] Make the cookie only accessible via SSL
	 * @param  {String}  path   [Optional] Path the cookie is for
	 * @return {Undefined}      undefined
	 */
	set : function ( res, name, value, offset, domain, secure, path ) {
		return $.cookie.set( name, value, offset, domain, secure, path, res );
	}
};

/**
 * Encodes `arg` as JSON if applicable
 *
 * @method encode
 * @param  {Mixed} arg Object to encode
 * @return {Mixed}     Original Object or JSON string
 */
TurtleIO.prototype.encode = function ( arg ) {
	// Do not want to coerce this Object to a String!
	if ( arg instanceof Buffer || typeof arg.pipe === "function" ) {
		return arg;
	}
	// Converting to JSON
	else if ( arg instanceof Array || arg instanceof Object ) {
		return $.encode( arg );
	}
	// Nothing to do, leave it as it is
	else {
		return arg;
	}
};

/**
 * Error handler for requests
 *
 * @method error
 * @param  {Object} req HTTP(S) request Object
 * @param  {Object} res HTTP(S) response Object
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.error = function ( req, res ) {
	var method = req.method.toLowerCase(),
	    status = this.codes.NOT_FOUND,
	    url    = this.url( req ),
	    host   = $.parse( url ).hostname;

	// If valid, determine what kind of error to respond with
	if ( !REGEX_GET.test( method ) && !REGEX_HEAD.test( method ) ) {
		if ( this.allowed( req.method, req.url, host ) ) {
			status = this.codes.SERVER_ERROR;
		}
		else {
			status = this.codes.NOT_ALLOWED;
		}
	}

	return this.respond( req, res, this.page( status, host ), status, {"Cache-Control": "no-cache"} );
};

/**
 * Generates an Etag
 *
 * @method etag
 * @param  {String} url      URL requested
 * @param  {Number} size     Response size
 * @param  {Number} modified Modified time
 * @param  {Object} body     [Optional] Response body
 * @return {String}          Etag value
 */
TurtleIO.prototype.etag = function ( /*url, size, modified, body*/ ) {
	return this.hash( $.array.cast( arguments ).join( "-" ) );
};

/**
 * Handles the request
 *
 * @method handle
 * @param  {Object}  req   HTTP(S) request Object
 * @param  {Object}  res   HTTP(S) response Object
 * @param  {String}  path  File path
 * @param  {String}  url   Requested URL
 * @param  {Boolean} dir   `true` is `path` is a directory
 * @param  {Object}  stat  fs.Stat Object
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.handle = function ( req, res, path, url, dir, stat ) {
	var self   = this,
	    parsed = $.parse( url ),
	    allow  = this.allows( parsed.pathname, parsed.hostname ),
	    write  = allow.indexOf( dir ? "POST" : "PUT" ) > -1,
	    del    = allow.indexOf( "DELETE" ) > -1,
	    method = req.method,
	    cached, etag, headers, mimetype, modified, size;

	// File request
	if ( !dir ) {
		if ( REGEX_GET.test( method ) ) {
			mimetype = mime.lookup( path );
			cached   = this.etags.cache[url];
			size     = stat.size;
			modified = stat.mtime.toUTCString();
			etag     = "\"" + this.etag( url, size, stat.mtime ) + "\"";
			headers  = {Allow: allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified};

			if ( method === "GET" ) {
				// Creating `watcher` in master ps to update LRU
				if ( !cached ) {
					this.watch( url, path, mimetype );
				}

				// Client has current version
				if ( ( req.headers["if-none-match"] === etag ) || ( !req.headers["if-none-match"] && Date.parse( req.headers["if-modified-since"] ) >= stat.mtime ) ) {
					this.respond( req, res, this.messages.NO_CONTENT, this.codes.NOT_MODIFIED, headers );
				}
				// Sending current version
				else {
					this.respond( req, res, path, this.codes.SUCCESS, headers, true );
				}
			}
			else {
				this.respond( req, res, this.messages.NO_CONTENT, this.codes.SUCCESS, headers );
			}
		}
		else if ( method === "DELETE" && del ) {
			this.stale( this.url( req ) );

			fs.unlink( path, function ( e ) {
				if ( e ) {
					self.error( req, req );
				}
				else {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.NO_CONTENT, {} );
				}
			});
		}
		else if ( method === "PUT" && write ) {
			this.write( path, req, res );
		}
		else {
			this.error( req, req );
		}
	}
	// Directory request
	else {
		if ( ( method === "POST" || method === "PUT" ) && write ) {
			this.write( path, req, res );
		}
		else if ( method === "DELETE" && del ) {
			this.stale( this.url( req ) );

			fs.unlink( path, function ( e ) {
				if ( e ) {
					self.error( req, req );
				}
				else {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.NO_CONTENT, {} );
				}
			});
		}
		else {
			this.error( req, req );
		}
	}

	return this;
};

/**
 * Sets a handler
 *
 * @method handler
 * @param  {String}   method HTTP method
 * @param  {String}   route  RegExp pattern
 * @param  {Function} fn     Handler
 * @param  {String}   host   [Optional] Virtual host, default is `all`
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.handler = function ( method, route, fn, host ) {
	host = host || "all";

	if ( this.handlers.all.hosts[host] === undefined ) {
		this.host( host );
	}

	this.handlers[method].routes.push( route );
	this.handlers[method].regex.push( new RegExp( "^" + route + "$" ) );
	this.handlers[method].hosts[host][route] = fn;

	return this;
};

/**
 * Creates a hash of arg
 *
 * @method hash
 * @param  {Mixed}  arg     String or Buffer
 * @param  {String} encrypt [Optional] Type of encryption
 * @param  {String} digest  [Optional] Type of digest
 * @return {String}         Hash of arg
 */
TurtleIO.prototype.hash = function ( arg, encrypt, digest ) {
	encrypt = encrypt || "md5";
	digest  = digest  || "hex";

	if ( typeof arg !== "string" && !arg instanceof Buffer ) {
		arg = "";
	}

	return crypto.createHash( encrypt ).update( arg ).digest( digest );
};

/**
 * Sets response headers
 *
 * @method headers
 * @param  {Object}  rHeaders Response headers
 * @param  {Number}  status   HTTP status code, default is 200
 * @param  {Boolean} get      Indicates if responding to a GET
 * @return {Object}           Response headers
 */
TurtleIO.prototype.headers = function ( rHeaders, status, get ) {
	var headers = $.clone( this.config.headers, true );

	// Decorating response headers
	if ( rHeaders instanceof Object ) {
		$.merge( headers, rHeaders );
	}

	// Fixing `Allow` header
	if ( !REGEX_HEAD2.test( headers.Allow ) ) {
		headers.Allow = headers.Allow.toUpperCase().explode().filter( function ( i ) {
			return !REGEX_HEAD.test( i );
		} ).join( ", " ).replace( "GET", "GET, HEAD, OPTIONS" );
	}

	if ( !headers.Date ) {
		headers.Date = new Date().toUTCString();
	}

	if ( headers["Access-Control-Allow-Methods"].isEmpty() ) {
		headers["Access-Control-Allow-Methods"] = headers.Allow;
	}

	// Decorating "Last-Modified" header
	if ( !headers["Last-Modified"] ) {
		headers["Last-Modified"] = headers.Date;
	}

	// Decorating "Transfer-Encoding" header
	if ( !headers["Transfer-Encoding"] )  {
		headers["Transfer-Encoding"] = "chunked";
	}

	// Removing headers not wanted in the response
	if ( !get || status >= this.codes.BAD_REQUEST ) {
		delete headers["Cache-Control"];
	}

	if ( ( status >= this.codes.FORBIDDEN && status <= this.codes.NOT_FOUND ) || ( status >= this.codes.SERVER_ERROR ) ) {
		delete headers.Allow;
		delete headers["Access-Control-Allow-Methods"];
		delete headers["Last-Modified"];
	}

	return headers;
};

/**
 * Registers a virtual host
 *
 * @method host
 * @param  {String} arg Virtual host
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.host = function ( arg ) {
	if ( this.handlers.all.hosts[arg] === undefined ) {
		this.vhosts.push( arg );
		this.vhostsRegExp.push( new RegExp( "^" + arg + "$" ) );
		this.handlers.all.hosts[arg]       = {};
		this.handlers["delete"].hosts[arg] = {};
		this.handlers.get.hosts[arg]       = {};
		this.handlers.patch.hosts[arg]     = {};
		this.handlers.post.hosts[arg]      = {};
		this.handlers.put.hosts[arg]       = {};
	}

	return this;
};

/**
 * Logs a message
 *
 * @method log
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    TurtleIO instance
 */
TurtleIO.prototype.log = function ( msg ) {
	var e = msg instanceof Error;

	// Determining what to log & dispatching to STDOUT
	if ( e ) {
		msg = msg.callstack || msg;
		console.error( msg );
	}
	else if ( this.config.logs.stdout ) {
		console.log( msg );
	}

	// Dispatching to syslog server
	syslog.log( syslog[!e ? "LOG_INFO" : "LOG_ERR"], msg );

	return this;
};

/**
 * HTTP (semantic) status messages
 *
 * @type {Object}
 */
TurtleIO.prototype.messages = {
	SUCCESS             : "Successful",
	CREATED             : "Created",
	ACCEPTED            : "Accepted",
	NO_CONTENT          : null,
	BAD_REQUEST         : "Invalid arguments",
	UNAUTHORIZED        : "Invalid authorization or OAuth token",
	FORBIDDEN           : "Forbidden",
	NOT_FOUND           : "Not found",
	NOT_ALLOWED         : "Method not allowed",
	CONFLICT            : "Conflict",
	SERVER_ERROR        : "Server error",
	BAD_GATEWAY         : "Bad gateway",
	SERVICE_UNAVAILABLE : "Service is unavailable"
};

/**
 * Gets an HTTP status page
 *
 * @method page
 * @param  {Number} code HTTP status code
 * @param  {String} host Virtual hostname
 * @return {String}      Response body
 */
TurtleIO.prototype.page = function ( code, host ) {
	host = host && this.pages[host] ? host : "all";

	return this.pages[host][code] || this.pages[host]["500"] || this.pages.all["500"];
};

/**
 * Preparing log message
 *
 * @method prep
 * @param  {Object} req HTTP(S) request Object
 * @param  {Object} res HTTP(S) response Object
 * @return {String}     Log message
 */
TurtleIO.prototype.prep = function ( req, res ) {
	var msg    = this.config.logs.format,
	    time   = this.config.logs.time,
	    parsed = $.parse( this.url( req ) ),
	    header = req.headers.authorization || "",
	    token  = header.split( REGEX_SPACE ).pop()  || "",
	    auth   = new Buffer( token, "base64" ).toString(),
	    user   = auth.split( ":" )[0] || "-",
	    refer  = req.headers.referer !== undefined ? ( "\"" + req.headers.referer + "\"" ) : "-";

	msg = msg.replace( "{{host}}",       req.headers.host )
	         .replace( "{{time}}",       moment().format( time ) )
	         .replace( "{{ip}}",         req.connection.remoteAddress )
	         .replace( "{{method}}",     req.method )
	         .replace( "{{path}}",       parsed.path )
	         .replace( "{{status}}",     res.statusCode )
	         .replace( "{{length}}",     res.getHeader( "Content-Length" ) || "-")
	         .replace( "{{referer}}",    refer )
	         .replace( "{{user}}",       user )
	         .replace( "{{user-agent}}", req.headers["user-agent"] || "-" );

	return msg;
};

/**
 * Proxies a (root) URL to a route
 *
 * @method proxy
 * @param  {String}  origin Host to proxy (e.g. http://hostname)
 * @param  {String}  route  Route to proxy
 * @param  {String}  host   [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} stream [Optional] Stream response to client (default is false)
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.proxy = function ( origin, route, host, stream ) {
	stream    = ( stream === true );
	var self  = this,
	    verbs = ["delete", "get", "post", "put", "patch"],
	    handle, headers, wrapper;

	/**
	 * Response handler
	 *
	 * @method handle
	 * @private
	 * @param  {Mixed}  arg   Proxy response
	 * @param  {Object} xhr   XmlHttpRequest
	 * @param  {Object} req   HTTP(S) request Object
	 * @param  {Object} res   HTTP(S) response Object
	 * @return {Undefined}    undefined
	 */
	handle = function ( arg, xhr, req, res ) {
		var resHeaders = {},
		    etag       = "",
		    regex      = /("|')\//g,
		    replace    = "$1" + route + "/",
		    url        = self.url( req ),
		    delay      = $.expires,
		    rewrite;

		try {
			// Getting or creating an Etag
			if ( xhr.status !== 304 ) {
				resHeaders = headers( xhr.getAllResponseHeaders() );
				rewrite    = REGEX_REWRITE.test( resHeaders["Content-Type"].replace( REGEX_NVAL, "" ) );
				etag       = resHeaders.Etag || "\"" + self.etag( url, resHeaders["Content-Length"] || 0, resHeaders["Last-Modified"] || 0, arg ) + "\"";

				// Setting headers
				if ( resHeaders.Etag !== etag ) {
					resHeaders.Etag = etag;
				}

				if ( resHeaders.Allow === undefined || resHeaders.Allow.isEmpty() ) {
					resHeaders.Allow = resHeaders["Access-Control-Allow-Methods"] || "GET";
				}

				resHeaders.Server = self.config.headers.Server;

				if ( !$.regex.no.test( resHeaders["Cache-Control"] ) ) {
					// Determining how long rep is valid
					if ( resHeaders["Cache-Control"] && $.regex.number_present.test( resHeaders["Cache-Control"] ) ) {
						delay = $.number.parse( $.regex.number_present.exec( resHeaders["Cache-Control"] )[0], 10 );
					}
					else if ( resHeaders.Expires !== undefined ) {
						delay = new Date( resHeaders.Expires ).diff( new Date() );
					}

					if ( delay > 0 ) {
						// Updating LRU
						self.register( url, {etag: etag.replace( /\"/g, "" ), mimetype: resHeaders["Content-Type"]}, true );

						// Removing from LRU when invalid
						$.delay( function () {
							self.unregister( url );
						}, delay, url );
					}
				}

				// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
				if ( req.headers["if-none-match"] === etag ) {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.NOT_MODIFIED, resHeaders );
				}
				else {
					if ( REGEX_HEAD.test( req.method.toLowerCase() ) ) {
						arg = self.messages.NO_CONTENT;
					}
					// Fixing root path of response
					else if ( rewrite ) {
						if ( arg instanceof Array || arg instanceof Object ) {
							arg = $.decode( $.encode( arg ).replace( regex, replace ) );
						}
						else if ( typeof arg === "string" ) {
							arg = arg.replace( regex, replace );
						}
					}

					self.respond( req, res, arg, xhr.status, resHeaders );
				}
			}
			else {
				self.respond( req, res, arg, xhr.status, {Server: self.config.headers.Server} );
			}
		}
		catch (e) {
			self.respond( req, res, self.page( self.codes.BAD_GATEWAY, self.hostname( req ) ), self.codes.BAD_GATEWAY, {Allow: "GET"} );
			self.log( e, true );
		}
	};

	/**
	 * Capitalizes HTTP headers
	 *
	 * @method headers
	 * @private
	 * @param  {Object} args Response headers
	 * @return {Object}      Reshaped response headers
	 */
	headers = function ( args ) {
		var result = {};

		args.trim().split( "\n" ).each( function ( i ) {
			var header, value;

			value          = i.replace( $.regex.header_value_replace, "" );
			header         = i.replace( $.regex.header_replace, "" );
			header         = header.unhyphenate( true ).replace( /\s+/g, "-" );
			result[header] = value;
		});

		return result;
	};

	/**
	 * Wraps the proxy request
	 *
	 * @method wrapper
	 * @private
	 * @param  {Object} req   HTTP(S) request Object
	 * @param  {Object} res   HTTP(S) response Object
	 * @return {Undefined}    undefined
	 */
	wrapper = function ( req, res ) {
		var url     = origin + req.url.replace( new RegExp( "^" + route ), "" ),
		    method  = req.method.toLowerCase(),
		    headerz = $.clone( req.headers ),
		    parsed  = $.parse( url ),
		    fn, options, proxyReq;

		// Facade to handle()
		fn = function ( arg, xhr ) {
			handle( arg, xhr, req, res );
		};

		// Streaming response to Client
		if ( stream ) {
			headerz.host = req.headers.host;

			options = {
				headers  : headerz,
				hostname : parsed.hostname,
				method   : req.method,
				path     : parsed.path,
				port     : parsed.port || 80
			};

			if ( !parsed.auth.isEmpty() ) {
				options.auth = parsed.auth;
			}

			proxyReq = http.request( options, function ( proxyRes ) {
				res.writeHeader(proxyRes.statusCode, proxyRes.headers);
				proxyRes.pipe( res );
			});

			if ( REGEX_BODY.test( req.method ) ) {
				proxyReq.write( req.body );
			}

			proxyReq.end();
		}
		// Acting as a RESTful proxy
		else {
			// Removing support for compression so the response can be rewritten (if textual)
			delete headerz["accept-encoding"];

			if ( REGEX_BODY.test( req.method ) ) {
				url[method]( fn, fn, req.body, headerz );
			}
			else if ( REGEX_DEL.test( method ) ) {
				url.del( fn, fn, headerz );
			}
			else if ( REGEX_HEAD.test( method ) ) {
				if ( method === "head" ) {
					method = "headers";
				}

				url[method]( fn, fn );
			}
			else {
				url.get( fn, fn, headerz );
			}
		}
	};

	// Setting route
	verbs.each( function ( i ) {
		self[i]( route, wrapper, host );
		self[i]( route + "/.*", wrapper, host );
	});

	return this;
};
/**
 * Redirects GETs for a route to another URL
 *
 * @method redirect
 * @param  {String}  route     Route to redirect
 * @param  {String}  url       URL to redirect the Client to
 * @param  {String}  host      [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} permanent [Optional] `true` will indicate the redirection is permanent
 * @return {Object}            instance
 * @todo Make it faster!
 */
TurtleIO.prototype.redirect = function ( route, url, host, permanent ) {
	var self    = this,
	    code    = this.codes[permanent === true ? "MOVED" : "REDIRECT"],
	    pattern = new RegExp( "^" + route + "$" );

	this.get( route, function ( req, res ) {
		var rewrite = ( pattern.exec( req.url ) || [] ).length > 0;

		self.respond( req, res, self.messages.NO_CONTENT, code, {"Location": ( rewrite ? req.url.replace( pattern, url ) : url )} );
	}, host);

	return this;
};

/**
 * Registers an Etag in the LRU cache
 *
 * @method register
 * @param  {String}  url   URL requested
 * @param  {Object}  state Object describing state `{etag: $etag, mimetype: $mimetype}`
 * @param  {Boolean} stale [Optional] Remove cache from disk
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.register = function ( url, state, stale ) {
	var cached;

	// Removing stale cache from disk
	if ( stale === true ) {
		cached = this.etags.cache[url];

		if ( cached && cached.value.etag !== state.etag ) {
			this.stale( url );
		}
	}

	// Updating LRU
	this.etags.set( url, state );

	return this;
};

/**
 * Request handler which provides RESTful CRUD operations
 *
 * @method request
 * @public
 * @param  {Object} req  HTTP(S) request Object
 * @param  {Object} res  HTTP(S) response Object
 * @param  {String} host [Optional] Virtual host
 * @return {Object}      TurtleIO instance
 */
TurtleIO.prototype.request = function ( req, res, host ) {
	var self    = this,
	    url     = this.url( req ),
	    parsed  = $.parse( url ),
	    method  = req.method,
	    handled = false,
	    found   = false,
	    count, path, nth, root;

	// Can't find the hostname in vhosts, try the default (if set) or send a 500
	if ( !host || !( host in this.config.vhosts ) ) {
		this.vhostsRegExp.each( function ( i, idx ) {
			if ( i.test( req.host ) ) {
				found = true;
				host  = self.vhosts[idx];
				return false;
			}
		} );

		if ( !found ) {
			if ( this.config["default"] !== null ) {
				host = this.config["default"];
			}
			else {
				this.error( req, res );
			}
		}
	}

	// Preparing file path
	root = this.config.root + "/" + this.config.vhosts[host];
	path = ( root + parsed.pathname ).replace( REGEX_DIR, "" );

	// Determining if the request is valid
	fs.lstat( path, function ( e, stats ) {
		if ( e ) {
			self.error( req, res );
		}
		else if ( !stats.isDirectory() ) {
			self.handle( req, res, path, parsed.href, false, stats );
		}
		else if ( stats.isDirectory() && !REGEX_GET.test( method ) ) {
			self.handle( req, res, path, parsed.href, true );
		}
		else {
			count = 0;
			nth   = self.config.indexes;
			path += "/";

			self.config.index.each( function ( i ) {
				fs.lstat( path + i, function ( e, stats ) {
					if ( !e && !handled ) {
						handled = true;
						self.handle( req, res, path + i, parsed.href + i, false, stats );
					}
					else if ( ++count === nth && !handled ) {
						self.error( req, res );
					}
				} );
			});
		}
	});

	return this;
};
/**
 * Send a response
 *
 * @method respond
 * @param  {Object}  req     Request Object
 * @param  {Object}  res     Response Object
 * @param  {Mixed}   body    Primitive, Buffer or Stream
 * @param  {Number}  status  [Optional] HTTP status, default is `200`
 * @param  {Object}  headers [Optional] HTTP headers
 * @param  {Boolean} file    [Optional] Indicates `body` is a file path
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.respond = function ( req, res, body, status, headers, file ) {
	var url      = this.url( req ),
	    ua       = req.headers["user-agent"],
	    encoding = req.headers["accept-encoding"],
	    type;

	status  = status || 200;
	headers = this.headers( headers || {"Content-Type": "text/plain"}, status, req.method === "GET" );

	if ( body ) {
		body = this.encode( body );

		// Emsuring JSON has proper mimetype
		if ( $.regex.json_wrap.test( body ) ) {
			headers["Content-Type"] = "application/json";
		}

		if ( req.method === "GET" ) {
			// Ensuring an Etag
			if ( !headers.Etag ) {
				headers.Etag = "\"" + this.etag( url, body.length || 0, headers["Last-Modified"] || 0 ) + "\"";
			}

			// Updating cache
			this.register( url, {etag: headers.Etag, mimetype: headers["Content-Type"]}, true );
		}
	}

	// Decorating response
	res.statusCode = status;

	// Determining if response should be compressed
	if ( body && this.config.compress && ( type = this.compression( ua, encoding, headers["Content-Type"] ) ) && type !== null ) {
		if ( body instanceof Buffer ) {
			headers["Content-Length"] = body.toString().length;
		}

		headers["Content-Encoding"] = type;
		res.writeHead( status, headers );
		this.compress( body, type, headers.Etag.replace( /"/g, "" ), res );
	}
	else if ( file ) {
		res.writeHead( status, headers );
		fs.createReadStream( body ).pipe( res );
	}
	else {
		if ( body instanceof Buffer ) {
			headers["Content-Length"] = body.toString().length;
		}

		res.writeHead( status, headers );
		res.end( body );
	}

	return this.log( this.prep( req, res ) );
};

/**
 * Restarts the instance
 *
 * @method restart
 * @return {Object} TurtleIO instance
 */
TurtleIO.prototype.restart = function () {
	var config = this.config;

	this.stop().start( config );

	return this;
};

/**
 * Routes a request to a handler
 *
 * @method route
 * @param  {Object} req Request Object
 * @param  {Object} res Response Object
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.route = function ( req, res ) {
	var self   = this,
	    url    = this.url( req ),
	    parsed = $.parse( url ),
	    method = req.method.toLowerCase(),
	    cached, handler, host, payload, route;

	// Finding a matching vhost
	this.vhostsRegExp.each( function ( i, idx ) {
		if ( i.test( parsed.hostname ) ) {
			return !( host = self.vhosts[idx] );
		}
	} );

	if ( !host ) {
		host = this.config["default"] || "all";
	}

	// Looking for a match
	this.handlers[method].regex.each( function ( i, idx ) {
		var x = self.handlers[method].routes[idx];

		if ( ( x in self.handlers[method].hosts[host] || x in self.handlers[method].hosts.all ) && i.test( parsed.path ) ) {
			route   = i;
			handler = self.handlers[method].hosts[host][x] || self.handlers[method].hosts.all[x];
			return false;
		}
	} );

	// Looking for a match against generic routes
	if ( !route ) {
		this.handlers.all.regex.each( function ( i, idx ) {
			var x = self.handlers.all.routes[idx];

			if ( ( x in self.handlers.all.hosts[host] || x in self.handlers.all.hosts.all ) && i.test( parsed.path ) ) {
				route   = i;
				handler = self.handlers.all.hosts[host][x] || self.handlers.all.hosts.all[x];
				return false;
			}
		} );
	}

	if ( handler ) {
		// Decorates a session
		req.session = !req.headers[this.config.session.id] ? null : this.session.get( req, res );

		// Setting listeners if expecting a body
		if ( REGEX_BODY.test( method ) ) {
			req.setEncoding( "utf-8" );

			req.on( "data", function ( data ) {
				payload = payload === undefined ? data : payload + data;
			});

			req.on( "end", function () {
				req.body = payload;
				handler.call( self, req, res, host );
			});
		}
		// Looking in LRU cache for Etag
		else if ( REGEX_GET.test( method ) ) {
			cached = this.etags.get( url );

			// Sending a 304 if Client is making a GET & has current representation
			if ( cached && !REGEX_HEAD.test( method ) && req.headers["if-none-match"] && req.headers["if-none-match"].replace( /\"/g, "" ) === cached.etag ) {
				this.respond( req, res, this.messages.NO_CONTENT, this.codes.NOT_MODIFIED, {"Content-Type": cached.mimetype, Etag: "\"" + cached.etag + "\""} );
			}
			else {
				handler.call( this, req, res, host );
			}
		}
		else {
			handler.call( this, req, res, host );
		}
	}
	else {
		this.error( req, res );
	}

	return this;
};

/**
 * Session factory
 *
 * @method Session
 * @private
 * @constructor
 * @param {String} id     Session ID
 * @param {Object} server Server instance
 */
function Session ( id, server ) {
	this._id        = id;
	this._server    = server;
	this._timestamp = 0;
}

/**
 * Saves session across cluster
 *
 * @method save
 * @public
 * @return {Undefined} undefined
 */
Session.prototype.save = function () {
	var body = {};

	this._timestamp = moment().utc().unix();

	$.iterate( this, function ( v, k ) {
		if ( !REGEX_SERVER.test( k ) ) {
			body[k] = v;
		}
	});
};

/**
 * Expires session across cluster
 *
 * @method expire
 * @public
 * @return {Undefined} undefined
 */
Session.prototype.expire = function () {
	delete this._server.sessions[this._id];
};

/**
 * Sessions
 *
 * @class sessions
 * @type {Object}
 * @todo too slow!
 */
TurtleIO.prototype.session = {
	/**
	 * Creates a session
	 *
	 * @method create
	 * @public
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     Session
	 */
	create : function ( req, res ) {
		var instance = this.server,
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    id       = $.uuid( true ),
		    sid      = instance.cipher( id, true, salt ),
		    sesh;

		// Setting cookie
		instance.cookie.set( res, instance.config.session.id, sid, this.expires, domain, secure, "/" );

		// Creating session instance & announcing it
		sesh = instance.sessions[id] = new Session( id, instance );
		sesh.save();

		return sesh;
	},

	/**
	 * Destroys a session
	 *
	 * @method destroy
	 * @public
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     TurtleIO instance
	 */
	destroy : function ( req, res ) {
		var instance = this.server,
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    sid      = instance.cookie.get( req, instance.config.session.id ),
		    id       = instance.cipher( sid, false, salt );

		if ( id !== undefined ) {
			// Expiring cookie
			instance.cookie.expire( res, instance.config.session.id, domain, secure, "/" );

			// Deleting sesssion
			delete instance.sessions[id];
		}

		return instance;
	},

	/**
	 * Gets a session
	 *
	 * @method get
	 * @public
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Mixed}      Session or undefined
	 */
	get : function ( req, res ) {
		var instance = this.server,
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    sid      = instance.cookie.get( req, instance.config.session.id ),
		    id, salt, sesh;

		if ( sid !== undefined ) {
			salt = req.connection.remoteAddress + "-" + instance.config.session.salt;
			id   = instance.cipher( sid, false, salt );
			sesh = instance.sessions[id];

			if ( sesh !== undefined ) {
				if ( sesh._timestamp.diff( moment().utc().unix() ) > 1 ) {
					instance.cookie.set( res, instance.config.session.id, sid, this.expires, domain, secure, "/" );
					sesh.save();
				}
			}
			else {
				this.destroy( req, res );
			}
		}

		return sesh;
	},

	/**
	 * Sets a session (cluster normalization)
	 *
	 * @method set
	 * @public
	 * @param  {Object} arg Message argument from Master
	 * @return {Object}     TurtleIO instance
	 */
	set : function ( arg ) {
		if ( this.sessions[arg.id] === undefined ) {
			this.sessions[arg.id] = new Session( arg.id, this );
		}

		$.merge( this.sessions[arg.id], arg.session );

		return this;
	},

	// Transformed `config.session.valid` for $.cookie{}
	expires : "",

	// Determines if a session has expired
	maxDiff : 0,

	// Set & unset from `start()` & `stop()`
	server : null
};

/**
 * Removes stale representation from disk
 *
 * @method stale
 * @public
 * @param  {String} url LRUItem key
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.stale = function ( url ) {
	var self   = this,
	    cached = this.etags.cache[url],
	    path   = this.config.tmp + "/",
	    gz, df;

	if ( cached ) {
		gz = path + cached.value.etag + ".gz";
		df = path + cached.value.etag + ".df";

		fs.exists( gz, function ( exists ) {
			if ( exists ) {
				fs.unlink( gz, function ( e ) {
					if ( e ) {
						self.log( e );
					}
				});
			}
		});

		fs.exists( df, function ( exists ) {
			if ( exists ) {
				fs.unlink( df, function ( e ) {
					if ( e ) {
						self.log( e );
					}
				});
			}
		});
	}

	return this;
};

/**
 * Starts the instance
 *
 * @method start
 * @param  {Object}   config Configuration
 * @param  {Function} err    Error handler
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.start = function ( cfg, err ) {
	var self = this,
	    config, pages;

	config = $.clone( defaultConfig );

	// Merging custom with default config
	$.merge( config, cfg || {} );

	// Overriding default error handler
	if ( typeof err === "function" ) {
		this.error = err;
	}

	// Setting configuration
	if ( !config.port ) {
		config.port = 8000;
	}

	if ( !config.address ) {
		config.address = "127.0.0.1";
	}

	this.config = config;
	pages       = this.config.pages ? ( this.config.root + this.config.pages ) : ( __dirname + "/../pages" );

	// Setting `Server` HTTP header
	if ( !this.config.headers.Server ) {
		this.config.headers.Server = "turtle.io/0.12.0 (abaaso/" + $.version + " node.js/" + process.versions.node.replace( /^v/, "" ) + process.platform.capitalize() + " V8/" + process.versions.v8.toString().trim() + ")";
	}

	// Setting acceptable lag
	toobusy.maxLag( this.config.lag );

	// Setting default routes
	this.host( "all" );

	// Registering virtual hosts
	$.array.cast( config.vhosts, true ).each( function ( i ) {
		self.host( i );
	} );

	// Setting a default GET route
	if ( !this.handlers.get.routes.contains( ".*" ) ) {
		this.get( "/.*", function ( req, res, host ) {
			self.request( req, res, host );
		}, "all" );
	}

	// Loading default error pages
	fs.readdir( pages, function ( e, files ) {
		if ( e ) {
			console.log( e );
		}
		else {
			files.each(function ( i ) {
				self.pages.all[i.replace( REGEX_NEXT, "" )] = fs.readFileSync( pages + "/" + i, "utf8" );
			});

			// Starting server
			if ( self.server === null ) {
				if ( config.ssl.cert !== null && config.ssl.key !== null ) {
					self.server = https.createServer( $.merge( config.ssl, {port: config.port, host: config.address} ), function ( req, res ) {
						self.route( req, res );
					} ).listen( config.port, config.address );
				}
				else {
					self.server = http.createServer( function ( req, res ) {
						self.route( req, res );
					} ).listen( config.port, config.address );
				}
			}
			else {
				self.server.listen( config.port, config.address );
			}

			console.log( "Started turtle.io on port " + config.port );
		}
	});

	// For toobusy()
	process.on( "uncaughtException", function ( e ) {
		self.log( e );
	} );

	return this;
};

/**
 * Returns an Object describing the instance's status
 *
 * @method status
 * @public
 * @return {Object} Status
 */
TurtleIO.prototype.status = function () {
	var ram    = process.memoryUsage(),
	    uptime = process.uptime(),
	    state  = {config: {}, process: {}, server: {}};

	// Startup parameters
	$.iterate( this.config, function ( v, k ) {
		state.config[k] = v;
	});

	// Process information
	state.process = {
		memory : ram,
		pid    : process.pid
	};

	// Server information
	state.server = {
		address     : this.server.address(),
		uptime      : uptime
	};

	return state;
};

/**
 * Stops the instance
 *
 * @method stop
 * @return {Object} TurtleIO instance
 */
TurtleIO.prototype.stop = function () {
	var port = this.config.port;

	this.config       = {};
	this.etags        = $.lru( 1000 );
	this.handlers     = {all: {regex: [], routes: [], hosts: {}}, "delete": {regex: [], routes: [], hosts: {}}, get: {regex: [], routes: [], hosts: {}}, patch: {regex: [], routes: [], hosts: {}}, post: {regex: [], routes: [], hosts: {}}, put: {regex: [], routes: [], hosts: {}}};
	this.pages        = {all: {}};
	this.sessions     = {};
	this.server       = null;
	this.vhosts       = [];
	this.vhostsRegExp = [];
	this.watching     = {};

	if ( this.server !== null ) {
		this.server.close();
	}

	console.log( "Stopped turtle.io on port " + port );

	return this;
};

/**
 * Unregisters an Etag in the LRU cache
 *
 * @method unregister
 * @param  {String} url URL requested
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.unregister = function ( url ) {
	if ( this.etags.cache[url] ) {
		this.stale( url );
	}

	this.etags.remove( url );

	return this;
};

/**
 * Constructs a URL
 *
 * @method url
 * @param  {Object} req Request Object
 * @return {String}     Requested URL
 */
TurtleIO.prototype.url = function ( req ) {
	return "http" + ( this.config.cert !== undefined ? "s" : "" ) + "://" + req.headers.host + req.url;
};

/**
 * Sets a DELETE handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype["delete"] = function ( route, fn, host ) {
	return this.handler( "delete", route, fn, host );
};

/**
 * Sets a GET handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.get = function ( route, fn, host ) {
	return this.handler( "get", route, fn, host );
};

/**
 * Sets a PATCH handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.patch = function ( route, fn, host ) {
	return this.handler( "patch", route, fn, host );
};

/**
 * Sets a POST handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.post = function ( route, fn, host ) {
	return this.handler( "post", route, fn, host );
};

/**
 * Sets a PUT handler
 *
 * @method delete
 * @param  {String}   route RegExp pattern
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Virtual host, default is `all`
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.put = function ( route, fn, host ) {
	return this.handler( "put", route, fn, host );
};

/**
 * Watches `path` for changes & updated LRU
 *
 * @method watcher
 * @param  {String} url      LRUItem url
 * @param  {String} path     File path
 * @param  {String} mimetype Mimetype of URL
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.watch = function ( url, path, mimetype ) {
	var self = this,
	    cleanup, watcher;

	/**
	 * Cleans up caches
	 *
	 * @method cleanup
	 * @private
	 * @param  {Object} watcher FileSystem Watcher
	 * @param  {String} url     Stale URL
	 * @param  {String} path    URL path
	 * @return {Undefined}      undefined
	 */
	cleanup = function ( watcher, url, path ) {
		watcher.close();
		self.stale( url );
		self.unregister( url );
		delete self.watching[path];
	};

	if ( !( this.watching[path] ) ) {
		// Tracking
		this.watching[path] = 1;

		// Watching path for changes
		watcher = fs.watch( path, function ( ev ) {
			if ( REGEX_RENAME.test( ev ) ) {
				cleanup( watcher, url, path );
			}
			else {
				fs.lstat( path, function ( e, stat ) {
					if ( e ) {
						self.log( e );
						cleanup( watcher, url, path );
					}
					else if ( self.registry.cache[url] ) {
						self.register( url, {etag: self.etag( url, stat.size, stat.mtime ), mimetype: mimetype}, true );
					}
					else {
						cleanup( watcher, url, path );
					}
				});
			}
		});
	}
};

/**
 * Writes files to disk
 *
 * @method write
 * @param  {String} path  File path
 * @param  {Object} req   HTTP request Object
 * @param  {Object} res   HTTP response Object
 * @return {Object}       TurtleIO instance
 */
TurtleIO.prototype.write = function ( path, req, res ) {
	var self  = this,
	    put   = ( req.method === "PUT" ),
	    body  = req.body,
	    allow = this.allows( req.url ),
	    del   = this.allowed( "DELETE", req.url ),
	    url   = this.url( req ),
	    status;

	if ( !put && $.regex.endslash.test( req.url ) ) {
		status = del ? this.codes.CONFLICT : this.codes.SERVER_ERROR;
		this.respond( req, res, this.page( status, this.hostname( req ) ), status, {Allow: allow}, false );
	}
	else {
		allow = allow.explode().remove( "POST" ).join( ", " );

		fs.lstat( path, function ( e, stat ) {
			if ( e ) {
				self.error( req, res );
			}
			else {
				var etag = "\"" + self.etag( url, stat.size, stat.mtime ) + "\"";

				if ( !req.headers.hasOwnProperty( "etag" ) || req.headers.etag === etag ) {
					fs.writeFile( path, body, function ( e ) {
						if ( e ) {
							self.error( req, req );
						}
						else {
							status = put ? self.codes.NO_CONTENT : self.codes.CREATED;
							self.respond( req, res, self.page( status, self.hostname( req ) ), status, {Allow: allow}, false );
						}
					});
				}
				else if ( req.headers.etag !== etag ) {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.FAILED, {}, false );
				}
			}
		});
	}

	return this;
};

module.exports = TurtleIO;
