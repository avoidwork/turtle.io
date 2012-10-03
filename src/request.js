/**
 * Request handler
 * 
 * @param  {Object} req HTTP(S) request Object
 * @param  {Object} res HTTP(S) response Object
 * @return {Object}     Instance
 * @todo  implement POST & PUT
 */
factory.prototype.request = function (res, req) {
	var self    = this,
	    host    = req.headers.host.indexOf(":") > -1 ? (/(.*)?:/.exec(req.headers.host)[1]) : req.headers.host,
	    parsed  = url.parse(req.url, true),
	    method  = REGEX_GET.test(req.method) ? "get" : req.method,
	    error   = function (err) {
	    	if (typeof err !== "undefined") self.log(err, true, true);
	    	self.respond(res, req, messages.ERROR_APPLICATION, codes.ERROR_APPLICATION);
	    },
	    path    = [],
	    handled = false,
	    port    = this.config.port,
	    allows, count, handle, mimetype, nth, root;

	if (!this.config.vhosts.hasOwnProperty(host)) return error();

	root = this.config.root + "/" + this.config.vhosts[host];

	if (!parsed.hasOwnProperty("host"))     parsed.host     = req.headers.host;
	if (!parsed.hasOwnProperty("protocol")) parsed.protocol = "http:";

	// Determines which verbs are allowed against a URL
	allows = function (url) {
		var result = "",
		    verbs  = ["DELETE", "GET", "POST", "PUT"];

		verbs.each(function (i) {
			if (allowed(i, url)) result += (result.length > 0 ? ", " : "") + i;
		});

		return result.replace("GET", "GET, HEAD, OPTIONS");
	};

	// Handles the request after determining the path
	handle = function (path, url) {
		handled = true;
		url     = parsed.protocol + "//" + req.headers.host.replace(/:.*/, "") + ":" + port + url;

		if (self.config.debug) self.log("[" + method.toUpperCase() + "] " + url);
		if (!allowed(method, req.url)) self.respond(res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED);
		else fs.exists(path, function (exists) {
			if (!exists) self.respond(res, req, messages.NOT_FOUND, codes.NOT_FOUND);
			else {
				switch (req.method.toLowerCase()) {
					case "delete":
						fs.unlink(path, function (err) {
							if (err) error(err);
							else self.respond(res, req, messages.NO_CONTENT, codes.NO_CONTENT)
						});
						break;

					case "get":
					case "head":
					case "options":
						mimetype = mime.lookup(path);
						if (req.method.toLowerCase() === "get") {
							fs.stat(path, function (err, data) {
								var size = data.size;

								fs.readFile(path, function (err, data) {
									if (err) error(err);
									else self.respond(res, req, data, codes.SUCCESS, {"Allow" : allows(req.url), "Content-Length": size, "Content-Type": mimetype});
								});
							});
						}
						else self.respond(res, req, null, codes.SUCCESS, {"Allow" : allows(req.url), "Content-Type": mimetype});
						break;

					default:
						self.error(res, req);
				}
			}
		});
	}

	if (!/\/$/.test(parsed.pathname)) handle(root + parsed.pathname, parsed.pathname);
	else {
		nth   = this.config.index.length;
		count = 0;
		this.config.index.each(function (i) {
			fs.exists(root + parsed.pathname + i, function (exists) {
				if (exists && !handled) handle(root + parsed.pathname + i, parsed.pathname + i);
				else if (!exists && ++count === nth) self.respond(res, req, messages.NOT_FOUND, codes.NOT_FOUND);
			});
		});
	}

	return this;
};