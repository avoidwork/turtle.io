const path = require("path");
const utility = require(path.join(__dirname, "utility"));
const regex = require(path.join(__dirname, "regex"));
const messages = require(path.join(__dirname, "messages"));
const codes = require(path.join(__dirname, "codes"));

function connect (req, res, next) {
	let server = req.server,
		payload;

	if (regex.body.test(req.method)) {
		req.setEncoding("utf-8");

		req.on("data", data => {
			payload = payload === undefined ? data : payload + data;

			if (server.config.maxBytes > 0 && Buffer.byteLength(payload) > server.config.maxBytes) {
				req.invalid = true;
				next(new Error(server.codes.REQ_TOO_LARGE));
			}
		});

		req.on("end", function () {
			if (!req.invalid) {
				if (payload) {
					req.body = payload;
				}

				next();
			}
		});
	} else {
		next();
	}
}

function cors (req, res, next) {
	req.cors = req.headers.origin !== undefined;
	next();
}

function etag (req, res, next) {
	let cached, headers;

	if (regex.get_only.test(req.method) && !req.headers.range && req.headers["if-none-match"] !== undefined) {
		// Not mutating cache, because `respond()` will do it
		cached = req.server.etags.cache[req.parsed.href];

		// Sending a 304 if Client is making a GET & has current representation
		if (cached && (req.headers["if-none-match"] || "").replace(/\"/g, "") === cached.value.etag) {
			headers = utility.clone(cached.value.headers);
			headers.age = parseInt(new Date().getTime() / 1000 - cached.value.timestamp, 10);
			res.respond(messages.NO_CONTENT, codes.NOT_MODIFIED, headers).then(null, function (e) {
				next(e);
			});
		} else {
			next();
		}
	} else {
		next();
	}
}
