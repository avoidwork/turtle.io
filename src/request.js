/**
 * Request handler which provides RESTful CRUD operations
 * 
 * Default route is for GET only
 * 
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.request = function (res, req, timer) {
	var self    = this,
	    host    = req.headers.host.replace(/:.*/, ""),
	    parsed  = url.parse(req.url, true),
	    method  = REGEX_GET.test(req.method) ? "get" : req.method.toLowerCase(),
	    path    = [],
	    handled = false,
	    port    = this.config.port,
	    path    = "",
	    found   = false,
	    count, handle, nth, root;

	// Most likely this request will fail due to latency, so handle it as a 503 and 'retry after a minute'
	if (toobusy()) {
		dtp.fire("busy", function (p) {
			return [req.headers.host, req.method, req.url, self.server.connections, diff(timer)];
		});

		return this.respond(res, req, messages.ERROR_SERVICE, codes.ERROR_SERVICE, {"Retry-After": 60}, timer);
	}

	// Can't find the hostname in vhosts, try the default (if set) or send a 500
	if (!this.config.vhosts.hasOwnProperty(host)) {
		$.array.cast(this.config.vhosts, true).each(function (i) {
			var regex = new RegExp(i.replace(/^\*/, ".*"));

			if (regex.test(host)) {
				found = true;
				host  = i;
				return false;
			}
		});

		if (!found) {
			if (this.config.default !== null) host = this.config.default;
			else return this.respond(res, req, messages.ERROR_APPLICATION, codes.ERROR_APPLICATION, timer);
		}
	}

	root = this.config.root + "/" + this.config.vhosts[host];

	if (!parsed.hasOwnProperty("host"))     parsed.host     = req.headers.host;
	if (!parsed.hasOwnProperty("protocol")) parsed.protocol = "http:";

	// Handles the request after determining the path
	handle = function (path, url, timer) {
		var allow, del, post, mimetype, status;

		allow   = allows(req.url, host);
		del     = allowed("DELETE", req.url);
		post    = allowed("POST", req.url);
		handled = true;
		url     = parsed.protocol + "//" + req.headers.host.replace(/:.*/, "") + ":" + port + url;

		dtp.fire("request", function (p) {
			return [url, allow, diff(timer)];
		});

		fs.exists(path, function (exists) {
			switch (true) {
				case !exists && method === "post":
					if (allowed(req.method, req.url)) self.write(path, res, req, timer);
					else {
						status = codes.NOT_ALLOWED;
						self.respond(res, req, messages.NOT_ALLOWED, status, {"Allow": allow}, timer);
					}
					break;
				case !exists:
					self.respond(res, req, messages.NO_CONTENT, codes.NOT_FOUND, (post ? {"Allow": "POST"} : undefined), timer);
					break;
				case !allowed(method, req.url):
					self.respond(res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED, {"Allow": allow}, timer);
					break;
				default:
					if (!/\/$/.test(req.url)) allow = allow.explode().remove("POST").join(", ");
					switch (method) {
						case "delete":
							fs.unlink(path, function (err) {
								if (err) self.error(res, req, timer);
								else self.respond(res, req, messages.NO_CONTENT, codes.NO_CONTENT, undefined, timer);
							});
							break;
						case "get":
						case "head":
						case "options":
							mimetype = mime.lookup(path);
							fs.stat(path, function (err, stat) {
								var size, modified, etag, raw, headers;

								if (err) self.error(res, req, timer);
								else {
									size     = stat.size;
									modified = stat.mtime.toUTCString();
									etag     = "\"" + self.hash(req.url + "-" + stat.size + "-" + stat.mtime) + "\"";
									headers  = {"Allow" : allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified};

									if (req.method === "GET") {
										switch (true) {
											case Date.parse(req.headers["if-modified-since"]) >= stat.mtime:
											case req.headers["if-none-match"] === etag:
												self.respond(res, req, messages.NO_CONTENT, codes.NOT_MODIFIED, headers, timer);
												break;
											default:
												headers["Transfer-Encoding"] = "chunked";
												self.headers(res, req, codes.SUCCESS, headers, timer);
												etag = etag.replace(/\"/g, "");
												self.compressed(res, req, etag, path, codes.SUCCESS, headers, true, timer);
										}
									}
									else self.respond(res, req, messages.NO_CONTENT, codes.SUCCESS, headers, timer);
								}
							});
							break;
						case "put":
							self.write(path, res, req, timer);
							break;
						default:
							self.respond(res, req, (del ? messages.CONFLICT : messages.ERROR_APPLICATION), (del ? codes.CONFLICT : codes.ERROR_APPLICATION), {"Allow": allow}, timer);
					}
			}
		});
	};

	// Determining if the request is valid
	fs.stat(root + parsed.pathname, function (err, stats) {
		if (err) self.error(res, req);
		else {
			if (!stats.isDirectory()) handle(root + parsed.pathname, parsed.pathname);
			else {
				// Adding a trailing slash for relative paths; redirect is not cached
				if (stats.isDirectory() && !REGEX_DIR.test(parsed.pathname)) {
					self.respond(res, req, messages.NO_CONTENT, codes.MOVED, {"Location": parsed.pathname + "/"}, timer);
				}
				else {
					nth   = self.config.index.length;
					count = 0;

					self.config.index.each(function (i) {
						fs.exists(root + parsed.pathname + i, function (exists) {
							if (exists && !handled) handle(root + parsed.pathname + i, parsed.pathname + i, timer);
							else if (!exists && ++count === nth) self.error(res, req, timer);
						});
					});
				}
			}
		}
	});

	return this;
};
