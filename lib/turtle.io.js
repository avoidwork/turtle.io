"use strict";

var _prototypeProperties = function (child, staticProps, instanceProps) { if (staticProps) Object.defineProperties(child, staticProps); if (instanceProps) Object.defineProperties(child.prototype, instanceProps); };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

/**
 * turtle.io
 *
 * Easy to use web server with virtual hosts & reverse proxies
 *
 * @author Jason Mulligan <jason.mulligan@avoidwork.com>
 * @copyright 2015 Jason Mulligan
 * @license BSD-3 <https://raw.github.com/avoidwork/turtle.io/master/LICENSE>
 * @link http://turtle.io
 * @version 3.2.5
 */
var constants = require("constants"),
    mmh3 = require("murmurhash3"),
    defaultConfig = require(__dirname + "/../config.json"),
    dtrace = require("dtrace-provider"),
    precise = require("precise"),
    util = require("keigai").util,
    array = util.array,
    clone = util.clone,
    csv = util.csv,
    iterate = util.iterate,
    lru = util.lru,
    number = util.number,
    merge = util.merge,
    parse = util.parse,
    json = util.json,
    request = util.request,
    string = util.string,
    fs = require("fs"),
    http = require("http"),
    https = require("https"),
    mime = require("mime"),
    moment = require("moment"),
    zlib = require("zlib"),
    ALL = "all",
    LOGGING = false,
    STALE = 60000,
    VERBS = ["delete", "get", "post", "put", "patch"],
    LOGLEVEL = undefined;

/**
 * RegExp cache
 *
 * @type {Object}
 */
