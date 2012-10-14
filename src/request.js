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
	    host    = req.headers.host.indexOf(":") > -1 ? (/(.*)?:/.exec(req.headers.host)[1]) : req.headers.host,
	    parsed  = url.parse(req.url, true),
	    method  = REGEX_GET.test(req.method) ? "get" : req.method.toLowerCase(),
	    error   = function (err) {
	    	if (typeof err !== "undefined") self.log(err, true, true);
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
		var allow, del, post, mimetype;

		allow   = allows(req.url),
		del     = allowed("DELETE", req.url),
		post    = allowed("POST", req.url),
		handled = true;
		url     = parsed.protocol + "//" + req.headers.host.replace(/:.*/, "") + ":" + port + url;

		self.log("[" + req.method + "] " + url, false, self.config.debug);

		fs.exists(path, function (exists) {
			switch (true) {
				case !exists && method === "post":
					allowed(req.method, req.url) ? self.write(path, res, req) : self.respond(res, req, messages.NOT_ALLOWED, codes.NOT_ALLOWED, {"Allow": allow});
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
								var size, modified, etag, raw;

								if (err) error(err);
								else {
									size     = stat.size;
									modified = stat.mtime.toUTCString();
									etag     = "\"" + self.hash(stat.size + "-" + stat.mtime) + "\"";

									if (req.method === "GET") {
										switch (true) {
											case Date.parse(req.headers["if-modified-since"]) >= stat.mtime:
											case req.headers["if-none-match"] === etag:
												self.headers(res, req, codes.NOT_MODIFIED, {"Allow" : allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified});
												res.end();
												break;
											default:
												self.headers(res, req, codes.SUCCESS, {"Allow" : allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified, "Transfer-Encoding": "chunked"});
												raw = fs.createReadStream(path);
												switch (true) {
													case REGEX_DEF.test(req.headers["accept-encoding"]):
														res.setHeader("Content-Encoding", "deflate");
														raw.pipe(zlib.createDeflate()).pipe(res);
														break;
													case REGEX_GZIP.test(req.headers["accept-encoding"]):
														res.setHeader("Content-Encoding", "gzip");
														raw.pipe(zlib.createGzip()).pipe(res);
														break;
													default:
														util.pump(raw, res);
												}
										}
									}
									else self.respond(res, req, messages.NO_CONTENT, codes.SUCCESS, {"Allow" : allow, "Content-Length": size, "Content-Type": mimetype, Etag: etag, "Last-Modified": modified});
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
