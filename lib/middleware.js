"use strict";

const path = require("path"),
	utility = require(path.join(__dirname, "utility.js")),
	regex = require(path.join(__dirname, "regex.js")),
	precise = require("precise");

function cors (req, res, next) {
	req.cors = req.headers.origin !== undefined;
	next();
}

function etag (req, res, next) {
	let cached, headers;

	if (regex.get_only.test(req.method) && !req.headers.range && req.headers["if-none-match"] !== undefined) {
		cached = req.server.etags.get(req.parsed.href);

		if (cached && (req.headers["if-none-match"] || "").replace(/\"/g, "") === cached.etag) {
			headers = utility.clone(cached.headers);
			headers.age = parseInt(new Date().getTime() / 1000 - cached.timestamp, 10);
			res.send("", 304, headers).then(null, next);
		} else {
			next();
		}
	} else {
		next();
	}
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

function timer (req, res, next) {
	req.timer = precise().start();
	next();
}

module.exports = {
	cors: cors,
	etag: etag,
	payload: payload,
	timer: timer
};
