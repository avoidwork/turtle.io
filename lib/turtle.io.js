/**
 * turtle.io
 *
 * Easy to use web server with virtual hosts & reverse proxies
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2014 Jason Mulligan
 * @license BSD-3 <https://raw.github.com/avoidwork/turtle.io/master/LICENSE>
 * @link http://turtle.io
 * @version 1.2.0
 */
"use strict";

var crypto        = require( "crypto" ),
    defaultConfig = require( __dirname + "/../config.json" ),
    util          = require( "keigai" ).util,
    array         = util.array,
    clone         = util.clone,
    coerce        = util.coerce,
    delay         = util.delay,
    iterate       = util.iterate,
    lru           = util.lru,
    number        = util.number,
    merge         = util.merge,
    parse         = util.parse,
    json          = util.json,
    request       = util.request,
    string        = util.string,
    uuid          = util.uuid,
    fs            = require( "fs" ),
    http          = require( "http" ),
    https         = require( "https" ),
    http_auth     = require( "http-auth" ),
    mime          = require( "mime" ),
    moment        = require( "moment" ),
    syslog        = require( "node-syslog" ),
    zlib          = require( "zlib" ),
    ALL           = "all",
    STALE         = 60000,
    REGEX_BODY    = /^(put|post|patch)$/i,
    REGEX_COMP    = /javascript|json|text|xml/,
    REGEX_CSV     = /text\/csv/,
    REGEX_ENDSLSH = /\/$/,
    REGEX_ENDSMCN = /;$/,
    REGEX_EXT     = /\.[\w+]{1,}$/, // 1 is for source code files, etc.
    REGEX_HEAD    = /^(head|options)$/i,
    REGEX_HEAD2   = /head|options/i,
    REGEX_HEADKEY = /:.*/,
    REGEX_HEADVAL = /.*:\s+/,
    REGEX_GET     = /^(get|head|options)$/i,
    REGEX_DEL     = /^(del)$/i,
    REGEX_DEF     = /deflate/,
    REGEX_DIR     = /\/$/,
    REGEX_GZIP    = /gz/,
    REGEX_IE      = /msie/i,
    REGEX_IDEVICE = /ipad|iphone|ipod/i,
    REGEX_SAFARI  = /safari\//i,
    REGEX_CHROME  = /chrome\/|chromium\//i,
    REGEX_JSON    = /json/,
    REGEX_JSONWRP = /^[\[\{]/,
    REGEX_NEXT    = /\..*/,
    REGEX_NOCACHE = /no-store|no-cache/i,
    REGEX_NVAL    = /;.*/,
    REGEX_NUMBER  = /\d{1,}/,
    REGEX_PRIVATE = /private/,
    REGEX_REFUSED = /ECONNREFUSED/,
    REGEX_RENAME  = /^rename$/,
    REGEX_SPACE   = /\s+/,
    REGEX_STREAM  = /application|audio|chemical|conference|font|image|message|model|xml|video/,
    REGEX_REWRITE;

// Hooking syslog output
syslog.init( "turtle_io", syslog.LOG_PID | syslog.LOG_ODELAY, syslog.LOG_LOCAL0 );

/**
 * TurtleIO
 *
 * @constructor
 */
function TurtleIO () {
	this.config         = {};
	this.etags          = lru( 1000 );
	this.handlers       = {all: {regex: [], routes: [], hosts: {}}, "delete": {regex: [], routes: [], hosts: {}}, get: {regex: [], routes: [], hosts: {}}, patch: {regex: [], routes: [], hosts: {}}, post: {regex: [], routes: [], hosts: {}}, put: {regex: [], routes: [], hosts: {}}};
	this.pages          = {all: {}};
	this.session.server = this;
	this.sessions       = {};
	this.server         = null;
	this.vhosts         = [];
	this.vhostsRegExp   = [];
	this.watching       = {};
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
	var self   = this,
	    result = false,
	    exist  = false,
	    d, hosts;

	host  = host || ALL;
	hosts = this.handlers[method].hosts;
	d     = hosts[this.config["default"]];
	exist = ( hosts[host] );

	array.each( this.handlers[method].regex, function ( i, idx ) {
		var route = self.handlers[method].routes[idx];

		if ( i.test( uri ) && ( ( exist && route in hosts[host] ) || route in d || route in hosts.all ) ) {
			return !( result = true );
		}
	} );

	if ( !result ) {
		hosts = this.handlers.all.hosts;
		d     = hosts[this.config["default"]];
		exist = ( hosts[host] );

		array.each( this.handlers.all.regex, function ( i, idx ) {
			var route = self.handlers.all.routes[idx];

			if ( i.test( uri ) && ( ( exist && route in hosts[host] ) || route in d || route in hosts.all ) ) {
				return !( result = true );
			}
		} );
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
	    verbs  = ["delete", "get", "post", "put", "patch"],
	    result;

	result = verbs.filter( function ( i ) {
		return self.allowed( i, uri, host );
	} );

	result = result.join( ", " ).toUpperCase().replace( "GET", "GET, HEAD, OPTIONS" );

	return result;
};

/**
 * Determines what authentication is valid (if any), and applies it to the request
 *
 * @method auth
 * @param  {Object}   req  Request Object
 * @param  {Object}   res  Response Object
 * @param  {String}   host Virtual host
 * @param  {Function} next Function to execute after applying optional authenication wrapper
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.auth = function ( req, res, host, next ) {
	// No authentication
	if ( !this.config.auth || ( this.config.auth && !this.config.auth[host] ) ) {
		next();
	}
	// Basic
	else if ( this.config.auth && this.config.auth[host] ) {
		if ( !this.config.auth[host].auth ) {
			this.config.auth[host].auth = http_auth( this.config.auth[host] );
		}

		this.config.auth[host].auth.apply( req, res, next );
	}

	return this;
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
	PERM_REDIRECT       : 308,
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
 * @param  {Object}  req  HTTP(S) request Object
 * @param  {Object}  res  HTTP(S) response Object
 * @param  {Object}  body Response body
 * @param  {Object}  type gzip (gz) or deflate (df)
 * @param  {String}  etag Etag
 * @param  {Boolean} file Indicates `body` is a file path
 * @return {Objet}        TurtleIO instance
 */
TurtleIO.prototype.compress = function ( req, res, body, type, etag, file ) {
	var self    = this,
	    method  = REGEX_GZIP.test( type ) ? "createGzip" : "createDeflate",
	    sMethod = method.replace( "create", "" ).toLowerCase(),
	    fp      = this.config.tmp + "/" + etag + "." + type;

	fs.exists( fp, function ( exist ) {
		if ( exist ) {
			// Pipe compressed asset to Client
			fs.createReadStream( fp ).on( "error", function ( e ) {
				self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
				self.error( req, res, self.codes.SERVER_ERROR );
			} ).pipe( res );
		}
		else if ( !file ) {
			// Pipe Stream through compression to Client & disk
			if ( typeof body.pipe == "function" ) {
				body.pipe( zlib[method]() ).pipe( res );
				body.pipe( zlib[method]() ).pipe( fs.createWriteStream( fp ) );
			}
			// Raw response body, compress and send to Client & disk
			else {
				zlib[sMethod]( body, function ( e, data ) {
					if ( e ) {
						self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
						self.unregister( req.parsed.href );
						self.error( req, res, self.codes.SERVER_ERROR );
					}
					else {
						res.end( data );

						fs.writeFile( fp, data, "utf8", function ( e ) {
							if ( e ) {
								self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
								self.unregister( req.parsed.href );
							}
						} );
					}
				} );
			}
		}
		else {
			// Pipe compressed asset to Client
			fs.createReadStream( body ).on( "error", function ( e ) {
				self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
				self.unregister( req.parsed.href );
				self.error( req, res, self.codes.SERVER_ERROR );
			} ).pipe( zlib[method]() ).pipe( res );

			// Pipe compressed asset to disk
			fs.createReadStream( body ).on( "error", function ( e ) {
				self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
			} ).pipe( zlib[method]() ).pipe( fs.createWriteStream( fp ) );
		}
	} );

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
	    encodings = typeof encoding == "string" ? string.explode( encoding ) : [];

	// Safari can't handle compression for proxies (socket doesn't close) or on an iDevice for simple GETs
	if ( this.config.compress === true && REGEX_COMP.test( mimetype ) && !REGEX_IE.test( agent ) && !REGEX_IDEVICE.test( agent ) && ( !REGEX_SAFARI.test( agent ) || REGEX_CHROME.test( agent ) ) ) {
		// Iterating supported encodings
		array.each( encodings, function ( i ) {
			if ( REGEX_GZIP.test( i ) ) {
				result = "gz";
			}
			else if ( REGEX_DEF.test( i ) ) {
				result = "zz";
			}

			// Found a supported encoding
			if ( result !== null ) {
				return false;
			}
		} );
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
		this.set( res, name, "", "-1s", domain, secure, path );

		return name;
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
		var result = {},
		    jar    = req.headers.cookie || "";

		if ( !string.isEmpty( jar ) ) {
			array.each( string.explode( jar, ";" ), function ( i ) {
				var item = string.explode( i, "=" );

				result[item[0]] = coerce( item[1] );
			} );
		}

		return result;
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
		value      = ( value || "" ) + ";";
		offset     = offset || "";
		domain     = typeof domain == "string" ? ( " Domain=" + domain + ";" ) : "";
		secure     = ( secure === true ) ? " secure" : "";
		path       = typeof path == "string" ? ( " Path=" + path + ";" ) : "";
		var expire = "",
		    span   = null,
		    type   = null,
		    types  = ["d", "h", "m", "s"],
		    regex  = new RegExp(),
		    i      = types.length,
		    cookies;

		if ( !string.isEmpty( offset ) ) {
			while ( i-- ) {
				regex.compile( types[i] );

				if ( regex.test( offset ) ) {
					type = types[i];
					span = number.parse( offset, 10 );
					break;
				}
			}

			if ( isNaN( span ) ) {
				throw new Error( "Invalid Arguments" );
			}

			expire = new Date();

			if ( type === "d" ) {
				expire.setDate( expire.getDate() + span );
			}
			else if ( type === "h" ) {
				expire.setHours( expire.getHours() + span );
			}
			else if ( type === "m" ) {
				expire.setMinutes( expire.getMinutes() + span );
			}
			else if ( type === "s" ) {
				expire.setSeconds( expire.getSeconds() + span );
			}
		}

		if ( expire instanceof Date ) {
			expire = " Expires=" + expire.toUTCString() + ";";
		}

		cookies = res.getHeader( "set-sookie" ) || [];
		cookies.push( ( string.trim( name.toString() ) + "=" + value + expire + domain + path + secure ).replace( REGEX_ENDSMCN, "" ) );
		res.setHeader( "set-cookie", cookies );
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
	if ( arg instanceof Buffer || typeof arg.pipe == "function" ) {
		return arg;
	}
	// Converting to JSON
	else if ( arg instanceof Array || arg instanceof Object ) {
		return json.encode( arg );
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
 * @param  {Object} req    Request Object
 * @param  {Object} res    Response Object
 * @param  {Number} status [Optional] HTTP status code
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.error = function ( req, res, status ) {
	var method = req.method.toLowerCase(),
	    host   = req.parsed ? req.parsed.hostname : ALL,
	    kdx    = -1,
	    body, msg;

	if ( isNaN( status ) ) {
		status = this.codes.NOT_FOUND;

		// If valid, determine what kind of error to respond with
		if ( !REGEX_GET.test( method ) && !REGEX_HEAD.test( method ) ) {
			if ( this.allowed( method, req.url, host ) ) {
				status = this.codes.SERVER_ERROR;
			}
			else {
				status = this.codes.NOT_ALLOWED;
			}
		}
	}

	body = this.page( status, host );

	array.each( array.cast( this.codes ), function ( i, idx ) {
		if ( i === status ) {
			kdx = idx;
			return false;
		}
	} );

	msg = kdx ? array.cast( this.messages )[kdx] : "Unknown error";

	this.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + msg ), "debug" );

	return this.respond( req, res, body, status, {"cache-control": "no-cache", "content-length": Buffer.byteLength( body )} );
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
	return this.hash( array.cast( arguments ).join( "-" ) );
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
	    allow  = this.allows( req.parsed.pathname, req.parsed.hostname ),
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
			headers  = {allow: allow, "content-length": size, "content-type": mimetype, etag: etag, "last-modified": modified};

			if ( method === "GET" ) {
				// Decorating path for watcher
				req.path = path;

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
			this.unregister( this.url( req ) );

			fs.unlink( path, function ( e ) {
				if ( e ) {
					self.error( req, req, self.codes.SERVER_ERROR );
				}
				else {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.NO_CONTENT, {} );
				}
			} );
		}
		else if ( method === "PUT" && write ) {
			this.write( req, res, path );
		}
		else {
			this.error( req, req, this.codes.SERVER_ERROR );
		}
	}
	// Directory request
	else {
		if ( ( method === "POST" || method === "PUT" ) && write ) {
			this.write( req, res, path );
		}
		else if ( method === "DELETE" && del ) {
			this.unregister( req.parsed.href );

			fs.unlink( path, function ( e ) {
				if ( e ) {
					self.error( req, req, self.codes.SERVER_ERROR );
				}
				else {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.NO_CONTENT, {} );
				}
			} );
		}
		else {
			this.error( req, req, this.codes.NOT_ALLOWED );
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
	host = host || ALL;

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

	if ( typeof arg != "string" && !( arg instanceof Buffer ) ) {
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
	var headers;

	// Decorating response headers
	if ( status !== this.codes.NOT_MODIFIED && status >= this.codes.MULTIPLE_CHOICE && status < this.codes.BAD_REQUEST ) {
		headers = rHeaders;
	}
	else if ( rHeaders instanceof Object  ) {
		headers = clone( this.config.headers, true );
		merge( headers, rHeaders );

		// Fixing `Allow` header
		if ( headers.allow && !REGEX_HEAD2.test( headers.allow ) ) {
			headers.allow = string.explode( headers.allow.toUpperCase() ).filter( function ( i ) {
				return !REGEX_HEAD.test( i );
			} ).join( ", " ).replace( "GET", "GET, HEAD, OPTIONS" );
		}

		if ( !headers.date ) {
			headers.date = new Date().toUTCString();
		}

		if ( headers["access-control-allow-methods"] && string.isEmpty( headers["access-control-allow-methods"] ) && headers.allow ) {
			headers["access-control-allow-methods"] = headers.allow;
		}

		// Decorating "Expires" header
		if ( headers.expires === undefined && headers["cache-control"] && REGEX_NUMBER.test( headers["cache-control"] ) ) {
			headers.expires = new Date( new Date( new Date().getTime() + number.parse( REGEX_NUMBER.exec( headers["cache-control"] )[0], 10 ) * 1000 ) ).toUTCString();
		}

		// Decorating "Transfer-Encoding" header
		if ( !headers["transfer-encoding"] )  {
			headers["transfer-encoding"] = "identity";
		}

		// Removing headers not wanted in the response
		if ( !get || status >= this.codes.BAD_REQUEST ) {
			delete headers["cache-control"];
			delete headers.expires;
			delete headers["last-modified"];
		}
		else if ( status === this.codes.NOT_MODIFIED ) {
			delete headers["last-modified"];
		}

		if ( status === this.codes.NOT_FOUND && headers.allow ) {
			delete headers.allow;
			delete headers["access-control-allow-methods"];
		}

		if ( headers["last-modified"] !== undefined && string.isEmpty( headers["last-modified"] ) ) {
			delete headers["last-modified"];
		}
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
		this.vhostsRegExp.push( new RegExp( "^" + arg.replace( /\*/g, ".*" ) + "$" ) );
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
 * Log levels
 *
 * @type {Array}
 */
TurtleIO.prototype.levels = ["emerg", "alert", "crit", "error", "warn", "notice", "info", "debug"];

/**
 * Logs a message
 *
 * @method log
 * @param  {Mixed}  arg   Error Object or String
 * @param  {String} level [Optional] `level` must match a valid LogLevel - http://httpd.apache.org/docs/1.3/mod/core.html#loglevel, default is `notice`
 * @return {Object}       TurtleIO instance
 */
TurtleIO.prototype.log = function ( arg, level ) {
	var e = arg instanceof Error,
	    syslogMethod;

	level = level || "notice";

	if ( this.config.logs.stdout && this.levels.indexOf( level ) <= this.levels.indexOf( this.config.logs.level ) ) {
		if ( e ) {
			console.error( "[" + moment().format( this.config.logs.time ) + "] [" + level + "] " + ( arg.stack || arg.message || arg ) );
		}
		else {
			console.log( arg );
		}
	}

	if ( this.config.logs.syslog ) {
		if ( level === "error" ) {
			syslogMethod = "LOG_ERR";
		}
		else if ( level === "warn" ) {
			syslogMethod = "LOG_WARNING";
		}
		else {
			syslogMethod = "LOG_" + level.toUpperCase();
		}

		syslog.log( syslog[syslogMethod], arg.stack || arg.message || arg );
	}

	return this;
};

/**
 * HTTP (semantic) status messages
 *
 * @type {Object}
 */
TurtleIO.prototype.messages = {
	CONTINUE            : "Continue",
	SWITCH_PROTOCOL     : "Switching protocols",
	SUCCESS             : "Success",
	CREATED             : "Created",
	ACCEPTED            : "Accepted",
	NON_AUTHORITATIVE   : "Non-Authoritative Information",
	NO_CONTENT          : null,
	RESET_CONTENT       : "Reset Content",
	PARTIAL_CONTENT     : "Partial Content",
	MULTIPLE_CHOICE     : "Multiple Choices",
	MOVED               : "Moved Permanently",
	FOUND               : "Found",
	SEE_OTHER           : "See Other",
	NOT_MODIFIED        : "Not Modified",
	USE_PROXY           : "Use Proxy",
	REDIRECT            : "Temporary Redirect",
	PERM_REDIRECT       : "Permanent Redirect",
	BAD_REQUEST         : "Bad Request",
	UNAUTHORIZED        : "Unauthorized",
	FORBIDDEN           : "Forbidden",
	NOT_FOUND           : "Not Found",
	NOT_ALLOWED         : "Method Not Allowed",
	NOT_ACCEPTABLE      : "Not Acceptable",
	PROXY_AUTH          : "Proxy Authentication Required",
	REQUEST_TIMEOUT     : "Request Timeout",
	CONFLICT            : "Conflict",
	GONE                : "Gone",
	LENGTH_REQUIRED     : "Length Required",
	FAILED              : "Precondition Failed",
	REQ_TOO_LARGE       : "Request Entity Too Large",
	URI_TOO_LONG        : "Request-URI Too Long",
	UNSUPPORTED_MEDIA   : "Unsupported Media Type",
	NOT_SATISFIABLE     : "Requested Range Not Satisfiable",
	EXPECTATION_FAILED  : "Expectation Failed",
	SERVER_ERROR        : "Internal Server Error",
	NOT_IMPLEMENTED     : "Not Implemented",
	BAD_GATEWAY         : "Bad Gateway",
	SERVICE_UNAVAILABLE : "Service Unavailable",
	GATEWAY_TIMEOUT     : "Gateway Timeout",
	HTTP_NOT_SUPPORTED  : "HTTP Version Not Supported"
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
	host = host && this.pages[host] ? host : ALL;

	return this.pages[host][code] || this.pages[host]["500"] || this.pages.all["500"];
};

/**
 * Preparing log message
 *
 * @method prep
 * @param  {Object} req     HTTP(S) request Object
 * @param  {Object} res     HTTP(S) response Object
 * @param  {Object} headers HTTP(S) response headers
 * @return {String}         Log message
 */
TurtleIO.prototype.prep = function ( req, res, headers ) {
	var msg  = this.config.logs.format,
	    user = req.parsed ? ( req.parsed.auth.split( ":" )[0] || "-" ) : "-",
	    ip   = ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) || "-";

	msg = msg.replace( "%v",             req.headers.host )
	         .replace( "%h",             ip )
	         .replace( "%l",             "-" )
	         .replace( "%u",             user )
	         .replace( "%t",             ( "[" + moment().format( this.config.logs.time ) + "]" ) )
	         .replace( "%r",             req.method + " " + req.url + " HTTP/1.1" )
	         .replace( "%>s",            res.statusCode )
	         .replace( "%b",             headers["content-length"] || "-" )
	         .replace( "%{Referer}i",    req.headers.referer       || "-" )
	         .replace( "%{User-agent}i", req.headers["user-agent"] || "-" );

	return msg;
};

/**
 * Proxies a URL to a route
 *
 * @method proxy
 * @param  {String}  route  Route to proxy
 * @param  {String}  origin Host to proxy (e.g. http://hostname)
 * @param  {String}  host   [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} stream [Optional] Stream response to client (default is false)
 * @return {Object}         TurtleIO instance
 */
TurtleIO.prototype.proxy = function ( route, origin, host, stream ) {
	var self  = this,
	    verbs = ["delete", "get", "post", "put", "patch"];

	/**
	 * Response handler
	 *
	 * @method handle
	 * @private
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @param  {Mixed}  arg Proxy response
	 * @param  {Object} xhr XmlHttpRequest
	 * @return {Undefined}  undefined
	 */
	function handle ( req, res, arg, xhr ) {
		var etag          = "",
		    regex         = /("|')\/[^?\/]/g,
		    regex_quote   = /^("|')/,
		    regexOrigin   = new RegExp( origin, "g" ),
		    replace       = "$1" + route,
		    url           = req.parsed.href,
		    stale         = STALE,
		    get           = req.method === "GET",
		    rewriteOrigin = req.parsed.protocol + "//" + req.parsed.host + route,
		    resHeaders, rewrite;

		resHeaders        = headers( xhr.getAllResponseHeaders() );
		resHeaders.server = self.config.headers.server;

		// Something went wrong
		if ( xhr.status < self.codes.CONTINUE ) {
			self.error( req, res, self.codes.BAD_GATEWAY );
		}
		else if ( xhr.status >= self.codes.SERVER_ERROR ) {
			self.error( req, res, xhr.status );
		}
		else {
			if ( get && ( xhr.status === self.codes.SUCCESS || xhr.status === self.codes.NOT_MODIFIED ) && !REGEX_NOCACHE.test( resHeaders["cache-control"] ) && !REGEX_PRIVATE.test( resHeaders["cache-control"] ) ) {
				// Determining how long rep is valid
				if ( resHeaders["cache-control"] && REGEX_NUMBER.test( resHeaders["cache-control"] ) ) {
					stale = number.parse( REGEX_NUMBER.exec( resHeaders["cache-control"] )[0], 10 );
				}
				else if ( resHeaders.expires !== undefined ) {
					stale = new Date( resHeaders.expires );
					stale = number.diff( stale, new Date() );
				}

				// Removing from LRU when invalid
				if ( stale > 0 ) {
					delay( function () {
						self.unregister( url );
					}, stale, url );
				}
			}

			if ( xhr.status !== self.codes.NOT_MODIFIED ) {
				rewrite = REGEX_REWRITE.test( ( resHeaders["content-type"] || "" ).replace( REGEX_NVAL, "" ) );

				// Setting headers
				if ( get && xhr.status === self.codes.SUCCESS ) {
					etag = resHeaders.etag || "\"" + self.etag( url, resHeaders["content-length"] || 0, resHeaders["last-modified"] || 0, self.encode( arg ) ) + "\"";

					if ( resHeaders.etag !== etag ) {
						resHeaders.etag = etag;
					}
				}

				if ( resHeaders.allow === undefined || string.isEmpty( resHeaders.allow ) ) {
					resHeaders.allow = resHeaders["access-control-allow-methods"] || "GET";
				}

				// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
				if ( get && req.headers["if-none-match"] === etag ) {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.NOT_MODIFIED, resHeaders );
				}
				else {
					if ( REGEX_HEAD.test( req.method.toLowerCase() ) ) {
						arg = self.messages.NO_CONTENT;
					}
					// Fixing root path of response
					else if ( rewrite ) {
						if ( arg instanceof Array || arg instanceof Object ) {
							arg = json.encode( arg ).replace( regexOrigin, rewriteOrigin );

							if ( route !== "/" ) {
								arg = arg.replace( /"(\/[^?\/]\w+)\//g, "\"" + route + "$1/" );
							}

							arg = json.decode( arg );
						}
						else if ( typeof arg == "string" ) {
							arg = arg.replace( regexOrigin, rewriteOrigin );

							if ( route !== "/" ) {
								arg = arg.replace( regex, replace + ( arg.match( regex ) || [""] )[0].replace( regex_quote, "" ) );
							}
						}
					}

					self.respond( req, res, arg, xhr.status, resHeaders );
				}
			}
			else {
				self.respond( req, res, arg, xhr.status, resHeaders );
			}
		}
	}

	/**
	 * Capitalizes HTTP headers
	 *
	 * @method headers
	 * @private
	 * @param  {Object} args Response headers
	 * @return {Object}      Reshaped response headers
	 */
	function headers ( args ) {
		var result = {};

		if ( !string.isEmpty( args ) ) {
			array.each( string.trim( args ).split( "\n" ), function ( i ) {
				var header, value;

				value          = i.replace( REGEX_HEADVAL, "" );
				header         = i.replace( REGEX_HEADKEY, "" ).toLowerCase();
				result[header] = !isNaN( value ) ? Number( value ) : value;
			} );
		}

		return result;
	}

	/**
	 * Wraps the proxy request
	 *
	 * @method wrapper
	 * @private
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Undefined}  undefined
	 */
	function wrapper ( req, res ) {
		var url      = origin + ( route !== "/" ? req.url.replace( new RegExp( "^" + route ), "" ) : req.url ),
		    method   = req.method.toLowerCase(),
		    headerz  = clone( req.headers, true ),
		    parsed   = parse( url ),
		    mimetype = mime.lookup( parsed.pathname ),
		    fn, options, proxyReq;

		// Facade to handle()
		fn = function ( arg, xhr ) {
			handle( req, res, arg, xhr );
		};

		// Streaming formats that do not need to be rewritten
		if ( !stream && ( REGEX_EXT.test( parsed.pathname ) && !REGEX_JSON.test( mimetype ) ) && REGEX_STREAM.test( mimetype ) ) {
			stream = true;
		}

		// Stripping existing authorization header because it's not relevant for the remote system
		delete headerz.authorization;

		// Identifying proxy behavior
		headerz["x-host"]             = parsed.host;
		headerz["x-forwarded-for"]    = ( headerz["x-forwarded-for"] ? headerz["x-forwarded-for"] + ", " : "" ) + req.connection.remoteAddress;
		headerz["x-forwarded-proto"]  = parsed.protocol.replace( ":", "" );
		headerz["x-forwarded-server"] = self.config.headers.Server;

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

			if ( !string.isEmpty( parsed.auth ) ) {
				options.auth = parsed.auth;
			}

			proxyReq = http.request( options, function ( proxyRes ) {
				res.writeHeader(proxyRes.statusCode, proxyRes.headers);
				proxyRes.pipe( res );
			} );

			proxyReq.on( "error", function ( e ) {
				self.error( req, res, REGEX_REFUSED.test( e.message ) ? self.codes.SERVER_UNAVAILABLE : self.codes.SERVER_ERROR );
			} );

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
				request( url, method, fn, fn, req.body, headerz );
			}
			else if ( REGEX_DEL.test( method ) ) {
				request( url, "delete", fn, fn, null, headerz );
			}
			else if ( REGEX_HEAD.test( method ) ) {
				if ( method === "head" ) {
					method = "headers";
				}

				request( url, method, fn, fn );
			}
			else {
				request( url, "get", fn, fn, headerz );
			}
		}
	}

	stream = ( stream === true );

	// Setting route
	array.each( verbs, function ( i ) {
		if ( route === "/" ) {
			self[i]( "/.*", wrapper, host );
		}
		else {
			self[i]( route, wrapper, host );
			self[i]( route + "/.*", wrapper, host );
		}
	} );

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
 */
TurtleIO.prototype.redirect = function ( route, url, host, permanent ) {
	var code    = this.codes[permanent === true ? "MOVED" : "REDIRECT"],
	    pattern = new RegExp( "^" + route + "$" );

	this.get( route, function ( req, res ) {
		var rewrite = ( pattern.exec( req.url ) || [] ).length > 0;

		this.respond( req, res, this.messages.NO_CONTENT, code, {"Location": ( rewrite ? req.url.replace( pattern, url ) : url ), "Cache-Control": "no-cache"} );
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
			this.unregister( url );
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
	    method  = req.method,
	    handled = false,
	    found   = false,
	    count, path, nth, root;

	// If an expectation can't be met, don't try!
	if ( req.headers.expect ) {
		return this.error( req, res, this.codes.EXPECTATION_FAILED );
	}

	// Can't find the hostname in vhosts, try the default (if set) or send a 500
	if ( !host || !( host in this.config.vhosts ) ) {
		array.each( this.vhostsRegExp, function ( i, idx ) {
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
				this.error( req, res, self.codes.SERVER_ERROR );
			}
		}
	}

	// Preparing file path
	root = this.config.root + "/" + this.config.vhosts[host];
	path = ( root + req.parsed.pathname ).replace( REGEX_DIR, "" );

	// Determining if the request is valid
	fs.lstat( path, function ( e, stats ) {
		if ( e ) {
			self.error( req, res, self.codes.NOT_FOUND );
		}
		else if ( !stats.isDirectory() ) {
			self.handle( req, res, path, req.parsed.href, false, stats );
		}
		else if ( REGEX_GET.test( method ) && !REGEX_DIR.test( req.parsed.pathname ) ) {
			self.respond( req, res, self.messages.NO_CONTENT, self.codes.REDIRECT, {"Location": ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + req.parsed.search} );
		}
		else if ( !REGEX_GET.test( method ) ) {
			self.handle( req, res, path, req.parsed.href, true );
		}
		else {
			count = 0;
			nth   = self.config.index.length;
			path += "/";

			array.each( self.config.index, function ( i ) {
				fs.lstat( path + i, function ( e, stats ) {
					if ( !e && !handled ) {
						handled = true;
						self.handle( req, res, path + i, ( req.parsed.pathname != "/" ? req.parsed.pathname : "" ) + "/" + i + req.parsed.search, false, stats );
					}
					else if ( ++count === nth && !handled ) {
						self.error( req, res, self.codes.NOT_FOUND );
					}
				} );
			} );
		}
	} );

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
	var self     = this,
	    ua       = req.headers["user-agent"],
	    encoding = req.headers["accept-encoding"],
	    type;

	if ( body === null ) {
		body = undefined;
	}

	status  = status || this.codes.SUCCESS;
	headers = this.headers( headers || {"content-type": "text/plain"}, status, req.method === "GET" );
	file    = ( file === true );

	if ( !file && body ) {
		body = this.encode( body );

		// Ensuring JSON has proper mimetype
		if ( ( headers["content-type"] === undefined || string.isEmpty( headers["content-type"] ) ) && REGEX_JSONWRP.test( body ) ) {
			headers["content-type"] = "application/json";
		}

		if ( req.method === "GET" ) {
			// CSV hook
			if ( status === this.codes.SUCCESS && body && headers["content-type"] === "application/json" && req.headers.accept && REGEX_CSV.test( string.explode( req.headers.accept )[0].replace( REGEX_NVAL, "" ) ) ) {
				headers["content-type"] = "text/csv";

				if ( !headers["content-disposition"] ) {
					headers["content-disposition"] = "attachment; filename=\"" + req.parsed.pathname.replace( /.*\//g, "" ).replace(/\..*/, "_" ) + req.parsed.search.replace( "?", "" ).replace( /\&/, "_" ) + ".csv\"";
				}

				body = json.csv( body );
			}
		}
	}

	if ( status === this.codes.NOT_MODIFIED || status < this.codes.MULTIPLE_CHOICE || status >= this.codes.BAD_REQUEST ) {
		// req.parsed may not exist if coming from `error()`
		if ( req.parsed ) {
			if ( !headers.allow && status < 400 ) {
				headers["access-control-allow-methods"] = headers.allow = this.allows( req.parsed.pathname, req.parsed.hostname );
			}

			if ( req.method === "GET" && ( status === this.codes.SUCCESS || status === this.codes.NOT_MODIFIED ) ) {
				// Ensuring an Etag
				if ( !headers.etag ) {
					headers.etag = "\"" + this.etag( req.parsed.href, body.length || 0, headers["last-modified"] || 0, body || 0 ) + "\"";
				}

				// Updating cache
				if ( !REGEX_NOCACHE.test( headers["cache-control"] ) && !REGEX_PRIVATE.test( headers["cache-control"] ) ) {
					this.register( req.parsed.href, {etag: headers.etag.replace( /"/g, "" ), mimetype: headers["content-type"]}, true );
				}

				// Setting a watcher on the local path
				if ( req.path ) {
					this.watch( req.parsed.href, req.path, headers["content-type"] );
				}
			}
		}
		else {
			delete headers.allow;
			delete headers["access-control-allow-methods"];
		}
	}

	// Determining if response should be compressed
	if ( status === this.codes.SUCCESS && body && this.config.compress && ( type = this.compression( ua, encoding, headers["content-type"] ) ) && type !== null ) {
		headers["content-encoding"]  = REGEX_GZIP.test( type ) ? "gzip" : "deflate";
		headers["transfer-encoding"] = "chunked";
		res.writeHead( status, headers );
		this.compress( req, res, body, type, headers.etag.replace( /"/g, "" ), file );
	}
	else if ( file ) {
		headers["transfer-encoding"] = "chunked";
		res.writeHead( status, headers );
		fs.createReadStream( body ).on( "error", function ( e ) {
			self.log( new Error( "[client " + ( req.headers["x-forwarded-for"] ? array.last( string.explode( req.headers["x-forwarded-for"] ) ) : req.connection.remoteAddress ) + "] " + e.message ), "error" );
			self.error( req, res, self.codes.SERVER_ERROR );
		} ).pipe( res );
	}
	else {
		if ( headers["content-length"] === undefined ) {
			if ( body instanceof Buffer ) {
				headers["content-length"] = Buffer.byteLength( body.toString() );
			}
			else if ( typeof body == "string" ) {
				headers["content-length"] = Buffer.byteLength( body );
			}
		}

		if ( body === undefined ) {
			body = this.messages.NO_CONTENT;
		}

		res.writeHead( status, headers );
		res.end( body );
	}

	return this.log( this.prep( req, res, headers ), "info" );
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
	    method = req.method.toLowerCase(),
	    cached, handler, host, parsed, payload, route;

	/**
	 * Operation
	 *
	 * @method op
	 * @private
	 * @return {Undefined} undefined
	 */
	function op () {
		if ( handler ) {
			req.cookies = {};
			req.session = null;

			// Decorating valid cookies
			if ( req.headers.cookie !== undefined ) {
				array.each( string.explode( req.headers.cookie, ";" ).map( function ( i ) {
					return i.split( "=" );
				} ), function ( i ) {
					req.cookies[i[0]] = i[1];
				} );
			}

			// Decorates a session
			if ( req.cookies[self.config.session.id] ) {
				req.session = self.session.get( req, res );
			}

			// Setting listeners if expecting a body
			if ( REGEX_BODY.test( method ) ) {
				req.setEncoding( "utf-8" );

				req.on( "data", function ( data ) {
					payload = payload === undefined ? data : payload + data;
				} );

				req.on( "end", function () {
					req.body = payload;
					handler.call( self, req, res, host );
				} );
			}
			// Looking in LRU cache for Etag
			else if ( REGEX_GET.test( method ) ) {
				cached = self.etags.get( url );

				// Sending a 304 if Client is making a GET & has current representation
				if ( cached && !REGEX_HEAD.test( method ) && req.headers["if-none-match"] && req.headers["if-none-match"].replace( /\"/g, "" ) === cached.etag ) {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.NOT_MODIFIED, {"content-type": cached.mimetype, etag: "\"" + cached.etag + "\""} );
				}
				else {
					handler.call( self, req, res, host );
				}
			}
			else {
				handler.call( self, req, res, host );
			}
		}
		else {
			self.error( req, res );
		}
	}

	// If the URL can't be parsed, respond with a 500
	try {
		parsed = parse( url );
	}
	catch ( e ) {
		return this.error( req, res, this.codes.SERVER_ERROR );
	}

	// Decorating parsed Object on request
	req.parsed = parsed;

	// Finding a matching vhost
	array.each( this.vhostsRegExp, function ( i, idx ) {
		if ( i.test( parsed.hostname ) ) {
			return !( host = self.vhosts[idx] );
		}
	} );

	if ( !host ) {
		host = this.config["default"] || ALL;
	}

	if ( REGEX_HEAD.test( method ) ) {
		method = "get";
	}

	// Looking for a match
	array.each( this.handlers[method].regex, function ( i, idx ) {
		var x = self.handlers[method].routes[idx];

		if ( ( x in self.handlers[method].hosts[host] || x in self.handlers[method].hosts.all ) && i.test( parsed.pathname ) ) {
			route   = i;
			handler = self.handlers[method].hosts[host][x] || self.handlers[method].hosts.all[x];
			return false;
		}
	} );

	// Looking for a match against generic routes
	if ( !route ) {
		array.each( this.handlers.all.regex, function ( i, idx ) {
			var x = self.handlers.all.routes[idx];

			if ( ( x in self.handlers.all.hosts[host] || x in self.handlers.all.hosts.all ) && i.test( parsed.pathname ) ) {
				route   = i;
				handler = self.handlers.all.hosts[host][x] || self.handlers.all.hosts.all[x];
				return false;
			}
		} );
	}

	// Handling authentication
	this.auth( req, res, host, op );

	return this;
};

/**
 * Session factory
 *
 * @method Session
 * @constructor
 * @param {String} id     Session ID
 * @param {Object} server TurtleIO instance
 */
function Session ( id, server ) {
	this._id        = id;
	this._server    = server;
	this._timestamp = moment().unix();
}

// Setting constructor loop
Session.prototype.constructor = Session;

/**
 * Sessions
 *
 * @class sessions
 * @type {Object}
 */
TurtleIO.prototype.session = {
	/**
	 * Creates a session
	 *
	 * @method create
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     Session
	 */
	create : function ( req, res ) {
		var domain = req.parsed.hostname,
		    secure = ( req.parsed.protocol === "https:" ),
		    sid    = uuid( true ),
		    sesh;

		// Creating the session
		sesh = this.server.sessions[sid] = req.session = new Session( sid, this.server );
		this.server.cookie.set( res, this.server.config.session.id, sid, this.valid, domain, secure );

		// Updating the session id cookie in the request object in case of an override
		req.cookies[this.server.config.session.id] = sid;

		return sesh;
	},

	/**
	 * Destroys a session
	 *
	 * @method destroy
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     TurtleIO instance
	 */
	destroy : function ( req, res ) {
		var domain = req.parsed.hostname,
		    secure = ( req.parsed.protocol === "https:" ),
		    sid    = req.cookies[this.server.config.session.id];

		if ( sid ) {
			this.server.cookie.expire( res, this.server.config.session.id, domain, secure );
			delete this.server.sessions[sid];
		}

		return this.server;
	},

	/**
	 * Gets a session
	 *
	 * @method get
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Mixed}      Session or undefined
	 */
	get : function ( req, res ) {
		var sid  = req.cookies[this.server.config.session.id],
		    sesh = null;

		if ( sid !== undefined ) {
			sesh = this.server.sessions[sid] || null;

			if ( sesh !== null ) {
				if ( sesh._timestamp.diff( moment().unix() ) > 1 ) {
					this.save( req, res );
				}
			}
			else {
				this.destroy( req, res );
			}
		}

		return sesh;
	},

	/**
	 * Saves a session
	 *
	 * @method save
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     TurtleIO instance
	 */
	save : function ( req, res ) {
		var domain = req.parsed.hostname,
		    secure = ( req.parsed.protocol === "https:" ),
		    sid    = req.cookies[this.server.config.session.id];

		if ( sid ) {
			this.server.sessions[sid]._timestamp = moment().unix();
			this.server.cookie.set( res, this.server.config.session.id, sid, this.valid, domain, secure );
		}

		return this.server;
	},

	// Determines if a session has expired
	maxDiff : 0,

	// Set & unset from `start()` & `stop()`
	server : null,

	// `config.session.valid` for $.cookie{}
	valid : ""
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

	config = clone( defaultConfig );

	// Merging custom with default config
	merge( config, cfg || {} );

	// Overriding default error handler
	if ( typeof err == "function" ) {
		this.error = err;
	}

	// Setting configuration
	if ( !config.port ) {
		config.port = 8000;
	}

	this.config = config;
	pages       = this.config.pages ? ( this.config.root + this.config.pages ) : ( __dirname + "/../pages" );

	// Looking for required setting
	if ( !this.config["default"] ) {
		this.log( new Error( "[client 0.0.0.0] Invalid default virtual host" ), "error" );
		syslog.close();
		process.exit( 1 );
	}

	// Setting session.expires
	this.session.valid = this.config.session.valid;

	// Lowercasing default headers
	delete this.config.headers;
	this.config.headers = {};

	iterate( config.headers, function ( value, key ) {
		self.config.headers[key.toLowerCase()] = value;
	} );

	// Setting `Server` HTTP header
	if ( !this.config.headers.server ) {
		this.config.headers.server = "turtle.io/1.2.0";
		this.config.headers["x-powered-by"] = "node.js/" + process.versions.node.replace( /^v/, "" ) + " " + string.capitalize( process.platform ) + " V8/" + string.trim( process.versions.v8.toString() );
	}

	// Creating REGEX_REWRITE
	REGEX_REWRITE = new RegExp( "^(" + this.config.proxy.rewrite.join( "|" ) + ")$" );

	// Setting default routes
	this.host( ALL );

	// Registering virtual hosts
	array.each( array.cast( config.vhosts, true ), function ( i ) {
		self.host( i );
	} );

	// Setting a default GET route
	if ( !array.contains( this.handlers.get.routes, ".*" ) ) {
		this.get( "/.*", function ( req, res, host ) {
			this.request( req, res, host );
		}, ALL );
	}

	// Loading default error pages
	fs.readdir( pages, function ( e, files ) {
		if ( e ) {
			self.log( new Error( "[client 0.0.0.0] " + e.message ), "error" );
		}
		else if ( array.keys( self.config ).length > 0 ) {
			array.each( files, function ( i ) {
				self.pages.all[i.replace( REGEX_NEXT, "" )] = fs.readFileSync( pages + "/" + i, "utf8" );
			} );

			// Starting server
			if ( self.server === null ) {
				// For proxy behavior
				if ( https.globalAgent.maxSockets < self.config.proxy.maxConnections ) {
					https.globalAgent.maxConnections = self.config.proxy.maxConnections;
				}

				if ( http.globalAgent.maxSockets < self.config.proxy.maxConnections ) {
					http.globalAgent.maxConnections = self.config.proxy.maxConnections;
				}

				if ( self.config.ssl.cert !== null && self.config.ssl.key !== null ) {
					// Reading files
					self.config.ssl.cert = fs.readFileSync( self.config.ssl.cert );
					self.config.ssl.key  = fs.readFileSync( self.config.ssl.key );

					// Starting server
					self.server = https.createServer( merge( self.config.ssl, {port: self.config.port, host: self.config.address} ), function ( req, res ) {
						self.route( req, res );
					} ).listen( self.config.port, self.config.address );
				}
				else {
					self.server = http.createServer( function ( req, res ) {
						self.route( req, res );
					} ).listen( self.config.port, self.config.address );
				}
			}
			else {
				self.server.listen( self.config.port, self.config.address );
			}

			// Dropping process
			if ( self.config.uid && !isNaN( self.config.uid ) ) {
				process.setuid( self.config.uid );
			}

			self.log( "Started turtle.io on port " + self.config.port, "debug" );
		}
	} );

	// Something went wrong, server must restart
	process.on( "uncaughtException", function ( e ) {
		self.log( e, "error" );
		process.exit( 1 );
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
	    state  = {config: {}, etags: {}, process: {}, server: {}},
	    invalid = /^(auth|session|ssl)$/;

	// Startup parameters
	iterate( this.config, function ( v, k ) {
		if ( !invalid.test( k ) ) {
			state.config[k] = v;
		}
	} );

	// Process information
	state.process = {
		memory  : ram,
		pid     : process.pid
	};

	// Server information
	state.server = {
		address : this.server.address(),
		uptime  : uptime
	};

	// LRU cache
	state.etags = {
		items   : this.etags.length,
		bytes   : Buffer.byteLength( array.cast( this.etags.cache ).map( function ( i ){ return i.value; } ).join( "" ) )
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

	this.log( "Stopping turtle.io on port " + port, "debug" );

	this.config       = {};
	this.etags        = lru( 1000 );
	this.handlers     = {all: {regex: [], routes: [], hosts: {}}, "delete": {regex: [], routes: [], hosts: {}}, get: {regex: [], routes: [], hosts: {}}, patch: {regex: [], routes: [], hosts: {}}, post: {regex: [], routes: [], hosts: {}}, put: {regex: [], routes: [], hosts: {}}};
	this.pages        = {all: {}};
	this.sessions     = {};
	this.vhosts       = [];
	this.vhostsRegExp = [];
	this.watching     = {};

	if ( this.server !== null ) {
		this.server.close();
		this.server = null;
	}

	return this;
};

/**
 * Unregisters an Etag in the LRU cache and
 * removes stale representation from disk
 *
 * @method unregister
 * @param  {String} url URL requested
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.unregister = function ( url ) {
	var self   = this,
	    cached = this.etags.cache[url],
	    path   = this.config.tmp + "/",
	    gz, df;

	if ( cached ) {
		this.etags.remove( url );

		path += cached.value.etag;
		gz    = path + ".gz";
		df    = path + ".zz";

		fs.exists( gz, function ( exists ) {
			if ( exists ) {
				fs.unlink( gz, function ( e ) {
					if ( e ) {
						self.log( e );
					}
				} );
			}
		} );

		fs.exists( df, function ( exists ) {
			if ( exists ) {
				fs.unlink( df, function ( e ) {
					if ( e ) {
						self.log( e );
					}
				} );
			}
		} );
	}

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
	var header = req.headers.authorization || "",
	    auth   = "",
	    token;

	if ( !string.isEmpty( header ) ) {
		token = header.split( REGEX_SPACE ).pop()  || "",
		auth  = new Buffer( token, "base64" ).toString();

		if ( !string.isEmpty( auth ) ) {
			auth += "@";
		}
	}

	return "http" + ( this.config.ssl.cert ? "s" : "" ) + "://" + auth + req.headers.host + req.url;
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
	var self = this;

	function op () {
		fn.apply( self, arguments );
	}

	return this.handler( "delete", route, op, host );
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
	var self = this;

	function op () {
		fn.apply( self, arguments );
	}

	return this.handler( "get", route, op, host );
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
	var self = this;

	function op () {
		fn.apply( self, arguments );
	}

	return this.handler( "patch", route, op, host );
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
	var self = this;

	function op () {
		fn.apply( self, arguments );
	}

	return this.handler( "post", route, op, host );
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
	var self = this;

	function op () {
		fn.apply( self, arguments );
	}

	return this.handler( "put", route, op, host );
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
	    watcher;

	/**
	 * Cleans up caches
	 *
	 * @method cleanup
	 * @private
	 * @return {Undefined} undefined
	 */
	function cleanup () {
		watcher.close();
		self.unregister( url );
		delete self.watching[path];
	}

	if ( !( this.watching[path] ) ) {
		// Tracking
		this.watching[path] = 1;

		// Watching path for changes
		watcher = fs.watch( path, function ( ev ) {
			if ( REGEX_RENAME.test( ev ) ) {
				cleanup();
			}
			else {
				fs.lstat( path, function ( e, stat ) {
					if ( e ) {
						self.log( e );
						cleanup();
					}
					else if ( self.etags.cache[url] ) {
						self.register( url, {etag: self.etag( url, stat.size, stat.mtime ), mimetype: mimetype}, true );
					}
					else {
						cleanup();
					}
				} );
			}
		} );
	}

	return this;
};

/**
 * Writes files to disk
 *
 * @method write
 * @param  {Object} req  HTTP request Object
 * @param  {Object} res  HTTP response Object
 * @param  {String} path File path
 * @return {Object}      TurtleIO instance
 */
TurtleIO.prototype.write = function ( req, res, path ) {
	var self  = this,
	    put   = ( req.method === "PUT" ),
	    body  = req.body,
	    allow = this.allows( req.url ),
	    del   = this.allowed( "DELETE", req.url ),
	    status;

	if ( !put && REGEX_ENDSLSH.test( req.url ) ) {
		status = del ? this.codes.CONFLICT : this.codes.SERVER_ERROR;
		this.respond( req, res, this.page( status, this.hostname( req ) ), status, {allow: allow}, false );
	}
	else {
		allow = array.remove( string.explode( allow ), "POST" ).join( ", " );

		fs.lstat( path, function ( e, stat ) {
			if ( e ) {
				self.error( req, res, self.codes.NOT_FOUND );
			}
			else {
				var etag = "\"" + self.etag( req.parsed.href, stat.size, stat.mtime ) + "\"";

				if ( !req.headers.hasOwnProperty( "etag" ) || req.headers.etag === etag ) {
					fs.writeFile( path, body, function ( e ) {
						if ( e ) {
							self.error( req, req, self.codes.SERVER_ERROR );
						}
						else {
							status = put ? self.codes.NO_CONTENT : self.codes.CREATED;
							self.respond( req, res, self.page( status, self.hostname( req ) ), status, {allow: allow}, false );
						}
					} );
				}
				else if ( req.headers.etag !== etag ) {
					self.respond( req, res, self.messages.NO_CONTENT, self.codes.FAILED, {}, false );
				}
			}
		} );
	}

	return this;
};

module.exports = TurtleIO;
