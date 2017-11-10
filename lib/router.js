"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var array = require("retsu"),
    defer = require("tiny-defer"),
    lru = require("tiny-lru"),
    path = require("path"),
    http = require("http"),
    mmh3 = require("murmurhash3js").x86.hash32,
    utility = require(path.join(__dirname, "utility.js")),
    regex = require(path.join(__dirname, "regex.js")),
    all = "all";

var Router = function () {
	function Router(max, seed) {
		_classCallCheck(this, Router);

		this.noaction = new Set();
		this.cache = lru(max);
		this.permissions = lru(max);
		this.middleware = new Map();
		this.hosts = [];
		this.patterns = [];
		this.seed = seed;
		this.verbs = ["DELETE", "GET", "POST", "PUT", "PATCH"];
	}

	_createClass(Router, [{
		key: "allowed",
		value: function allowed(method, uri, host, override) {
			var _this = this;

			return this.routes(uri, host, method, override).filter(function (i) {
				return !_this.noaction.has(i.hash || _this.hash(i));
			}).length > 0;
		}
	}, {
		key: "allows",
		value: function allows(uri, host, override) {
			var _this2 = this;

			var result = !override ? this.permissions.get(host + "_" + uri) : undefined;

			if (override || !result) {
				result = this.verbs.filter(function (i) {
					return _this2.allowed(i, uri, host, override);
				});

				result = result.join(", ").replace("GET", "GET, HEAD, OPTIONS");
				this.permissions.set(host + "_" + uri, result);
			}

			return result;
		}
	}, {
		key: "blacklist",
		value: function blacklist(fn) {
			var hfn = fn.hash || this.hash(fn.toString());

			if (!this.noaction.has(hfn)) {
				this.noaction.add(hfn);
			}

			return hfn;
		}
	}, {
		key: "hash",
		value: function hash(arg) {
			return mmh3(arg, this.seed);
		}
	}, {
		key: "host",
		value: function host(arg) {
			var _this3 = this;

			var result = void 0;

			array.each(this.patterns, function (i, idx) {
				return i.test(arg) ? !(result = _this3.hosts[idx]) : void 0;
			});

			return result;
		}
	}, {
		key: "last",
		value: function last(req, res, deferred, err) {
			var errorCode = void 0,
			    error = void 0,
			    status = void 0;

			if (!err) {
				deferred.reject(req.allow.indexOf("GET") > -1 ? new Error(405) : new Error(404));
			} else {
				errorCode = !isNaN(err.message) ? err.message : http.STATUS_CODES[err.message || err] || 500;
				status = res.statusCode >= 400 ? res.statusCode : errorCode;
				error = new Error(status);
				error.extended = isNaN(err.message) ? req.server.config.logging.stack ? err.stack : err.message : undefined;
				deferred.reject(error);
			}
		}
	}, {
		key: "route",
		value: function route(req, res) {
			var _this4 = this;

			var deferred = defer(),
			    method = regex.head.test(req.method) ? "GET" : req.method,
			    middleware = array.iterator(this.routes(req.parsed.pathname, req.host, method));

			var next = function next(err) {
				process.nextTick(function () {
					var arity = 3,
					    step = middleware.next();

					if (!step.done) {
						if (err) {
							arity = utility.getArity(step.value);
							do {
								arity = utility.getArity(step.value);
							} while (arity < 4 && (step = middleware.next()) && !step.done);
						}

						if (!step.done) {
							if (err) {
								if (arity === 4) {
									try {
										step.value(err, req, res, next);
									} catch (e) {
										next(e);
									}
								} else {
									_this4.last(req, res, deferred, err);
								}
							} else {
								try {
									step.value(req, res, next);
								} catch (e) {
									next(e);
								}
							}
						} else {
							_this4.last(req, res, deferred, err);
						}
					} else if (!res._header && req.server.config.catchAll) {
						_this4.last(req, res, deferred, err);
					} else if (res._header) {
						deferred.resolve([req, res]);
					}
				});
			};

			next();

			return deferred.promise;
		}
	}, {
		key: "routes",
		value: function routes(uri, host, method) {
			var override = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

			var id = method + ":" + host + ":" + uri,
			    cached = !override ? this.cache.get(id) : undefined,
			    lall = void 0,
			    h = void 0,
			    result = void 0;

			if (cached) {
				result = cached;
			} else {
				lall = this.middleware.get(all) || new Map();
				h = this.middleware.get(host) || new Map();
				result = [];

				array.each([lall.get(all), lall.get(method), h.get(all), h.get(method)], function (c) {
					if (c) {
						array.each(Array.from(c.keys()).filter(function (i) {
							var valid = void 0;

							try {
								valid = new RegExp("^" + i + "$", "i").test(uri);
							} catch (e) {
								valid = new RegExp("^" + utility.escape(i) + "$", "i").test(uri);
							}

							return valid;
						}), function (i) {
							result = result.concat(c.get(i));
						});
					}
				});

				this.cache.set(id, result);
			}

			return result;
		}
	}, {
		key: "setHost",
		value: function setHost(arg) {
			if (!array.contains(this.hosts, arg)) {
				this.hosts.push(arg);
				this.patterns.push(new RegExp("^" + arg.replace(/\*/g, ".*") + "$"));
			}

			return this;
		}
	}, {
		key: "use",
		value: function use(rpath, fn, host, method) {
			var lpath = rpath,
			    lfn = fn,
			    lhost = host,
			    lmethod = method,
			    mhost = void 0,
			    mmethod = void 0;

			if (typeof lpath !== "string") {
				lhost = lfn;
				lfn = lpath;
				lpath = "/.*";
			}

			lhost = lhost || all;
			lmethod = lmethod || all;

			if (typeof lfn !== "function" && lfn && typeof lfn.handle !== "function") {
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
	}]);

	return Router;
}();

function factory() {
	var max = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 1000;
	var seed = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 9;

	return new Router(max, seed);
}

module.exports = factory;
