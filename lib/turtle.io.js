/**
 * turtle.io
 *
 * Easy to use web server with virtual hosts & RESTful proxies
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright Jason Mulligan 2012
 * @license BSD-3 <http://opensource.org/licenses/BSD-3-Clause>
 * @link https://github.com/avoidwork/turtle.io
 * @version 0.1.3
 */

(function (global) {
"use strict";

var $          = require("abaaso"),
    crypto     = require("crypto"),
    fs         = require("fs"),
    mime       = require("mime"),
    moment     = require("moment"),
    url        = require("url"),
    util       = require("util"),
    zlib       = require("zlib"),
    REGEX_HALT = new RegExp("ReferenceError|" + $.label.error.invalidArguments),
    REGEX_BODY = /head|options/i,
    REGEX_GET  = /get|head|options/i,
    REGEX_DEL  = /del/i,
    REGEX_DEF  = /deflate/,
    REGEX_GZIP = /gzip/,
    REGEX_IE   = /msie/i;

/**
 * Verifies a method is allowed on a URI
 * 
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @param  {String} host   Hostname
 * @return {Boolean}       Boolean indicating if method is allowed
 */
var allowed = function (method, uri, host) {
	host       = host || "all";
	var result = false;

	$.route.list(method, host).each(function (route) {
		if (RegExp("^" + route + "$").test(uri)) return !(result = true);
	});

	if (!result) $.route.list("all", host).each(function (route) {
		if (RegExp("^" + route + "$").test(uri)) return !(result = true);
	});

	if (!result && host !== "all") {
		$.route.list(method, "all").each(function (route) {
			if (RegExp("^" + route + "$").test(uri)) return !(result = true);
		});

		if (!result) $.route.list("all", "all").each(function (route) {
			if (RegExp("^" + route + "$").test(uri)) return !(result = true);
		});		
	}

	return result;
};

/**
 * Determines which verbs are allowed against a URL
 * 
 * @param  {String} url  URL to query
 * @param  {String} host Hostname
 * @return {String}      Allowed methods
 */
var allows = function (url, host) {
	var result = "",
	    verbs  = ["DELETE", "GET", "POST", "PUT"];

	verbs.each(function (i) {
		if (allowed(i, url, host)) result += (result.length > 0 ? ", " : "") + i;
	});

	return result.replace("GET", "GET, HEAD, OPTIONS");
};

/**
 * Bootstraps instance
 *
 * Loads configuration, applies optional args & sets listeners
 * 
 * @param  {Object} args Overrides or optional properties to set
 * @return {Object} Instance
 */
var bootstrap = function (args) {
	var headers = {
		"Accept"                       : "text/html, text/plain",
		"Allow"                        : "",
		"Content-Type"                 : "text/html; charset=UTF-8",
		"Date"                         : "",
		"Last-Modified"                : "",
		"Server"                       : "turtle.io/0.1.3",
		"X-Powered-By"                 : (function () { return ("abaaso/" + $.version + " node.js/" + process.versions.node.replace(/^v/, "") + " (" + process.platform.capitalize() + " V8/" + process.versions.v8 + ")"); })(),
		"Access-Control-Allow-Headers" : "Accept, Allow, Cache-Control, Content-Type, Date, Etag, Transfer-Encoding, Server",
		"Access-Control-Allow-Methods" : "",
		"Access-Control-Allow-Origin"  : ""
	};

	// Loading config
	config.call(this, args);

	// Hooking the observer
	$.observer.hook(this);

	// Start listener
	this.on("beforeStart", function (newArgs) {
		var self   = this,
		    params = {};

		// Loading config
		config.call(this, (newArgs || args));

		// Applying default headers (if not overridden)
		$.iterate(headers, function (v, k) {
			if (typeof self.config.headers[k] === "undefined") self.config.headers[k] = v;
		});

		// Preparing parameters
		params.port = this.config.port;
		if (typeof this.config.csr !== "undefined") params.csr = this.config.csr;
		if (typeof this.config.key !== "undefined") params.csr = this.config.key;

		// Setting error route
		$.route.set("error", function (res, req) { self.error(res, req); });

		// Setting default response route
		this.get("/.*", this.request);

		// Creating a server
		this.server = $.route.server(params, function (e) { self.log(e, true); });
		this.active = true;
	}, "server");

	// After start listener
	this.on("afterStart", function () {
		this.log("Started turtle.io on port " + this.config.port);
	}, "logging");

	// Restart listener
	this.on("beforeRestart", function () {
		this.stop().start();
	});

	// After restart listener
	this.on("afterRestart", function () {
		this.log("Restarted turtle.io on port " + this.config.port);
	});

	// Stop listener
	this.on("beforeStop", function () {
		if (this.server !== null) {
			try { this.server.close(); }
			catch (e) { void 0; }
			this.active = false;
			this.server = null;
			this.unset("*");
		}
	}, "vhosts");

	// After stop listener
	this.on("afterStop", function () {
		this.log("Stopped turtle.io on port " + this.config.port);
	}, "logging");

	return this;
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
	NOT_MODIFIED      : 304,
	INVALID_ARGUMENTS : 400,
	INVALID_AUTH      : 401,
	FORBIDDEN         : 403,
	NOT_FOUND         : 404,
	NOT_ALLOWED       : 405,
	CONFLICT          : 409,
	FAILED            : 412,
	ERROR_APPLICATION : 500,
	ERROR_SERVICE     : 503
};

/**
 * Loads & applies the configuration file
 * 
 * @param  {Object} args [Optional] Overrides or optional properties to set
 * @return {Object}      Instance
 */
var config = function (args) {
	if (!(args instanceof Object)) args = {};

	var config = require("../config.json"),
	    id     = this.id || (args.id || (config.id || $.genId()));

	// Merging args into config
	$.merge(config, args);
	delete config.id;

	// Loading if first execution or config has changed
	if (this.id !== id || $.encode(this.config) !== $.encode(config)) {
		this.id     = id;
		this.config = config;
	}

	return this;
};

/**
 * Instance Factory
 * 
 * @param  {Object} args [Optional] Properties to set
 * @return {Object}      Instance of turtle.io
 */
var factory = function (args) {
	var self = this;

	this.active  = false;
	this.id      = "";
	this.config  = {};
	this.server  = null;
	this.version = "0.1.3";

	bootstrap.call(self, args);

	return this;
};

/**
 * Error handler for requests
 * 
 * @param  {Object} res Response Object
 * @param  {Object} req Request Object
 * @return {Object}     Instance
 */
factory.prototype.error = function (res, req) {
	var parsed = url.parse(req.url),
	    uri    = "",
	    msg    = this.config.logs.format,
	    host   = req.headers.host.replace(/:.*/, "");

	if (!parsed.hasOwnProperty("host"))     parsed.host     = req.headers.host;
	if (!parsed.hasOwnProperty("protocol")) parsed.protocol = "http:";

	uri = parsed.protocol + "//" + host+ ":" + this.config.port + req.url;

	REGEX_GET.test(req.method) ? this.respond(res, req, messages.NOT_FOUND, codes.NOT_FOUND, (allowed("POST") ? {"Allow": "POST"} : undefined))
	                           : this.respond(res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED, {"Allow": allows(req.url, host)});

	// Preparing log message
	msg = msg.replace("{{host}}", req.headers.host)
	         .replace("{{time}}", new Date().toUTCString())
	         .replace("{{method}}", req.method)
	         .replace("{{path}}", parsed.pathname)
	         .replace("{{status}}", (REGEX_GET.test(req.method) ? codes.NOT_FOUND : codes.NOT_ALLOWED))
	         .replace("{{length}}", "-")
	         .replace("{{user-agent}}", req.headers["user-agent"] || "-");
	
	// Writing log
	this.log(msg, true, this.config.debug);
};

/**
 * Creates a hash of arg
 * 
 * @param  {Mixed}  arg     String or Buffer
 * @param  {String} encrypt [Optional] Type of encryption
 * @param  {String} digest  [Optional] Type of digest
 * @return {String}         Hash of arg
 */
factory.prototype.hash = function (arg, encrypt, digest) {
	if (/null|undefined/.test(arg))     arg     = "";
	if (typeof encrypt === "undefined") encrypt = "md5";
	if (typeof digest  === "undefined") digest  = "hex";

	return crypto.createHash(encrypt).update(arg).digest(digest);
};

/**
 * Sets response headers
 * 
 * @param  {Object}  res             Response object
 * @param  {Object}  req             Request object
 * @param  {Number}  status          [Optional] HTTP status code, default is 200
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @return {Objet}                   Instance
 */
factory.prototype.headers = function (res, req, status, responseHeaders) {
	var get      = REGEX_GET.test(req.method),
	    headers  = $.clone(this.config.headers),
	    compression;

	// Setting optional params
	if (typeof status === "undefined") status = codes.SUCCESS;
	if (!(responseHeaders instanceof Object)) responseHeaders = {};

	// Decorating response headers
	$.merge(headers, responseHeaders);

	// Setting headers
	headers["Date"]                         = new Date().toUTCString();
	headers["Access-Control-Allow-Methods"] = headers.Allow;

	// Setting the response status code
	res.statusCode = status;

	// Removing headers not wanted in the response
	if (!get || status >= codes.INVALID_ARGUMENTS) delete headers["Cache-Control"];
	switch (true) {
		case status >= codes.FORBIDDEN && status < codes.NOT_FOUND:
		case status >= codes.ERROR_APPLICATION:
			delete headers.Allow;
			delete headers["Access-Control-Allow-Methods"];
			delete headers["Last-Modified"];
			break;
	}

	// Decorating response with headers
	$.iterate(headers, function (v, k) { res.setHeader(k, v); });

	return this;
};

/**
 * Logs a message
 * 
 * @param  {Mixed}   msg     Error Object or String
 * @param  {Boolean} error   [Optional] Write to error log (default: false)
 * @param  {Boolean} display [Optional] Displays msgor on the console (default: true)
 * @return {Object}          Instance
 */
factory.prototype.log = function (msg, error, display) {
	error   = (error   === true);
	display = (display !== false);

	var err = "Could not write to msg to log",
	    dir = this.config.logs.dir,
	    date, filename, text, append;

	// Appends text to the log file
	append = function (filename, text) {
		fs.appendFile((dir + "/" + filename), text, function (e) {
			if (e) $.log(e);
			if (REGEX_HALT.test(text)) process.exit(0);
		});
	};

	// Displaying on the console
	if (display) $.log(msg);

	// Writing to log file if config is loaded
	if (typeof this.config.logs !== "undefined") {
		date     = new Date();
		text     = msg + "\n" + (typeof msg.stack !== "undefined" ? msg.stack + "\n" : "");
		filename = this.config.logs[error ? "error" : "daemon"].replace(/\{\{date\}\}/, moment(date).format(this.config.logs.date));

		fs.exists(dir, function (exists) {
			if (exists) append(filename, text);
			else fs.mkdir(dir, function (e) {
				if (e) $.log(e);
				else append(filename, text);
			});
		});
	}
	else if (REGEX_HALT.test(msg)) process.exit(0);

	return this;
};

/**
 * Proxies a request to a Server
 * 
 * @param  {String} origin Host to proxy (e.g. http://hostname)
 * @param  {String} route  Route to proxy
 * @param  {String} host   [Optional] Hostname this route is for (default is all)
 * @return {Object}        Instance
 */
factory.prototype.proxy = function (origin, route, host) {
	var self  = this,
	    verbs = ["delete", "get", "post", "put"],
	    handle, headers;

	/**
	 * Response handler
	 * 
	 * @param  {Mixed}  arg Proxy response
	 * @param  {Object} xhr XmlHttpRequest
	 * @param  {Object} res HTTP response Object
	 * @param  {Object} req HTTP request Object
	 * @return {Undefined}  undefined
	 */
	handle = function (arg, xhr, res, req) {
		try {
			self.respond(res, req, arg, xhr.status, headers(xhr.getAllResponseHeaders()));
		}
		catch (e) {
			self.log(e);
			self.respond(res, req, arg, 502, {});
		}
	};

	/**
	 * Capitalizes HTTP headers
	 * 
	 * @param  {Object} args Response headers
	 * @return {Object}      Reshaped response headers
	 */
	headers = function (args) {
		var result = {},
			rvalue  = /.*:\s+/,
			rheader = /:.*/;

		args.trim().split("\n").each(function (i) {
			var header, value;

			value          = i.replace(rvalue, "");
			header         = i.replace(rheader, "");
			header         = header.indexOf("-") === -1 ? header.capitalize() : (function () { var x = []; header.explode("-").each(function (i) { x.push(i.capitalize()) }); return x.join("-"); })();
			result[header] = value;
		});

		return result;
	};

	// Setting route
	verbs.each(function (i) {
		self[REGEX_DEL.test(i) ? "delete" : i](route, function (res, req) {
			var url = origin + req.url;

			url[req.method.toLowerCase()](function (arg, xhr) { handle (arg, xhr, res, req); }, function (arg, xhr) { handle (arg, xhr, res, req); });
		}, host);
	});

	return this;
};

/**
 * Request handler which provides RESTful CRUD operations
 * 
 * Default route is for GET only
 * 
 * @param  {Object} req HTTP(S) request Object
 * @param  {Object} res HTTP(S) response Object
 * @return {Object}     Instance
 */
factory.prototype.request = function (res, req) {
	var self    = this,
	    host    = req.headers.host.replace(/:.*/, ""),
	    parsed  = url.parse(req.url, true),
	    method  = REGEX_GET.test(req.method) ? "get" : req.method.toLowerCase(),
	    error   = function (err) {
	    	if (typeof err !== "undefined") self.log(err, true, self.config.debug);
	    	self.respond(res, req, messages.ERROR_APPLICATION, codes.ERROR_APPLICATION);
	    },
	    path    = [],
	    handled = false,
	    port    = this.config.port,
	    path    = "",
	    count, handle, nth, root;

	if (!this.config.vhosts.hasOwnProperty(host)) return error();

	root = this.config.root + "/" + this.config.vhosts[host];

	if (!parsed.hasOwnProperty("host"))     parsed.host     = req.headers.host;
	if (!parsed.hasOwnProperty("protocol")) parsed.protocol = "http:";

	// Handles the request after determining the path
	handle = function (path, url) {
		var allow, del, post, mimetype, status;

		allow   = allows(req.url, host);
		del     = allowed("DELETE", req.url);
		post    = allowed("POST", req.url);
		handled = true;
		url     = parsed.protocol + "//" + req.headers.host.replace(/:.*/, "") + ":" + port + url;

		fs.exists(path, function (exists) {
			switch (true) {
				case !exists && method === "post":
					if (allowed(req.method, req.url)) self.write(path, res, req);
					else {
						status = codes.NOT_ALLOWED;
						self.respond(res, req, messages.NOT_ALLOWED, status, {"Allow": allow});
					}
					break;
				case !exists:
					self.respond(res, req, messages.NO_CONTENT, codes.NOT_FOUND, (post ? {"Allow": "POST"} : undefined));
					break;
				case !allowed(method, req.url):
					self.respond(res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED, {"Allow": allow});
					break;
				default:
					if (!/\/$/.test(req.url)) allow = allow.explode().remove("POST").join(", ");
					switch (method) {
						case "delete":
							fs.unlink(path, function (err) {
								if (err) error(err);
								else self.respond(res, req, messages.NO_CONTENT, codes.NO_CONTENT);
							});
							break;
						case "get":
						case "head":
						case "options":
							mimetype = mime.lookup(path);
							fs.stat(path, function (err, stat) {
								var ie = REGEX_IE.test(req.headers["user-agent"]),
								    size, modified, etag, raw, headers;

								if (err) error(err);
								else {
									size     = stat.size;
									modified = stat.mtime.toUTCString();
									etag     = "\"" + self.hash(stat.size + "-" + stat.mtime) + "\"";
									headers  = {"Allow" : allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified};

									if (req.method === "GET") {
										switch (true) {
											case Date.parse(req.headers["if-modified-since"]) >= stat.mtime:
											case req.headers["if-none-match"] === etag:
												self.headers(res, req, codes.NOT_MODIFIED, headers);
												res.end();
												break;
											default:
												headers["Transfer-Encoding"] = "chunked";
												self.headers(res, req, codes.SUCCESS, headers);
												raw = fs.createReadStream(path);
												switch (true) {
													case !ie && REGEX_DEF.test(req.headers["accept-encoding"]):
														res.setHeader("Content-Encoding", "deflate");
														raw.pipe(zlib.createDeflate()).pipe(res);
														break;
													case !ie && REGEX_GZIP.test(req.headers["accept-encoding"]):
														res.setHeader("Content-Encoding", "gzip");
														raw.pipe(zlib.createGzip()).pipe(res);
														break;
													default:
														util.pump(raw, res);
												}
										}
									}
									else self.respond(res, req, messages.NO_CONTENT, codes.SUCCESS, headers);
								}
							});
							break;
						case "put":
							self.write(path, res, req);
							break;
						default:
							self.respond(res, req, (del ? messages.CONFLICT : messages.ERROR_APPLICATION), (del ? codes.CONFLICT : codes.ERROR_APPLICATION), {"Allow": allow});
					}
			}
		});
	};

	// Determining if the request is valid
	fs.stat(root + parsed.pathname, function (err, stats) {
		if (err) self.respond(res, req, messages.NO_CONTENT, codes.NOT_FOUND, (allowed("POST", req.url) ? {"Allow": "POST"} : undefined));
		else {
			if (!stats.isDirectory()) handle(root + parsed.pathname, parsed.pathname);
			else {
				// Adding a trailing slash for relative paths
				if (stats.isDirectory() && !/\/$/.test(parsed.pathname)) self.respond(res, req, messages.NO_CONTENT, codes.MOVED, {"Location": parsed.pathname + "/"});
				else {
					nth   = self.config.index.length;
					count = 0;

					self.config.index.each(function (i) {
						fs.exists(root + parsed.pathname + i, function (exists) {
							if (exists && !handled) handle(root + parsed.pathname + i, parsed.pathname + i);
							else if (!exists && ++count === nth) self.respond(res, req, messages.NO_CONTENT, codes.NOT_FOUND, (allowed("POST", req.url) ? {"Allow": "POST"} : undefined));
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
 * @param  {Object}  res             Response object
 * @param  {Object}  req             Request object
 * @param  {Mixed}   output          [Optional] Response
 * @param  {Number}  status          [Optional] HTTP status code, default is 200
 * @param  {Object}  responseHeaders [Optional] HTTP headers to decorate the response with
 * @return {Objet}                   Instance
 */
factory.prototype.respond = function (res, req, output, status, responseHeaders) {
	if (typeof status === "undefined")        status          = codes.SUCCESS;
	if (!(responseHeaders instanceof Object)) responseHeaders = {};

	var body     = !REGEX_BODY.test(req.method),
	    encoding = req.headers["accept-encoding"],
	    compress = body && !REGEX_IE.test(req.headers["user-agent"]) && (REGEX_DEF.test(encoding) || REGEX_GZIP.test(encoding)),
	    self     = this;

	// Encoding as JSON if not prepared
	if (body && ((output instanceof Array) || String(output) === "[object Object]")) {
		responseHeaders["Content-Type"] = "application/json";
		output = $.encode(output);
	}

	if (compress) {
		encoding = REGEX_DEF.test(encoding) ? "deflate" : "gzip";
		responseHeaders["Content-Encoding"] = encoding;
		zlib[encoding](output, function (err, compressed) {
			if (err) self.error(res, req);
			else {
				self.headers(res, req, status, responseHeaders);
				res.write(compressed);
				res.end();
			}
		});
	}
	else {
		this.headers(res, req, status, responseHeaders);
		if (body) res.write(output);
		res.end();
	}

	return this;
};

/**
 * Restarts instance
 * 
 * @return {Object} instance
 */
factory.prototype.restart = function () {
	return this.fire("beforeRestart, afterRestart");
};

/**
 * Starts instance
 * 
 * @param  {Object} args Parameters to set
 * @return {Object}      Instance
 */
factory.prototype.start = function (args) {
	return this.fire("beforeStart, afterStart", args);
};

/**
 * Returns an Object describing the instance's status
 * 
 * @return {Object} Status
 */
factory.prototype.status = function () {
	var state = {
		config  : {},
		process : {},
		server  : {}
	};

	// Startup parameters
	$.iterate(this.config, function (v, k) {
		state.config[k] = v;
	});

	// Process information
	state.process.memory = process.memoryUsage();
	state.process.pid    = process.pid;

	// Server information
	state.server.address        = this.server.address();
	state.server.connections    = this.server.connections;
	state.server.maxConnections = this.server.macConnections;

	return state;
};

/**
 * Stops instance
 * 
 * @return {Object} Instance
 */
factory.prototype.stop = function () {
	return this.fire("beforeStop, afterStop");
};

/**
 * Unsets a route
 * 
 * @param  {String} route URI Route
 * @param  {String} verb  HTTP method
 * @return {Object}       Instance
 */
factory.prototype.unset = function (route, verb, host) {
	var verbs = ["all", "delete", "get", "post", "put"];

	if (route === "*") {
		verbs.each(function (verb) {
			$.route.list(verb, host).each(function (route) {
				// Can't delete error route, only override it
				if (route === "error" && verb === "all" && host === "all") return;
				$.route.del(route, verb, host);
			});
		});
	}
 	else $.route.del(route, verb, host);
 	return this;
};

/**
 * Sets a route for all verbs
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.all = function (route, fn, host) {
	var self = this;

	$.route.set(route, function (res, req) {
		handler.call(self, res, req, fn);
	}, "all", host);
	return this;
};

/**
 * Sets a DELETE route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.delete = function (route, fn, host) {
	var self = this;

	$.route.set(route, function (res, req) {
		handler.call(self, res, req, fn);
	}, "delete", host);
	return this;
};

/**
 * Sets a GET route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.get = function (route, fn, host) {
	var self = this;

	$.route.set(route, function (res, req) {
		handler.call(self, res, req, fn);
	}, "get", host);
	return this;
};

/**
 * Sets a POST route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.post = function (route, fn, host) {
	var self = this;

	$.route.set(route, function (res, req) {
		handler.call(self, res, req, fn);
	}, "post", host);
	return this;
};

/**
 * Sets a DELETE route
 * 
 * @param  {RegExp}   route Route
 * @param  {Function} fn    Handler
 * @param  {String}   host  [Optional] Hostname this route is for (default is all)
 * @return {Object}         Instance
 */
factory.prototype.put = function (route, fn, host) {
	var self = this;

	$.route.set(route, function (res, req) {
		handler.call(self, res, req, fn);
	}, "put", host);
	return this;
};

/**
 * Writes files to disk
 * 
 * @param  {String} path  File path
 * @param  {Object} res   HTTP response Object
 * @param  {Object} req   HTTP request Object
 * @return {Object}       Instance
 */
factory.prototype.write = function (path, res, req) {
	var self  = this,
	    put   = (req.method === "PUT"),
	    body  = "",
	    allow = allows(req.url),
	    del   = allowed("DELETE", req.url);

	if (!put && /\/$/.test(req.url)) self.respond(res, req, (del ? messages.CONFLICT : messages.ERROR_APPLICATION), (del ? codes.CONFLICT : codes.ERROR_APPLICATION), {"Allow" : allow});
	else {
		allow = allow.explode().remove("POST").join(", ");

		req.on("data", function (data) { 
			body += data;
		});

		req.on("end", function () {
			fs.readFile(path, function (e, data) {
				var hash = "\"" + self.hash(data) + "\"";

				if (e) self.respond(res, req, messages.ERROR_APPLICATION, codes.ERROR_APPLICATION);
				switch (true) {
					case !req.headers.hasOwnProperty(etag):
					case req.headers.etag === hash:
						fs.writeFile(path, body, function (e) {
							if (e) self.respond(res, req, messages.ERROR_APPLICATION, codes.ERROR_APPLICATION);
							else self.respond(res, req, (put ? messages.NO_CONTENT : messages.CREATED), (put ? codes.NO_CONTENT : codes.CREATED), {"Allow" : allow, Etag: hash});
						});
						break;
					case req.headers.etag !== hash:
						self.respond(res, req, null, codes.FAILED);
						break;
					default:
						self.respond(res, req, messages.ERROR_APPLICATION, codes.ERROR_APPLICATION);
				}
			});
		});
	}

	return this;
};

/**
 * Route handler
 * 
 * @param  {Object} res HTTP response Object
 * @param  {Object} req HTTP request Object
 * @return {Object}     Instance
 */
var handler = function (res, req, fn) {
	var self = this;

	res.on("close", function () {
		self.log(res, req);
	});

	fn.call(self, res, req);
	self.log(prep.call(self, res, req), false, self.config.debug);
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
	NO_CONTENT        : "",
	INVALID_ARGUMENTS : "Invalid arguments",
	INVALID_AUTH      : "Invalid authorization or OAuth token",
	FORBIDDEN         : "Forbidden",
	NOT_FOUND         : "Not found",
	NOT_ALLOWED       : "Method not allowed",
	CONFLICT          : "Conflict",
	ERROR_APPLICATION : "Application error",
	ERROR_SERVICE     : "Service is unavailable"
};

/**
 * Preparing log message
 * 
 * @param  {Object} res HTTP response Object
 * @param  {Object} req HTTP request Object
 * @return {String}     Log message
 */
var prep = function (res, req) {
	var msg    = this.config.logs.format,
	    parsed = url.parse(req.url);

	msg = msg.replace("{{host}}", req.headers.host)
	         .replace("{{time}}", new Date().toUTCString())
	         .replace("{{method}}", req.method)
	         .replace("{{path}}", parsed.pathname)
	         .replace("{{status}}", res.statusCode)
	         .replace("{{length}}", res.getHeader("Content-Length") || "-")
	         .replace("{{user-agent}}", req.headers["user-agent"] || "-");

	return msg;
}
module.exports = factory;
})(this);
