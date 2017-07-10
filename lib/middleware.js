"use strict";

const http = require("http"),
	fs = require("fs"),
	path = require("path"),
	mime = require("mimetype"),
	each = require("retsu").each,
	regex = require(path.join(__dirname, "regex.js")),
	precise = require("precise");

function file (req, res, next) {
	if (req.headers.expect !== void 0) {
		next(new Error(417));
	} else {
		req.server.validate(req, res).then(() => next()).catch(err => next(err));
	}
}

function payload (req, res, next) {
	if (regex.body.test(req.method)) {
		const server = req.server;
		let body;

		req.setEncoding("utf-8");

		req.on("data", data => {
			body = body === void 0 ? data : body + data;

			if (server.config.maxBytes > 0 && Buffer.byteLength(body) > server.config.maxBytes) {
				req.invalid = true;
				next(new Error(413));
			}
		});

		req.on("end", () => {
			if (!req.invalid) {
				if (body !== void 0) {
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
	if (req.file === void 0) {
		return next(new Error(404));
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

	if (letag !== void 0) {
		headers.etag = letag;
	}

	if (regex.get_only.test(method)) {
		if (letag !== void 0 && req.headers["if-none-match"] === letag) {
			delete headers["content-length"];
			res.send("", 304, headers);
		} else if (req.headers["if-none-match"] === void 0 && Date.parse(req.headers["if-modified-since"]) >= stats.mtime) {
			delete headers["content-length"];
			res.send("", 304, headers);
		} else {
			options = {};

			// Setting the partial content headers
			if (req.headers.range !== void 0) {
				each(req.headers.range.replace(/^.*=/, "").split(",")[0].split("-"), (i, idx) => {
					options[idx === 0 ? "start" : "end"] = i ? parseInt(i, 10) : void 0;
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

	return void 0;
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
