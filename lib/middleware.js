"use strict";

const fs = require("fs"),
	path = require("path"),
	mime = require("mimetype"),
	utility = require(path.join(__dirname, "utility.js")),
	regex = require(path.join(__dirname, "regex.js")),
	precise = require("precise");

function cors (req, res, next) {
	req.cors = req.headers.origin !== undefined;
	next();
}

function etag (req, res, next) {
	const server = req.server;
	let cached, headers;

	if (regex.get_only.test(req.method) && !req.headers.range && req.headers["if-none-match"] !== undefined) {
		cached = server.etags.get(req.hash);

		if (cached && (req.headers["if-none-match"] || "").replace(/\"/g, "") === cached.etag) {
			headers = utility.clone(cached.headers);
			headers.age = parseInt(new Date().getTime() / 1000 - cached.timestamp, 10);
			res.send("", 304, headers);
		} else {
			next();
		}
	} else {
		next();
	}
}

function file (req, res, next) {
	const server = req.server;
	let handled = false,
		count, lpath, nth, root;

	if (req.headers.expect) {
		next(new Error(417));
	} else {
		root = path.join(server.config.root, server.config.hosts[req.host]);
		lpath = path.resolve(path.join(root, req.parsed.pathname.replace(regex.dir, "")));

		fs.lstat(lpath, (e, stats) => {
			if (e) {
				next(); // Allowing the error through because a custom route would be registered later
			} else if (!stats.isDirectory()) {
				req.file = {path: lpath, stats: stats};
				server.log("Routed request to disk", "debug");
				next();
			} else if (regex.get.test(req.method) && !regex.dir.test(req.parsed.pathname)) {
				res.redirect((req.parsed.pathname !== "/" ? req.parsed.pathname : "") + "/" + req.parsed.search, 301);
			} else {
				count = 0;
				nth = server.config.index.length;

				server.config.index.forEach(i => {
					let npath = path.join(lpath, i);

					fs.lstat(npath, (err, lstats) => {
						if (!err && !handled) {
							handled = true;
							req.file = {path: npath, stats: lstats};
							server.log("Routed request to disk", "debug");
							next();
						} else if (++count === nth && !handled) {
							next(new Error(404));
						}
					});
				});
			}
		});
	}
}

function mimetype (req, res, next) {
	next();
}

function payload (req, res, next) {
	let server = req.server,
		body;

	if (regex.body.test(req.method)) {
		req.setEncoding("utf-8");

		req.on("data", data => {
			body = body === undefined ? data : body + data;

			if (server.config.maxBytes > 0 && Buffer.byteLength(body) > server.config.maxBytes) {
				req.invalid = true;
				next(new Error(413));
			}
		});

		req.on("end", () => {
			if (!req.invalid) {
				if (body) {
					req.body = body;
				}

				next();
			}
		});
	} else {
		next();
	}
}

function stream (req, res, next) {
	let method = req.method,
		server = req.server,
		status = 200,
		allow, del, letag, headers, mimetype, modified, size, pathname, invalid, out_dir, in_dir, options, write;

	// Not a file on disk
	if (!req.file) {
		return next();
	}

	// Wiring a route for an accurate `Allow` header, doesn't affect middleware path
	if (!req.allow) {
		server.get(req.parsed.pathname, file, "get", req.host);
		req.allow = server.allows(req.parsed.pathname, req.host, true);
	}

	allow = req.allow;

	if (!dir) {
		if (regex.get.test(method)) {
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

function timer (req, res, next) {
	req.timer = precise().start();
	next();
}

function valid (req, res, next) {
	let pathname = req.parsed.pathname.replace(regex.root, ""),
		invalid = (pathname.replace(regex.dir, "").split("/").filter(i => {
			return i !== ".";
		})[0] || "") === "..",
		outDir = !invalid ? (pathname.match(/\.{2}\//g) || []).length : 0,
		inDir = !invalid ? (pathname.match(/\w+?(\.\w+|\/)+/g) || []).length : 0;

	if (invalid || (outDir > 0 && outDir >= inDir)) {
		next(new Error(404));
	} else {
		next();
	}
}

module.exports = {
	cors: cors,
	etag: etag,
	file: file,
	payload: payload,
	stream: stream,
	timer: timer,
	valid: valid
};
