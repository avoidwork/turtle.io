const array = require("retsu"),
	constants = require("constants"),
	csv = require("csv.js"),
	defer = require("tiny-defer"),
	dtrace = require("dtrace-provider"),
	fs = require("fs"),
	http = require("http"),
	https = require("https"),
	mime = require("mime"),
	mmh3 = require("murmurhash3js").x86.hash32,
	moment = require("moment"),
	os = require("os"),
	path = require("path"),
	precise = require("precise"),
	lru = require("tiny-lru"),
	zlib = require("zlib"),
	levels = require(path.join(__dirname, "levels.js")),
	messages = require(path.join(__dirname, "messages.js")),
	codes = require(path.join(__dirname, "codes.js")),
	regex = require(path.join(__dirname, "regex.js")),
	router = require(path.join(__dirname, "router.js")),
	utility = require(path.join(__dirname, "utility.js")),
	version = require(path.join(__dirname, "..", "package.json")).version,
	defaultConfig = require(path.join(__dirname, "..", "config.json")),
	all = "all",
	verbs = ["delete", "get", "post", "put", "patch"];

class TurtleIO {
	constructor () {
		this.config = utility.clone(defaultConfig);
		this.codes = codes;
		this.dtp = null;
		this.etags = lru(1000);
		this.levels = levels;
		this.messages = messages;
		this.middleware = {all: {}};
		this.loglevel = "";
		this.logging = false;
		this.permissions = lru(1000);
		this.routeCache = lru(5000); // verbs * etags
		this.pages = {all: {}};
		this.server = null;
		this.stale = 0;
		this.vhosts = [];
		this.vhostsRegExp = [];
		this.watching = {};
	}

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
	allowed (method, uri, host, override) {
		let timer = precise().start(),
			result;

		result = this.routes(uri, host, method, override).filter(i => {
			return this.config.noaction[i.hash || this.hash(i)] === undefined;
		});

		timer.stop();
		this.signal("allowed", function () {
			return [host, uri, method.toUpperCase(), timer.diff()];
		});

		return result.length > 0;
	}

	/**
	 * Determines which verbs are allowed against a URL
	 *
	 * @method allows
	 * @param  {String}  uri      URI to query
	 * @param  {String}  host     Hostname
	 * @param  {Boolean} override Overrides cached version
	 * @return {String}           Allowed methods
	 */
	allows (uri, host, override) {
		let timer = precise().start(),
			result = !override ? this.permissions.get(host + "_" + uri) : undefined;

		if (override || !result) {
			result = verbs.filter(i => {
				return this.allowed(i, uri, host, override);
			});

			result = result.join(", ").toUpperCase().replace("GET", "GET, HEAD, OPTIONS");
			this.permissions.set(host + "_" + uri, result);
		}

		timer.stop();
		this.signal("allows", function () {
			return [host, uri, timer.diff()];
		});

		return result;
	}

	/**
	 * Adds a function the middleware 'no action' hash
	 *
	 * @method blacklist
	 * @param  {Function} fn Function to add
	 * @return {Object}      TurtleIO instance
	 */
	blacklist (fn) {
		let hfn = fn.hash || this.hash(fn.toString());

		if (this.config.noaction === undefined) {
			this.config.noaction = {};
		}

		if (!this.config.noaction[hfn]) {
			this.config.noaction[hfn] = 1;
		}

		return this;
	}

