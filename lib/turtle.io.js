/**
 * turtle.io
 *
 * Easy to use web server with virtual hosts & RESTful proxies
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2013 Jason Mulligan
 * @license BSD-3 <https://raw.github.com/avoidwork/turtle.io/master/LICENSE>
 * @link http://turtle.io
 * @version 0.9.0
 */
( function ( global ) {
"use strict";

var $           = require( "abaaso" ),
    cluster     = require( "cluster" ),
    crypto      = require( "crypto" ),
    fs          = require( "fs" ),
    http        = require( "http" ),
    http_auth   = require( "http-auth" ),
    mime        = require( "mime" ),
    moment      = require( "moment" ),
    syslog      = require( "node-syslog" ),
    toobusy     = require( "toobusy" ),
    url         = require( "url" ),
    zlib        = require( "zlib" ),
    d           = require( "dtrace-provider" ),
    dtp         = d.createDTraceProvider( "turtle-io" ),
    REGEX_BODY  = /^(put|post|patch)$/i,
    REGEX_CSV   = /text\/csv/,
    REGEX_HALT  = new RegExp( "^(ReferenceError|" + $.label.error.invalidArguments + ")$" ),
    REGEX_HEAD  = /^(head|options)$/i,
    REGEX_HEAD2 = /head|options/i,
    REGEX_GET   = /^(get|head|options)$/i,
    REGEX_DEL   = /^(del)$/i,
    REGEX_DEF   = /deflate/,
    REGEX_GZIP  = /gzip/,
    REGEX_IE    = /msie/i,
    REGEX_DIR   = /\/$/,
    REGEX_NVAL  = /;.*/,
    REGEX_NURI  = /.*\//,
    REGEX_PORT  = /:.*/,
    REGEX_SERVER= /^\_server/,
    MSG_ACK     = "acknowledge",
    MSG_ALL     = "announce",
    MSG_MASTER  = "master",
    MSG_READY   = "ready",
    MSG_START   = "start",
    MSG_QUE_ID  = "id_queue",
    MSG_QUE_NEW = "new_queue",
    MSG_QUE_DEL = "delete_queue",
    MSG_QUE_SET = "set_queue",
    MSG_SES_DEL = "delete_session",
    MSG_SES_SET = "set_session",
    TERM_SIG    = "SIGTERM",
    TERM_CODE   = 143,
    fn;

// Hooking syslog output
syslog.init( "turtle_io", syslog.LOG_PID | syslog.LOG_ODELAY, syslog.LOG_LOCAL0 );

// Disabling abaaso observer
$.discard( true );

/**
 * HTTP (semantic) status codes
 * 
 * @type {Object}
 */
var codes = {
	SUCCESS           : 200,
	CREATED           : 201,
	ACCEPTED          : 202,
	NO_CONTENT        : 204,
	MOVED             : 301,
	REDIRECT          : 302,
	NOT_MODIFIED      : 304,
	INVALID_ARGUMENTS : 400,
	INVALID_AUTH      : 401,
	FORBIDDEN         : 403,
	NOT_FOUND         : 404,
	NOT_ALLOWED       : 405,
	CONFLICT          : 409,
	FAILED            : 412,
	ERROR_APPLICATION : 500,
	ERROR_GATEWAY     : 502,
	ERROR_SERVICE     : 503
};

/**
 * Returns the difference of now from `timer`
 * 
 * @param  {Object} timer Date instance
 * @return {Number}       Milliseconds
 */
var diff = function (timer) {
	return new Date() - timer;
};

/**
 * Encodes `obj` as JSON if applicable
 * 
 * @param  {Mixed} obj Object to encode
 * @return {Mixed}     Original Object or JSON string
 */
var encode = function ( obj ) {
	var result;

	// Do not want to coerce this Object to a String!
	if ( obj instanceof Buffer ) {
		result = obj;
	}
	// Converting to JSON
	else if ( obj instanceof Array || obj instanceof Object ) {
		result = $.encode( obj );
	}
	// Nothing to do, leave it as it is
	else {
		result = obj;
	}

	return result;
};

/**
 * Default error handler
 * 
 * @method errorHandler
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} timer [Optional] Date instance
 * @return {undefined}    Undefined
 */
var errorHandler = function ( res, req, timer ) {
	timer      = timer || new Date();
	var self   = this,
	    body   = messages.NOT_FOUND,
	    status = codes.NOT_FOUND,
	    method = req.method.toLowerCase(),
	    host   = req.headers.host.replace( REGEX_PORT, "" );

	// If valid, determine what kind of error to respond with
	if ( !REGEX_GET.test( method ) && !REGEX_HEAD.test( method ) ) {
		if ( self.allowed( req.method, req.url, host ) ) {
			body   = messages.ERROR_APPLICATION;
			status = codes.ERROR_APPLICATION;
		}
		else {
			body   = messages.NOT_ALLOWED;
			status = codes.NOT_ALLOWED;
		}
	}

	this.respond( res, req, body, status, {"Cache-Control": "no-cache"}, timer, false );
};

/**
 * Exits application when unrecoverable error occurs
 * 
 * @return {Undefined} undefined
 */
var exit = function () {
	syslog.close();
	toobusy.shutdown();
	process.exit( 0 );
};

/**
 * turtle.io factory
 * 
 * @method factory
 * @return {Object} Instance
 */
var factory = function () {
	this.active       = false;
	this.bootstrapped = false;
	this.config       = require(__dirname + "/../config.json");
	this.requestQueue = {
		items    : [],
		last     : null,
		times    : [],
		registry : {}
	};
	this.logQueue     = [];
	this.server       = null;
	this.sessions     = {};
	this.version      = "0.9.0";
};

/**
 * Verifies a method is allowed on a URI
 * 
 * @method allowed
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @param  {String} host   Hostname
 * @return {Boolean}       Boolean indicating if method is allowed
 */
factory.prototype.allowed = function ( method, uri, host ) {
	host       = host || "all";
	var result = false,
	    timer  = new Date(),
	    routes = this.routes( method, host ).merge( this.routes( "all", host ) );

	if ( host !== undefined ) {
		routes.merge( this.routes( method, "all" ) ).merge( this.routes( "all", "all" ) );
	}

	routes.each( function ( i ) {
		if ( RegExp( "^" + i + "$" ).test( uri ) ) {
			return !( result = true );
		}
	});

	dtp.fire( "allowed", function ( p ) {
		return [host, uri, method.toUpperCase(), diff( timer )];
	});

	return result;
};

/**
 * Determines which verbs are allowed against a URL
 * 
 * @method allows
 * @param  {String} url  URL to query
 * @param  {String} host Hostname
 * @return {String}      Allowed methods
 */
factory.prototype.allows = function ( uri, host ) {
	var self   = this,
	    result = [],
	    verbs  = ["DELETE", "GET", "POST", "PUT", "PATCH"],
	    timer  = new Date();

	verbs.each( function ( i ) {
		if ( self.allowed( i, uri, host ) ) {
			result.push( i );
		}
	});

	result = result.join( ", " ).replace( "GET", "GET, HEAD, OPTIONS" );

	dtp.fire( "allows", function ( p ) {
		return [host, uri, diff( timer )];
	});

	return result;
};

/**
 * Bootstraps instance
 * 
 * @method bootstrap
 * @param  {Function} fn [Optional] Route error handler
 * @return {Object}      Instance
 */
factory.prototype.bootstrap = function ( fn ) {
	var self    = this,
	    params  = {},
	    expires = {
	    	interval : 0,
	    	sampling : ""
	    };

	if ( this.bootstrapped === false ) {
		// Preparing parameters
		params.port           = this.config.port;
		params.maxConnections = this.config.maxConnections;

		if ( this.config.csr !== undefined ) {
			params.csr = this.config.csr;
		}

		if ( this.config.key !== undefined ) {
			params.csr = this.config.key;
		}

		// Registering dtrace probes
		if (this.config.probes) {
			probes();
		}

		// Setting error route
		$.route.set( "error", function ( res, req, timer ) {
			fn( res, req, timer );
		});

		// Setting optional queue status route
		if ( this.config.queue.status ) {
			this.get( "/queue", function ( res, req, timer ) {
				this.respond( res, req, {next: "/queue/:item", items: $.array.cast( this.requestQueue.registry, true )}, 200, {"Cache-Control": "no-cache"}, timer, false );
			});

			this.get( "/queue/.*", function ( res, req, timer ) {
				var uuid = req.url.replace(/.*\/queue\/?/, "");

				if ( uuid.indexOf( "/" ) > -1 ) {
					self.error( res, req, timer );
				}
				else {
					self.queueStatus( res, req, uuid, timer );
				}
			});
		}

		// Setting default response route
		if ( !this.routes().get.contains( "/.*" ) ) {
			this.get( "/.*", this.request );
		}

		// Creating a server
		this.active = true;
		this.server = $.route.server( params, function ( e ) {
			self.log( e, true );
		});

		// Setting acceptable lag
		toobusy.maxLag( this.config.lag );

		// Socket probe
		this.server.on( "connection", function () {
			dtp.fire( "connection", function ( p ) {
				return [self.server.connections];
			});
		});

		// Flushing logs to disk on a timer
		fs.appendFile( "/var/log/" + this.config.logs.file, "", function ( e ) {
			if ( e ) {
				fs.exists( __dirname + "/../log/" + self.config.logs.file, function ( exists ) {
					var file = __dirname + "/../log/" + self.config.logs.file;

					if ( !exists ) {
						fs.writeFileSync( file, "" );
					}

					$.repeat( function () {
						self.flush( file );
					}, self.config.logs.flush, "logs");
				});
			}
			else {
				$.repeat( function () {
					self.flush( "/var/log/" + self.config.logs.file );
				}, self.config.logs.flush, "logs");
			}
		});

		// Setting internal reference
		this.session.server = this;

		// Setting session cookie expiration representation
		this.session.expires = this.config.session.valid.split( /\s/ ).map( function ( i, idx ) {
			return idx === 0 ? i : i.charAt( 0 );
		}).join( "" );

		// Calculating how long sessions are valid for
		this.config.session.valid.split( /\s/ ).map( function ( i, idx ) {
			if ( idx === 0 ) {
				expires.interval = parseInt( i, 10 );
			}
			else {
				expires.sampling = i;
			}
		});

		this.session.maxDiff = moment().utc().unix().diff( moment().utc().subtract( expires.sampling, expires.interval ).unix() );

		// Purging expired sessions
		$.repeat(function () {
			var now = moment().utc().unix();

			$.array.cast( self.sessions ).each( function ( i ) {
				if ( now.diff( i._timestamp ) >= self.session.maxDiff ) {
					i.expire();
				}
			});
		}, self.config.session.gc, "expiredSessions" );

		// Dropping process
		if ( this.config.uid !== null ) {
			process.setuid( this.config.uid );
		}
	}

	return this;
};

/**
 * Creates a compressed version of the Body of a Response
 * 
 * @method cache
 * @param  {String}   filename Filename of the new file (Etag without quotes)
 * @param  {String}   obj      Body or Path to file to compress
 * @param  {Function} encoding Compression encoding (deflate or gzip)
 * @param  {Boolean}  body     [Optional] Indicates obj is the Body of a Response (default is false)
 * @param  {Function} callback [Optional] Callback function
 * @return {Objet}             Instance
 */
factory.prototype.cache = function ( filename, obj, encoding, body, callback ) {
	body      = ( body === true );
	var self  = this,
	    ext   = REGEX_DEF.test(encoding) ? ".df" : ".gz",
	    dest  = this.config.tmp + "/" + filename + ext,
	    timer = new Date();

	fs.exists(dest, function ( exists ) {
		var raw, stream;

		// Local asset
		if ( !body ) {
			if ( exists ) {
				raw    = fs.createReadStream( obj ),
				stream = fs.createWriteStream( dest );

				raw.pipe( zlib[REGEX_DEF.test( encoding ) ? "createDeflate" : "createGzip"]() ).pipe( stream );

				dtp.fire( "compress", function ( p ) {
					return [filename, dest, encoding, diff( timer )];
				});
			}

			if ( typeof callback === "function" ) {
				callback();
			}
		}
		// Proxy or custom route response body
		else {
			if ( !exists ) {
				obj = encode( obj );

				zlib[encoding]( obj, function ( e, compressed ) {
					if ( e ) {
						self.log( e, true, false );
					}
					else {
						fs.writeFile( dest, compressed, "utf8", function ( e ) {
							if ( e ) {
								self.log( e, true, false );
							}
							else {
								dtp.fire( "compress", function ( p ) {
									return [filename, dest, encoding, diff( timer )];
								});

								if ( typeof callback === "function" ) {
									callback();
								}
							}
						});
					}
				});
			}
			else if ( typeof callback === "function" ) {
				callback();
			}
		}
	});

	return this;
};

/**
 * Verifies there's a cached version of the compressed file
 * 
 * @method cached
 * @param  {String}   filename Filename (etag)
 * @param  {String}   format   Type of compression (gzip or deflate)
 * @param  {Function} fn       Callback function
 * @return {Objet}             Instance
 */
factory.prototype.cached = function ( filename, format, fn ) {
	var ext  = REGEX_DEF.test( format ) ? ".df" : ".gz",
	    path = this.config.tmp + "/" + filename + ext;

	fs.exists( path, function ( exists ) {
		fn( exists, path );
	});

	return this;
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
factory.prototype.cipher = function ( arg, encode, salt ) {
	var cipher, crypted;

	try {
		encode   = ( encode !== false );
		salt     = salt || this.config.session.salt;
		cipher   = crypto[encode ? "createCipher" : "createDecipher"]( "aes-256-cbc", salt ),
		crypted  = encode ? cipher.update( arg, "utf8", "hex" ) : cipher.update( arg, "hex", "utf8" );
		crypted += cipher.final( encode ? "hex" : "utf8" );

		return crypted;
	}
	catch ( e ) {
		this.log( e );

		return undefined;
	}
};

/**
 * Pipes compressed asset to Client, or schedules the creation of the asset
 * 
 * @param  {Object}  res     HTTP(S) response Object
 * @param  {Object}  req     HTTP(S) request Object
 * @param  {String}  etag    Etag header
 * @param  {String}  arg     Response body
 * @param  {Number}  status  Response status code
 * @param  {Object}  headers HTTP headers
 * @param  {Boolean} local   [Optional] Indicates arg is a file path, default is false
 * @param  {Object}  timer   [Optional] Date instance
 * @return {Objet}           Instance
 */
factory.prototype.compressed = function ( res, req, etag, arg, status, headers, local, timer ) {
	local           = ( local === true );
	timer           = timer || new Date();
	var self        = this,
	    compression = this.compression( req.headers["user-agent"], req.headers["accept-encoding"] ),
	    raw, body;

	// Local asset, piping result directly to Client
	if ( local ) {
		this.headers( res, req, status, headers );

		if (compression !== null) {
			res.setHeader( "Content-Encoding", compression );

			this.cached( etag, compression, function ( ready, npath ) {
				dtp.fire( "compressed", function ( p ) {
					return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
				});

				// File is ready!
				if ( ready ) {
					raw = fs.createReadStream( npath );
					raw.pipe( res );
				}
				// File is not ready, cache it locally & pipe to the client while compressing (2x)
				else {
					self.cache( etag, arg, compression );
					raw = fs.createReadStream( arg );
					raw.pipe( zlib[REGEX_DEF.test( compression ) ? "createDeflate" : "createGzip"]() ).pipe( res );
				}

				dtp.fire( "respond", function ( p ) {
					return [req.headers.host, req.method, req.url, status, diff( timer )];
				});

				self.log( prep.call( self, res, req ) );
			});
		}
		else {
			raw = fs.createReadStream( arg );
			raw.pipe( res );

			dtp.fire( "compressed", function ( p ) {
				return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
			});
		}
	}
	// Custom or proxy route result
	else {
		if ( compression !== null ) {
			this.cached( etag, compression, function ( ready, npath ) {
				res.setHeader( "Content-Encoding" , compression );

				// Responding with cached asset
				if ( ready ) {
					dtp.fire( "compressed", function ( p ) {
						return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
					});

					self.headers( res, req, status, headers );

					raw = fs.createReadStream( npath );
					raw.pipe( res );

					self.log( prep.call( self, res, req ) );

					dtp.fire( "respond", function ( p ) {
						return [req.headers.host, req.method, req.url, status, diff( timer )];
					});
				}
				// Compressing asset & writing to disk after responding
				else {
					body = encode( arg );

					zlib[compression]( body, function ( e, compressed ) {
						dtp.fire( "compressed", function ( p ) {
							return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
						});

						if ( e ) {
							self.error( res, req, e, timer );
						}
						else {
							self.respond( res, req, compressed, status, headers, timer, false );

							fs.writeFile( npath, compressed, function ( e ) {
								if ( e ) {
									self.log( e, true, false );
								}
								else {
									dtp.fire( "compress", function ( p ) {
										return [etag, npath, compression, diff( timer )];
									});
								}
							});
						}
					});
				}
			});
		}
		else {
			dtp.fire( "compressed", function ( p ) {
				return [etag, local ? "local" : "custom", req.headers.host, req.url, diff( timer )];
			});

			this.respond( res, req, arg, status, headers, timer, false );
		}
	}

	return this;
};


/**
 * Determines what/if compression is supported for a request
 * 
 * @method compression
 * @param  {String} agent    User-Agent header value
 * @param  {String} encoding Accept-Encoding header value
 * @return {Mixed}           Supported compression or null
 */
factory.prototype.compression = function ( agent, encoding ) {
	var result    = null,
	    encodings = typeof encoding === "string" ? encoding.explode() : [];

	if ( this.config.compress === true && !REGEX_IE.test( agent ) ) {
		// Iterating supported encodings
		encodings.each( function ( i ) {
			switch ( true ) {
				case REGEX_GZIP.test( i ):
					result = "gzip";
					break;
				case REGEX_DEF.test( i ):
					result = "deflate";
					break;
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
factory.prototype.cookie = {
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
 * Error handler for requests
 * 
 * @method error
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.error = function ( res, req, e, timer ) {
	e     = e.message || e;
	timer = timer     || new Date();

	$.route.load( "error", res, req );

	dtp.fire( "error", function ( p ) {
		return [req.headers.host, req.url, codes.ERROR_APPLICATION, e || messages.ERROR_APPLICATION, diff( timer )];
	});
};

/**
 * Flushes log queue
 * 
 * @param {String} file File path
 * @return {Object}     Instance
 */
factory.prototype.flush = function ( file ) {
	var msg = this.logQueue.join( "\n" );

	// Writing to file
	if ( !msg.isEmpty() ) {
		// Clearing queue
		this.logQueue = [];

		// Batch append to log file to avoid `Error: EMFILE errno:20`
		fs.appendFile( file, msg + "\n", function ( e ) {
			if ( e ) {
				console.log( "Couldn't write to log file" );
			}
		});
	}
};

/**
 * Creates a hash of arg
 * 
 * @param  {Mixed}  arg     String or Buffer
 * @param  {String} encrypt [Optional] Type of encryption
 * @param  {String} digest  [Optional] Type of digest
 * @return {String}         Hash of arg
 */
factory.prototype.hash = function ( arg, encrypt, digest ) {
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
 * @param  {Object}  res             HTTP(S) response Object
 * @param  {Object}  req             HTTP(S) request Object
 * @param  {Number}  status          [Optional] Response status code
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @return {Objet}                   Instance
 */
factory.prototype.headers = function ( res, req, status, responseHeaders ) {
	status      = status || codes.SUCCESS;
	var get     = REGEX_GET.test( req.method ),
	    headers = $.clone( this.config.headers );

	if ( !( responseHeaders instanceof Object ) ) {
		responseHeaders = {};
	}

	// Decorating response headers
	$.merge( headers, responseHeaders );

	// Fixing `Allow` header
	if ( !REGEX_HEAD2.test( headers.Allow ) ) {
		headers.Allow = headers.Allow.toUpperCase()
		                             .split( /,|\s+/ )
		                             .filter( function ( i ) {
		                             	return ( !i.isEmpty() && i !== "HEAD" && i !== "OPTIONS" );
		                              })
		                             .join( ", " )
		                             .replace( "GET", "GET, HEAD, OPTIONS" );
	}

	headers["Date"] = new Date().toUTCString();

	if ( headers["Access-Control-Allow-Methods"].isEmpty() ) {
		headers["Access-Control-Allow-Methods"] = headers.Allow;
	}

	// Decorating "Last-Modified" header
	if ( headers["Last-Modified"].isEmpty() ) {
		headers["Last-Modified"] = headers["Date"];
	}

	// Setting the response status code
	res.statusCode = status;

	// Removing headers not wanted in the response
	if ( !get || status >= codes.INVALID_ARGUMENTS ) {
		delete headers["Cache-Control"];
	}

	switch ( true ) {
		case status >= codes.FORBIDDEN && status <= codes.NOT_FOUND:
		case status >= codes.ERROR_APPLICATION:
			delete headers.Allow;
			delete headers["Access-Control-Allow-Methods"];
			delete headers["Last-Modified"];
			break;
	}

	// Decorating response with headers
	$.iterate( headers, function ( v, k ) {
		res.setHeader( k, v );
	});

	return this;
};

/**
 * Logs a message
 * 
 * @param  {Mixed} msg Error Object or String
 * @return {Object}    Instance
 */
factory.prototype.log = function ( msg ) {
	var err = msg.callstack !== undefined;

	// Determining what to log
	msg = msg.callstack || msg;

	// Dispatching to syslog server
	syslog.log( syslog[!err ? "LOG_INFO" : "LOG_ERR"], msg );

	// Unrecoverable error, restarting process
	if ( REGEX_HALT.test( msg ) ) {
		exit();
	}
	// Adding message to log queue
	else {
		this.logQueue.push( msg );
	}

	// Dispatching to STDOUT
	if ( this.config.logs.stdout ) {
		console.log( msg );
	}

	return this;
};

/**
 * Moves items out of queue
 *
 * @method mode
 * @param  {Boolean} start `true` to start, `false` to stop
 * @return {Object}         Instance
 */
factory.prototype.mode = function ( start ) {
	var id    = "queue",
	    self  = this,
	    limit = this.config.queue.size,
	    fn    = ( self.config.queue.handler instanceof Function );

	$.repeat( function () {
		var processed = [],
		    now       = moment().utc().unix(),
		    items, nth;

		// Resetting queue time tracking every 1000 items
		if ( self.requestQueue.times.length >= 1000 ) {
			self.requestQueue.times = [];
		}

		// Batch processing the queue
		if ( self.requestQueue.items.length > 0 ) {
			items = self.requestQueue.items.limit( 0, limit );
			nth   = items.length - 1;

			items.each( function ( i ) {
				if ( fn ) {
					try {
						self.config.queue.handler.call( self, i.data );
					}
					catch ( e ) {
						self.log( e );
					}
				}

				self.requestQueue.last = i.uuid;
				self.requestQueue.times.push( now - i.timestamp );
				delete self.requestQueue.registry[i.uuid];

				processed.push( i.uuid );
			});

			// Removing processed items
			self.requestQueue.items.remove( 0, nth );

			// Announcing which items where processed
			self.sendMessage( MSG_QUE_DEL, processed, true );
		}
	}, this.config.queue.time, id );
};

/**
 * Proxies a (root) URL to a route
 * 
 * @param  {String}  origin Host to proxy (e.g. http://hostname)
 * @param  {String}  route  Route to proxy
 * @param  {String}  host   [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} stream [Optional] Stream response to client (default is false)
 * @return {Object}         Instance
 */
factory.prototype.proxy = function ( origin, route, host, stream ) {
	stream    = ( stream === true );
	var self  = this,
	    verbs = ["delete", "get", "post", "put", "patch"],
	    timer = new Date(),
	    handle, headers, wrapper;

	/**
	 * Response handler
	 * 
	 * @param  {Mixed}  arg   Proxy response
	 * @param  {Object} xhr   XmlHttpRequest
	 * @param  {Object} res   HTTP(S) response Object
	 * @param  {Object} req   HTTP(S) request Object
	 * @param  {Object} timer [Optional] Date instance
	 * @return {Undefined}    undefined
	 */
	handle = function ( arg, xhr, res, req, timer ) {
		var resHeaders = {},
		    etag       = "",
		    regex      = /("|')\//g,
		    replace    = "$1" + route + "/",
		    date, nth, raw;

		try {
			// Getting or creating an Etag
			resHeaders = headers( xhr.getAllResponseHeaders() );
			date       = ( resHeaders["Last-Modified"] || resHeaders["Date"] ) || undefined;

			if ( isNaN( new Date( date ).getFullYear() ) ) {
				date = new Date();
			}
			else {
				date = new Date( date );
			}

			etag = resHeaders.Etag || "\"" + self.hash( req.url + "-" + req.method + "-" + resHeaders["Content-Length"] + "-" + date.getTime() ) + "\"";

			// Setting headers
			if ( resHeaders.Etag !== etag ) {
				resHeaders.Etag = etag;
			}

			if ( resHeaders.Allow === undefined || resHeaders.Allow.isEmpty() ) {
				resHeaders.Allow = resHeaders["Access-Control-Allow-Methods"] || "GET";
			}

			// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
			switch ( true ) {
				case req.headers["if-none-match"] === etag:
					self.respond( res, req, messages.NO_CONTENT, codes.NOT_MODIFIED, resHeaders, timer, false );
					break;
				default:
					resHeaders["Transfer-Encoding"] = "chunked";
					etag = etag.replace( /\"/g, "" );

					// Fixing root path of response
					switch (true) {
						case REGEX_HEAD.test( req.method.toLowerCase() ):
							arg = messages.NO_CONTENT;
							break;
						case arg instanceof Array:
						case arg instanceof Object:
							arg = $.decode( $.encode( arg ).replace( regex, replace ) );
							break;
						case typeof arg === "string":
							arg = arg.replace( regex, replace );
							break;
					}

					// Sending compressed version to Client if supported
					if ( req.headers["accept-encoding"] !== undefined ) {
						self.compressed( res, req, etag, arg, xhr.status, resHeaders, false, timer );
					}
					else {
						self.respond( res, req, arg, xhr.status, resHeaders, timer, false );
					}
			}
		}
		catch (e) {
			self.respond( res, req, messages.NO_CONTENT, codes.ERROR_GATEWAY, {Allow: "GET"}, timer, false );
			self.log( e, true );
		}
	};

	/**
	 * Capitalizes HTTP headers
	 * 
	 * @param  {Object} args Response headers
	 * @return {Object}      Reshaped response headers
	 */
	headers = function ( args ) {
		var result  = {},
		    rvalue  = /.*:\s+/,
		    rheader = /:.*/;

		args.trim().split( "\n" ).each( function ( i ) {
			var header, value;

			value          = i.replace( rvalue, "" );
			header         = i.replace( rheader, "" );
			header         = header.unhyphenate( true ).replace( /\s+/g, "-" );
			result[header] = value;
		});

		return result;
	};

	/**
	 * Wraps the proxy request
	 * 
	 * @param  {Object} res   HTTP(S) response Object
	 * @param  {Object} req   HTTP(S) request Object
	 * @param  {Object} timer [Optional] Date instance
	 * @return {Undefined}    undefined
	 */
	wrapper = function ( res, req, timer ) {
		var url     = origin + req.url.replace( new RegExp( "^" + route ), "" ),
		    method  = req.method.toLowerCase(),
		    headerz = $.clone( req.headers ),
		    parsed  = $.parse( url ),
		    fn, options, proxyReq;

		// Facade to handle()
		fn = function ( arg, xhr ) {
			handle( arg, xhr, res, req, timer );
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

			dtp.fire( "proxy", function ( p ) {
				return [req.headers.host, req.method, route, origin, diff( timer )];
			});
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

		dtp.fire( "proxy-set", function ( p ) {
			return [host || "*", i.toUpperCase(), origin, route, diff( timer )];
		});
	});

	return this;
};

/**
 * Queues a request for processing
 * 
 * @method queue
 * @param  {Object} res     HTTP(S) response Object
 * @param  {Object} req     HTTP(S) request Object
 * @param  {Mixed}  arg     Argument to pass to queue
 * @param  {String} id      [Optional] Queue item ID
 * @param  {Object} headers [Optional] HTTP headers to decorate the response with
 * @param  {Object} timer   [Optional] Date instance
 * @return {Object}         Instance
 */
factory.prototype.queue = function ( res, req, arg, id, headers, timer ) {
	var uuid   = id || $.uuid( true ),
	    parsed = $.parse( this.url( req ) ),
	    epoch  = moment().utc().unix(),
	    body, total;

	this.requestQueue.registry[uuid] = epoch;
	this.sendMessage( MSG_QUE_NEW, {uuid: uuid, data: arg, timestamp: epoch}, false );

	total = $.array.cast( this.requestQueue.registry ).length - 1;
	body  = {processing: total < this.config.queue.size ? "now" : moment().fromNow( ( total / this.config.queue.size * this.config.queue.time ), " seconds" )};

	if ( this.config.queue.status ) {
		body.status = parsed.protocol + "//" + req.headers.host + "/queue/" + uuid;
	}

	this.respond( res, req, body, codes.ACCEPTED, headers, timer, false );

	return this;
};

/**
 * Checks queued request status
 * 
 * @method queueStatus
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} req   HTTP(S) request Object
 * @param  {String} uuid  Queue item UUID
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.queueStatus = function ( res, req, uuid, timer ) {
	var body, items, position, timestamp;

	if ( this.requestQueue.registry[uuid] === undefined ) {
		this.respond( res, req, messages.NOT_FOUND, 404, {"Cache-Control": "no-cache"}, timer, false );	
	}
	else {
		items     = $.array.keys( this.requestQueue.registry, true );
		position  = items.index( uuid );
		timestamp = this.requestQueue.registry[uuid];
		body      = {
			position  : position,
			total     : items.length,
			estimate  : Math.ceil( this.requestQueue.times.mean() ) + " seconds",
			timestamp : timestamp
		}

		this.respond( res, req, body, 200, {"Cache-Control": "no-cache"}, timer, false );
	}
};

/**
 * Starts worker
 * 
 * @method ready
 * @param  {Object} arg Message argument from Master
 * @return {Object}     Instance
 */
factory.prototype.ready = function ( arg ) {
	var self = this;

	// Setting reference to queue worker
	this.config.queue.id = arg;

	// Starting queue worker
	if ( cluster.worker.id === this.config.queue.id ) {
		this.mode( true );
	}
	// Starting http worker
	else {
		// Setting error handler
		if ( typeof this.config.errorHandler !== "function" ) {
			this.config.errorHandler = function ( res, req, timer ) {
				errorHandler.call( self, res, req, timer );
			};
		}

		// Bootstrapping instance
		this.bootstrap.call( this, this.config.errorHandler );
	}

	return this;
};

/**
 * Cluster command processing
 * 
 * @method sendMessage
 * @param  {Object} arg Message passed
 * @return {Object}     Instance
 */
factory.prototype.receiveMessage = function ( msg ) {
	var self = this;

	// Processing message
	switch ( msg.cmd ) {
		case MSG_ACK:
			$.clearTimer( msg.id );
			break;

		case MSG_QUE_ID:
			this.config.queue.id = msg.arg;
			break;

		case MSG_QUE_NEW:
			this.requestQueue.registry[msg.arg.uuid] = this.requestQueue.items.length;
			this.requestQueue.items.push( {uuid: msg.arg.uuid, data: msg.arg.data, timestamp: msg.arg.timestamp} );
			this.sendMessage( MSG_QUE_SET, {uuid: msg.arg.uuid, timestamp: msg.arg.timestamp}, true );
			break;

		case MSG_QUE_SET:
			this.requestQueue.registry[msg.arg.uuid] = msg.arg.timestamp;
			break;

		case MSG_QUE_DEL:
			self.requestQueue.last = msg.arg.last();
			msg.arg.each( function ( i ) {
				delete self.requestQueue.registry[i];
			});
			break;

		case MSG_SES_DEL:
			delete this.sessions[msg.arg];
			break;

		case MSG_SES_SET:
			this.session.set( msg.arg );
			break;

		case MSG_START:
			this.ready( msg.arg );
			break;
	}

	// Acknowledging message
	if ( msg.ack ) {
		process.send( {ack: false, cmd: MSG_ACK, arg: null, id: msg.id, worker: msg.worker} );
	}
};

/**
 * Redirects GETs for a route to another URL
 * 
 * @param  {String}  route     Route to redirect
 * @param  {String}  url       URL to redirect the Client to
 * @param  {String}  host      [Optional] Hostname this route is for (default is all)
 * @param  {Boolean} permanent [Optional] `true` will indicate the redirection is permanent
 * @return {Object}            instance
 */
factory.prototype.redirect = function ( route, url, host, permanent ) {
	var self  = this,
	    code  = codes[permanent === true ? "MOVED" : "REDIRECT"],
	    timer = new Date();

	this.get( route, function ( res, req, timer ) {
		self.respond( res, req, messages.NO_CONTENT, code, {"Location": url}, timer, false );
	}, host);

	dtp.fire( "redirect-set", function ( p ) {
		return [host || "*", route, url, permanent, diff( timer )];
	});

	return this;
};

/**
 * Request handler which provides RESTful CRUD operations
 * 
 * Default route is for GET only
 * 
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.request = function ( res, req, timer ) {
	var self    = this,
	    host    = req.headers.host.replace( /:.*/, "" ),
	    parsed  = $.parse( this.url( req ) ),
	    method  = REGEX_GET.test( req.method ) ? "get" : req.method.toLowerCase(),
	    path    = [],
	    handled = false,
	    port    = this.config.port,
	    path    = "",
	    found   = false,
	    count, handle, nth, root;

	// Most likely this request will fail due to latency, so handle it as a 503 and 'retry after a minute'
	if ( toobusy() ) {
		dtp.fire( "busy", function ( p ) {
			return [req.headers.host, req.method, req.url, self.server.connections, diff( timer )];
		});

		return this.respond( res, req, messages.ERROR_SERVICE, codes.ERROR_SERVICE, {"Retry-After": 60}, timer, false );
	}

	// Can't find the hostname in vhosts, try the default (if set) or send a 500
	if ( !this.config.vhosts.hasOwnProperty( host ) ) {
		$.array.cast( this.config.vhosts, true ).each(function ( i ) {
			var regex = new RegExp( i.replace(/^\*/, ".*" ) );

			if ( regex.test( host ) ) {
				found = true;
				host  = i;
				return false;
			}
		});

		if ( !found ) {
			if ( this.config.default !== null ) {
				host = this.config.default;
			}
			else {
				throw Error( messages.ERROR_APPLICATION );
			}
		}
	}

	root = this.config.root + "/" + this.config.vhosts[host];

	if (!parsed.hasOwnProperty( "host") ) {
		parsed.host = req.headers.host;
	}

	if (!parsed.hasOwnProperty( "protocol") ) {
		parsed.protocol = "http:";
	}

	// Handles the request after determining the path
	handle = function ( path, url, timer ) {
		var allow, del, post, mimetype, status;

		allow   = self.allows( req.url, host );
		del     = self.allowed( "DELETE", req.url, host );
		post    = self.allowed( "POST", req.url, host );
		handled = true;
		url     = parsed.href;

		dtp.fire( "request", function ( p ) {
			return [url, allow, diff( timer )];
		});

		fs.exists( path, function ( exists ) {
			switch ( true ) {
				case !exists && method === "post":
					if ( self.allowed( req.method, req.url, host ) ) {
						self.write( path, res, req, timer );
					}
					else {
						status = codes.NOT_ALLOWED;
						self.respond( res, req, messages.NOT_ALLOWED, status, {Allow: allow}, timer, false );
					}
					break;
				case !exists:
					self.respond( res, req, messages.NOT_FOUND, codes.NOT_FOUND, ( post ? {Allow: "POST"} : {} ), timer, false );
					break;
				case !self.allowed( method.toUpperCase(), req.url, host ):
					self.respond( res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED, {Allow: allow}, timer, false );
					break;
				default:
					if ( !/\/$/.test( req.url ) ) {
						allow = allow.explode().remove( "POST" ).join( ", " );
					}

					switch ( method ) {
						case "delete":
							fs.unlink( path, function ( e ) {
								if ( e ) {
									self.error( req, req, e, timer );
								}
								else {
									self.respond( res, req, messages.NO_CONTENT, codes.NO_CONTENT, {}, timer, false );
								}
							});
							break;
						case "get":
						case "head":
						case "options":
							mimetype = mime.lookup( path );
							fs.stat( path, function ( e, stat ) {
								var size, modified, etag, raw, headers;

								if ( e ) {
									self.error( res, req, e );
								}
								else {
									size     = stat.size;
									modified = stat.mtime.toUTCString();
									etag     = "\"" + self.hash( req.url + "-" + stat.size + "-" + stat.mtime ) + "\"";
									headers  = {Allow: allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified};

									if ( req.method === "GET" ) {
										switch ( true ) {
											case Date.parse( req.headers["if-modified-since"] ) >= stat.mtime:
											case req.headers["if-none-match"] === etag:
												self.respond( res, req, messages.NO_CONTENT, codes.NOT_MODIFIED, headers, timer, false );
												break;
											default:
												headers["Transfer-Encoding"] = "chunked";
												etag = etag.replace( /\"/g, "" );
												self.compressed( res, req, etag, path, codes.SUCCESS, headers, true, timer );
										}
									}
									else {
										self.respond( res, req, messages.NO_CONTENT, codes.SUCCESS, headers, timer, false );
									}
								}
							});
							break;
						case "put":
							self.write( path, res, req, timer );
							break;
						default:
							self.error( req, req, e, timer );
					}
			}
		});
	};

	// Determining if the request is valid
	fs.stat( root + parsed.pathname, function ( e, stats ) {
		if ( e ) {
			self.error( res, req, e );
		}
		else {
			if ( !stats.isDirectory() ) {
				handle( root + parsed.pathname, parsed.pathname );
			}
			else {
				// Adding a trailing slash for relative paths; redirect is not cached
				if ( stats.isDirectory() && !REGEX_DIR.test( parsed.pathname ) ) {
					self.respond( res, req, messages.NO_CONTENT, codes.MOVED, {"Location": parsed.pathname + "/"}, timer, false );
				}
				else {
					nth   = self.config.index.length;
					count = 0;

					self.config.index.each( function ( i ) {
						fs.exists( root + parsed.pathname + i, function ( exists ) {
							if ( exists && !handled ) {
								handle( root + parsed.pathname + i, parsed.pathname + i, timer );
							}
							else if ( !exists && ++count === nth ) {
								self.error( res, req, messages.NOT_FOUND );
							}
						});
					});
				}
			}
		}
	});

	return this;
};

/**
 * Constructs a response
 * 
 * @method respond
 * @param  {Object}  res      HTTP(S) response Object
 * @param  {Object}  req      HTTP(S) request Object
 * @param  {Mixed}   output   [Optional] Response body
 * @param  {Number}  status   [Optional] HTTP status code, default is 200
 * @param  {Object}  headers  [Optional] HTTP headers to decorate the response with
 * @param  {Object}  timer    [Optional] Date instance
 * @param  {Boolean} compress [Optional] Enable compression of the response (if supported)
 * @return {Objet}            Instance
 */
factory.prototype.respond = function ( res, req, output, status, headers, timer, compress ) {
	status       = status || codes.SUCCESS;
	timer        = timer  || new Date(); // Not ideal! This gives a false sense of speed for custom routes
	compress     = ( compress === true );
	var body     = !REGEX_HEAD.test( req.method ) && output !== null,
	    encoding = this.compression( req.headers["user-agent"], req.headers["accept-encoding"] ),
	    self     = this,
	    nth, salt;

	if ( !( headers instanceof Object ) ) {
		headers = {};
	}

	// Determining wether compression is supported
	compress = compress && body && encoding !== null;

	// Stringifying Array or Object
	output = encode( output );

	// Decorating the proper header for a JSON response
	if ( typeof output === "string" && $.regex.json_wrap.test( output ) ) {
		headers["Content-Type"] = "application/json";
	}

	if ( status === 200 ) {
		// CSV hook
		if ( body && headers["Content-Type"] === "application/json" && req.headers["accept"] !== undefined && REGEX_CSV.test( req.headers["accept"].explode()[0].replace( REGEX_NVAL, "" ) ) ) {
			headers["Content-Type"] = "text/csv";

			if ( headers["Content-Disposition"] === undefined ) {
				headers["Content-Disposition"] = "attachment; filename=\"" + req.url.replace( REGEX_NURI, "" ) + ".csv\"";
			}

			output = $.json.csv( output );
		}

		// Setting Etag if not present
		if ( headers.Etag === undefined ) {
			salt = req.url + "-" + req.method + "-" + $.encode( req.headers ) + "-" + ( output !== null && typeof output.length !== "undefined" ? output.length : null ) + "-" + output;
			headers.Etag = "\"" + self.hash( salt ) + "\"";
		}
	}

	// Comparing against request headers incase this is a custom route response
	if ( headers.Etag !== undefined && req.headers["if-none-match"] === headers.Etag ) {
		status = 304;
		body   = false;
	}

	// Compressing response to disk
	if ( status === 200 && compress ) {
		self.compressed( res, req, headers.Etag.replace(/"/g, ""), output, status, headers, false, timer );
	}
	// Serving content
	else {
		this.headers( res, req, status, headers );

		if ( body ) {
			res.write( output );
		}

		res.end();

		dtp.fire( "respond", function ( p ) {
			return [req.headers.host, req.method, req.url, status, diff( timer )];
		});

		self.log( prep.call( self, res, req ) );
	}

	return this;
};

/**
 * Restarts instance
 * 
 * @method restart
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	var config;

	if ( cluster.isMaster ) {
		config = this.config;
		this.stop().start( config );
	}

	return this;
};

/**
 * Retrieves routes
 * 
 * @param  {String} method [Optional] HTTP method/verb
 * @param  {String} host   [Optional] Host to lookup, defaults to `all`
 * @return {Object}        Hash of routes
 */
factory.prototype.routes = function ( method, host ) {
	return $.route.list( method, host );
};

/**
 * Broadcasts a message to other workers every second,
 * until acknowledged
 * 
 * @method sendMessage
 * @param  {String}  cmd Command
 * @param  {Object}  arg Parameter
 * @param  {Boolean} all [Optional] `true` will broadcast message to other workers
 * @param  {Boolean} ack [Optional] `true` will broadcast message until first acknowledgement
 * @return {Object}      Instance
 */
factory.prototype.sendMessage = function ( cmd, arg, all, ack ) {
	all      = ( all === true );
	ack      = ( ack === true );
	var id   = $.uuid( true ),
	    body = {
	    	cmd    : cmd,
	    	id     : id,
	    	arg    : arg,
	    	worker : cluster.worker.id,
	    	ack    : ack
	    };

	if ( all ) {
		body.altCmd = cmd;
		body.cmd    = MSG_ALL;
	}

	if ( ack ) {
		$.repeat( function () {
			process.send( body );
		}, 1000, id);
	}
	else {
		process.send( body );
	}

	return this;
};

/**
 * Sessions
 * 
 * @type {Object}
 */
factory.prototype.session = {
	/**
	 * Creates a session
	 * 
	 * @method create
	 * @param  {Object} res HTTP(S) response Object
	 * @param  {Object} req HTTP(S) request Object
	 * @return {Object}     Session
	 */
	create : function ( res, req ) {
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
	 * @param  {Object} res HTTP(S) response Object
	 * @param  {Object} req HTTP(S) request Object
	 * @return {Object}     Instance
	 */
	destroy : function ( res, req ) {
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

			// Announcing deletion of session
			instance.sendMessage( MSG_SES_DEL, id, true );
		}

		return instance;
	},

	/**
	 * Gets a session
	 * 
	 * @method get
	 * @param  {Object} res HTTP(S) response Object
	 * @param  {Object} req HTTP(S) request Object
	 * @return {Mixed}      Session or undefined
	 */
	get : function ( res, req ) {
		var instance = this.server,
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    sid      = instance.cookie.get( req, instance.config.session.id ),
		    id, salt, sesh, timestamp, now;

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
				this.destroy( res, req );
			}
		}

		return sesh;
	},

	/**
	 * Sets a session (cluster normalization)
	 * 
	 * @method set
	 * @param  {Object} arg Message argument from Master
	 * @return {Object}     Instance
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
 * Session factory
 * 
 * @method Session
 * @param {String} id     Session ID
 * @param {Object} server Server instance
 */
function Session ( id, server ) {
	this._id        = id;
	this._server    = server;
	this._timestamp = 0;
};

/**
 * Saves session across cluster
 *
 * @method save
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

	// Announcing session shape
	this._server.sendMessage( MSG_SES_SET, {id: this._id, session: body}, true );
};

/**
 * Expires session across cluster
 * 
 * @method expire
 * @return {Undefined} undefined
 */
Session.prototype.expire = function () {
	delete this._server.sessions[this._id];
	this._server.sendMessage( MSG_SES_DEL, this._id, true );
};

/**
 * Starts instance
 * 
 * @method start
 * @param  {Object}   args         Parameters to set
 * @param  {Function} errorHandler [Optional] Error handler
 * @return {Object}                Instance
 */
factory.prototype.start = function ( args, errorHandler ) {
	var self    = this,
	    params  = {},
	    headers = {},
	    i       = -1,
	    bootstrap, error, msg, sig;

	// Merging config
	if ( args !== undefined ) {
		$.merge( this.config, args );
	}

	// Setting `Server` HTTP header
	if ( this.config.headers.Server === undefined ) {
		this.config.headers.Server = ( function () { return ( "turtle.io/0.9.0 (abaaso/" + $.version + " node.js/" + process.versions.node.replace( /^v/, "" ) + process.platform.capitalize() + " V8/" + process.versions.v8.toString().trim() + ")" ); } )();
	}

	// Setting error handler
	this.config.errorHandler  = errorHandler;

	if ( cluster.isMaster ) {
		// Message passing
		msg = function ( msg ) {
			pass.call( self, msg );
		};

		// Signal handler
		sig = function ( code, signal ) {
			var newQueue = false,
			    worker;

			// Only restarting if a SIGTERM wasn't received, e.g. SIGKILL or SIGHUP
			if ( signal !== TERM_SIG && code !== TERM_CODE ) {
				// Queue worker was killed, re-route!
				if ( cluster.workers[self.config.queue.id.toString()] === undefined ) {
					newQueue = true;
					self.config.queue.id = parseInt( $.array.keys( cluster.workers ).sort( $.array.sort ).last(), 10 ) + 1;
				}

				// Forking new queue process
				worker = cluster.fork();
				worker.on( "message", msg );
				worker.on( "exit",    sig );

				// Announcing new queue worker
				if ( newQueue ) {
					msg( {ack: false, cmd: MSG_ALL, altCmd: MSG_QUE_ID, id: $.uuid( true ), arg: self.config.queue.id, worker: MSG_MASTER} );
				}
			}
		};

		// Minimum process count is 3 [master, queue, www(1+)]
		if ( this.config.ps < 2 ) {
			this.config.ps = 2;
		}

		// Announcing state
		console.log( "Starting turtle.io on port " + this.config.port );

		// Spawning child processes
		while ( ++i < this.config.ps ) {
			cluster.fork();
		}

		// Setting up worker events
		$.array.cast( cluster.workers ).each( function ( i, idx ) {
			i.on( "message", msg );
			i.on( "exit",    sig );
		});
	}
	else {
		// This is only meant to capture Errors emitted from node.js,
		// such as a Stream Error in stream.js, which allows toobusy to do it's job
		process.on("uncaughtException", function ( e ) {
			self.log( e );
		});

		// Setting message listener
		process.on( "message", function ( arg ) {
			self.receiveMessage.call( self, arg );
		});

		// Notifying master
		this.sendMessage( MSG_READY, null );
	}

	return this;
};

/**
 * Returns an Object describing the instance's status
 * 
 * @method status
 * @return {Object} Status
 */
factory.prototype.status = function () {
	var ram    = process.memoryUsage(),
	    uptime = process.uptime(),
	    state  = {
	    	config  : {},
	    	process : {},
	    	queue   : {},
	    	server  : {}
	    };

	// Startup parameters
	$.iterate( this.config, function ( v, k ) {
		state.config[k] = v;
	});

	// Process information
	state.process = {
		memory : ram,
		pid    : process.pid
	};

	// Queue
	state.queue = {
		average : Math.ceil( this.requestQueue.times.mean() || 0 ),
		last    : this.requestQueue.last,
		total   : this.requestQueue.items.length
	};

	// Server information
	state.server = {
		address     : this.server.address(),
		connections : this.server.connections,
		uptime      : uptime
	};

	dtp.fire( "status", function ( p ) {
		return [state.server.connections, uptime, ram.heapUsed, ram.heapTotal];
	});

	return state;
};

/**
 * Stops instance
 * 
 * @method stop
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	if ( cluster.isMaster ) {
		console.log( "Stopping turtle.io on port " + this.config.port );

		$.array.cast( cluster.workers ).each(function ( i ) {
			process.kill( i.process.pid, TERM_SIG );
		});
	}

	return this;
};

/**
 * Unsets a route
 * 
 * @method unset
 * @param  {String} route URI Route
 * @param  {String} verb  HTTP method
 * @return {Object}       Instance
 */
factory.prototype.unset = function ( route, verb, host ) {
	var timer = new Date();

	route === "*" ? $.route.reset() : $.route.del( route, verb, host );

	dtp.fire( "route-unset", function ( p ) {
		return [host || "*", route, verb || "ALL", diff( timer )];
	});

 	return this;
};

/**
 * Sets a route for all verbs
 * 
 * @method all
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.all = function ( route, fn, host ) {
	var self  = this,
	    timer = new Date();

	$.route.set( route, function ( res, req ) {
		handler.call( self, res, req, fn );
	}, "all", host );

	dtp.fire( "route-set", function ( p ) {
		return [host || "*", route, "ALL", diff( timer )];
	});

	return this;
};

/**
 * Sets a DELETE route
 * 
 * @method delete
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.delete = function ( route, fn, host ) {
	var self  = this,
	    timer = new Date();

	$.route.set( route, function ( res, req ) {
		handler.call( self, res, req, fn );
	}, "delete", host );

	dtp.fire( "route-set", function ( p ) {
		return [host || "*", route, "DELETE", diff( timer )];
	});

	return this;
};

/**
 * Sets a GET route
 * 
 * @method get
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.get = function ( route, fn, host ) {
	var self  = this,
	    timer = new Date();

	$.route.set(route, function ( res, req ) {
		handler.call( self, res, req, fn );
	}, "get", host );

	dtp.fire( "route-set", function ( p ) {
		return [host || "*", route, "GET", diff( timer )];
	});

	return this;
};

/**
 * Sets a PATCH route
 * 
 * @method patch
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.patch = function ( route, fn, host ) {
	var self  = this,
	    timer = new Date();

	$.route.set(route, function ( res, req ) {
		handler.call( self, res, req, fn );
	}, "patch", host );

	dtp.fire("route-set", function ( p ) {
		return [host || "*", route, "PATCH", diff( timer )];
	});

	return this;
};

/**
 * Sets a POST route
 * 
 * @method post
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.post = function ( route, fn, host ) {
	var self  = this,
	    timer = new Date();

	$.route.set(route, function ( res, req ) {
		handler.call( self, res, req, fn );
	}, "post", host );

	dtp.fire("route-set", function ( p ) {
		return [host || "*", route, "POST", diff( timer )];
	});

	return this;
};

/**
 * Sets a DELETE route
 * 
 * @method put
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.put = function ( route, fn, host ) {
	var self  = this,
	    timer = new Date();

	$.route.set( route, function ( res, req ) {
		handler.call( self, res, req, fn );
	}, "put", host );

	dtp.fire( "route-set", function ( p ) {
		return [host || "*", route, "PUT", diff( timer )];
	});

	return this;
};

/**
 * Writes files to disk
 * 
 * @method write
 * @param  {String} path  File path
 * @param  {Object} res   HTTP response Object
 * @param  {Object} req   HTTP request Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.write = function ( path, res, req, timer ) {
	var self  = this,
	    put   = ( req.method === "PUT" ),
	    body  = req.body,
	    allow = this.allows( req.url ),
	    del   = this.allowed( "DELETE", req.url );

	if ( !put && /\/$/.test( req.url ) ) {
		this.respond( res, req, ( del ? messages.CONFLICT : messages.ERROR_APPLICATION ), ( del ? codes.CONFLICT : codes.ERROR_APPLICATION ), {Allow: allow}, timer, false );
	}
	else {
		allow = allow.explode().remove( "POST" ).join(", ");

		fs.readFile( path, function ( e, data ) {
			var hash = "\"" + self.hash( data ) + "\"";

			if ( e ) {
				self.respond( res, req, messages.ERROR_APPLICATION, codes.ERROR_APPLICATION, {}, timer, false );
				self.log( e );
			}
			else {
				switch (true) {
					case !req.headers.hasOwnProperty( etag ):
					case req.headers.etag === hash:
						fs.writeFile( path, body, function ( e ) {
							if ( e ) {
								self.error( req, req, e, timer );
							}
							else {
								dtp.fire( "write", function ( p ) {
									return [req.headers.host, req.url, req.method, path, diff( timer )];
								});

								self.respond( res, req, ( put ? messages.NO_CONTENT : messages.CREATED ), ( put ? codes.NO_CONTENT : codes.CREATED ), {Allow: allow, Etag: hash}, timer, false );
							}
						});
						break;
					case req.headers.etag !== hash:
						self.respond( res, req, messages.NO_CONTENT, codes.FAILED, {}, timer, false );
						break;
					default:
						self.error( req, req, e, timer );
				}
			}
		});
	}

	return this;
};

/**
 * Route handler
 * 
 * @method handler
 * @param  {Object}   res HTTP(S) response Object
 * @param  {Object}   req HTTP(S) request Object
 * @param  {Function} fn  Request handler
 * @return {Object}       Instance
 */
var handler = function ( res, req, fn ) {
	var self  = this,
	    host  = req.headers.host.replace( /:.*/, "" ),
	    timer = new Date(),
	    op;

	// Setting up request handler
	op = function () {
		var payload;

		try {
			// Decorating session
			req.session = self.session.get( res, req );

			// Setting listeners if expecting a body
			if ( REGEX_BODY.test( req.method ) ) {
				req.setEncoding( "utf-8" );

				req.on( "data", function ( data ) {
					payload = payload === undefined ? data : payload + data;
				});

				req.on( "end", function () {
					req.body = payload;
					fn.call( self, res, req, timer );
				});
			}
			else {
				fn.call( self, res, req, timer );
			}
		}
		catch ( e ) {
			self.error( res, req, e, timer );
		}

		dtp.fire( "handler", function ( p ) {
			return [req.headers.host, req.url, diff( timer )];
		});
	};

	// Setting listener for unexpected close
	res.on( "close", function () {
		self.log( prep.call( self, res, req ) );
	});

	// Handling request or wrapping it with HTTP Authentication
	switch ( true ) {
		case this.config.auth === undefined:
		case !this.config.auth.hasOwnProperty( host ):
			op();
			break;
		default:
			if ( typeof this.config.auth[host].auth === "undefined" ) {
				this.config.auth[host].auth = http_auth( this.config.auth[host] );
			}
			this.config.auth[host].auth.apply( req, res, op );
	}
};

/**
 * HTTP (semantic) status messages
 * 
 * @type {Object}
 */
var messages = {
	SUCCESS           : "Successful",
	CREATED           : "Created",
	ACCEPTED          : "Accepted",
	NO_CONTENT        : null,
	INVALID_ARGUMENTS : "Invalid arguments",
	INVALID_AUTH      : "Invalid authorization or OAuth token",
	FORBIDDEN         : "Forbidden",
	NOT_FOUND         : "Not found",
	NOT_ALLOWED       : "Method not allowed",
	CONFLICT          : "Conflict",
	ERROR_APPLICATION : "Application error",
	ERROR_GATEWAY     : "Bad gateway",
	ERROR_SERVICE     : "Service is unavailable"
};

/**
 * Sends a command to one or more processes
 * 
 * @method pass
 * @param  {Object} arg Command
 * @return {Undefined}  undefined
 */
var pass = function ( arg ) {
	var self = this;

	switch ( arg.cmd ) {
		case MSG_ALL:
			arg.cmd = arg.altCmd;
			delete arg.altCmd;

			$.array.cast( cluster.workers ).each(function ( i, idx ) {
				if ( self.config.queue.id !== i.id && i.id !== arg.worker ) {
					cluster.workers[i.id.toString()].send( arg );
				}
			});
			break;

		case MSG_READY:
			cluster.workers[arg.worker.toString()].send( {ack: false, cmd: MSG_START, id: $.uuid( true ), arg: this.config.queue.id, worker: MSG_MASTER} );
			break;

		default:
			cluster.workers[( arg.cmd === MSG_QUE_NEW ? this.config.queue.id : arg.worker ).toString()].send( arg );
	}
};

/**
 * Preparing log message
 * 
 * @param  {Object} res HTTP(S) response Object
 * @param  {Object} req HTTP(S) request Object
 * @return {String}     Log message
 */
var prep = function ( res, req ) {
	var msg    = this.config.logs.format,
	    time   = this.config.logs.time,
	    parsed = $.parse( this.url( req ) ),
	    header = req.headers["authorization"] || "",
	    token  = header.split( /\s+/ ).pop()  || "",
	    auth   = new Buffer( token, "base64" ).toString(),
	    user   = auth.split( /:/ )[0] || "-",
	    refer  = req.headers.referer !== undefined ? ( "\"" + req.headers.referer + "\"" ) : "-";

	msg = msg.replace( "{{host}}",       req.headers.host )
	         .replace( "{{time}}",       new moment().format( time ) )
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
 * Registers dtrace probes
 * 
 * @return {Undefined} undefined
 */
var probes = function () {
	// Registering probes
	dtp.addProbe("allowed",        "char *", "char *", "char *", "int");
	dtp.addProbe("allows",         "char *", "char *", "int");
	dtp.addProbe("busy",           "char *", "char *", "char *", "int", "int");
	dtp.addProbe("compress",       "char *", "char *", "char *", "int");
	dtp.addProbe("compressed",     "char *", "char *", "char *", "char *", "int");
	dtp.addProbe("connection",     "int");
	dtp.addProbe("error",          "char *",  "char *", "int", "char *", "int");
	dtp.addProbe("handler",        "char *",  "char *", "int");
	dtp.addProbe("proxy",          "char *", "char *", "char *", "char *", "int");
	dtp.addProbe("proxy-set",      "char *", "char *", "char *", "char *", "int");
	dtp.addProbe("redirect-set",   "char *", "char *", "char *", "int", "int");
	dtp.addProbe("request",        "char *", "char *", "int");
	dtp.addProbe("respond",        "char *", "char *", "char *", "int", "int");
	dtp.addProbe("route-set",      "char *", "char *", "char *", "int");
	dtp.addProbe("route-unset",    "char *", "char *", "char *", "int");
	dtp.addProbe("status",         "int", "int", "int", "int");
	dtp.addProbe("write",          "char *", "char *", "char *", "char *", "int");

	// Enabling probes
	dtp.enable();
};

/**
 * Concatinates the request URL
 * 
 * @param  {Object} req HTTP(S) request Object
 * @return {String}     Complete request URL
 */
factory.prototype.url = function ( req ) {
	return "http" + ( this.config.cert !== undefined ? "s" : "" ) + "://" + req.headers.host + req.url;
};

module.exports = factory;
})( this );
