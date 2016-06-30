"use strict";

const array = require("retsu"),
	defer = require("tiny-defer"),
	lru = require("tiny-lru"),
	http = require("http"),
	https = require("https"),
	path = require("path"),
	fs = require("fs"),
	mime = require("mimetype"),
	moment = require("moment"),
	zlib = require("zlib"),
	regex = require(path.join(__dirname, "regex.js")),
	utility = require(path.join(__dirname, "utility.js")),
	verbs = ["DELETE", "GET", "POST", "PUT", "PATCH"];

class TurtleIO {
	constructor () {
		this.config = {
			address: "0.0.0.0",
			default: "localhost",
			cacheSize: 1000,
			catchAll: true,
			compress: true,
			headers: {
				"accept-ranges": "bytes",
				"cache-control": "public, max-age=300, must-revalidate",
				"content-type": "text/html; charset=utf-8"
			},
			hosts: {},
			index: ["index.htm", "index.html"],
			json: 2,
			logging: {
				enabled: true,
				stack: true,
				format: "%v %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-agent}i\"",
				level: "info",
				levels: {
					"emerg": 0,
					"alert": 1,
					"crit": 2,
					"error": 3,
					"warn": 4,
					"notice": 5,
					"info": 6,
					"debug": 7
				},
				time: "D/MMM/YYYY:HH:mm:ss ZZ"
			},
			maxBytes: 1048576,
			port: 8000,
			root: "",
			seed: 625,
			ssl: {
				key: null,
				cert: null
			},
			uid: 0
		};
		this.etags = null;
		this.router = null;
		this.server = null;
		this.watching = new Map();
	}

	all (route, fn, host) {
		array.each(verbs, i => {
			this.router.use(route, fn, i, host);
		});

		return this;
	}

	allows (...args) {
		return this.router.allows(...args);
	}

	allowed (...args) {
		return this.router.allowed(...args);
	}

	blacklist (...args) {
		return this.router.blacklist(...args);
	}

	clf (req, res, headers) {
		let user = "-";

		if (req.parsed.auth && req.parsed.auth.indexOf(":") > -1) {
			user = req.parsed.auth.split(":")[0] || "-";
		}

		return this.config.logging.format.replace("%v", req.headers.host)
			.replace("%h", req.ip || "-")
			.replace("%l", "-")
			.replace("%u", user)
			.replace("%t", "[" + moment().format(this.config.logging.time) + "]")
			.replace("%r", req.method + " " + req.url + " HTTP/1.1")
			.replace("%>s", res.statusCode)
			.replace("%b", headers["content-length"] || "-")
			.replace("%{Referer}i", req.headers.referer || "-")
			.replace("%{User-agent}i", req.headers["user-agent"] || "-");
	}

	compression (encoding = "", mimetype = "") {
		let result = "";

		if (this.config.compress === true && regex.compress.test(mimetype)) {
			array.each(utility.explode(encoding), i => {
				let output;

				if (regex.gzip.test(i)) {
					result = "gz";
					output = false;
				}

				if (regex.def.test(i)) {
					result = "zz";
					output = false;
				}

				return output;
			});
		}

		return result;
	}

	del (route, fn, host) {
		this.router.use(route, fn, host, "DELETE");

		return this;
	}

	delete (route, fn, host) {
		this.router.use(route, fn, host, "DELETE");

		return this;
	}

	error (req, res, status = 500, msg) {
		let body;

		if (msg === undefined) {
			body = "<!DOCTYPE html><html><head><title>" + http.STATUS_CODES[status] + "</title></head><body><h1>" + http.STATUS_CODES[status] + "</h1></body></html>";
		}

		return this.send(req, res, msg || body, status, {"cache-control": "no-cache"});
	}

	etag (...args) {
		return this.hash(args.join("-"));
	}

	get (route, fn, host) {
		this.router.use(route, fn, host, "GET");

		return this;
	}