var regex = {
	body: /^(put|post|patch)$/i,
	comp: /javascript|json|text|xml/,
	csv: /text\/csv/,
	end_slash: /\/$/,
	ext: /\.[\w+]{1,}$/, // 1 is for source code files, etc.
	head: /^(head|options)$/i,
	head_key: /:.*/,
	head_value: /.*:\s+/,
	get: /^(get|head|options)$/i,
	get_only: /^get$/i,
	def: /deflate/,
	dir: /\/$/,
	gzip: /gz/,
	ie: /msie/i,
	idevice: /ipad|iphone|ipod/i,
	indent: /application\/json\;\sindent=(\d+)/,
	safari: /safari\//i,
	chrome: /chrome\/|chromium\//i,
	json: /json/,
	json_wrap: /^[\[\{]/,
	next: /\..*/,
	nocache: /no-store|no-cache/i,
	nval: /;.*/,
	number: /\d{1,}/,
	"private": /private/,
	refused: /ECONNREFUSED/,
	rename: /^rename$/,
	root: /^\//,
	space: /\s+/,
	stream: /application|audio|chemical|conference|font|image|message|model|xml|video/
};

/**
 * HTTP status codes
 *
 * @type {Object}
 */
var CODES = {
	CONTINUE: 100,
	SWITCH_PROTOCOL: 101,
	SUCCESS: 200,
	CREATED: 201,
	ACCEPTED: 202,
	NON_AUTHORITATIVE: 203,
	NO_CONTENT: 204,
	RESET_CONTENT: 205,
	PARTIAL_CONTENT: 206,
	MULTIPLE_CHOICE: 300,
	MOVED: 301,
	FOUND: 302,
	SEE_OTHER: 303,
	NOT_MODIFIED: 304,
	USE_PROXY: 305,
	REDIRECT: 307,
	PERM_REDIRECT: 308,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	NOT_ALLOWED: 405,
	NOT_ACCEPTABLE: 406,
	PROXY_AUTH: 407,
	REQUEST_TIMEOUT: 408,
	CONFLICT: 409,
	GONE: 410,
	LENGTH_REQUIRED: 411,
	FAILED: 412,
	REQ_TOO_LARGE: 413,
	URI_TOO_LONG: 414,
	UNSUPPORTED_MEDIA: 415,
	NOT_SATISFIABLE: 416,
	EXPECTATION_FAILED: 417,
	SERVER_ERROR: 500,
	NOT_IMPLEMENTED: 501,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
	GATEWAY_TIMEOUT: 504,
	HTTP_NOT_SUPPORTED: 505
};

/**
 * Log levels
 *
 * @type {Array}
 */
var LEVELS = ["emerg", "alert", "crit", "error", "warn", "notice", "info", "debug"];

/**
 * HTTP (semantic) status messages
 *
 * @type {Object}
 */
var MESSAGES = {
	CONTINUE: "Continue",
	SWITCH_PROTOCOL: "Switching protocols",
	SUCCESS: "Success",
	CREATED: "Created",
	ACCEPTED: "Accepted",
	NON_AUTHORITATIVE: "Non-Authoritative Information",
	NO_CONTENT: "",
	RESET_CONTENT: "Reset Content",
	PARTIAL_CONTENT: "Partial Content",
	MULTIPLE_CHOICE: "Multiple Choices",
	MOVED: "Moved Permanently",
	FOUND: "Found",
	SEE_OTHER: "See Other",
	NOT_MODIFIED: "Not Modified",
	USE_PROXY: "Use Proxy",
	REDIRECT: "Temporary Redirect",
	PERM_REDIRECT: "Permanent Redirect",
	BAD_REQUEST: "Bad Request",
	UNAUTHORIZED: "Unauthorized",
	FORBIDDEN: "Forbidden",
	NOT_FOUND: "Not Found",
	NOT_ALLOWED: "Method Not Allowed",
	NOT_ACCEPTABLE: "Not Acceptable",
	PROXY_AUTH: "Proxy Authentication Required",
	REQUEST_TIMEOUT: "Request Timeout",
	CONFLICT: "Conflict",
	GONE: "Gone",
	LENGTH_REQUIRED: "Length Required",
	FAILED: "Precondition Failed",
	REQ_TOO_LARGE: "Request Entity Too Large",
	URI_TOO_LONG: "Request-URI Too Long",
	UNSUPPORTED_MEDIA: "Unsupported Media Type",
	NOT_SATISFIABLE: "Requested Range Not Satisfiable",
	EXPECTATION_FAILED: "Expectation Failed",
	SERVER_ERROR: "Internal Server Error",
	NOT_IMPLEMENTED: "Not Implemented",
	BAD_GATEWAY: "Bad Gateway",
	SERVICE_UNAVAILABLE: "Service Unavailable",
	GATEWAY_TIMEOUT: "Gateway Timeout",
	HTTP_NOT_SUPPORTED: "HTTP Version Not Supported"
};

var TurtleIO = (function () {
	/**
  * TurtleIO
  *
  * @constructor
  */

	function TurtleIO() {
		_classCallCheck(this, TurtleIO);

		this.config = {};
		this.codes = CODES;
		this.dtp = null;
		this.etags = lru(1000);
		this.levels = LEVELS;
		this.messages = MESSAGES;
		this.middleware = { all: {} };
		this.permissions = lru(1000);
		this.routeCache = lru(5000); // verbs * etags
		this.pages = { all: {} };
		this.server = null;
		this.vhosts = [];
		this.vhostsRegExp = [];
		this.watching = {};
	}

	_prototypeProperties(TurtleIO, null, {
		allowed: {

			/**
    * Verifies a method is allowed on a URI
    *
    * @method allowed
    * @param  {String}  method   HTTP verb
    * @param  {String}  uri      URI to query
    * @param  {String}  host     Hostname
    * @param  {Boolean} override Overrides cached version
    * @return {Boolean}          Boolean indicating if method is allowed
    */

			value: function allowed(method, uri, host, override) {
				var self = this;
				var timer = precise().start();
				var result = this.routes(uri, host, method, override);

				result = result.filter(function (i) {
					return self.config.noaction[i.hash || self.hash(i)] === undefined;
				});

				timer.stop();

				this.signal("allowed", function () {
					return [host, uri, method.toUpperCase(), timer.diff()];
				});

				return result.length > 0;
			},
			writable: true,
			configurable: true
		},
		allows: {

			/**
    * Determines which verbs are allowed against a URL
    *
    * @method allows
    * @param  {String}  uri      URI to query
    * @param  {String}  host     Hostname
    * @param  {Boolean} override Overrides cached version
    * @return {String}           Allowed methods
    */

			value: function allows(uri, host, override) {
				var self = this,
				    timer = precise().start(),
				    result = !override ? this.permissions.get(host + "_" + uri) : undefined;

				if (override || !result) {
					result = VERBS.filter(function (i) {
						return self.allowed(i, uri, host, override);
					});

					result = result.join(", ").toUpperCase().replace("GET", "GET, HEAD, OPTIONS");
					this.permissions.set(host + "_" + uri, result);
				}

				timer.stop();

				this.signal("allows", function () {
					return [host, uri, timer.diff()];
				});

				return result;
			},
			writable: true,
			configurable: true
		},
		blacklist: {

			/**
    * Adds a function the middleware 'no action' hash
    *
    * @method blacklist
    * @param  {Function} fn Function to add
    * @return {Object}      TurtleIO instance
    */

			value: function blacklist(fn) {
				var hfn = fn.hash || this.hash(fn.toString());

				if (this.config.noaction === undefined) {
					this.config.noaction = {};
				}

				if (!this.config.noaction[hfn]) {
					this.config.noaction[hfn] = 1;
				}

				return this;
			},
			writable: true,
			configurable: true
		},
		compress: {

			/**
    * Pipes compressed asset to Client
    *
    * @method compressed
    * @param  {Object}  req     HTTP(S) request Object
    * @param  {Object}  res     HTTP(S) response Object
    * @param  {Object}  body    Response body
    * @param  {Object}  type    gzip (gz) or deflate (df)
    * @param  {String}  etag    Etag
    * @param  {Boolean} file    Indicates `body` is a file path
    * @param  {Object}  options Stream options
    * @param  {Number}  status  HTTP status
    * @param  {Object}  headers HTTP headers
    * @return {Object}          TurtleIO instance
    */

			value: function compress(req, res, body, type, etag, file, options, status, headers) {
				var self = this,
				    timer = precise().start(),
				    method = regex.gzip.test(type) ? "createGzip" : "createDeflate",
				    sMethod = method.replace("create", "").toLowerCase(),
				    fp = etag ? this.config.tmp + "/" + etag + "." + type : null;

				var next = function (exist) {
					if (!file) {
						// Pipe Stream through compression to Client & disk
						if (typeof body.pipe == "function") {
							if (!res._header && !res._headerSent) {
								res.writeHead(status, headers);
							}

							body.pipe(zlib[method]()).pipe(res);
							body.pipe(zlib[method]()).pipe(fs.createWriteStream(fp));

							timer.stop();

							self.signal("compress", function () {
								return [etag, fp, timer.diff()];
							});
						}
						// Raw response body, compress and send to Client & disk
						else {
							zlib[sMethod](body, function (e, data) {
								if (e) {
									self.log(new Error("[client " + (req.headers["x-forwarded-for"] ? array.last(string.explode(req.headers["x-forwarded-for"])) : req.connection.remoteAddress) + "] " + e.message), "error");
									self.unregister(req.parsed.href);
									self.error(req, res, CODES.SERVER_ERROR);
								} else {
									if (!res._header && !res._headerSent) {
										headers["content-length"] = data.length;
										res.writeHead(status, headers);
									}

									res.end(data);

									if (fp) {
										fs.writeFile(fp, data, "utf8", function (e) {
											if (e) {
												self.log(new Error("[client " + (req.headers["x-forwarded-for"] ? array.last(string.explode(req.headers["x-forwarded-for"])) : req.connection.remoteAddress) + "] " + e.message), "error");
												self.unregister(req.parsed.href);
											}
										});
									}

									timer.stop();

									self.signal("compress", function () {
										return [etag, fp || "dynamic", timer.diff()];
									});
								}
							});
						}
					} else {
						if (!res._header && !res._headerSent) {
							res.writeHead(status, headers);
						}

						// Pipe compressed asset to Client
						fs.createReadStream(body, options).on("error", function (e) {
							self.log(new Error("[client " + (req.headers["x-forwarded-for"] ? array.last(string.explode(req.headers["x-forwarded-for"])) : req.connection.remoteAddress) + "] " + e.message), "error");
							self.unregister(req.parsed.href);
							self.error(req, res, CODES.SERVER_ERROR);
						}).pipe(zlib[method]()).pipe(res);

						// Pipe compressed asset to disk
						if (exist === false) {
							fs.createReadStream(body).on("error", function (e) {
								self.log(new Error("[client " + (req.headers["x-forwarded-for"] ? array.last(string.explode(req.headers["x-forwarded-for"])) : req.connection.remoteAddress) + "] " + e.message), "error");
							}).pipe(zlib[method]()).pipe(fs.createWriteStream(fp));
						}

						timer.stop();

						self.signal("compress", function () {
							return [etag, fp, timer.diff()];
						});
					}
				};

				if (fp) {
					fs.exists(fp, function (exist) {
						// Pipe compressed asset to Client
						if (exist) {
							fs.lstat(fp, function (e, stats) {
								if (e) {
									self.error(req, res, e);
								} else {
									if (!res._header && !res._headerSent) {
										headers["content-length"] = stats.size;

										if (options) {
											headers["content-range"] = "bytes " + options.start + "-" + options.end + "/" + headers["content-length"];
											headers["content-length"] = number.diff(options.end, options.start) + 1;
										}

										res.writeHead(status, headers);
									}

									fs.createReadStream(fp, options).on("error", function (e) {
										self.log(new Error("[client " + (req.headers["x-forwarded-for"] ? array.last(string.explode(req.headers["x-forwarded-for"])) : req.connection.remoteAddress) + "] " + e.message), "error");
										self.unregister(req.parsed.href);
										self.error(req, res, CODES.SERVER_ERROR);
									}).pipe(res);

									timer.stop();

									self.signal("compress", function () {
										return [etag, fp, timer.diff()];
									});
								}
							});
						} else {
							next(exist);
						}
					});
				} else {
					next(false);
				}

				return this;
			},
			writable: true,
			configurable: true
		},
		compression: {

			/**
    * Determines what/if compression is supported for a request
    *
    * @method compression
    * @param  {String} agent    User-Agent header value
    * @param  {String} encoding Accept-Encoding header value
    * @param  {String} mimetype Mime type of response body
    * @return {Mixed}           Supported compression or null
    */

			value: function compression(agent, encoding, mimetype) {
				var timer = precise().start(),
				    result = null,
				    encodings = typeof encoding == "string" ? string.explode(encoding) : [];

				// Safari can't handle compression for proxies (socket doesn't close) or on an iDevice for simple GETs
				if (this.config.compress === true && regex.comp.test(mimetype) && !regex.ie.test(agent) && !regex.idevice.test(agent) && (!regex.safari.test(agent) || regex.chrome.test(agent))) {
					// Iterating supported encodings
					array.iterate(encodings, function (i) {
						if (regex.gzip.test(i)) {
							result = "gz";
						} else if (regex.def.test(i)) {
							result = "zz";
						}

						// Found a supported encoding
						if (result !== null) {
							return false;
						}
					});
				}

				timer.stop();

				this.signal("compression", function () {
					return [agent, timer.diff()];
				});

				return result;
			},
			writable: true,
			configurable: true
		},
		encode: {

			/**
    * Encodes `arg` as JSON if applicable
    *
    * @method encode
    * @param  {Mixed}  arg    Object to encode
    * @param  {String} accept Accept HTTP header
    * @return {Mixed}         Original Object or JSON string
    */

			value: function encode(arg, accept) {
				var header = undefined,
				    indent = undefined;

				// Do not want to coerce this Object to a String!
				if (arg instanceof Buffer || typeof arg.pipe == "function") {
					return arg;
				}
				// Converting to JSON
				else if (arg instanceof Array || arg instanceof Object) {
					header = regex.indent.exec(accept);
					indent = header !== null ? parseInt(header[1], 10) : this.config.json;

					return JSON.stringify(arg, null, indent);
				}
				// Nothing to do, leave it as it is
				else {
					return arg;
				}
			},
			writable: true,
			configurable: true
		},
		error: {

			/**
    * Error handler for requests
    *
    * @method error
    * @param  {Object} req    Request Object
    * @param  {Object} res    Response Object
    * @param  {Number} status [Optional] HTTP status code
    * @param  {String} msg    [Optional] Response body
    * @return {Object}        TurtleIO instance
    */

			value: function error(req, res, status, msg) {
				var timer = precise().start(),
				    method = req.method.toLowerCase(),
				    host = req.parsed ? req.parsed.hostname : ALL,
				    kdx = -1,
				    body = undefined;

				if (isNaN(status)) {
					status = CODES.NOT_FOUND;

					// If valid, determine what kind of error to respond with
					if (!regex.get.test(method) && !regex.head.test(method)) {
						if (this.allowed(method, req.parsed.pathname, req.vhost)) {
							status = CODES.SERVER_ERROR;
						} else {
							status = CODES.NOT_ALLOWED;
						}
					}
				}

				body = this.page(status, host);

				array.iterate(array.cast(CODES), function (i, idx) {
					if (i === status) {
						kdx = idx;
						return false;
					}
				});

				if (msg === undefined) {
					msg = kdx ? array.cast(MESSAGES)[kdx] : "Unknown error";
				}

				this.log(new Error("[client " + (req.headers["x-forwarded-for"] ? array.last(string.explode(req.headers["x-forwarded-for"])) : req.connection.remoteAddress) + "] " + msg), "debug");

				timer.stop();

				this.signal("error", function () {
					return [req.headers.host, req.parsed.path, status, msg, timer.diff()];
				});

				return this.respond(req, res, body, status, {
					"cache-control": "no-cache",
					"content-length": Buffer.byteLength(body)
				});
			},
			writable: true,
			configurable: true
		},
		etag: {

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

			value: function etag() {
				return this.hash(array.cast(arguments).join("-"));
			},
			writable: true,
			configurable: true
		},
		handle: {

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

			value: function handle(req, res, path, url, dir, stat) {
				var self = this,
				    allow = undefined,
				    del = undefined,
				    etag = undefined,
				    headers = undefined,
				    method = undefined,
				    mimetype = undefined,
				    modified = undefined,
				    size = undefined,
				    write = undefined;

				allow = req.allow;
				write = allow.indexOf(dir ? "POST" : "PUT") > -1;
				del = allow.indexOf("DELETE") > -1;
				method = req.method;

				// File request
				if (!dir) {
					if (regex.get.test(method)) {
						mimetype = mime.lookup(path);
						size = stat.size;
						modified = stat.mtime.toUTCString();
						etag = "\"" + this.etag(url, size, stat.mtime) + "\"";
						headers = {
							allow: allow,
							"content-length": size,
							"content-type": mimetype,
							etag: etag,
							"last-modified": modified
						};

						if (method === "GET") {
							// Decorating path for watcher
							req.path = path;

							// Client has current version
							if (req.headers["if-none-match"] === etag || !req.headers["if-none-match"] && Date.parse(req.headers["if-modified-since"]) >= stat.mtime) {
								this.respond(req, res, MESSAGES.NO_CONTENT, CODES.NOT_MODIFIED, headers, true);
							}
							// Sending current version
							else {
								this.respond(req, res, path, CODES.SUCCESS, headers, true);
							}
						} else {
							this.respond(req, res, MESSAGES.NO_CONTENT, CODES.SUCCESS, headers, true);
						}
					} else if (method === "DELETE" && del) {
						this.unregister(this.url(req));

						fs.unlink(path, function (e) {
							if (e) {
								self.error(req, req, CODES.SERVER_ERROR);
							} else {
								self.respond(req, res, MESSAGES.NO_CONTENT, CODES.NO_CONTENT, {});
							}
						});
					} else if (method === "PUT" && write) {
						this.write(req, res, path);
					} else {
						this.error(req, req, CODES.SERVER_ERROR);
					}
				}
				// Directory request
				else {
					if ((method === "POST" || method === "PUT") && write) {
						this.write(req, res, path);
					} else if (method === "DELETE" && del) {
						this.unregister(req.parsed.href);

						fs.unlink(path, function (e) {
							if (e) {
								self.error(req, req, CODES.SERVER_ERROR);
							} else {
								self.respond(req, res, MESSAGES.NO_CONTENT, CODES.NO_CONTENT, {});
							}
						});
					} else {
						this.error(req, req, CODES.NOT_ALLOWED);
					}
				}

				return this;
			},
			writable: true,
			configurable: true
		},
		hash: {

			/**
    * Creates a hash of arg
    *
    * @method hash
    * @param  {Mixed}    arg String or Buffer
    * @param  {Function} cb  [Optional] Callback function, triggers async behavior
    * @return {String}       Hash of arg
    */

			value: function hash(arg, cb) {
				if (typeof arg != "string" && !(arg instanceof Buffer)) {
					arg = "";
				}

				if (cb === undefined) {
					return mmh3.murmur32HexSync(arg, this.config.seed);
				} else {
					mmh3.murmur32Hex(arg, this.config.seed, function (e, value) {
						if (e) {
							cb(e, null);
						} else {
							cb(null, value);
						}
					});
				}
			},
			writable: true,
			configurable: true
		},
		headers: {

			/**
    * Sets response headers
    *
    * @method headers
    * @param  {Object}  req      Request Object
    * @param  {Object}  rHeaders Response headers
    * @param  {Number}  status   HTTP status code, default is 200
    * @return {Object}           Response headers
    */

			value: function headers(req, rHeaders, status) {
				var timer = precise().start(),
				    get = regex.get.test(req.method),
				    headers = undefined;

				// Decorating response headers
				if (status !== CODES.NOT_MODIFIED && status >= CODES.MULTIPLE_CHOICE && status < CODES.BAD_REQUEST) {
					headers = rHeaders;
				} else if (rHeaders instanceof Object) {
					headers = clone(this.config.headers, true);
					merge(headers, rHeaders);
					headers.allow = req.allow;

					if (!headers.date) {
						headers.date = new Date().toUTCString();
					}

					if (req.cors) {
						if ((req.method == "OPTIONS" || req.headers["x-requested-with"]) && headers["access-control-allow-origin"] === "*") {
							headers["access-control-allow-origin"] = req.headers.origin || req.headers.referer.replace(/\/$/, "");
							headers["access-control-allow-credentials"] = "true";
						}

						headers["access-control-allow-methods"] = headers.allow;
					} else {
						delete headers["access-control-allow-origin"];
						delete headers["access-control-expose-headers"];
						delete headers["access-control-max-age"];
						delete headers["access-control-allow-credentials"];
						delete headers["access-control-allow-methods"];
						delete headers["access-control-allow-headers"];
					}

					// Decorating "Transfer-Encoding" header
					if (!headers["transfer-encoding"]) {
						headers["transfer-encoding"] = "identity";
					}

					// Removing headers not wanted in the response
					if (!get || status >= CODES.BAD_REQUEST) {
						delete headers["cache-control"];
						delete headers.etag;
						delete headers["last-modified"];
					}

					if (status === CODES.NOT_MODIFIED) {
						delete headers["last-modified"];
					}

					if (status === CODES.NOT_FOUND && headers.allow || status >= CODES.SERVER_ERROR) {
						delete headers["accept-ranges"];
					}

					if (!headers["last-modified"]) {
						delete headers["last-modified"];
					}
				}

				headers.status = status + " " + http.STATUS_CODES[status];

				timer.stop();

				this.signal("headers", function () {
					return [status, timer.diff()];
				});

				return headers;
			},
			writable: true,
			configurable: true
		},
		host: {

			/**
    * Registers a virtual host
    *
    * @method host
    * @param  {String} arg Virtual host
    * @return {Object}     TurtleIO instance
    */

			value: function host(arg) {
				if (!array.contains(this.vhosts, arg)) {
					this.vhosts.push(arg);
					this.vhostsRegExp.push(new RegExp("^" + arg.replace(/\*/g, ".*") + "$"));
				}

				return this;
			},
			writable: true,
			configurable: true
		},
		log: {

			/**
    * Logs a message
    *
    * @method log
    * @param  {Mixed}  arg   Error Object or String
    * @param  {String} level [Optional] `level` must match a valid LogLevel - http://httpd.apache.org/docs/1.3/mod/core.html#loglevel, default is `notice`
    * @return {Object}       TurtleIO instance
    */

			value: function log(arg, level) {
				var self = undefined,
				    timer = undefined,
				    e = undefined;

				if (LOGGING) {
					self = this;
					timer = precise().start();
					e = arg instanceof Error;
					level = level || "notice";

					if (this.config.logs.stdout && LEVELS.indexOf(level) <= LOGLEVEL) {
						if (e) {
							console.error("[" + moment().format(this.config.logs.time) + "] [" + level + "] " + (arg.stack || arg.message || arg));
						} else {
							console.log(arg);
						}
					}

					timer.stop();

					this.signal("log", function () {
						return [level, self.config.logs.stdout, false, timer.diff()];
					});
				}

				return this;
			},
			writable: true,
			configurable: true
		},
		page: {

			/**
    * Gets an HTTP status page
    *
    * @method page
    * @param  {Number} code HTTP status code
    * @param  {String} host Virtual hostname
    * @return {String}      Response body
    */

			value: function page(code, host) {
				host = host && this.pages[host] ? host : ALL;

				return this.pages[host][code] || this.pages[host]["500"] || this.pages.all["500"];
			},
			writable: true,
			configurable: true
		},
		probes: {

			/**
    * Registers dtrace probes
    *
    * @method probes
    * @return {Object} TurtleIO instance
    */

			value: function probes() {
				this.dtp.addProbe("allowed", "char *", "char *", "char *", "int");
				this.dtp.addProbe("allows", "char *", "char *", "int");
				this.dtp.addProbe("compress", "char *", "char *", "int");
				this.dtp.addProbe("compression", "char *", "int");
				this.dtp.addProbe("error", "char *", "char *", "int", "char *", "int");
				this.dtp.addProbe("headers", "int", "int");
				this.dtp.addProbe("log", "char *", "int", "int", "int");
				this.dtp.addProbe("proxy", "char *", "char *", "char *", "char *", "int");
				this.dtp.addProbe("middleware", "char *", "char *", "int");
				this.dtp.addProbe("request", "char *", "int");
				this.dtp.addProbe("respond", "char *", "char *", "char *", "int", "int");
				this.dtp.addProbe("status", "int", "int", "int", "int", "int");
				this.dtp.addProbe("write", "char *", "char *", "char *", "char *", "int");
				this.dtp.enable();
			},
			writable: true,
			configurable: true
		},
		prep: {

			/**
    * Preparing log message
    *
    * @method prep
    * @param  {Object} req     HTTP(S) request Object
    * @param  {Object} res     HTTP(S) response Object
    * @param  {Object} headers HTTP(S) response headers
    * @return {String}         Log message
    */

			value: function prep(req, res, headers) {
				var msg = this.config.logs.format,
				    user = req.parsed ? req.parsed.auth.split(":")[0] || "-" : "-";

				msg = msg.replace("%v", req.headers.host).replace("%h", req.ip || "-").replace("%l", "-").replace("%u", user).replace("%t", "[" + moment().format(this.config.logs.time) + "]").replace("%r", req.method + " " + req.url + " HTTP/1.1").replace("%>s", res.statusCode).replace("%b", headers["content-length"] || "-").replace("%{Referer}i", req.headers.referer || "-").replace("%{User-agent}i", req.headers["user-agent"] || "-");

				return msg;
			},
			writable: true,
			configurable: true
		},
		proxy: {

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

			value: function proxy(route, origin, host, stream) {
				stream = stream === true;
				var self = this;

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
				var handle = function (req, res, arg, xhr) {
					var etag = "",
					    regexOrigin = new RegExp(origin.replace(regex.end_slash, ""), "g"),
					    url = req.parsed.href,
					    stale = STALE,
					    get = req.method === "GET",
					    rewriteOrigin = req.parsed.protocol + "//" + req.parsed.host + (route == "/" ? "" : route),
					    cached = undefined,
					    resHeaders = undefined,
					    rewrite = undefined;

					resHeaders = headers(xhr.getAllResponseHeaders());
					resHeaders.via = (resHeaders.via ? resHeaders.via + ", " : "") + resHeaders.server;
					resHeaders.server = self.config.headers.server;

					// Something went wrong
					if (xhr.status < CODES.CONTINUE) {
						self.error(req, res, CODES.BAD_GATEWAY);
					} else if (xhr.status >= CODES.SERVER_ERROR) {
						self.error(req, res, xhr.status);
					} else {
						// Determining if the response will be cached
						if (get && (xhr.status === CODES.SUCCESS || xhr.status === CODES.NOT_MODIFIED) && !regex.nocache.test(resHeaders["cache-control"]) && !regex["private"].test(resHeaders["cache-control"])) {
							// Determining how long rep is valid
							if (resHeaders["cache-control"] && regex.number.test(resHeaders["cache-control"])) {
								stale = number.parse(regex.number.exec(resHeaders["cache-control"])[0], 10);
							} else if (resHeaders.expires !== undefined) {
								stale = new Date(resHeaders.expires);
								stale = number.diff(stale, new Date());
							}

							// Removing from LRU when invalid
							if (stale > 0) {
								setTimeout(function () {
									self.unregister(url);
								}, stale * 1000);
							}
						}

						if (xhr.status !== CODES.NOT_MODIFIED) {
							rewrite = regex.rewrite.test((resHeaders["content-type"] || "").replace(regex.nval, ""));

							// Setting headers
							if (get && xhr.status === CODES.SUCCESS) {
								etag = resHeaders.etag || "\"" + self.etag(url, resHeaders["content-length"] || 0, resHeaders["last-modified"] || 0, self.encode(arg)) + "\"";

								if (resHeaders.etag !== etag) {
									resHeaders.etag = etag;
								}
							}

							if (resHeaders.allow === undefined || string.isEmpty(resHeaders.allow)) {
								resHeaders.allow = resHeaders["access-control-allow-methods"] || "GET";
							}

							// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
							if (get && req.headers["if-none-match"] === etag) {
								cached = self.etags.get(url);

								if (cached) {
									resHeaders.age = parseInt(new Date().getTime() / 1000 - cached.value.timestamp, 10);
								}

								self.respond(req, res, MESSAGES.NO_CONTENT, CODES.NOT_MODIFIED, resHeaders);
							} else {
								if (regex.head.test(req.method.toLowerCase())) {
									arg = MESSAGES.NO_CONTENT;
								}
								// Fixing root path of response
								else if (rewrite) {
									// Changing the size of the response body
									delete resHeaders["content-length"];

									if (arg instanceof Array || arg instanceof Object) {
										arg = json.encode(arg, req.headers.accept).replace(regexOrigin, rewriteOrigin);

										if (route !== "/") {
											arg = arg.replace(/"(\/[^?\/]\w+)\//g, "\"" + route + "$1/");
										}

										arg = json.decode(arg);
									} else if (typeof arg == "string") {
										arg = arg.replace(regexOrigin, rewriteOrigin);

										if (route !== "/") {
											arg = arg.replace(/(href|src)=("|')([^http|mailto|<|_|\s|\/\/].*?)("|')/g, "$1=$2" + route + "/$3$4").replace(new RegExp(route + "//", "g"), route + "/");
										}
									}
								}

								self.respond(req, res, arg, xhr.status, resHeaders);
							}
						} else {
							self.respond(req, res, arg, xhr.status, resHeaders);
						}
					}
				};

				/**
     * Converts HTTP header String to an Object
     *
     * @method headers
     * @private
     * @param  {Object} args Response headers
     * @return {Object}      Reshaped response headers
     */
				var headers = function (args) {
					var result = {};

					if (!string.isEmpty(args)) {
						array.iterate(string.trim(args).split("\n"), function (i) {
							var header = undefined,
							    value = undefined;

							value = i.replace(regex.headVAL, "");
							header = i.replace(regex.headKEY, "").toLowerCase();
							result[header] = !isNaN(value) ? Number(value) : value;
						});
					}

					return result;
				};

				/**
     * Wraps the proxy request
     *
     * @method wrapper
     * @private
     * @param  {Object} req HTTP(S) request Object
     * @param  {Object} res HTTP(S) response Object
     * @return {Undefined}  undefined
     */
				var wrapper = function (req, res) {
					var timer = precise().start(),
					    url = origin + (route !== "/" ? req.url.replace(new RegExp("^" + route), "") : req.url),
					    method = req.method.toLowerCase(),
					    headerz = clone(req.headers, true),
					    parsed = parse(url),
					    cached = self.etags.get(url),
					    streamd = stream === true,
					    mimetype = cached ? cached.mimetype : mime.lookup(!regex.ext.test(parsed.pathname) ? "index.htm" : parsed.pathname),
					    defer = undefined,
					    fn = undefined,
					    options = undefined,
					    proxyReq = undefined,
					    xhr = undefined;

					// Facade to handle()
					fn = function (arg) {
						timer.stop();

						self.signal("proxy", function () {
							return [req.headers.host, req.method, route, origin, timer.diff()];
						});

						handle(req, res, arg, xhr);
					};

					// Streaming formats that do not need to be rewritten
					if (!streamd && (regex.ext.test(parsed.pathname) && !regex.json.test(mimetype)) && regex.stream.test(mimetype)) {
						streamd = true;
					}

					// Identifying proxy behavior
					headerz["x-host"] = parsed.host;
					headerz["x-forwarded-for"] = headerz["x-forwarded-for"] ? headerz["x-forwarded-for"] + ", " + req.ip : req.ip;
					headerz["x-forwarded-proto"] = parsed.protocol.replace(":", "");
					headerz["x-forwarded-server"] = self.config.headers.server;

					if (!headerz["x-real-ip"]) {
						headerz["x-real-ip"] = req.ip;
					}

					// Streaming response to Client
					if (streamd) {
						headerz.host = req.headers.host;

						options = {
							headers: headerz,
							hostname: parsed.hostname,
							method: req.method,
							path: parsed.path,
							port: parsed.port || 80
						};

						if (!string.isEmpty(parsed.auth)) {
							options.auth = parsed.auth;
						}

						proxyReq = http.request(options, function (proxyRes) {
							res.writeHeader(proxyRes.statusCode, proxyRes.headers);
							proxyRes.pipe(res);
						});

						proxyReq.on("error", function (e) {
							self.error(req, res, regex.refused.test(e.message) ? CODES.SERVER_UNAVAILABLE : CODES.SERVER_ERROR);
						});

						if (regex.body.test(req.method)) {
							proxyReq.write(req.body);
						}

						proxyReq.end();
					}
					// Acting as a RESTful proxy
					else {
						// Removing support for compression so the response can be rewritten (if textual)
						delete headerz["accept-encoding"];

						defer = request(url, method, req.body, headerz);
						xhr = defer.xhr;

						defer.then(fn, fn);
					}
				};

				// Setting route
				array.iterate(VERBS, function (i) {
					if (route === "/") {
						self[i]("/.*", wrapper, host);
					} else {
						self[i](route, wrapper, host);
						self[i](route + "/.*", wrapper, host);
					}
				});

				return this;
			},
			writable: true,
			configurable: true
		},
		redirect: {

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

			value: function redirect(route, url, host, permanent) {
				var _this = this;

				var code = CODES[permanent === true ? "MOVED" : "REDIRECT"],
				    pattern = new RegExp("^" + route + "$");

				this.get(route, function (req, res) {
					var rewrite = (pattern.exec(req.url) || []).length > 0;

					_this.respond(req, res, MESSAGES.NO_CONTENT, code, {
						Location: rewrite ? req.url.replace(pattern, url) : url,
						"Cache-Control": "no-cache"
					});
				}, host);

				return this;
			},
			writable: true,
			configurable: true
		},
		register: {

			/**
    * Registers an Etag in the LRU cache
    *
    * @method register
    * @param  {String}  url   URL requested
    * @param  {Object}  state Object describing state `{etag: $etag, mimetype: $mimetype}`
    * @param  {Boolean} stale [Optional] Remove cache from disk
    * @return {Object}        TurtleIO instance
    */

			value: function register(url, state, stale) {
				var cached = undefined;

				// Removing stale cache from disk
				if (stale === true) {
					cached = this.etags.cache[url];

					if (cached && cached.value.etag !== state.etag) {
						this.unregister(url);
					}
				}

				// Updating LRU
				this.etags.set(url, state);

				return this;
			},
			writable: true,
			configurable: true
		},
		request: {

			/**
    * Request handler which provides RESTful CRUD operations
    *
    * @method request
    * @public
    * @param  {Object} req HTTP(S) request Object
    * @param  {Object} res HTTP(S) response Object
    * @return {Object}     TurtleIO instance
    */

			value: function request(req, res) {
				var self = this,
				    timer = precise().start(),
				    method = req.method,
				    handled = false,
				    host = req.vhost,
				    pathname = req.parsed.pathname.replace(regex.root, ""),
				    invalid = (pathname.replace(regex.dir, "").split("/").filter(function (i) {
					return i != ".";
				})[0] || "") == "..",
				    out_dir = !invalid ? (pathname.match(/\.{2}\//g) || []).length : 0,
				    in_dir = !invalid ? (pathname.match(/\w+?(\.\w+|\/)+/g) || []).length : 0,
				    count = undefined,
				    path = undefined,
				    nth = undefined,
				    root = undefined;

				var end = function () {
					timer.stop();
					self.signal("request", function () {
						return [req.parsed.href, timer.diff()];
					});
				};

				// If an expectation can't be met, don't try!
				if (req.headers.expect) {
					end();
					return this.error(req, res, CODES.EXPECTATION_FAILED);
				}

				// Are we still in the virtual host root?
				if (invalid || out_dir > 0 && out_dir >= in_dir) {
					end();
					return this.error(req, res, CODES.NOT_FOUND);
				}

				// Preparing file path
				root = this.config.root + "/" + this.config.vhosts[host];
				path = (root + req.parsed.pathname).replace(regex.dir, "");

				// Determining if the request is valid
				fs.lstat(path, function (e, stats) {
					if (e) {
						end();
						self.error(req, res, CODES.NOT_FOUND);
					} else if (!stats.isDirectory()) {
						end();
						self.handle(req, res, path, req.parsed.href, false, stats);
					} else if (regex.get.test(method) && !regex.dir.test(req.parsed.pathname)) {
						end();
						self.respond(req, res, MESSAGES.NO_CONTENT, CODES.REDIRECT, { Location: (req.parsed.pathname != "/" ? req.parsed.pathname : "") + "/" + req.parsed.search });
					} else if (!regex.get.test(method)) {
						end();
						self.handle(req, res, path, req.parsed.href, true);
					} else {
						count = 0;
						nth = self.config.index.length;
						path += "/";

						array.iterate(self.config.index, function (i) {
							fs.lstat(path + i, function (e, stats) {
								if (!e && !handled) {
									handled = true;
									end();
									self.handle(req, res, path + i, (req.parsed.pathname != "/" ? req.parsed.pathname : "") + "/" + i + req.parsed.search, false, stats);
								} else if (++count === nth && !handled) {
									end();
									self.error(req, res, CODES.NOT_FOUND);
								}
							});
						});
					}
				});

				return this;
			},
			writable: true,
			configurable: true
		},
		respond: {

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

			value: function respond(req, res, body, status, headers, file) {
				var head = regex.head.test(req.method),
				    self = this,
				    timer = precise().start(),
				    ua = req.headers["user-agent"],
				    encoding = req.headers["accept-encoding"],
				    type = undefined,
				    options = undefined;

				var finalize = function () {
					var cheaders = undefined,
					    cached = undefined;

					if (status === CODES.NOT_MODIFIED || status < CODES.MULTIPLE_CHOICE || status >= CODES.BAD_REQUEST) {
						// req.parsed may not exist if coming from `error()`
						if (req.parsed) {
							if (req.method === "GET" && status === CODES.SUCCESS) {
								// Updating cache
								if (!regex.nocache.test(headers["cache-control"]) && !regex["private"].test(headers["cache-control"])) {
									if (headers.etag === undefined) {
										headers.etag = "\"" + self.etag(req.parsed.href, body.length || 0, headers["last-modified"] || 0, body || 0) + "\"";
									}

									cheaders = clone(headers, true);

									delete cheaders["access-control-allow-origin"];
									delete cheaders["access-control-expose-headers"];
									delete cheaders["access-control-max-age"];
									delete cheaders["access-control-allow-credentials"];
									delete cheaders["access-control-allow-methods"];
									delete cheaders["access-control-allow-headers"];

									cached = self.etags.get(req.parsed.href);

									if (!cached) {
										self.register(req.parsed.href, {
											etag: cheaders.etag.replace(/"/g, ""),
											headers: cheaders,
											mimetype: cheaders["content-type"],
											timestamp: parseInt(new Date().getTime() / 1000, 10)
										}, true);
									}
								}

								// Setting a watcher on the local path
								if (req.path) {
									self.watch(req.parsed.href, req.path);
								}
							}
						} else {
							delete headers.allow;
							delete headers["access-control-allow-methods"];
						}
					}
				};

				if (body === null || body === undefined) {
					body = MESSAGES.NO_CONTENT;
				}

				status = status || CODES.SUCCESS;
				headers = this.headers(req, headers || { "content-type": "text/plain" }, status);
				file = file === true;

				if (head) {
					delete headers.etag;
					delete headers["last-modified"];
				}

				if (!file && body !== MESSAGES.NO_CONTENT) {
					body = this.encode(body, req.headers.accept);

					if (headers["content-length"] === undefined) {
						if (body instanceof Buffer) {
							headers["content-length"] = Buffer.byteLength(body.toString());
						} else if (typeof body == "string") {
							headers["content-length"] = Buffer.byteLength(body);
						}
					}

					headers["content-length"] = headers["content-length"] || 0;

					if (head) {
						body = MESSAGES.NO_CONTENT;

						if (req.method === "OPTIONS") {
							headers["content-length"] = 0;
							delete headers["content-type"];
						}
					}

					// Ensuring JSON has proper mimetype
					if (regex.json_wrap.test(body)) {
						headers["content-type"] = "application/json";
					}

					if (req.method === "GET") {
						// CSV hook
						if (status === CODES.SUCCESS && body && headers["content-type"] === "application/json" && req.headers.accept && regex.csv.test(string.explode(req.headers.accept)[0].replace(regex.nval, ""))) {
							headers["content-type"] = "text/csv";

							if (!headers["content-disposition"]) {
								headers["content-disposition"] = "attachment; filename=\"" + req.parsed.pathname.replace(/.*\//g, "").replace(/\..*/, "_") + req.parsed.search.replace("?", "").replace(/\&/, "_") + ".csv\"";
							}

							body = csv.encode(body);
						}
					}
				}

				// Fixing 'accept-ranges' for non-filesystem based responses
				if (!file) {
					delete headers["accept-ranges"];
				}

				if (status === CODES.NOT_MODIFIED) {
					delete headers["accept-ranges"];
					delete headers["content-encoding"];
					delete headers["content-length"];
					delete headers["content-type"];
					delete headers.date;
					delete headers["transfer-encoding"];
				}

				// Clean up, in case it these are still hanging around
				if (status === CODES.NOT_FOUND) {
					delete headers.allow;
					delete headers["access-control-allow-methods"];
				}

				// Setting `x-response-time`
				headers["x-response-time"] = ((req.timer.stopped === null ? req.timer.stop() : req.timer).diff() / 1000000).toFixed(2) + " ms";

				// Setting the partial content headers
				if (req.headers.range) {
					options = {};

					array.iterate(req.headers.range.match(/\d+/g) || [], function (i, idx) {
						options[idx === 0 ? "start" : "end"] = parseInt(i, 10);
					});

					if (options.end === undefined) {
						options.end = headers["content-length"];
					}

					if (isNaN(options.start) || isNaN(options.end) || options.start >= options.end) {
						delete req.headers.range;
						return this.error(req, res, CODES.NOT_SATISFIABLE);
					}

					status = CODES.PARTIAL_CONTENT;
					headers.status = status + " " + http.STATUS_CODES[status];
					headers["content-range"] = "bytes " + options.start + "-" + options.end + "/" + headers["content-length"];
					headers["content-length"] = number.diff(options.end, options.start) + 1;
				}

				// Determining if response should be compressed
				if (ua && (status === CODES.SUCCESS || status === CODES.PARTIAL_CONTENT) && body !== MESSAGES.NO_CONTENT && this.config.compress && (type = this.compression(ua, encoding, headers["content-type"])) && type !== null) {
					headers["content-encoding"] = regex.gzip.test(type) ? "gzip" : "deflate";

					if (file) {
						headers["transfer-encoding"] = "chunked";
					}

					finalize();

					this.compress(req, res, body, type, headers.etag ? headers.etag.replace(/"/g, "") : undefined, file, options, status, headers);
				} else if ((status === CODES.SUCCESS || status === CODES.PARTIAL_CONTENT) && file && req.method === "GET") {
					headers["transfer-encoding"] = "chunked";

					finalize();

					if (!res._header && !res._headerSent) {
						res.writeHead(status, headers);
					}

					fs.createReadStream(body, options).on("error", function (e) {
						self.log(new Error("[client " + (req.headers["x-forwarded-for"] ? array.last(string.explode(req.headers["x-forwarded-for"])) : req.connection.remoteAddress) + "] " + e.message), "error");
						self.error(req, res, CODES.SERVER_ERROR);
					}).pipe(res);
				} else {
					finalize();

					if (!res._header && !res._headerSent) {
						res.writeHead(status, headers);
					}

					res.end(status === CODES.PARTIAL_CONTENT ? body.slice(options.start, options.end) : body);
				}

				timer.stop();

				this.signal("respond", function () {
					return [req.headers.host, req.method, req.url, status, timer.diff()];
				});

				return this.log(this.prep(req, res, headers), "info");
			},
			writable: true,
			configurable: true
		},
		restart: {

			/**
    * Restarts the instance
    *
    * @method restart
    * @return {Object} TurtleIO instance
    */

			value: function restart() {
				var config = this.config;

				return this.stop().start(config);
			},
			writable: true,
			configurable: true
		},
		route: {

			/**
    * Routes a request to a handler
    *
    * @method route
    * @param  {Object} req Request Object
    * @param  {Object} res Response Object
    * @return {Object}     TurtleIO instance
    */

			value: function route(req, res) {
				var self = this,
				    url = this.url(req),
				    method = req.method.toLowerCase(),
				    parsed = parse(url),
				    update = false,
				    payload = undefined;

				if (regex.head.test(method)) {
					method = "get";
				}

				// Decorating parsed Object on request
				req.parsed = parsed;
				req.query = parsed.query;
				req.ip = req.headers["x-forwarded-for"] ? array.last(string.explode(req.headers["x-forwarded-for"])) : req.connection.remoteAddress;
				req.server = this;
				req.timer = precise().start();

				// Finding a matching vhost
				array.iterate(this.vhostsRegExp, function (i, idx) {
					if (i.test(parsed.hostname)) {
						return !(req.vhost = self.vhosts[idx]);
					}
				});

				req.vhost = req.vhost || this.config["default"];

				// Adding middleware to avoid the round trip next time
				if (!this.allowed("get", req.parsed.pathname, req.vhost)) {
					this.get(req.parsed.pathname, function (req, res) {
						self.request(req, res);
					}, req.vhost);

					update = true;
				}

				req.allow = this.allows(req.parsed.pathname, req.vhost, update);
				req.body = "";

				// Decorating response
				res.redirect = function (uri) {
					self.respond(req, res, MESSAGES.NO_CONTENT, CODES.FOUND, { location: uri });
				};

				res.respond = function (arg, status, headers) {
					self.respond(req, res, arg, status, headers);
				};

				res.error = function (status, arg) {
					self.error(req, res, status, arg);
				};

				// Mimic express for middleware interoperability
				res.locals = {};
				res.header = res.setHeader;

				// Setting listeners if expecting a body
				if (regex.body.test(method)) {
					req.setEncoding("utf-8");

					req.on("data", function (data) {
						payload = payload === undefined ? data : payload + data;

						if (self.config.maxBytes > 0 && Buffer.byteLength(payload) > self.config.maxBytes) {
							req.invalid = true;
							self.error(req, res, CODES.REQ_TOO_LARGE);
						}
					});

					req.on("end", function () {
						if (!req.invalid) {
							if (payload) {
								req.body = payload;
							}

							self.run(req, res, req.vhost, method);
						}
					});
				}
				// Running middleware
				else {
					self.run(req, res, req.vhost, method);
				}

				return this;
			},
			writable: true,
			configurable: true
		},
		routes: {

			/**
    * Returns middleware for the uri
    *
    * @method result
    * @param  {String}  uri      URI to query
    * @param  {String}  host     Hostname
    * @param  {String}  method   HTTP verb
    * @param  {Boolean} override Overrides cached version
    * @return {Array}
    */

			value: function routes(uri, host, method, override) {
				var id = method + ":" + host + ":" + uri,
				    cached = override !== true && this.routeCache.get(id),
				    all = undefined,
				    h = undefined,
				    result = undefined;

				if (cached) {
					return cached;
				}

				all = this.middleware.all || {};
				h = this.middleware[host] || {};
				result = [];

				try {
					array.iterate([all.all, all[method], h.all, h[method]], function (c) {
						if (c) {
							array.iterate(array.keys(c).filter(function (i) {
								return new RegExp("^" + i + "$", "i").test(uri);
							}), function (i) {
								result = result.concat(c[i]);
							});
						}
					});
				} catch (e) {
					result = [];
				}

				this.routeCache.set(id, result);

				return result;
			},
			writable: true,
			configurable: true
		},
		run: {

			/**
    * Runs middleware in a chain
    *
    * @method run
    * @param  {Object} req    Request Object
    * @param  {Object} res    Response Object
    * @param  {String} host   [Optional] Host
    * @param  {String} method HTTP method
    * @return {Object}        TurtleIO instance
    */

			value: function run(req, res, host, method) {
				var self = this,
				    middleware = array.iterator(this.routes(req.parsed.pathname, host, method));

				var get_arity = function (arg) {
					return arg.toString().replace(/(^.*\()|(\).*)|(\n.*)/g, "").split(",").length;
				};

				var stop = function (timer) {
					if (timer.stopped === null) {
						timer.stop();
						self.signal("middleware", function () {
							return [host, req.url, timer.diff()];
						});
					}
				};

				var last = function (timer, err) {
					var status = undefined;

					stop(timer);

					if (!err) {
						if (regex.get.test(method)) {
							self.request(req, res);
						} else if (self.allowed("get", req.parsed.pathname, req.vhost)) {
							self.error(req, res, CODES.NOT_ALLOWED);
						} else {
							self.error(req, res, CODES.NOT_FOUND);
						}
					} else {
						status = res.statusCode >= CODES.BAD_REQUEST ? res.statusCode : CODES[(err.message || err).toUpperCase()] || CODES.SERVER_ERROR;
						self.error(req, res, status, err);
					}
				};

				var next = function (err) {
					var timer = precise().start(),
					    arity = 3,
					    item = middleware.next();

					if (!item.done) {
						if (err) {
							// Finding the next error handling middleware
							arity = get_arity(item.value);
							do {
								arity = get_arity(item.value);
							} while (arity < 4 && (item = middleware.next()) && !item.done);
						}

						stop(timer);

						if (!item.done) {
							if (err) {
								if (arity === 4) {
									try {
										item.value(err, req, res, next);
									} catch (e) {
										next(e);
									}
								} else {
									last(timer, err);
								}
							} else {
								try {
									item.value(req, res, next);
								} catch (e) {
									next(e);
								}
							}
						} else {
							last(timer, err);
						}
					} else if (!res._header && self.config.catchAll) {
						last(timer, err);
					}
				};

				next();

				return this;
			},
			writable: true,
			configurable: true
		},
		signal: {

			/**
    * Signals a probe
    *
    * @method signal
    * @param  {String}   name Name of probe
    * @param  {Function} fn   DTP handler
    * @return {Object}        TurtleIO instance
    */

			value: function signal(name, fn) {
				if (this.config.logs.dtrace) {
					this.dtp.fire(name, fn);
				}

				return this;
			},
			writable: true,
			configurable: true
		},
		start: {

			/**
    * Starts the instance
    *
    * @method start
    * @param  {Object}   config Configuration
    * @param  {Function} err    Error handler
    * @return {Object}          TurtleIO instance
    */

			value: function start(cfg, err) {
				var self = this,
				    config = undefined,
				    headers = undefined,
				    pages = undefined;

				config = clone(defaultConfig, true);

				// Merging custom with default config
				merge(config, cfg || {});

				this.dtp = dtrace.createDTraceProvider(config.id || "turtle-io");

				// Duplicating headers for re-decoration
				headers = clone(config.headers, true);

				// Overriding default error handler
				if (typeof err == "function") {
					this.error = err;
				}

				// Setting configuration
				if (!config.port) {
					config.port = 8000;
				}

				merge(this.config, config);

				pages = this.config.pages ? this.config.root + this.config.pages : __dirname + "/../pages";
				LOGLEVEL = LEVELS.indexOf(this.config.logs.level);
				LOGGING = this.config.logs.dtrace || this.config.logs.stdout;

				// Looking for required setting
				if (!this.config["default"]) {
					this.log(new Error("[client 0.0.0.0] Invalid default virtual host"), "error");
					process.exit(1);
				}

				// Lowercasing default headers
				delete this.config.headers;
				this.config.headers = {};

				iterate(headers, function (value, key) {
					self.config.headers[key.toLowerCase()] = value;
				});

				// Setting `Server` HTTP header
				if (!this.config.headers.server) {
					this.config.headers.server = "turtle.io/3.2.5";
					this.config.headers["x-powered-by"] = "node.js/" + process.versions.node.replace(/^v/, "") + " " + string.capitalize(process.platform) + " V8/" + string.trim(process.versions.v8.toString());
				}

				// Creating regex.rewrite
				regex.rewrite = new RegExp("^(" + this.config.proxy.rewrite.join("|") + ")$");

				// Setting default routes
				this.host(ALL);

				// Registering DTrace probes
				this.probes();

				// Registering virtual hosts
				array.iterate(array.cast(config.vhosts, true), function (i) {
					self.host(i);
				});

				// Loading default error pages
				fs.readdir(pages, function (e, files) {
					if (e) {
						self.log(new Error("[client 0.0.0.0] " + e.message), "error");
					} else if (array.keys(self.config).length > 0) {
						array.iterate(files, function (i) {
							self.pages.all[i.replace(regex.next, "")] = fs.readFileSync(pages + "/" + i, "utf8");
						});

						// Starting server
						if (self.server === null) {
							// For proxy behavior
							if (https.globalAgent.maxSockets < self.config.proxy.maxConnections) {
								https.globalAgent.maxConnections = self.config.proxy.maxConnections;
							}

							if (http.globalAgent.maxSockets < self.config.proxy.maxConnections) {
								http.globalAgent.maxConnections = self.config.proxy.maxConnections;
							}

							if (self.config.ssl.cert !== null && self.config.ssl.key !== null) {
								// POODLE
								self.config.secureProtocol = "SSLv23_method";
								self.config.secureOptions = constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2;

								// Reading files
								self.config.ssl.cert = fs.readFileSync(self.config.ssl.cert);
								self.config.ssl.key = fs.readFileSync(self.config.ssl.key);

								// Starting server
								self.server = https.createServer(merge(self.config.ssl, {
									port: self.config.port,
									host: self.config.address,
									secureProtocol: self.config.secureProtocol,
									secureOptions: self.config.secureOptions
								}), function (req, res) {
									self.route(req, res);
								}).listen(self.config.port, self.config.address);
							} else {
								self.server = http.createServer(function (req, res) {
									self.route(req, res);
								}).listen(self.config.port, self.config.address);
							}
						} else {
							self.server.listen(self.config.port, self.config.address);
						}

						// Dropping process
						if (self.config.uid && !isNaN(self.config.uid)) {
							process.setuid(self.config.uid);
						}

						self.log("Started " + self.config.id + " on port " + self.config.port, "debug");
					}
				});

				// Something went wrong, server must restart
				process.on("uncaughtException", function (e) {
					self.log(e, "error");
					process.exit(1);
				});

				return this;
			},
			writable: true,
			configurable: true
		},
		status: {

			/**
    * Returns an Object describing the instance's status
    *
    * @method status
    * @public
    * @return {Object} Status
    */

			value: function status() {
				var timer = precise().start(),
				    ram = process.memoryUsage(),
				    uptime = process.uptime(),
				    state = { config: {}, etags: {}, process: {}, server: {} },
				    invalid = /^(auth|session|ssl)$/;

				// Startup parameters
				iterate(this.config, function (v, k) {
					if (!invalid.test(k)) {
						state.config[k] = v;
					}
				});

				// Process information
				state.process = {
					memory: ram,
					pid: process.pid
				};

				// Server information
				state.server = {
					address: this.server.address(),
					uptime: uptime
				};

				// LRU cache
				state.etags = {
					items: this.etags.length,
					bytes: Buffer.byteLength(array.cast(this.etags.cache).map(function (i) {
						return i.value;
					}).join(""))
				};

				timer.stop();

				this.signal("status", function () {
					return [state.server.connections, uptime, ram.heapUsed, ram.heapTotal, timer.diff()];
				});

				return state;
			},
			writable: true,
			configurable: true
		},
		stop: {

			/**
    * Stops the instance
    *
    * @method stop
    * @return {Object} TurtleIO instance
    */

			value: function stop() {
				var port = this.config.port;

				this.log("Stopping " + this.config.id + " on port " + port, "debug");

				this.config = {};
				this.dtp = null;
				this.etags = lru(1000);
				this.pages = { all: {} };
				this.permissions = lru(1000);
				this.routeCache = lru(5000); // verbs * etags
				this.vhosts = [];
				this.vhostsRegExp = [];
				this.watching = {};

				if (this.server !== null) {
					this.server.close();
					this.server = null;
				}

				return this;
			},
			writable: true,
			configurable: true
		},
		unregister: {

			/**
    * Unregisters an Etag in the LRU cache and
    * removes stale representation from disk
    *
    * @method unregister
    * @param  {String} url URL requested
    * @return {Object}     TurtleIO instance
    */

			value: function unregister(url) {
				var self = this,
				    cached = this.etags.cache[url],
				    path = this.config.tmp + "/",
				    gz = undefined,
				    df = undefined;

				if (cached) {
					this.etags.remove(url);

					path += cached.value.etag;
					gz = path + ".gz";
					df = path + ".zz";

					fs.exists(gz, function (exists) {
						if (exists) {
							fs.unlink(gz, function (e) {
								if (e) {
									self.log(e);
								}
							});
						}
					});

					fs.exists(df, function (exists) {
						if (exists) {
							fs.unlink(df, function (e) {
								if (e) {
									self.log(e);
								}
							});
						}
					});
				}

				return this;
			},
			writable: true,
			configurable: true
		},
		url: {

			/**
    * Constructs a URL
    *
    * @method url
    * @param  {Object} req Request Object
    * @return {String}     Requested URL
    */

			value: function url(req) {
				var header = req.headers.authorization || "",
				    auth = "",
				    token = undefined;

				if (!string.isEmpty(header)) {
					token = header.split(regex.space).pop() || "", auth = new Buffer(token, "base64").toString();

					if (!string.isEmpty(auth)) {
						auth += "@";
					}
				}

				return "http" + (this.config.ssl.cert ? "s" : "") + "://" + auth + req.headers.host + req.url;
			},
			writable: true,
			configurable: true
		},
		use: {

			/**
    * Adds middleware to processing chain
    *
    * @method use
    * @param  {String}   path   [Optional] Path the middleware applies to, default is `/*`
    * @param  {Function} fn     Middlware to chain
    * @param  {String}   host   [Optional] Host
    * @param  {String}   method [Optional] HTTP method
    * @return {Object}          TurtleIO instance
    */

			value: function use(path, fn, host, method) {
				if (typeof path != "string") {
					host = fn;
					fn = path;
					path = "/.*";
				}

				host = host || ALL;
				method = method || ALL;

				if (typeof fn != "function" && (fn && typeof fn.handle != "function")) {
					throw new Error("Invalid middleware");
				}

				if (!this.middleware[host]) {
					this.middleware[host] = {};
				}

				if (!this.middleware[host][method]) {
					this.middleware[host][method] = {};
				}

				if (!this.middleware[host][method][path]) {
					this.middleware[host][method][path] = [];
				}

				if (fn.handle) {
					fn = fn.handle;
				}

				// hash for permission checks
				fn.hash = this.hash(fn.toString());

				this.middleware[host][method][path].push(fn);

				return this;
			},
			writable: true,
			configurable: true
		},
		all: {

			/**
    * Sets a handler for all methods
    *
    * @method all
    * @param  {String}   route RegExp pattern
    * @param  {Function} fn    Handler
    * @param  {String}   host  [Optional] Virtual host, default is `all`
    * @return {Object}         TurtleIO instance
    */

			value: function all(route, fn, host) {
				var self = this;

				array.iterate(VERBS, function (i) {
					self.use(route, fn, host, i);
				});

				return this;
			},
			writable: true,
			configurable: true
		},
		del: {

			/**
    * Sets a DELETE handler
    *
    * @method delete
    * @param  {String}   route RegExp pattern
    * @param  {Function} fn    Handler
    * @param  {String}   host  [Optional] Virtual host, default is `all`
    * @return {Object}         TurtleIO instance
    */

			value: function del(route, fn, host) {
				return this.use(route, fn, host, "delete");
			},
			writable: true,
			configurable: true
		},
		"delete": {

			/**
    * Sets a DELETE handler
    *
    * @method delete
    * @param  {String}   route RegExp pattern
    * @param  {Function} fn    Handler
    * @param  {String}   host  [Optional] Virtual host, default is `all`
    * @return {Object}         TurtleIO instance
    */

			value: function _delete(route, fn, host) {
				return this.use(route, fn, host, "delete");
			},
			writable: true,
			configurable: true
		},
		get: {

			/**
    * Sets a GET handler
    *
    * @method delete
    * @param  {String}   route RegExp pattern
    * @param  {Function} fn    Handler
    * @param  {String}   host  [Optional] Virtual host, default is `all`
    * @return {Object}         TurtleIO instance
    */

			value: function get(route, fn, host) {
				return this.use(route, fn, host, "get");
			},
			writable: true,
			configurable: true
		},
		patch: {

			/**
    * Sets a PATCH handler
    *
    * @method delete
    * @param  {String}   route RegExp pattern
    * @param  {Function} fn    Handler
    * @param  {String}   host  [Optional] Virtual host, default is `all`
    * @return {Object}         TurtleIO instance
    */

			value: function patch(route, fn, host) {
				return this.use(route, fn, host, "patch");
			},
			writable: true,
			configurable: true
		},
		post: {

			/**
    * Sets a POST handler
    *
    * @method delete
    * @param  {String}   route RegExp pattern
    * @param  {Function} fn    Handler
    * @param  {String}   host  [Optional] Virtual host, default is `all`
    * @return {Object}         TurtleIO instance
    */

			value: function post(route, fn, host) {
				return this.use(route, fn, host, "post");
			},
			writable: true,
			configurable: true
		},
		put: {

			/**
    * Sets a PUT handler
    *
    * @method delete
    * @param  {String}   route RegExp pattern
    * @param  {Function} fn    Handler
    * @param  {String}   host  [Optional] Virtual host, default is `all`
    * @return {Object}         TurtleIO instance
    */

			value: function put(route, fn, host) {
				return this.use(route, fn, host, "put");
			},
			writable: true,
			configurable: true
		},
		watch: {

			/**
    * Watches `path` for changes & updated LRU
    *
    * @method watcher
    * @param  {String} url      LRUItem url
    * @param  {String} path     File path
    * @param  {String} mimetype Mimetype of URL
    * @return {Object}          TurtleIO instance
    */

			value: function watch(url, path) {
				var self = this,
				    watcher = undefined;

				/**
     * Cleans up caches
     *
     * @method cleanup
     * @private
     * @return {Undefined} undefined
     */
				var cleanup = function () {
					watcher.close();
					self.unregister(url);
					delete self.watching[path];
				};

				if (!this.watching[path]) {
					// Tracking
					this.watching[path] = 1;

					// Watching path for changes
					watcher = fs.watch(path, function (ev) {
						if (regex.rename.test(ev)) {
							cleanup();
						} else {
							fs.lstat(path, function (e, stat) {
								var value = undefined;

								if (e) {
									self.log(e);
									cleanup();
								} else if (self.etags.cache[url]) {
									value = self.etags.cache[url].value;
									value.etag = self.etag(url, stat.size, stat.mtime);
									value.timestamp = parseInt(new Date().getTime() / 1000, 10);
									self.register(url, value, true);
								} else {
									cleanup();
								}
							});
						}
					});
				}

				return this;
			},
			writable: true,
			configurable: true
		},
		write: {

			/**
    * Writes files to disk
    *
    * @method write
    * @param  {Object} req  HTTP request Object
    * @param  {Object} res  HTTP response Object
    * @param  {String} path File path
    * @return {Object}      TurtleIO instance
    */

			value: function write(req, res, path) {
				var self = this,
				    timer = precise().start(),
				    put = req.method === "PUT",
				    body = req.body,
				    allow = req.allow,
				    del = this.allowed("DELETE", req.parsed.pathname, req.vhost),
				    status = undefined;

				if (!put && regex.end_slash.test(req.url)) {
					status = del ? CODES.CONFLICT : CODES.SERVER_ERROR;

					timer.stop();

					this.signal("write", function () {
						return [req.headers.host, req.url, req.method, path, timer.diff()];
					});

					this.respond(req, res, this.page(status, this.hostname(req)), status, { allow: allow }, false);
				} else {
					allow = array.remove(string.explode(allow), "POST").join(", ");

					fs.lstat(path, function (e, stat) {
						if (e) {
							self.error(req, res, CODES.NOT_FOUND);
						} else {
							var etag = "\"" + self.etag(req.parsed.href, stat.size, stat.mtime) + "\"";

							if (!req.headers.hasOwnProperty("etag") || req.headers.etag === etag) {
								fs.writeFile(path, body, function (e) {
									if (e) {
										self.error(req, req, CODES.SERVER_ERROR);
									} else {
										status = put ? CODES.NO_CONTENT : CODES.CREATED;
										self.respond(req, res, self.page(status, self.hostname(req)), status, { allow: allow }, false);
									}
								});
							} else if (req.headers.etag !== etag) {
								self.respond(req, res, MESSAGES.NO_CONTENT, CODES.FAILED, {}, false);
							}
						}
					});

					timer.stop();

					this.signal("write", function () {
						return [req.headers.host, req.url, req.method, path, timer.diff()];
					});
				}

				return this;
			},
			writable: true,
			configurable: true
		}
	});

	return TurtleIO;
})();

/**
 * TurtleIO factory
 *
 * @method factory
 * @return {Object} TurtleIO instance
 */
var factory = function () {
	var self = new TurtleIO();

	var cors = function (req, res, next) {
		req.cors = req.headers.origin !== undefined;
		next();
	};

	var etag = function (req, res, next) {
		var cached = undefined,
		    headers = undefined;

		if (regex.get_only.test(req.method) && !req.headers.range) {
			cached = self.etags.get(req.parsed.href);

			// Sending a 304 if Client is making a GET & has current representation
			if (cached && req.headers["if-none-match"] && req.headers["if-none-match"].replace(/\"/g, "") === cached.etag) {
				headers = clone(cached.headers, true);
				headers.age = parseInt(new Date().getTime() / 1000 - cached.timestamp, 10);
				return self.respond(req, res, MESSAGES.NO_CONTENT, CODES.NOT_MODIFIED, self.headers(req, headers, CODES.NOT_MODIFIED));
			} else {
				next();
			}
		} else {
			next();
		}
	};

	self.use(cors).blacklist(cors);
	self.use(etag).blacklist(etag);

	return self;
};

module.exports = factory;