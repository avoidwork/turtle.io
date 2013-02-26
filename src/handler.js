/**
 * Route handler
 * 
 * @method handler
 * @param  {Object}   res HTTP response Object
 * @param  {Object}   req HTTP request Object
 * @param  {Function} fn  Request handler
 * @return {Object}       Instance
 */
var handler = function (res, req, fn) {
	var self = this,
	    host = req.headers.host.replace(/:.*/, ""),
	    op;

	// Setting up request handler
	op = function () {
		fn.call(self, res, req);
	};

	// Setting listener for unexpected close
	res.on("close", function () {
		self.log(prep.call(self, res, req));
	});

	// Firing probe
	dtp.fire("handler", function (p) {
		return [req.headers.host, req.url];
	});

	// Handling request or wrapping it with HTTP Authentication
	switch (true) {
		case this.config.auth === "undefined":
		case !this.config.auth.hasOwnProperty(host):
			op();
			break;
		default:
			if (typeof this.config.auth[host].auth === "undefined") this.config.auth[host].auth = http_auth(this.config.auth[host]);
			this.config.auth[host].auth.apply(req, res, op);
	}
};
