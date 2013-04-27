/**
 * turtle.io
 *
 * Easy to use web server with virtual hosts & RESTful proxies
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2013 Jason Mulligan
 * @license BSD-3 <https://raw.github.com/avoidwork/turtle.io/master/LICENSE>
 * @link http://turtle.io
 * @version 0.8.0
 */
( function ( global ) {
"use strict";

var $          = require( "abaaso" ),
    crypto     = require( "crypto" ),
    fs         = require( "fs" ),
    http_auth  = require( "http-auth" ),
    mime       = require( "mime" ),
    moment     = require( "moment" ),
    syslog     = require( "node-syslog" ),
    toobusy    = require( "toobusy" ),
    url        = require( "url" ),
    util       = require( "util" ),
    zlib       = require( "zlib" ),
    d          = require( "dtrace-provider" ),
    dtp        = d.createDTraceProvider( "turtle-io" ),
    REGEX_BODY = /^(put|post|patch)$/i,
    REGEX_HALT = new RegExp( "^(ReferenceError|" + $.label.error.invalidArguments + ")$" ),
    REGEX_HEAD = /^(head|options)$/i,
    REGEX_HEAD2= /head|options/i,
    REGEX_GET  = /^(get|head|options)$/i,
    REGEX_DEL  = /^(del)$/i,
    REGEX_DEF  = /deflate/,
    REGEX_GZIP = /gzip/,
    REGEX_IE   = /msie/i,
    REGEX_DIR  = /\/$/;

// Hooking syslog output
syslog.init( "turtle_io", syslog.LOG_PID | syslog.LOG_ODELAY, syslog.LOG_LOCAL0 );

// Disabling abaaso observer
$.discard( true );

/**
 * Verifies a method is allowed on a URI
 * 
 * @method allowed
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @param  {String} host   Hostname
 * @return {Boolean}       Boolean indicating if method is allowed
 */
var allowed = function ( method, uri, host ) {
	host       = host || "all";
	var result = false,
	    timer  = new Date();

	$.route.list( method, host ).each(function ( route ) {
		if ( RegExp( "^" + route + "$" ).test( uri ) ) return !( result = true );
	});

	if ( !result ) {
		$.route.list( "all", host ).each( function ( route ) {
			if ( RegExp( "^" + route + "$" ).test( uri ) ) return !( result = true );
		});
	}

	if ( !result && host !== "all" ) {
		$.route.list( method, "all" ).each( function ( route ) {
			if ( RegExp( "^" + route + "$" ).test( uri ) ) return !( result = true );
		});

		if ( !result ) $.route.list( "all", "all" ).each( function ( route ) {
			if ( RegExp( "^" + route + "$" ).test( uri ) ) return !( result = true );
		});		
	}

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
var allows = function ( uri, host ) {
	var result = "",
	    verbs  = ["DELETE", "GET", "POST", "PUT", "PATCH"],
	    timer  = new Date();

	verbs.each( function ( i ) {
		if ( allowed( i, uri, host ) ) result += ( result.length > 0 ? ", " : "" ) + i;
	});

	result = result.replace( "GET", "GET, HEAD, OPTIONS" );

	dtp.fire( "allows", function ( p ) {
		return [host, uri, diff( timer )];
	});

	return result;
};

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
 * Loads & applies the configuration file
 * 
 * @method config
 * @param  {Object} args [Optional] Overrides or optional properties to set
 * @return {Object}      Instance
 */
var config = function ( args ) {
	if ( !( args instanceof Object ) ) args = {};

	var config = require( __dirname + "/../config.json" ),
	    id     = this.id || (args.id || ( config.id || $.genId() ) );

	// Merging args into config
	$.iterate( args, function ( value, key ) {
		if ( value instanceof Object ) {
			if ( config[key] === undefined ) {
				config[key] = {};
			}

			$.merge( config[key], value );
		}
		else {
			config[key] = value;
		}
	});

	delete config.id;

	// Loading if first execution or config has changed
	if ( this.id !== id || $.encode( this.config ) !== $.encode( config ) ) {
		this.id     = id;
		this.config = config;
	}

	return this;
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
 * Instance Factory
 * 
 * @method factory
 * @param  {Object} args [Optional] Properties to set
 * @return {Object}      Instance of turtle.io
 */
var factory = function ( args ) {
	var self = this;

	this.active       = false;
	this.id           = "";
	this.config       = {};
	this.requestQueue = {
		flushing : false,
		items    : [],
		last     : null,
		times    : [],
		registry : {}
	};
	this.server       = null;
	this.version      = "0.8.0";

	// Loading config
	config.call( this, args );

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
			util.pump( raw, res );

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
	var err  = msg.callstack !== undefined,
	    file = this.config.logs.file.replace("{{ext}}", new moment().format( this.config.logs.ext ) ),
	    exit;

	// Exist application when unrecoverable error occurs
	exit = function () {
		syslog.close();
		toobusy.shutdown();
		process.exit( 0 );
	};

	// Determining what to log
	msg = msg.callstack || msg;

	// Dispatching to syslog server
	syslog.log( syslog[!err ? "LOG_INFO" : "LOG_ERR"], msg );

	// Writing to log file
	fs.appendFile( "/var/log/" + file, msg + "\n", function ( e ) {
		if ( e ) {
			fs.appendFile( __dirname + "/../" + file, msg + "\n", function ( e ) {
				if ( e ) {
					// Couldn't write to the log, no need to spam the terminal
					void 0;
				}

				if ( REGEX_HALT.test( msg ) ) {
					exit();
				}
			});
		}
		else if ( REGEX_HALT.test( msg ) ) {
			exit();
		}
	});

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
	var id = "queue",
	    self, limit;

	if ( start ) {
		self  = this,
		limit = this.config.queue.size;

		$.repeat( function () {
			var items, nth, now;

			if ( self.requestQueue.items.length > 0 ) {
				self.requestQueue.flushing = true;

				items = self.requestQueue.items.limit(0, limit);
				nth   = items.length;
				now   = new Date();

				items.each( function ( i ) {
					try {
						i.callback();
					}
					catch ( e ) {
						self.log( e );
					}

					self.requestQueue.last = i.uuid;
					self.requestQueue.times.push( now.getTime() - i.timestamp.getTime() );
					delete self.requestQueue.registry[i.uuid];
				});

				self.requestQueue.items.remove(0, (nth - 1));

				self.requestQueue.flushing = false;
			}
		}, this.config.queue.time, id );
	}
	else {
		$.clearTimer( id );
	}
};

/**
 * Pipes a stream to a URI
 * 
 * @param  {String}   uri      URI make request against
 * @param  {String}   method   HTTP method
 * @param  {Function} callback Callback function
 * @param  {Object}   arg      Stream or Buffer
 * @return {Object}            Instance
 */
factory.prototype.pipe = function ( uri, method, callback, arg ) {
	var options = {
		uri            : uri,
		method         : method.toUpperCase(),
		timeout        : 30000,
		followRedirect : true,
		maxRedirects   : 10
	};

	request( options, callback ).pipe( arg );

	return this;
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
		    parsed  = $.parse( origin + req.url ),
		    fn, options, proxyReq;

		// Removing support for compression so the response can be rewritten (if textual)
		delete headerz["accept-encoding"];

		// Facade to handle()
		fn = function ( arg, xhr ) {
			handle( arg, xhr, res, req, timer );
		};

		// Streaming response to Client
		if ( stream ) {
			headerz.host = parsed.hostname;

			options = {
				headers  : headerz,
				hostname : parsed.hostname,
				method   : req.method,
				path     : parsed.path,
				port     : parsed.port
			};

			if ( !parsed.auth.isEmpty() ) {
				options.auth = parsed.auth;
			}

			proxyReq = http.request( options ).pipe( res );

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
 * @param  {Object}   res      HTTP(S) response Object
 * @param  {Object}   req      HTTP(S) request Object
 * @param  {Function} callback Callback function to execute when processed
 * @param  {String}   id       [Optional] Queue item ID
 * @param  {Object}   headers  [Optional] HTTP headers to decorate the response with
 * @param  {Object}   timer    [Optional] Date instance
 * @return {Object}            Instance
 */
factory.prototype.queue = function ( res, req, callback, id, headers, timer ) {
	var uuid   = id || $.uuid( true ),
	    parsed = $.parse( this.url( req ) ),
	    body;

	if ( typeof callback !== "function" ) {
		throw Error( $.label.error.invalidArguments );
	}

	this.requestQueue.items.push( {callback: callback, uuid: uuid, timestamp: new Date()} );
	this.requestQueue.registry[uuid] = true;

	body = {
		processing: this.requestQueue.items.length < this.config.queue.size ? "now" : moment().fromNow( ( this.requestQueue.items.length / this.config.queue.size * this.config.queue.time ), " seconds" )
	}

	if ( this.config.queue.status ) {
		body.status = parsed.protocol + "//" + req.headers.host + "/queue/" + uuid;
	}

	this.respond( res, req, body, 202, headers, timer, false );

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
	var body, position, timestamp;

	if ( this.requestQueue.registry[uuid] === undefined ) {
		this.respond( res, req, messages.NOT_FOUND, 404, {"Cache-Control": "no-cache"}, timer, false );	
	}
	else {
		this.requestQueue.items.each( function ( i, idx ) {
			if ( i.uuid === uuid ) {
				position  = idx;
				timestamp = i.timestamp;
				return false;
			}
		});

		body = {
			position  : position,
			total     : this.requestQueue.items.length,
			estimate  : Math.ceil( this.requestQueue.times.mean() ) + " seconds",
			timestamp : moment.utc( timestamp ).format()
		}

		this.respond( res, req, body, 200, {"Cache-Control": "no-cache"}, timer, false );
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

		allow   = allows( req.url, host );
		del     = allowed( "DELETE", req.url, host );
		post    = allowed( "POST", req.url, host );
		handled = true;
		url     = parsed.href;

		dtp.fire( "request", function ( p ) {
			return [url, allow, diff( timer )];
		});

		fs.exists( path, function ( exists ) {
			switch ( true ) {
				case !exists && method === "post":
					if ( allowed( req.method, req.url, host ) ) {
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
				case !allowed( method, req.url, host ):
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
	status   = status || codes.SUCCESS;
	timer    = timer  || new Date(); // Not ideal! This gives a false sense of speed for custom routes
	compress = ( compress === true );

	var body      = !REGEX_HEAD.test(req.method) && output !== null,
	    encoding  = this.compression(req.headers["user-agent"], req.headers["accept-encoding"]),
	    self      = this,
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

	// Setting Etag if not present
	if (headers.Etag === undefined) {
		salt = req.url + "-" + req.method + "-" + ( output !== null && typeof output.length !== "undefined" ? output.length : null ) + "-" + output;
		headers.Etag = "\"" + self.hash( salt ) + "\"";
	}

	// Comparing against request headers incase this is a custom route response
	if (req.headers["if-none-match"] === headers.Etag) {
		status = 304;
		body   = false;
	}

	// Compressing response to disk
	if ( status !== 304 && compress ) {
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
	return this.stop().start();
};

/**
 * Starts instance
 * 
 * @method start
 * @param  {Object}   args Parameters to set
 * @param  {Function} fn   [Optional] Error handler
 * @return {Object}        Instance
 */
factory.prototype.start = function ( args, fn ) {
	var self    = this,
	    params  = {},
	    headers = {},
	    error;

	// Setting error handler
	if (typeof fn === "function") {
		error = fn;
	}
	else {
		error = function ( res, req, timer ) {
			var body   = messages.NOT_FOUND,
			    status = codes.NOT_FOUND,
			    method = req.method.toLowerCase(),
			    host   = req.headers.host.replace( /:.*/, "" );

			if ( !REGEX_GET.test( method ) ) {
				if ( allowed( req.method, req.url, host ) ) {
					body   = messages.ERROR_APPLICATION;
					status = codes.ERROR_APPLICATION;
				}
				else {
					body   = messages.NOT_ALLOWED;
					status = codes.NOT_ALLOWED;
				}
			}

			self.respond( res, req, body, status, {"Cache-Control": "no-cache"}, timer, false );
		}
	}

	// Default headers
	headers = {
		"Server"       : "turtle.io/0.8.0",
		"X-Powered-By" : ( function () { return ( "abaaso/" + $.version + " node.js/" + process.versions.node.replace( /^v/, "" ) + " (" + process.platform.capitalize() + " V8/" + process.versions.v8.toString().trim() + ")" ); } )()
	};

	// Loading config
	config.call( this, args );

	// Applying default headers (if not overridden)
	$.iterate( headers, function ( v, k ) {
		if ( self.config.headers[k] === undefined ) {
			self.config.headers[k] = v;
		}
	});

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
		error( res, req, timer );
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
	this.get( "/.*", this.request );

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

	// Starting queue processor
	this.mode( true );

	// This is only meant to capture Errors emitted from node.js,
	// such as a Stream Error in stream.js, which allows toobusy to do it's job
	process.on("uncaughtException", function ( e ) {
		self.log( e );
	});

	// Announcing state
	console.log( "Started turtle.io on port " + this.config.port );

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
		connections : typeof this.server.getConnections === "function" ? this.server.getConnections() : this.server.connections,
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
	// Shutting down the server
	if ( this.server !== null ) {
		try {
			this.server.close();
		}
		catch (e) {
			void 0;
		}

		this.active = false;
		this.server = null;

		this.mode( false );
		this.unset( "*" );
	}

	// Removing hooks to process
	process.removeAllListeners("on");

	console.log( "Stopped turtle.io on port " + this.config.port );

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
	    allow = allows( req.url ),
	    del   = allowed( "DELETE", req.url );

	if ( !put && /\/$/.test( req.url ) ) {
		self.respond( res, req, ( del ? messages.CONFLICT : messages.ERROR_APPLICATION ), ( del ? codes.CONFLICT : codes.ERROR_APPLICATION ), {Allow: allow}, timer, false );
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
}
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
