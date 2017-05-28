"use strict";

const http = require("http"),
	fs = require("fs"),
	path = require("path"),
	mime = require("mimetype"),
	each = require("retsu").each,
	regex = require(path.join(__dirname, "regex.js")),
	precise = require("precise");

function file (req, res, next) {
	const server = req.server;

	if (req.headers.expect !== undefined) {
		next(new Error(417));
	} else {
		let root = path.join(server.config.root, server.config.hosts[req.host]),
			lpath = path.join(root, req.parsed.pathname.replace(regex.dir, ""));

		fs.lstat(lpath, (e, stats) => {
			if (e !== null) {
				next();
			} else if (!stats.isDirectory()) {
				req.file = {path: lpath, stats: stats};
				server.log("Routed request to disk", "debug");
				next();
			} else if (regex.get.test(req.method) && !regex.dir.test(req.parsed.pathname)) {
				res.redirect((req.parsed.pathname !== "/" ? req.parsed.pathname : "") + "/" + req.parsed.search, 301);
			} else {
				let count = 0,
					handled = false,
					nth = server.config.index.length;

				if (nth > 0) {
					each(server.config.index, i => {
						let npath = path.join(lpath, i);

						fs.lstat(npath, (err, lstats) => {
							if (err === null && !handled) {
								handled = true;
								req.file = {path: npath, stats: lstats};
								server.log("Routed request to disk", "debug");
								next();
							} else if (++count === nth && !handled) {
								next();
							}
						});
					});
				} else {
					next();
				}
			}
		});
	}
}

function noop (req, res, next) {
	next();
}

function payload (req, res, next) {
	if (regex.body.test(req.method)) {
		const server = req.server;
		let body;

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
				if (body !== undefined) {
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
	const method = req.method,
		server = req.server,
		stats = req.file ? req.file.stats : {};
	let status = 200,
		letag, headers, options;

	// Not a file on disk
	if (req.file === undefined) {
		return next();
	}

	// Wiring a route for an accurate `Allow` header, doesn't affect middleware path
	if (req.allow === "") {
		server.get(req.parsed.pathname, noop, req.host);
		req.allow = server.allows(req.parsed.pathname, req.host, true);
	}

	if (server.canETag(req.parsed.pathname, req.method)) {
		letag = server.etag(req.parsed.pathname, stats.size, stats.mtime);
	}

	headers = {
		allow: req.allow,
		"content-length": stats.size,
		"content-type": mime.lookup(req.file.path),
		"last-modified": stats.mtime.toUTCString()
	};

	if (letag !== undefined) {
		headers.etag = letag;
	}

	if (regex.get_only.test(method)) {
		if (letag !== undefined && req.headers["if-none-match"] === letag) {
			delete headers["content-length"];
			res.send("", 304, headers);
		} else if (req.headers["if-none-match"] === undefined && Date.parse(req.headers["if-modified-since"]) >= stats.mtime) {
			delete headers["content-length"];
			res.send("", 304, headers);
		} else {
			options = {};

			// Setting the partial content headers
			if (req.headers.range !== undefined) {
				each(req.headers.range.replace(/^.*=/, "").split(",")[0].split("-"), (i, idx) => {
					options[idx === 0 ? "start" : "end"] = i ? parseInt(i, 10) : undefined;
				});

				// Byte offsets
				if (isNaN(options.start) && !isNaN(options.end)) {
					options.start = stats.size - options.end;
					options.end = stats.size;
				} else if (isNaN(options.end)) {
					options.end = stats.size;
				}

				if (options.start >= options.end || isNaN(options.start) || isNaN(options.start)) {
					return res.error(416, http.STATUS_CODES[416]);
				}

				status = 206;
				headers["content-range"] = "bytes " + options.start + "-" + options.end + "/" + stats.size;
				headers["content-length"] = options.end - options.start + 1;
			}

			req.server.send(req, res, fs.createReadStream(req.file.path, options), status, headers);
		}
	} else {
		req.server.send(req, res, "", 200, headers);
	}

	return undefined;
}

function timer (req, res, next) {
	req.timer = precise().start();
	next();
}

module.exports = {
	file: file,
	payload: payload,
	stream: stream,
	timer: timer
};