	/**
	 * Pipes compressed asset to Client
	 *
	 * @method compressed
	 * @param  {Object}  req     HTTP(S) request Object
	 * @param  {Object}  res     HTTP(S) response Object
	 * @param  {Object}  body    Response body
	 * @param  {Object}  type    gzip (gz) or deflate (df)
	 * @param  {String}  letag   Etag
	 * @param  {Boolean} file    Indicates `body` is a file path
	 * @param  {Object}  options Stream options
	 * @param  {Number}  status  HTTP status
	 * @param  {Object}  headers HTTP headers
	 * @return {Object}          Promise
	 */
	compress (req, res, body, type, letag, file, options, status, headers) {
		let timer = precise().start(),
			deferred = defer(),
			method = regex.gzip.test(type) ? "createGzip" : "createDeflate",
			sMethod = method.replace("create", "").toLowerCase(),
			fp = letag ? path.join(this.config.tmp, letag + "." + type) : null;

		let next = exist => {
			if (!file) {
				if (typeof body.pipe === "function") { // Pipe Stream through compression to Client & disk
					if (!res._header && !res._headerSent) {
						headers["transfer-encoding"] = "chunked";
						delete headers["content-length"];
						res.writeHead(status, headers);
					}

					body.pipe(zlib[method]()).on("end", function () {
						deferred.resolve(true);
					}).pipe(res);
					body.pipe(zlib[method]()).pipe(fs.createWriteStream(fp));
					timer.stop();
					this.signal("compress", function () {
						return [letag, fp, timer.diff()];
					});
				} else { // Raw response body, compress and send to Client & disk
					zlib[sMethod](body, (e, data) => {
						if (e) {
							this.unregister(req.parsed.href);
							deferred.reject(new Error(this.codes.SERVER_ERROR));
						} else {
							if (!res._header && !res._headerSent) {
								headers["content-length"] = data.length;
								headers["transfer-encoding"] = "identity";
								res.writeHead(status, headers);
							}

							res.end(data);

							if (fp) {
								fs.writeFile(fp, data, "utf8", err => {
									if (err) {
										this.unregister(req.parsed.href);
									}
								});
							}

							timer.stop();
							this.signal("compress", function () {
								return [letag, fp || "dynamic", timer.diff()];
							});
							deferred.resolve(true);
						}
					});
				}
			} else {
				if (!res._header && !res._headerSent) {
					headers["transfer-encoding"] = "chunked";
					delete headers["content-length"];
					res.writeHead(status, headers);
				}

				// Pipe compressed asset to Client
				fs.createReadStream(body, options).on("error", () => {
					this.unregister(req.parsed.href);
					deferred.reject(new Error(this.codes.SERVER_ERROR));
				}).pipe(zlib[method]()).on("close", function () {
					deferred.resolve(true);
				}).pipe(res);

				// Pipe compressed asset to disk
				if (exist === false) {
					fs.createReadStream(body).on("error", () => {
						this.unregister(req.parsed.href);
					}).pipe(zlib[method]()).pipe(fs.createWriteStream(fp));
				}

				timer.stop();
				this.signal("compress", function () {
					return [letag, fp, timer.diff()];
				});
			}
		};

		if (fp) {
			fs.exists(fp, exist => {
				// Pipe compressed asset to Client
				if (exist) {
					fs.lstat(fp, (e, stats) => {
						if (e) {
							deferred.reject(new Error(this.codes.SERVER_ERROR));
						} else {
							if (!res._header && !res._headerSent) {
								headers["transfer-encoding"] = "chunked";
								delete headers["content-length"];

								if (options) {
									headers["content-range"] = "bytes " + options.start + "-" + options.end + "/" + stats.size;
								}

								res.writeHead(status, headers);
							}

							fs.createReadStream(fp, options).on("error", () => {
								this.unregister(req.parsed.href);
								deferred.reject(new Error(this.codes.SERVER_ERROR));
							}).on("close", function () {
								deferred.resolve(true);
							}).pipe(res);
							timer.stop();
							this.signal("compress", function () {
								return [letag, fp, timer.diff()];
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

		return deferred.promise;
	}

	/**
	 * Determines what/if compression is supported for a request
	 *
	 * @method compression
	 * @param  {String} agent    User-Agent header value
	 * @param  {String} encoding Accept-Encoding header value
	 * @param  {String} mimetype Mime type of response body
	 * @return {Mixed}           Supported compression or null
	 */
	compression (agent, encoding, mimetype) {
		let timer = precise().start(),
			result = "",
			encodings = typeof encoding === "string" ? utility.explode(encoding) : [];

		// No soup for IE!
		if (this.config.compress === true && regex.comp.test(mimetype) && !regex.ie.test(agent)) {
			array.each(encodings, function (i) {
				if (regex.gzip.test(i)) {
					result = "gz";
				}

				if (regex.def.test(i)) {
					result = "zz";
				}

				if (!utility.isEmpty(result)) {
					return false;
				}
			});
		}

		timer.stop();
		this.signal("compression", function () {
			return [agent, timer.diff()];
		});

		return result;
	}

	/**
	 * Decorates the Request & Response
	 *
	 * @method decorate
	 * @param  {Object} req Request Object
	 * @param  {Object} res Response Object
	 * @return {Undefined}  Undefined
	 */
	decorate (req, res) {
		let timer = precise().start(), // Assigning as early as possible
			uri = this.url(req),
			parsed = utility.parse(uri),
			hostname = parsed.hostname,
			update = false;

		// Decorating parsed Object on request
		req.body = "";
		res.header = res.setHeader;
		req.ip = req.headers["x-forwarded-for"] ? array.last(utility.explode(req.headers["x-forwarded-for"])) : req.connection.remoteAddress;
		res.locals = {};
		req.parsed = parsed;
		req.query = parsed.query;
		req.server = this;
		req.timer = timer;

		// Finding a matching virtual host
		this.vhostsRegExp.forEach((i, idx) => {
			if (i.test(hostname)) {
				return !(req.vhost = this.vhosts[idx]);
			}
		});

		req.vhost = req.vhost || this.config.default;

		// Adding middleware to avoid the round trip next time
		if (!this.allowed("get", req.parsed.pathname, req.vhost)) {
			this.get(req.parsed.pathname, (req2, res2, next2) => {
				this.request(req2, res2).then(function () {
					next2();
				}, function (e) {
					next2(e);
				});
			}, req.vhost);

			update = true;
		}

		req.allow = this.allows(req.parsed.pathname, req.vhost, update);

		// Adding methods
		res.redirect = target => {
			return this.respond.call(this, req, res, this.messages.NO_CONTENT, this.codes.FOUND, {location: target});
		};

		res.respond = (arg, status, headers) => {
			return this.respond.call(this, req, res, arg, status, headers);
		};

		res.error = (status, arg) => {
			return this.error.call(this, req, res, status, arg);
		};

		res.send = (arg, status, headers) => {
			return this.respond.call(this, req, res, arg, status, headers);
		};
	}

	/**
	 * Encodes `arg` as JSON if applicable
	 *
	 * @method encode
	 * @param  {Mixed}  arg    Object to encode
	 * @param  {String} accept Accept HTTP header
	 * @return {Mixed}         Original Object or JSON string
	 */
	encode (arg, accept) {
		let header, indent;

		if (arg instanceof Buffer || typeof arg.pipe === "function") {
			return arg;
		} else if (arg instanceof Array || arg instanceof Object) {
			header = regex.indent.exec(accept);
			indent = header !== null ? parseInt(header[1], 10) : this.config.json;

			return JSON.stringify(arg, null, indent);
		} else {
			return arg;
		}
	}

	/**
	 * Error handler for requests
	 *
	 * @method error
	 * @param  {Object} req    Request Object
	 * @param  {Object} res    Response Object
	 * @param  {Number} status [Optional] HTTP status code
	 * @param  {String} msg    [Optional] Response body
	 * @return {Object}        Promise
	 */
	error (req, res, status, msg) {
		let timer = precise().start(),
			deferred = defer(),
			method = req.method.toLowerCase(),
			host = req.parsed ? req.parsed.hostname : all,
			kdx = -1,
			lstatus = status,
			body;

		if (isNaN(lstatus)) {
			lstatus = this.codes.NOT_FOUND;

			// If valid, determine what kind of error to respond with
			if (!regex.get.test(method)) {
				if (this.allowed(method, req.parsed.pathname, req.vhost)) {
					lstatus = this.codes.SERVER_ERROR;
				} else {
					lstatus = this.codes.NOT_ALLOWED;
				}
			}
		}

		array.cast(this.codes).forEach(function (i, idx) {
			if (i === lstatus) {
				kdx = idx;
				return false;
			}
		});

		if (msg === undefined) {
			body = this.page(lstatus, host);
		}

		timer.stop();
		this.signal("error", () => {
			return [req.vhost, req.parsed.path, lstatus, msg || kdx ? array.cast(this.messages)[kdx] : "Unknown error", timer.diff()];
		});

		this.respond(req, res, msg || body, lstatus, {
			"cache-control": "no-cache",
			"content-length": Buffer.byteLength(msg || body)
		}).then(function () {
			deferred.resolve(true);
		}, function () {
			deferred.resolve(true);
		});

		return deferred.promise;
	}

	/**
	 * Generates an Etag
	 *
	 * @method etag
	 * @return {String}          Etag value
	 */
	etag (...args) {
		return this.hash(args.join("-"));
	}

	/**
	 * Handles the request
	 *
	 * @method handle
	 * @param  {Object}  req    HTTP(S) request Object
	 * @param  {Object}  res    HTTP(S) response Object
	 * @param  {String}  fpath  File path
	 * @param  {String}  uri    Requested URL
	 * @param  {Boolean} dir    `true` is `path` is a directory
	 * @param  {Object}  stat   fs.Stat Object
	 * @return {Object}         Promise
	 */
	handle (req, res, fpath, uri, dir, stat) {
		let deferred = defer(),
			allow = req.allow,
			write = allow.indexOf(dir ? "POST" : "PUT") > -1,
			del = allow.indexOf("DELETE") > -1,
			method = req.method,
			letag, headers, mimetype, modified, size, pathname, invalid, out_dir, in_dir;

		if (!dir) {
			pathname = req.parsed.pathname.replace(regex.root, "");
			invalid = (pathname.replace(regex.dir, "").split("/").filter(function (i) {
					return i !== ".";
				})[0] || "") === "..";
			out_dir = !invalid ? (pathname.match(/\.{2}\//g) || []).length : 0;
			in_dir = !invalid ? (pathname.match(/\w+?(\.\w+|\/)+/g) || []).length : 0;

			// Are we still in the virtual host root?
			if (invalid) {
				deferred.reject(new Error(this.codes.NOT_FOUND));
			} else if (out_dir > 0 && out_dir >= in_dir) {
				deferred.reject(new Error(this.codes.NOT_FOUND));
			} else if (regex.get.test(method)) {
				mimetype = mime.lookup(fpath);
				size = stat.size;
				modified = stat.mtime.toUTCString();
				letag = "\"" + this.etag(uri, size, stat.mtime) + "\"";
				headers = {
					allow: allow,
					"content-length": size,
					"content-type": mimetype,
					etag: letag,
					"last-modified": modified
				};

				if (regex.get_only.test(method)) {
					// Decorating path for watcher
					req.path = fpath;

					// Client has current version
					switch (true) {
						case req.headers["if-none-match"] === letag:
						case !req.headers["if-none-match"] && Date.parse(req.headers["if-modified-since"]) >= stat.mtime:
							this.respond(req, res, this.messages.NO_CONTENT, this.codes.NOT_MODIFIED, headers, true).then(function (arg) {
								deferred.resolve(arg);
							}, function (e) {
								deferred.reject(e);
							});
							break;
						default:
							this.respond(req, res, fpath, this.codes.OK, headers, true).then(function (arg) {
								deferred.resolve(arg);
							}, function (e) {
								deferred.reject(e);
							});
					}
				} else {
					this.respond(req, res, this.messages.NO_CONTENT, this.codes.OK, headers, true).then(function (arg) {
						deferred.resolve(arg);
					}, function (e) {
						deferred.reject(e);
					});
				}
			} else if (regex.del.test(method) && del) {
				this.unregister(this.url(req));

				fs.unlink(fpath, e => {
					if (e) {
						deferred.reject(new Error(this.codes.SERVER_ERROR));
					} else {
						this.respond(req, res, this.messages.NO_CONTENT, this.codes.NO_CONTENT, {}).then(function (arg) {
							deferred.resolve(arg);
						}, function (err) {
							deferred.reject(err);
						});
					}
				});
			} else if (regex.put.test(method) && write) {
				this.write(req, res, fpath).then(function (arg) {
					deferred.resolve(arg);
				}, function (e) {
					deferred.reject(e);
				});
			} else {
				deferred.reject(new Error(this.codes.SERVER_ERROR));
			}
		} else if ((regex.post.test(method) || regex.put.test(method)) && write) {
			this.write(req, res, fpath).then(function (arg) {
				deferred.resolve(arg);
			}, function (e) {
				deferred.reject(e);
			});
		} else if (regex.del.test(method) && del) {
			this.unregister(req.parsed.href);

			fs.unlink(fpath, e => {
				if (e) {
					deferred.reject(new Error(this.codes.SERVER_ERROR));
				} else {
					this.respond(req, res, this.messages.NO_CONTENT, this.codes.NO_CONTENT, {}).then(function (arg) {
						deferred.resolve(arg);
					}, function (err) {
						deferred.reject(err);
					});
				}
			});
		} else {
			deferred.reject(new Error(this.codes.NOT_ALLOWED));
		}

		return deferred.promise;
	}

	/**
	 * Creates a hash of arg
	 *
	 * @method hash
	 * @param  {Mixed}  arg String or Buffer
	 * @return {String} Hash of arg
	 */
	hash (arg) {
		return mmh3(arg, this.config.seed);
	}

	/**
	 * Sets response headers
	 *
	 * @method headers
	 * @param  {Object}  req      Request Object
	 * @param  {Object}  rHeaders Response headers
	 * @param  {Number}  status   HTTP status code, default is 200
	 * @return {Object}           Response headers
	 */
	headers (req, lRHeaders = {}, status = codes.OK) {
		let timer = precise().start(),
			rHeaders = utility.clone(lRHeaders),
			lheaders;

		// Decorating response headers
		if (status !== this.codes.NOT_MODIFIED && status >= this.codes.MULTIPLE_CHOICE && status < this.codes.BAD_REQUEST) {
			lheaders = rHeaders;
		} else {
			lheaders = utility.merge(utility.clone(this.config.headers), rHeaders);

			if (!lheaders.allow) {
				lheaders.allow = req.allow;
			}

			if (!lheaders.date) {
				lheaders.date = new Date().toUTCString();
			}

			if (req.cors) {
				lheaders["access-control-allow-origin"] = req.headers.origin || req.headers.referer.replace(/\/$/, "");
				lheaders["access-control-allow-credentials"] = "true";
				lheaders["access-control-allow-methods"] = lheaders.allow;
			} else {
				delete lheaders["access-control-allow-origin"];
				delete lheaders["access-control-expose-headers"];
				delete lheaders["access-control-max-age"];
				delete lheaders["access-control-allow-credentials"];
				delete lheaders["access-control-allow-methods"];
				delete lheaders["access-control-allow-headers"];
			}

			// Decorating "Transfer-Encoding" header
			if (!lheaders["transfer-encoding"]) {
				lheaders["transfer-encoding"] = "identity";
			}

			// Removing headers not wanted in the response
			if (!regex.get.test(req.method) || status >= this.codes.BAD_REQUEST || lheaders["x-ratelimit-limit"]) {
				delete lheaders["cache-control"];
				delete lheaders.etag;
				delete lheaders["last-modified"];
			}

			if (lheaders["x-ratelimit-limit"]) {
				lheaders["cache-control"] = "no-cache";
			}

			if (status === this.codes.NOT_MODIFIED) {
				delete lheaders["last-modified"];
			}

			if (status === this.codes.NOT_FOUND && lheaders.allow) {
				delete lheaders["accept-ranges"];
			}

			if (status >= this.codes.SERVER_ERROR) {
				delete lheaders["accept-ranges"];
			}

			if (!lheaders["last-modified"]) {
				delete lheaders["last-modified"];
			}
		}

		lheaders.status = status + " " + (http.STATUS_CODES[status] || "");

		timer.stop();
		this.signal("headers", function () {
			return [status, timer.diff()];
		});

		return lheaders;
	}

	/**
	 * Registers a virtual host
	 *
	 * @method host
	 * @param  {String} arg Virtual host
	 * @return {Object}     TurtleIO instance
	 */
	host (arg) {
		if (!array.contains(this.vhosts, arg)) {
			this.vhosts.push(arg);
			this.vhostsRegExp.push(new RegExp("^" + arg.replace(/\*/g, ".*") + "$"));
		}

		return this;
	}

	/**
	 * Logs a message
	 *
	 * @method log
	 * @param  {Mixed}  arg   Error Object or String
	 * @param  {String} level [Optional] `level` must match a valid LogLevel - http://httpd.apache.org/docs/1.3/mod/core.html#loglevel, default is `notice`
	 * @return {Object}       TurtleIO instance
	 */
	log (arg, level = "notice") {
		let timer, e;

		if (this.logging) {
			timer = precise().start();
			e = arg instanceof Error;

			if (this.config.logs.stdout && this.levels.indexOf(level) <= this.loglevel) {
				if (e) {
					console.error("[" + moment().format(this.config.logs.time) + "] [" + level + "] " + (arg.stack || arg.message || arg));
				} else {
					console.log(arg);
				}
			}

			timer.stop();
			this.signal("log", () => {
				return [level, this.config.logs.stdout, false, timer.diff()];
			});
		}

		return this;
	}

	/**
	 * Gets an HTTP status page
	 *
	 * @method page
	 * @param  {Number} code HTTP status code
	 * @param  {String} host Virtual hostname
	 * @return {String}      Response body
	 */
	page (code, host) {
		let lhost = host !== undefined && this.pages[host] ? host : all;

		return this.pages[lhost][code] || this.pages[lhost]["500"] || this.pages.all["500"];
	}

	/**
	 * Preparing log message
	 *
	 * @method prep
	 * @param  {Object} req     HTTP(S) request Object
	 * @param  {Object} res     HTTP(S) response Object
	 * @param  {Object} headers HTTP(S) response headers
	 * @return {String}         Log message
	 */
	prep (req, res, headers) {
		let msg = this.config.logs.format,
			user = "-";

		if (req.parsed.auth && req.parsed.auth.indexOf(":") > -1) {
			user = req.parsed.auth.split(":")[0] || "-";
		}

		msg = msg.replace("%v", req.headers.host)
			.replace("%h", req.ip || "-")
			.replace("%l", "-")
			.replace("%u", user)
			.replace("%t", "[" + moment().format(this.config.logs.time) + "]")
			.replace("%r", req.method + " " + req.url + " HTTP/1.1")
			.replace("%>s", res.statusCode)
			.replace("%b", headers["content-length"] || "-")
			.replace("%{Referer}i", req.headers.referer || "-")
			.replace("%{User-agent}i", req.headers["user-agent"] || "-");

		return msg;
	}

	/**
	 * Registers dtrace probes
	 *
	 * @method probes
	 * @return {Object} TurtleIO instance
	 */
	probes () {
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
	}

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
	proxy (route, origin, host, stream = false) {
		/**
		 * Response handler
		 *
		 * @method handle
		 * @private
		 * @param  {Object} req     Request Object
		 * @param  {Object} res     Response Object
		 * @param  {Object} headers Proxy Response headers
		 * @param  {Object} status  Proxy Response status
		 * @param  {String} arg     Proxy Response body
		 * @return {Undefined}      undefined
		 */
		let handle = (req, res, headers, status, arg) => {
			let deferred = defer(),
				letag = "",
				regexOrigin = new RegExp(origin.replace(regex.end_slash, ""), "g"),
				uri = req.parsed.href,
				lstale = this.stale,
				get = regex.get_only.test(req.method),
				rewriteOrigin = req.parsed.protocol + "//" + req.parsed.host + (route === "/" ? "" : route),
				larg = arg,
				cached, rewrite;

			if (headers.server) {
				headers.via = (headers.via ? headers.via + ", " : "") + headers.server;
			}

			headers.server = this.config.headers.server;

			if (status >= this.codes.BAD_REQUEST) {
				this.error(req, res, status, arg).then(function (argz) {
					deferred.resolve(argz);
				});
			} else {
				// Determining if the response will be cached
				if (get && (status === this.codes.OK || status === this.codes.NOT_MODIFIED) && !regex.nocache.test(headers["cache-control"]) && !regex.private.test(headers["cache-control"])) {
					// Determining how long rep is valid
					if (headers["cache-control"] && regex.number.test(headers["cache-control"])) {
						lstale = parseInt(regex.number.exec(headers["cache-control"])[0], 10);
					} else if (headers.expires !== undefined) {
						lstale = new Date().getTime() - new Date(headers.expires);
					}

					// Removing from LRU when invalid
					if (lstale > 0) {
						setTimeout(() => {
							this.unregister(uri);
						}, lstale * 1000);
					}
				}

				if (status !== this.codes.NOT_MODIFIED) {
					rewrite = regex.rewrite.test((headers["content-type"] || "").replace(regex.nval, ""));

					// Setting headers
					if (get && status === this.codes.OK) {
						letag = headers.etag || "\"" + this.etag(uri, headers["content-length"] || 0, headers["last-modified"] || 0, this.encode(arg)) + "\"";

						if (headers.etag !== letag) {
							headers.etag = letag;
						}
					}

					if (headers.allow === undefined || utility.isEmpty(headers.allow)) {
						headers.allow = headers["access-control-allow-methods"] || "GET";
					}

					// Determining if a 304 response is valid based on Etag only (no timestamp is kept)
					if (get && req.headers["if-none-match"] === letag) {
						cached = this.etags.get(uri);

						if (cached) {
							headers.age = parseInt(new Date().getTime() / 1000 - cached.value.timestamp, 10);
						}

						this.respond(req, res, this.messages.NO_CONTENT, this.codes.NOT_MODIFIED, headers).then(function (argz) {
							deferred.resolve(argz);
						}, function (e) {
							deferred.reject(e);
						});
					} else {
						if (regex.head.test(req.method.toLowerCase())) {
							larg = this.messages.NO_CONTENT;
						} else if (rewrite) {
							// Changing the size of the response body
							delete headers["content-length"];

							if (larg instanceof Array || larg instanceof Object) {
								larg = JSON.stringify(larg).replace(regexOrigin, rewriteOrigin);

								if (route !== "/") {
									larg = larg.replace(/"(\/[^?\/]\w+)\//g, "\"" + route + "$1/");
								}

								larg = JSON.parse(larg);
							} else if (typeof larg === "string") {
								larg = larg.replace(regexOrigin, rewriteOrigin);

								if (route !== "/") {
									larg = larg.replace(/(href|src)=("|')([^http|mailto|<|_|\s|\/\/].*?)("|')/g, "$1=$2" + route + "/$3$4")
										.replace(new RegExp(route + "//", "g"), route + "/");
								}
							}
						}

						this.respond(req, res, larg, status, headers).then(function (argz) {
							deferred.resolve(argz);
						}, function (e) {
							deferred.reject(e);
						});
					}
				} else {
					this.respond(req, res, arg, status, headers).then(function (argz) {
						deferred.resolve(argz);
					}, function (e) {
						deferred.reject(e);
					});
				}
			}

			return deferred.promise;
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
		let wrapper = (req, res) => {
			let timer = precise().start(),
				deferred = defer(),
				uri = origin + (route !== "/" ? req.url.replace(new RegExp("^" + route), "") : req.url),
				headerz = utility.clone(req.headers),
				parsed = utility.parse(uri),
				streamd = stream === true,
				mimetype = mime.lookup(!regex.ext.test(parsed.pathname) ? "index.htm" : parsed.pathname),
				fn, options, proxyReq, next, obj;

			// Facade to handle()
			fn = (headers, status, body) => {
				timer.stop();
				this.signal("proxy", function () {
					return [req.vhost, req.method, route, origin, timer.diff()];
				});
				handle(req, res, headers, status, body).then(function (arg) {
					deferred.resolve(arg);
				}, function (e) {
					deferred.reject(e);
				});
			};

			// Streaming formats that do not need to be rewritten
			if (!streamd && (regex.ext.test(parsed.pathname) && !regex.json.test(mimetype)) && regex.stream.test(mimetype)) {
				streamd = true;
			}

			// Identifying proxy behavior
			headerz["x-host"] = parsed.host;
			headerz["x-forwarded-for"] = headerz["x-forwarded-for"] ? headerz["x-forwarded-for"] + ", " + req.ip : req.ip;
			headerz["x-forwarded-proto"] = parsed.protocol.replace(":", "");
			headerz["x-forwarded-server"] = this.config.headers.server;

			if (!headerz["x-real-ip"]) {
				headerz["x-real-ip"] = req.ip;
			}

			// Removing compression for rewriting
			delete headerz["accept-encoding"];

			headerz.host = req.headers.host;
			options = {
				headers: headerz,
				hostname: parsed.hostname,
				method: req.method,
				path: parsed.path,
				port: parsed.port || (headerz["x-forwarded-proto"] === "https" ? 443 : 80),
				agent: false
			};

			if (!utility.isEmpty(parsed.auth)) {
				options.auth = parsed.auth;
			}

			if (streamd) {
				next = function (proxyRes) {
					res.writeHeader(proxyRes.statusCode, proxyRes.headers);
					proxyRes.pipe(res);
				};
			} else {
				next = function (proxyRes) {
					var data = "";

					proxyRes.setEncoding("utf8");
					proxyRes.on("data", function (chunk) {
						data += chunk;
					}).on("end", function () {
						fn(proxyRes.headers, proxyRes.statusCode, data);
					});
				};
			}

			if (parsed.protocol.indexOf("https") > -1) {
				options.rejectUnauthorized = false;
				obj = https;
			} else {
				obj = http;
			}

			proxyReq = obj.request(options, next);
			proxyReq.on("error", e => {
				this.error(req, res, this.codes[regex.refused.test(e.message) ? "SERVER_UNAVAILABLE" : "SERVER_ERROR"], e.message);
			});

			if (regex.body.test(req.method)) {
				proxyReq.write(req.body);
			}

			proxyReq.end();

			return deferred.promise;
		};

		// Setting route
		verbs.forEach(i => {
			if (route === "/") {
				this[i]("/.*", wrapper, host);
			} else {
				this[i](route, wrapper, host);
				this[i](route + "/.*", wrapper, host);
			}
		});

		return this;
	}

	/**
	 * Redirects GETs for a route to another URL
	 *
	 * @method redirect
	 * @param  {String}  route     Route to redirect
	 * @param  {String}  uri       URL to redirect the Client to
	 * @param  {String}  host      [Optional] Hostname this route is for (default is all)
	 * @param  {Boolean} permanent [Optional] `true` will indicate the redirection is permanent
	 * @return {Object}            instance
	 */
	redirect (route, uri, host, permanent = false) {
		let pattern = new RegExp("^" + route + "$");

		this.get(route, (req, res) => {
			let rewrite = (pattern.exec(req.url) || []).length > 0;

			this.respond(req, res, this.messages.NO_CONTENT, this.codes[permanent ? "MOVED" : "REDIRECT"], {
				location: rewrite ? req.url.replace(pattern, uri) : uri,
				"cache-control": "no-cache"
			});
		}, host);

		return this;
	}

	/**
	 * Registers an Etag in the LRU cache
	 *
	 * @method register
	 * @param  {String}  uri   URL requested
	 * @param  {Object}  state Object describing state `{etag: $etag, mimetype: $mimetype}`
	 * @param  {Boolean} purge [Optional] Remove cache from disk
	 * @return {Object}        TurtleIO instance
	 */
	register (uri, state, purge) {
		let cached;

		// Removing stale cache from disk
		if (purge === true) {
			cached = this.etags.cache[uri];

			if (cached && cached.value.etag !== state.etag) {
				this.unregister(uri);
			}
		}

		// Removing superficial headers
		[
			"content-encoding",
			"server",
			"status",
			"transfer-encoding",
			"x-powered-by",
			"x-response-time",
			"access-control-allow-origin",
			"access-control-expose-headers",
			"access-control-max-age",
			"access-control-allow-credentials",
			"access-control-allow-methods",
			"access-control-allow-headers"
		].forEach(function (i) {
			delete state.headers[i];
		});

		// Updating LRU
		this.etags.set(uri, state);

		return this;
	}

	/**
	 * Request handler which provides RESTful CRUD operations
	 *
	 * @method request
	 * @public
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     TurtleIO instance
	 */
	request (req, res) {
		let timer = precise().start(),
			deferred = defer(),
			method = req.method,
			handled = false,
			host = req.vhost,
			count, lpath, nth, root;

		let end = () => {
			timer.stop();
			this.signal("request", function () {
				return [req.parsed.href, timer.diff()];
			});
		};

		// If an expectation can't be met, don't try!
		if (req.headers.expect) {
			end();
			deferred.reject(new Error(this.codes.EXPECTATION_FAILED));
		} else {
			// Preparing file path
			root = path.join(this.config.root, this.config.vhosts[host]);
			lpath = path.join(root, req.parsed.pathname.replace(regex.dir, ""));

			// Determining if the request is valid
			fs.lstat(lpath, (e, stats) => {
				if (e) {
					end();
					deferred.reject(new Error(this.codes.NOT_FOUND));
				} else if (!stats.isDirectory()) {
					end();
					this.handle(req, res, lpath, req.parsed.href, false, stats).then(function (arg) {
						deferred.resolve(arg);
					}, function (err) {
						deferred.reject(err);
					});
				} else if (regex.get.test(method) && !regex.dir.test(req.parsed.pathname)) {
					end();
					this.respond(req, res, this.messages.NO_CONTENT, this.codes.REDIRECT, {"location": (req.parsed.pathname !== "/" ? req.parsed.pathname : "") + "/" + req.parsed.search}).then(function (arg) {
						deferred.resolve(arg);
					}, function (err) {
						deferred.reject(err);
					});
				} else if (!regex.get.test(method)) {
					end();
					this.handle(req, res, lpath, req.parsed.href, true).then(function (arg) {
						deferred.resolve(arg);
					}, function (err) {
						deferred.reject(err);
					});
				} else {
					count = 0;
					nth = this.config.index.length;

					this.config.index.forEach(i => {
						let npath = path.join(lpath, i);

						fs.lstat(npath, (err, lstats) => {
							if (!err && !handled) {
								handled = true;
								end();
								this.handle(req, res, npath, (req.parsed.pathname !== "/" ? req.parsed.pathname : "") + "/" + i + req.parsed.search, false, lstats).then(function (arg) {
									deferred.resolve(arg);
								}, function (errz) {
									deferred.reject(errz);
								});
							} else if (++count === nth && !handled) {
								end();
								deferred.reject(new Error(this.codes.NOT_FOUND));
							}
						});
					});
				}
			});
		}

		return deferred.promise;
	}

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
	respond (req, res, body, status = codes.OK, headers = {"content-type": "text/plain"}, file = false) {
		let timer = precise().start(),
			deferred = defer(),
			head = regex.head.test(req.method),
			ua = req.headers["user-agent"],
			encoding = req.headers["accept-encoding"],
			lheaders = headers,
			lstatus = status,
			lbody = body,
			type, options;

		let finalize = () => {
			let cheaders, cached;

			if (regex.get_only.test(req.method) && (lstatus === this.codes.OK || lstatus === this.codes.NOT_MODIFIED)) {
				// Updating cache
				if (!regex.nocache.test(lheaders["cache-control"]) && !regex.private.test(lheaders["cache-control"])) {
					cached = this.etags.get(req.parsed.href);

					if (!cached) {
						if (lheaders.etag === undefined) {
							lheaders.etag = "\"" + this.etag(req.parsed.href, lbody.length || 0, lheaders["last-modified"] || 0, lbody || 0) + "\"";
						}

						cheaders = utility.clone(lheaders);

						// Ensuring the content type is known
						if (!cheaders["content-type"]) {
							cheaders["content-type"] = mime.lookup(req.path || req.parsed.pathname);
						}

						this.register(req.parsed.href, {
							etag: cheaders.etag.replace(/"/g, ""),
							headers: cheaders,
							mimetype: cheaders["content-type"],
							timestamp: parseInt(new Date().getTime() / 1000, 10)
						}, true);
					}
				}

				// Setting a watcher on the local path
				if (req.path) {
					this.watch(req.parsed.href, req.path);
				}
			} else if (lstatus === this.codes.NOT_FOUND) {
				delete lheaders.allow;
				delete lheaders["access-control-allow-methods"];
			}
		};

		lheaders = this.headers(req, lheaders, lstatus);

		if (head) {
			lbody = this.messages.NO_CONTENT;

			if (regex.options.test(req.method)) {
				lheaders["content-length"] = 0;
				delete lheaders["content-type"];
			}

			delete lheaders.etag;
			delete lheaders["last-modified"];
		} else if (lbody === null || lbody === undefined) {
			lbody = this.messages.NO_CONTENT;
		}

		if (!file && lbody !== this.messages.NO_CONTENT) {
			lbody = this.encode(lbody, req.headers.accept);

			if (lheaders["content-length"] === undefined) {
				if (lbody instanceof Buffer) {
					lheaders["content-length"] = Buffer.byteLength(lbody.toString());
				}

				if (typeof lbody === "string") {
					lheaders["content-length"] = Buffer.byteLength(lbody);
				}
			}

			lheaders["content-length"] = lheaders["content-length"] || 0;

			// Ensuring JSON has proper mimetype
			if (regex.json_wrap.test(lbody)) {
				lheaders["content-type"] = "application/json";
			}

			// CSV hook
			if (regex.get_only.test(req.method) && lstatus === this.codes.OK && lbody && lheaders["content-type"] === "application/json" && req.headers.accept && regex.csv.test(utility.explode(req.headers.accept)[0].replace(regex.nval, ""))) {
				lheaders["content-type"] = "text/csv";

				if (!lheaders["content-disposition"]) {
					lheaders["content-disposition"] = "attachment; filename=\"" + req.parsed.pathname.replace(/.*\//g, "").replace(/\..*/, "_") + req.parsed.search.replace("?", "").replace(/\&/, "_") + ".csv\"";
				}

				lbody = csv.encode(lbody);
			}
		}

		if (lstatus === this.codes.NOT_MODIFIED) {
			delete lheaders["accept-ranges"];
			delete lheaders["content-encoding"];
			delete lheaders["content-length"];
			delete lheaders["content-type"];
			delete lheaders.date;
			delete lheaders["transfer-encoding"];
		}

		// Clean up, in case it these are still hanging around
		if (lstatus === this.codes.NOT_FOUND) {
			delete lheaders.allow;
			delete lheaders["access-control-allow-methods"];
		}

		// Setting `x-response-time`
		lheaders["x-response-time"] = ((req.timer.stopped.length === 0 ? req.timer.stop() : req.timer).diff() / 1000000).toFixed(2) + " ms";

		// Setting the partial content headers
		if (req.headers.range) {
			options = {};
			(req.headers.range.match(/\d+/g) || []).forEach((i, idx) => {
				options[idx === 0 ? "start" : "end"] = parseInt(i, 10);
			});

			if (options.end === undefined) {
				options.end = lheaders["content-length"];
			}

			if (isNaN(options.start) || isNaN(options.end) || options.start >= options.end) {
				delete req.headers.range;
				return this.error(req, res, this.codes.NOT_SATISFIABLE).then(function () {
					deferred.resolve(true);
				}, function (e) {
					deferred.reject(e);
				});
			}

			lstatus = this.codes.PARTIAL_CONTENT;
			lheaders.status = lstatus + " " + http.STATUS_CODES[lstatus];
			lheaders["content-range"] = "bytes " + options.start + "-" + options.end + "/" + lheaders["content-length"];
			lheaders["content-length"] = options.end - options.start;

			// Complete range
			++lheaders["content-length"];

			// Accounting for 0 byte start position
			--options.start;
			--options.end;
		}

		// Determining if response should be compressed
		if (ua && (lstatus === this.codes.OK || lstatus === this.codes.PARTIAL_CONTENT) && lbody !== this.messages.NO_CONTENT && this.config.compress && (type = this.compression(ua, encoding, lheaders["content-type"])) && !utility.isEmpty(type)) {
			lheaders["content-encoding"] = regex.gzip.test(type) ? "gzip" : "deflate";

			if (file) {
				lheaders["transfer-encoding"] = "chunked";
				delete lheaders["content-length"];
			}

			finalize();
			this.compress(req, res, lbody, type, lheaders.etag ? lheaders.etag.replace(/"/g, "") : undefined, file, options, lstatus, lheaders).then(function () {
				deferred.resolve(true);
			}, function (e) {
				deferred.reject(e);
			});
		} else if ((lstatus === this.codes.OK || lstatus === this.codes.PARTIAL_CONTENT) && file && regex.get_only.test(req.method)) {
			lheaders["transfer-encoding"] = "chunked";
			delete lheaders["content-length"];
			finalize();

			if (!res._header && !res._headerSent) {
				res.writeHead(lstatus, lheaders);
			}

			fs.createReadStream(lbody, options).on("error", () => {
				deferred.reject(new Error(this.codes.SERVER_ERROR));
			}).on("close", function () {
				deferred.resolve(true);
			}).pipe(res);
		} else {
			finalize();

			if (!res._header && !res._headerSent) {
				res.writeHead(lstatus, lheaders);
			}

			if (lstatus === this.codes.PARTIAL_CONTENT) {
				// Accounting for Buffer/String `slice()`
				++options.end;

				if (lbody instanceof Buffer) {
					res.end(lbody.slice(options.start, options.end).toString());
				} else {
					res.end(new Buffer(lbody).slice(options.start, options.end).toString());
				}
			} else {
				res.end(lbody);
			}

			deferred.resolve(true);
		}

		timer.stop();
		this.signal("respond", function () {
			return [req.vhost, req.method, req.url, lstatus, timer.diff()];
		});

		process.nextTick(() => {
			this.log(this.prep(req, res, lheaders), "info");
		});

		return deferred.promise;
	}

	/**
	 * Restarts the instance
	 *
	 * @method restart
	 * @return {Object} TurtleIO instance
	 */
	restart () {
		let config = this.config;

		return this.stop().start(config);
	}

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
	routes (uri, host, method, override = false) {
		let id = method + ":" + host + ":" + uri,
			cached = !override ? this.routeCache.get(id) : undefined,
			lall, h, result;

		if (cached) {
			result = cached;
		} else {
			lall = this.middleware.all || {};
			h = this.middleware[host] || {};
			result = [];

			[lall.all, lall[method], h.all, h[method]].forEach(function (c) {
				if (c) {
					Object.keys(c).filter(function (i) {
						let valid;

						try {
							valid = new RegExp("^" + i + "$", "i").test(uri);
						} catch (e) {
							valid = new RegExp("^" + utility.escape(i) + "$", "i").test(uri);
						}

						return valid;
					}).forEach(function (i) {
						result = result.concat(c[i]);
					});
				}
			});

			this.routeCache.set(id, result);
		}

		return result;
	}

	/**
	 * Signals a probe
	 *
	 * @method signal
	 * @param  {String}   name Name of probe
	 * @param  {Function} fn   DTP handler
	 * @return {Object}        TurtleIO instance
	 */
	signal (name, fn) {
		if (this.config.logs.dtrace) {
			this.dtp.fire(name, fn);
		}

		return this;
	}

	/**
	 * Starts the instance
	 *
	 * @method start
	 * @param  {Object}   cfg Configuration
	 * @param  {Function} err Error handler
	 * @return {Object}       TurtleIO instance
	 */
	start (cfg = {}, err = undefined) {
		let config = utility.merge(utility.clone(defaultConfig), cfg),
			headers, pages;

		this.dtp = dtrace.createDTraceProvider(config.id || "turtle-io");

		// Duplicating headers for re-decoration
		headers = utility.clone(config.headers);

		// Overriding default error handler
		if (typeof err === "function") {
			this.error = err;
		}

		// Setting configuration
		if (!config.port) {
			config.port = 8000;
		}

		this.config = utility.merge(this.config, config);

		// Setting temp folder
		this.config.tmp = this.config.tmp || os.tmpdir();

		pages = this.config.pages ? path.join(this.config.root, this.config.pages) : path.join(__dirname, "..", "pages");
		this.loglevel = this.levels.indexOf(this.config.logs.level);
		this.logging = this.config.logs.dtrace || this.config.logs.stdout;

		// Looking for required setting
		if (!this.config.default) {
			this.log(new Error("[client 0.0.0.0] Invalid default virtual host"), "error");
			process.exit(1);
		}

		// Lowercasing default headers
		delete this.config.headers;
		this.config.headers = {};

		utility.iterate(headers, (value, key) => {
			this.config.headers[key.toLowerCase()] = value;
		});

		// Setting `Server` HTTP header
		if (!this.config.headers.server) {
			this.config.headers.server = "turtle.io/" + version;
			this.config.headers["x-powered-by"] = "node.js/" + process.versions.node.replace(/^v/, "") + " " + utility.capitalize(process.platform) + " V8/" + utility.trim(process.versions.v8.toString());
		}

		// Creating regex.rewrite
		regex.rewrite = new RegExp("^(" + this.config.proxy.rewrite.join("|") + ")$");

		// Setting default routes
		this.host(all);

		// Registering DTrace probes
		this.probes();

		// Registering virtual hosts
		array.cast(config.vhosts, true).forEach(i => {
			this.host(i);
		});

		// Loading default error pages
		fs.readdir(pages, (e, files) => {
			if (e) {
				this.log(new Error("[client 0.0.0.0] " + e.message), "error");
			} else if (Object.keys(this.config).length > 0) {
				let next = (req, res) => {
					this.decorate(req, res);
					router(req, res).then(function (arg) {
						return arg;
					}, errz => {
						let body, status;

						if (isNaN(errz.message)) {
							body = errz;
							status = new Error(this.codes.SERVER_ERROR);
						} else {
							body = errz.extended;
							status = Number(errz.message);
						}

						return this.error(req, res, status, body);
					});
				};

				files.forEach(i => {
					this.pages.all[i.replace(regex.next, "")] = fs.readFileSync(path.join(pages, i), "utf8");
				});

				// Starting server
				if (this.server === null) {
					if (this.config.ssl.cert !== null && this.config.ssl.key !== null) {
						// POODLE
						this.config.secureProtocol = "SSLv23_method";
						this.config.secureOptions = constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2;

						// Reading files
						this.config.ssl.cert = fs.readFileSync(this.config.ssl.cert);
						this.config.ssl.key = fs.readFileSync(this.config.ssl.key);

						// Starting server
						this.server = https.createServer(utility.merge(this.config.ssl, {
							port: this.config.port,
							host: this.config.address,
							secureProtocol: this.config.secureProtocol,
							secureOptions: this.config.secureOptions
						}), next).listen(this.config.port, this.config.address);
					} else {
						this.server = http.createServer(next).listen(this.config.port, this.config.address);
					}
				} else {
					this.server.listen(this.config.port, this.config.address);
				}

				// Dropping process
				if (this.config.uid && !isNaN(this.config.uid)) {
					process.setuid(this.config.uid);
				}

				this.log("Started " + this.config.id + " on port " + this.config.port, "debug");
			}
		});

		// Something went wrong, server must restart
		process.on("uncaughtException", e => {
			this.log(e, "error");
			process.exit(1);
		});

		return this;
	}

	/**
	 * Stops the instance
	 *
	 * @method stop
	 * @return {Object} TurtleIO instance
	 */
	stop () {
		let port = this.config.port;

		this.log("Stopping " + this.config.id + " on port " + port, "debug");
		this.config = utility.clone(defaultConfig);
		this.dtp = null;
		this.etags = lru(1000);
		this.pages = {all: {}};
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
	}

	/**
	 * Unregisters an Etag in the LRU cache and removes stale representation from disk
	 *
	 * @method unregister
	 * @param  {String} uri URL requested
	 * @return {Object}     TurtleIO instance
	 */
	unregister (uri) {
		let cached = this.etags.cache[uri],
			lpath = this.config.tmp,
			ext = ["gz", "zz"];

		if (cached) {
			lpath = path.join(lpath, cached.value.etag);
			this.etags.remove(uri);
			ext.forEach(i => {
				let lfile = lpath + "." + i;

				fs.exists(lfile, (exists) => {
					if (exists) {
						fs.unlink(lfile, e => {
							if (e) {
								this.log(e);
							}
						});
					}
				});
			});
		}

		return this;
	}

	/**
	 * Constructs a URL
	 *
	 * @method url
	 * @param  {Object} req Request Object
	 * @return {String}     Requested URL
	 */
	url (req) {
		let header = req.headers.authorization || "",
			auth = "",
			token;

		if (!utility.isEmpty(header)) {
			token = header.split(regex.space).pop() || "";
			auth = new Buffer(token, "base64").toString();

			if (!utility.isEmpty(auth)) {
				auth += "@";
			}
		}

		return "http" + (this.config.ssl.cert ? "s" : "") + "://" + auth + req.headers.host + req.url;
	}

	/**
	 * Adds middleware to processing chain
	 *
	 * @method use
	 * @param  {String}   rpath   [Optional] Path the middleware applies to, default is `/*`
	 * @param  {Function} fn      Middlware to chain
	 * @param  {String}   host    [Optional] Host
	 * @param  {String}   method  [Optional] HTTP method
	 * @return {Object}           TurtleIO instance
	 */
	use (rpath, fn, host, method) {
		let lpath = rpath,
			lfn = fn,
			lhost = host,
			lmethod = method;

		if (typeof lpath !== "string") {
			lhost = lfn;
			lfn = lpath;
			lpath = "/.*";
		}

		lhost = lhost || all;
		lmethod = lmethod || all;

		if (typeof lfn !== "function" && (lfn && typeof lfn.handle !== "function")) {
			throw new Error("Invalid middleware");
		}

		if (!this.middleware[lhost]) {
			this.middleware[lhost] = {};
		}

		if (!this.middleware[lhost][lmethod]) {
			this.middleware[lhost][lmethod] = {};
		}

		if (!this.middleware[lhost][lmethod][lpath]) {
			this.middleware[lhost][lmethod][lpath] = [];
		}

		if (lfn.handle) {
			lfn = lfn.handle;
		}

		lfn.hash = this.hash(lfn.toString());
		this.middleware[lhost][lmethod][lpath].push(lfn);

		return this;
	}

	/**
	 * Sets a handler for all methods
	 *
	 * @method all
	 * @param  {String}   route RegExp pattern
	 * @param  {Function} fn    Handler
	 * @param  {String}   host  [Optional] Virtual host, default is `all`
	 * @return {Object}         TurtleIO instance
	 */
	all (route, fn, host) {
		verbs.forEach(i => {
			this.use(route, fn, host, i);
		});

		return this;
	}

	/**
	 * Sets a DELETE handler
	 *
	 * @method delete
	 * @param  {String}   route RegExp pattern
	 * @param  {Function} fn    Handler
	 * @param  {String}   host  [Optional] Virtual host, default is `all`
	 * @return {Object}         TurtleIO instance
	 */
	del (route, fn, host) {
		return this.use(route, fn, host, "delete");
	}

	/**
	 * Sets a DELETE handler
	 *
	 * @method delete
	 * @param  {String}   route RegExp pattern
	 * @param  {Function} fn    Handler
	 * @param  {String}   host  [Optional] Virtual host, default is `all`
	 * @return {Object}         TurtleIO instance
	 */
	delete (route, fn, host) {
		return this.use(route, fn, host, "delete");
	}

	/**
	 * Sets a GET handler
	 *
	 * @method delete
	 * @param  {String}   route RegExp pattern
	 * @param  {Function} fn    Handler
	 * @param  {String}   host  [Optional] Virtual host, default is `all`
	 * @return {Object}         TurtleIO instance
	 */
	get (route, fn, host) {
		return this.use(route, fn, host, "get");
	}

	/**
	 * Sets a PATCH handler
	 *
	 * @method delete
	 * @param  {String}   route RegExp pattern
	 * @param  {Function} fn    Handler
	 * @param  {String}   host  [Optional] Virtual host, default is `all`
	 * @return {Object}         TurtleIO instance
	 */
	patch (route, fn, host) {
		return this.use(route, fn, host, "patch");
	}

	/**
	 * Sets a POST handler
	 *
	 * @method delete
	 * @param  {String}   route RegExp pattern
	 * @param  {Function} fn    Handler
	 * @param  {String}   host  [Optional] Virtual host, default is `all`
	 * @return {Object}         TurtleIO instance
	 */
	post (route, fn, host) {
		return this.use(route, fn, host, "post");
	}

	/**
	 * Sets a PUT handler
	 *
	 * @method delete
	 * @param  {String}   route RegExp pattern
	 * @param  {Function} fn    Handler
	 * @param  {String}   host  [Optional] Virtual host, default is `all`
	 * @return {Object}         TurtleIO instance
	 */
	put (route, fn, host) {
		return this.use(route, fn, host, "put");
	}

	/**
	 * Watches `path` for changes & updated LRU
	 *
	 * @method watcher
	 * @param  {String} uri   LRUItem url
	 * @param  {String} fpath File path
	 * @return {Object}       TurtleIO instance
	 */
	watch (uri, fpath) {
		/**
		 * Cleans up caches
		 *
		 * @method cleanup
		 * @private
		 * @return {Undefined} undefined
		 */
		let cleanup = () => {
			this.watching[fpath].close();
			this.unregister(uri);
			delete this.watching[fpath];
		};

		if (this.watching[fpath] === undefined) {
			this.watching[fpath] = fs.watch(fpath, ev => {
				if (regex.rename.test(ev)) {
					cleanup();
				} else {
					fs.lstat(fpath, (e, stat) => {
						let value;

						if (e) {
							this.log(e);
							cleanup();
						} else if (this.etags.cache[uri]) {
							value = this.etags.cache[uri].value;
							value.etag = this.etag(uri, stat.size, stat.mtime).toString();
							value.headers.etag = "\"" + value.etag + "\"";
							value.timestamp = parseInt(new Date().getTime() / 1000, 10);
							this.register(uri, value, true);
						} else {
							cleanup();
						}
					});
				}
			});
		}

		return this;
	}

	/**
	 * Writes files to disk
	 *
	 * @method write
	 * @param  {Object} req   HTTP request Object
	 * @param  {Object} res   HTTP response Object
	 * @param  {String} fpath File path
	 * @return {Object}       Promise
	 */
	write (req, res, fpath) {
		let timer = precise().start(),
			deferred = defer(),
			put = regex.put.test(req.method),
			body = req.body,
			allow = req.allow,
			del = this.allowed("DELETE", req.parsed.pathname, req.vhost),
			status;

		if (!put && regex.end_slash.test(req.url)) {
			status = this.codes[del ? "CONFLICT" : "SERVER_ERROR"];
			timer.stop();

			this.signal("write", function () {
				return [req.vhost, req.url, req.method, fpath, timer.diff()];
			});

			deferred.resolve(this.respond(req, res, this.page(status, this.hostname(req)), status, {allow: allow}, false));
		} else {
			allow = array.remove(utility.explode(allow), "POST").join(", ");

			fs.lstat(fpath, (e, stat) => {
				let letag;

				if (e) {
					deferred.reject(new Error(this.codes.NOT_FOUND));
				} else {
					letag = "\"" + this.etag(req.parsed.href, stat.size, stat.mtime) + "\"";

					if (!req.headers.hasOwnProperty("etag") || req.headers.etag === letag) {
						fs.writeFile(fpath, body, err => {
							if (err) {
								deferred.reject(new Error(this.codes.SERVER_ERROR));
							} else {
								status = this.codes[put ? "NO_CONTENT" : "CREATED"];
								deferred.resolve(this.respond(req, res, this.page(status, this.hostname(req)), status, {allow: allow}, false));
							}
						});
					} else if (req.headers.etag !== letag) {
						deferred.resolve(this.respond(req, res, this.messages.NO_CONTENT, this.codes.FAILED, {}, false));
					}
				}
			});

			timer.stop();
			this.signal("write", function () {
				return [req.vhost, req.url, req.method, fpath, timer.diff()];
			});
		}

		return deferred.promise;
	}
}

module.exports = TurtleIO;
