const array = require("retsu"),
	defer = require("tiny-defer"),
	lru = require("tiny-lru"),
	path = require("path"),
	http = require("http"),
	mmh3 = require("murmurhash3js").x86.hash32,
	utility = require(path.join(__dirname, "utility.js")),
	regex = require(path.join(__dirname, "regex.js")),
	all = "all";

class Router {
	constructor (max, seed) {
		this.noaction = {};
		this.cache = lru(max);
		this.permissions = lru(max);
		this.middleware = new Map();
		this.hosts = [];
		this.patterns = [];
		this.seed = seed;
		this.verbs = ["DELETE", "GET", "POST", "PUT", "PATCH"];
	}

	allowed (method, uri, host, override) {
		return this.routes(uri, host, method, override).filter(i => {
				return this.noaction[i.hash || this.hash(i)] === undefined;
			}).length > 0;
	}

	allows (uri, host, override) {
		let result = !override ? this.permissions.get(host + "_" + uri) : undefined;

		if (override || !result) {
			result = this.verbs.filter(i => {
				return this.allowed(i, uri, host, override);
			});

			result = result.join(", ").replace("GET", "GET, HEAD, OPTIONS");
			this.permissions.set(host + "_" + uri, result);
		}

		return result;
	}

	blacklist (fn) {
		let hfn = fn.hash || this.hash(fn.toString());

		if (!this.config.noaction[hfn]) {
			this.config.noaction[hfn] = 1;
		}

		return hfn;
	}

	hash (arg) {
		return mmh3(arg, this.seed);
	}

	host (arg) {
		let result;

		array.each(this.patterns, (i, idx) => {
			if (i.test(arg)) {
				return !(result = this.hosts[idx]);
			}
		});

		return result;
	}

	last (req, res, method, deferred, err) {
		let errorCode, error, status;

		if (!err) {
			if (regex.get.test(method)) {
				deferred.resolve([req, res]);
			}

			deferred.reject(req.allow.indexOf("GET") > -1 ? new Error(405) : new Error(404));
		} else {
			errorCode = !isNaN(err.message) ? err.message : http.STATUS_CODES[err.message || err] || 500;
			status = res.statusCode >= 400 ? res.statusCode : errorCode;
			error = new Error(status);
			error.extended = isNaN(err.message) ? err.stack : undefined;
			deferred.reject(error);
		}
	}

	route (req, res) {
		let deferred = defer(),
			method = regex.head.test(req.method) ? "GET" : req.method,
			middleware = array.iterator(this.routes(req.parsed.pathname, req.host, method));

		let next = err => {
			process.nextTick(() => {
				let arity = 3,
					item = middleware.next();

				if (!item.done) {
					if (err) {
						arity = utility.getArity(item.value);
						do {
							arity = utility.getArity(item.value);
						} while (arity < 4 && (item = middleware.next()) && !item.done);
					}

					if (!item.done) {
						if (err) {
							if (arity === 4) {
								try {
									item.value(err, req, res, next);
								} catch (e) {
									next(e);
								}
							} else {
								this.last(req, res, method, deferred, err);
							}
						} else {
							try {
								item.value(req, res, next);
							} catch (e) {
								next(e);
							}
						}
					} else {
						this.last(req, res, method, deferred, err);
					}
				} else if (!res._header && req.server.config.catchAll) {
					this.last(req, res, method, deferred, err);
				} else if (res._header) {
					deferred.resolve([req, res]);
				}
			});
		};

		next();

		return deferred.promise;
	}

	routes (uri, host, method, override = false) {
		let id = method + ":" + host + ":" + uri,
			cached = !override ? this.cache.get(id) : undefined,
			lall, h, result;

		if (cached) {
			result = cached;
		} else {
			lall = this.middleware.get(all) || new Map();
			h = this.middleware.get(host) || new Map();
			result = [];

			[lall.get(all), lall.get(method), h.get(all), h.get(method)].forEach(c => {
				if (c) {
					Array.from(c.keys()).filter(i => {
						let valid;

						try {
							valid = new RegExp("^" + i + "$", "i").test(uri);
						} catch (e) {
							valid = new RegExp("^" + utility.escape(i) + "$", "i").test(uri);
						}

						return valid;
					}).forEach(i => {
						result = result.concat(c.get(i));
					});
				}
			});

			this.cache.set(id, result);
		}

		return result;
	}

	use (rpath, fn, host, method) {
		let lpath = rpath,
			lfn = fn,
			lhost = host,
			lmethod = method,
			mhost, mmethod;

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

		if (!this.middleware.has(lhost)) {
			this.middleware.set(lhost, new Map());
		}

		mhost = this.middleware.get(lhost);

		if (!mhost.has(lmethod)) {
			mhost.set(lmethod, new Map());
		}

		mmethod = mhost.get(lmethod);

		if (!mmethod.has(lpath)) {
			mmethod.set(lpath, []);
		}

		if (lfn.handle) {
			lfn = lfn.handle;
		}

		lfn.hash = this.hash(lfn.toString());
		mmethod.get(lpath).push(lfn);

		return this;
	}
}

function factory (max = 1000, seed = 9) {
	return new Router(max, seed);
}

module.exports = factory;
