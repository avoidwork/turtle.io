"use strict";

const http = require("http"),
	fs = require("fs"),
	path = require("path"),
	mime = require("mimetype"),
	utility = require(path.join(__dirname, "utility.js")),
	regex = require(path.join(__dirname, "regex.js")),
	precise = require("precise");

function cors (req, res, next) {
	req.cors = req.headers.origin !== undefined;
	next();
}

function error (err, req, res, next) {
	res.error(500, err);
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
		lpath = path.join(root, req.parsed.pathname.replace(regex.dir, ""));

		fs.lstat(lpath, (e, stats) => {
			if (e) {
				next();
			} else if (!e && !stats.isDirectory()) {
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

function noop (req, res, next) {
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
		stats = req.file ? req.file.stats : {},
		letag, headers, options;

	// Not a file on disk
	if (!req.file) {
		return next();
	}

	// Wiring a route for an accurate `Allow` header, doesn't affect middleware path
	if (!req.allow) {
		server.get(req.parsed.pathname, noop, req.host);
		req.allow = server.allows(req.parsed.pathname, req.host, true);
	}

	letag = "\"" + server.etag(req.parsed.pathname, stats.size, stats.mtime) + "\"";
	headers = {
		allow: req.allow,
		"content-length": stats.size,
		"content-type": mime.lookup(req.file.path),
		etag: letag,
		"last-modified": stats.mtime.toUTCString()
	};

	if (regex.get_only.test(method)) {
		if (req.headers["if-none-match"] === letag) {
			delete headers["content-length"];
			res.send("", 304, headers);
		} else if (!req.headers["if-none-match"] && Date.parse(req.headers["if-modified-since"]) >= stats.mtime) {
			delete headers["content-length"];
			res.send("", 304, headers);
		} else {
			options = {};

			// Setting the partial content headers
			if (req.headers.range) {
				req.headers.range.split(",")[0].split("-").forEach((i, idx) => {
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

			console.log(req.file.path);
			res.send(fs.createReadStream(req.file.path, options), status, headers);
		}
	} else {
		res.send("", 200, headers);
	}

	return undefined;
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

	if (invalid) {
		next(new Error(404));
	} else if (outDir > 0 && outDir >= inDir) {
		next(new Error(404));
	} else {
		next();
	}
}

module.exports = {
	cors: cors,
	error: error,
	etag: etag,
	file: file,
	payload: payload,
	stream: stream,
	timer: timer,
	valid: valid
};