	handle (req, res, fpath, uri, dir, stat) {
		let deferred = defer(),
			allow = req.allow,
			write = array.contains(allow, dir ? "POST" : "PUT"),
			del = array.contains(allow, "DELETE"),
			method = req.method,
			status = 200,
			letag, headers, mimetype, modified, size, pathname, invalid, out_dir, in_dir, options;

		if (!dir) {
			pathname = req.parsed.pathname.replace(regex.root, "");
			invalid = (pathname.replace(regex.dir, "").split("/").filter(i => {
					return i !== ".";
				})[0] || "") === "..";
			out_dir = !invalid ? (pathname.match(/\.{2}\//g) || []).length : 0;
			in_dir = !invalid ? (pathname.match(/\w+?(\.\w+|\/)+/g) || []).length : 0;

			if (invalid) {
				deferred.reject(new Error(404));
			} else if (out_dir > 0 && out_dir >= in_dir) {
				deferred.reject(new Error(404));
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
					this.watch(req.parsed.href, fpath);

					if (req.headers["if-none-match"] === letag) {
						delete headers["content-length"];
						this.send(req, res, "", 304, headers).then(deferred.resolve, deferred.reject);
					} else if (!req.headers["if-none-match"] && Date.parse(req.headers["if-modified-since"]) >= stat.mtime) {
						delete headers["content-length"];
						this.send(req, res, "", 304, headers).then(deferred.resolve, deferred.reject);
					} else {
						options = {};

						// Setting the partial content headers
						if (req.headers.range) {
							array.each(req.headers.range.split(",")[0].split("-"), (i, idx) => {
								options[idx === 0 ? "start" : "end"] = i ? parseInt(i, 10) : undefined;
							});

							// Byte offsets
							if (isNaN(options.start) && !isNaN(options.end)) {
								options.start = size - options.end;
								options.end = size;
							} else if (isNaN(options.end)) {
								options.end = size;
							}

							if (options.start >= options.end || isNaN(options.start) || isNaN(options.start)) {
								return this.error(req, res, 416, http.STATUS_CODES[416]).then(deferred.resolve, deferred.reject);
							}

							status = 206;
							headers["content-range"] = "bytes " + options.start + "-" + options.end + "/" + size;
							headers["content-length"] = options.end - options.start + 1;
						}

						this.send(req, res, fs.createReadStream(fpath, options), status, headers).then(deferred.resolve, deferred.reject);
					}
				} else {
					this.send(req, res, "", 200, headers).then(deferred.resolve, deferred.reject);
				}
			} else if (regex.del.test(method) && del) {
				this.unregister(req.parsed.href, fpath);

				fs.unlink(fpath, e => {
					if (e) {
						this.error(req, res, 500).then(deferred.resolve, deferred.reject);
					} else {
						this.send(req, res, "", 204, {}).then(deferred.resolve, deferred.reject);
					}
				});
			} else if (regex.put.test(method) && write) {
				this.write(req, res, fpath).then(deferred.resolve, deferred.reject);
			} else {
				this.error(req, res, 500).then(deferred.resolve, deferred.reject);
			}
		} else if ((regex.post.test(method) || regex.put.test(method)) && write) {
			this.write(req, res, fpath).then(deferred.resolve, deferred.reject);
		} else {
			this.error(req, res, 405, http.STATUS_CODES[405]).then(deferred.resolve, deferred.reject);
		}

		return deferred.promise;
	}

	headers (req, res, status, body, headers, pipe) {
		let result = utility.merge(utility.clone(this.config.headers), headers),
			cors = ["access-control-allow-origin",
				"access-control-allow-credentials",
				"access-control-expose-headers",
				"access-control-max-age",
				"access-control-allow-methods",
				"access-control-allow-headers"],
			options = {},
			size;

		if (!req.cors) {
			array.each(cors, i => {
				delete result[i];
			});
		} else {
			array.each(cors, i => {
				result[i] = result[i.replace("access-control-", "")] || "";
			});

			result["access-control-allow-origin"] = req.headers.origin || req.headers.referer.replace(/\/$/, "");
			result["access-control-allow-credentials"] = "true";
			result["access-control-allow-methods"] = result.allow;
		}

		if (!pipe && result["content-length"] === undefined) {
			result["content-length"] = Buffer.byteLength(body.toString());
		} else if (pipe) {
			delete result["content-length"];
			result["transfer-encoding"] = "chunked";
		}

		size = result["content-length"] || 0;

		if (!pipe && req.headers.range && headers["content-range"] === undefined) {
			array.each(req.headers.range.split(",")[0].split("-"), (i, idx) => {
				options[idx === 0 ? "start" : "end"] = i ? parseInt(i, 10) : undefined;
			});

			// Byte offsets
			if (isNaN(options.start) && !isNaN(options.end)) {
				options.start = size - options.end;
				options.end = size;
			} else if (isNaN(options.end)) {
				options.end = size;
			}

			if (options.start >= options.end || isNaN(options.start) || isNaN(options.start)) {
				result["content-range"] = "";
			} else {
				req.range = options;
				result["content-range"] = "bytes " + options.start + "-" + options.end + "/" + size;
				result["content-length"] = options.end - options.start + 1;
			}
		}

		if (!regex.get.test(req.method) || status >= 400) {
			delete result.etag;
			delete result["last-modified"];
		}

		if (status === 304) {
			delete result["content-length"];
			delete result["last-modified"];
		}

		if (status === 404) {
			delete result["accept-ranges"];
			delete result["access-control-allow-methods"];
		}

		if (status >= 500) {
			delete result["accept-ranges"];
		}

		if (result["last-modified"] === "") {
			delete result["last-modified"];
		}

		result["x-response-time"] = ((req.timer.stopped.length === 0 ? req.timer.stop() : req.timer).diff() / 1000000).toFixed(2) + " ms";

		this.log("Generated headers", "debug");

		return result;
	}

	hash (arg) {
		return this.router.hash(arg);
	}

	log (msg, level = "debug") {
		let idx;

		if (this.config.logging.enabled) {
			idx = this.config.logging.levels[level];

			if (idx <= this.config.logging.levels[this.config.logging.level]) {
				process.nextTick(() => {
					console[idx > 4 ? "log" : "error"](msg);
				});
			}
		}

		return this;
	}

	patch (route, fn, host) {
		this.router.use(route, fn, host, "PATCH");

		return this;
	}

	post (route, fn, host) {
		this.router.use(route, fn, host, "POST");

		return this;
	}

	put (route, fn, host) {
		this.router.use(route, fn, host, "PUT");

		return this;
	}

	register (uri, state) {
		delete state.headers["cache-control"];
		delete state.headers["content-length"];
		delete state.headers["content-encoding"];
		delete state.headers.date;
		delete state.headers.server;
		delete state.headers["transfer-encoding"];
		delete state.headers["x-powered-by"];
		delete state.headers["x-response-time"];
		delete state.headers["access-control-allow-origin"];
		delete state.headers["access-control-expose-headers"];
		delete state.headers["access-control-max-age"];
		delete state.headers["access-control-allow-credentials"];
		delete state.headers["access-control-allow-methods"];
		delete state.headers["access-control-allow-headers"];
		this.etags.set(uri, state);
		this.log("Registered " + uri + " in cache", "debug");

		return this;
	}

	request (req, res) {
		let deferred = defer(),
			method = req.method,
			handled = false,
			count, lpath, nth, root;

		if (req.headers.expect) {
			deferred.reject(new Error(417));
		} else {
			root = path.join(this.config.root, this.config.hosts[req.host]);
			lpath = path.join(root, req.parsed.pathname.replace(regex.dir, ""));

			fs.lstat(lpath, (e, stats) => {
				if (e) {
					deferred.reject(new Error(404));
				} else if (!stats.isDirectory()) {
					this.handle(req, res, lpath, req.parsed.href, false, stats).then(deferred.resolve, deferred.reject);
				} else if (regex.get.test(method) && !regex.dir.test(req.parsed.pathname)) {
					this.send(req, res, "", 301, {"location": (req.parsed.pathname !== "/" ? req.parsed.pathname : "") + "/" + req.parsed.search}).then(deferred.resolve, deferred.reject);
				} else if (!regex.get.test(method)) {
					this.handle(req, res, lpath, req.parsed.href, true).then(deferred.resolve, deferred.reject);
				} else {
					count = 0;
					nth = this.config.index.length;

					array.each(this.config.index, i => {
						let npath = path.join(lpath, i);

						fs.lstat(npath, (err, lstats) => {
							if (!err && !handled) {
								handled = true;
								this.handle(req, res, npath, (req.parsed.pathname !== "/" ? req.parsed.pathname : "") + "/" + i + req.parsed.search, false, lstats).then(deferred.resolve, deferred.reject);
							} else if (++count === nth && !handled) {
								deferred.reject(new Error(404));
							}
						});
					});
				}
			});
		}

		this.log("Routed request to disk", "debug");

		return deferred.promise.then(arg => arg, err => {
			this.router.onerror(req, res, err);
		});
	}

	send (req, res, body = "", status = 200, headers = {"content-type": "text/plain"}) {
		let deferred = defer(),
			pipe = typeof body.on === "function",
			indent = this.config.json,
			header, lheaders, compression, compressionMethod;

		let errHandler = e => {
			try {
				res.statusCode = 500;
				res.end(http.STATUS_CODES[500]);
			} catch (err) {
				void 0;
			}

			this.log(e.stack, "warn");
			deferred.reject(e);
		};

		if (!res._header && !res._headerSent) {
			res.statusCode = status;

			if (!pipe && body instanceof Object || body instanceof Array) {
				if (req.headers.accept) {
					header = regex.indent.exec(req.headers.accept);
					indent = header !== null ? parseInt(header[1], 10) : this.config.json;
				}

				body = JSON.stringify(body, null, indent);
				headers["content-length"] = Buffer.byteLength(body);
				headers["content-type"] = "application/json";
			}

			lheaders = this.headers(req, res, status, body, headers, pipe);

			if (status !== 416 && req.headers.range && !lheaders["content-range"]) {
				return this.error(req, res, 416, http.STATUS_CODES[416]);
			}

			if (body) {
				compression = this.compression(req.headers["accept-encoding"], lheaders["content-type"]);
			}

			if (compression) {
				if (regex.gzip.test(compression)) {
					lheaders["content-encoding"] = "gzip";
					compressionMethod = "createGzip";
				} else {
					lheaders["content-encoding"] = "deflate";
					compressionMethod = "createDeflate";
				}

				if (pipe) {
					lheaders["transfer-encoding"] = "chunked";
					delete lheaders["content-length"];
					res.writeHead(status, lheaders);
					body.pipe(zlib[compressionMethod]()).on("error", errHandler).on("close", () => {
						deferred.resolve(true);
					}).pipe(res);
				} else {
					zlib[compressionMethod.replace("create", "").toLowerCase()](body, (e, data) => {
						if (e) {
							errHandler(e);
						} else {
							lheaders["content-length"] = data.length;
							res.writeHead(status, lheaders);
							res.end(data);
							deferred.resolve(true);
						}
					});
				}
			} else {
				if (lheaders["content-range"]) {
					status = res.statusCode = 206;
				}

				res.writeHead(status, lheaders);

				if (pipe) {
					body.on("error", errHandler).on("close", () => {
						deferred.resolve(true);
					}).pipe(res);
				} else {
					if (req.range) {
						res.end(new Buffer(body.toString()).slice(req.range.start, req.range.end + 1).toString());
					} else {
						res.end(body.toString());
					}

					deferred.resolve(true);
				}
			}

			if (status < 400 && lheaders.etag) {
				this.register(req.parsed.href, {
					etag: lheaders.etag.replace(/"/g, ""),
					headers: utility.clone(lheaders),
					timestamp: parseInt(new Date().getTime() / 1000, 10)
				}, true);
			}
		}

		return deferred.promise;
	}

	start () {
		if (!this.server) {
			if (!this.config.ssl.key && !this.config.ssl.cert) {
				this.server = http.createServer(this.router.route).listen(this.config.port, this.config.address);
			} else {
				this.server = https.createServer({
					cert: fs.readFileSync(this.config.ssl.cert),
					key: fs.readFileSync(this.config.ssl.key),
					port: this.config.port,
					host: this.config.address
				}, this.router.route).listen(this.config.port, this.config.address);
			}

			// Dropping process
			if (this.config.uid && !isNaN(this.config.uid)) {
				process.setuid(this.config.uid);
			}

			this.log("Started server on port " + this.config.address + ":" + this.config.port, "debug");
		}

		return this;
	}

	stop () {
		if (!this.server) {
			// Stopping inbound requests
			this.server.stop();
			this.server = null;

			// Clearing watchers
			array.each(this.watching, (key, watcher) => {
				watcher.close();
			});

			// Resetting state
			this.etags = lru(this.config.cacheSize);
			this.watching = new Map();

			this.log("Stopped server on port " + this.config.address + ":" + this.config.port, "debug");
		}

		return this;
	}

	unregister (uri, fpath) {
		this.etags.remove(uri);
		this.log("Unregistered " + uri + " from cache", "debug");

		if (fpath && this.watching.has(fpath)) {
			this.watching.get(fpath).close();
			this.watching.delete(fpath);
			this.log("Deleted file watcher for " + fpath, "debug");
		}

		return this;
	}

	use (...args) {
		return this.router.use.apply(this.router, args);
	}

	watch (uri, fpath) {
		if (!this.watching.has(fpath)) {
			this.watching.set(fpath, fs.watch(fpath, () => {
				this.unregister(uri, fpath);
			}));

			this.log("Created watcher for " + fpath + " (" + uri + ")", "debug");
		}

		return this;
	}

	write (req, res, fpath) {
		let deferred = defer(),
			put = regex.put.test(req.method),
			body = req.body,
			allow = req.allow,
			del = array.contains(req.allow, "DELETE"),
			status;

		if (!put && regex.end_slash.test(req.url)) {
			status = del ? 409 : 500;
			this.error(req, res, status, http.STATUS_CODES[status]);
			deferred.resolve(true);
		} else {
			allow = array.remove(utility.explode(allow), "POST").join(", ");

			fs.lstat(fpath, (e, stat) => {
				let letag;

				if (e) {
					deferred.reject(new Error(404));
				} else {
					letag = "\"" + this.etag(req.parsed.href, stat.size, stat.mtime) + "\"";

					if (req.headers["if-none-match"] === undefined || req.headers["if-none-match"] === letag) {
						fs.writeFile(fpath, body, err => {
							if (err) {
								deferred.reject(new Error(500));
							} else {
								status = put ? 204 : 201;
								deferred.resolve(this.send(req, res, http.STATUS_CODE[status], status, {allow: allow}, false));
							}
						});
					} else if (req.headers["if-none-match"] !== letag) {
						deferred.resolve(this.send(req, res, "", 412, {}, false));
					}
				}
			});
		}

		return deferred.promise;
	}
}

module.exports = TurtleIO;
