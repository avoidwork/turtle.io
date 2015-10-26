const array = require("retsu");
const defer = require("tiny-defer");
const path = require("path");
const utility = require(path.join(__dirname, "utility.js"));
const regex = require(path.join(__dirname, "regex.js"));

function router (req, res) {
	let deferred = defer(),
		method = req.method.toLowerCase(),
		middleware;

	function last (err) {
		let errorCode, error, status;

		if (!err) {
			if (regex.get.test(method)) {
				deferred.resolve([req, res]);
			} else if (req.server.allowed("get", req.parsed.pathname, req.vhost)) {
				deferred.reject(new Error(req.server.codes.NOT_ALLOWED));
			} else {
				deferred.reject(new Error(req.server.codes.NOT_FOUND));
			}
		} else {
			errorCode = !isNaN(err.message) ? err.message : req.server.codes[(err.message || err).toUpperCase()] || req.server.codes.SERVER_ERROR;
			status = res.statusCode >= req.server.codes.BAD_REQUEST ? res.statusCode : errorCode;
			error = new Error(status);
			error.extended = isNaN(err.message) ? err.message : undefined;
			deferred.reject(error);
		}
	}

	function next (err) {
		process.nextTick(function () {
			let arity = 3,
				item = middleware.next();

			if (!item.done) {
				if (err) {
					// Finding the next error handling middleware
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
							last(err);
						}
					} else {
						try {
							item.value(req, res, next);
						} catch (e) {
							next(e);
						}
					}
				} else {
					last(err);
				}
			} else if (!res._header && req.server.config.catchAll) {
				last(err);
			} else if (res._header) {
				deferred.resolve([req, res]);
			}
		});
	}

	if (regex.head.test(method)) {
		method = "get";
	}

	middleware = array.iterator(req.server.routes(req.parsed.pathname, req.vhost, method));
	next();

	return deferred.promise;
}

module.exports = router;
