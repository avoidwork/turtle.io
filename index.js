"use strict";

const path = require("path"),
	woodland = require("woodland"),
	etag = require("tiny-etag"),
	each = require("retsu").each,
	middleware = require(path.join(__dirname, "lib", "middleware.js")),
	regex = require(path.join(__dirname, "lib", "regex.js")),
	TurtleIO = require(path.join(__dirname, "lib", "turtleio.js")),
	utility = require(path.join(__dirname, "lib", "utility.js")),
	version = require(path.join(__dirname, "package.json")).version;

function factory (cfg = {}, errHandler = null) {
	let obj = new TurtleIO();

	function decorate (req, res) {
		req.filepath = path.join(obj.config.root, obj.config.hosts[req.host], req.parsed.pathname.replace(regex.dir, ""));
		req.hash = obj.hash(req.parsed.href);
		req.server = obj;
		res.redirect = (target, status = 302) => obj.send(req, res, "", status, {location: target});
		res.respond = (arg, status, headers) => obj.send(req, res, arg, status, headers);
		res.error = (status, arg) => obj.error(req, res, status, arg);
		res.send = (arg, status, headers) => obj.send(req, res, arg, status, headers);
	}

	utility.merge(obj.config, cfg);

	if (obj.config.headers.server === void 0) {
		obj.config.headers.server = "turtle.io/" + version + " (" + utility.capitalize(process.platform) + ")";
	}

	if (obj.config.headers["x-powered-by"] === void 0) {
		obj.config.headers["x-powered-by"] = "node.js/" + process.versions.node.replace(/^v/, "");
	}

	obj.etags = etag({
		cacheSize: obj.config.cacheSize,
		seed: obj.config.seed,
		notify: obj.config.etags.notify,
		onchange: obj.config.etags.onchange
	});

	if (obj.config.etags.update) {
		obj.etags.cache.update = obj.config.etags.update;
	}

	obj.router = woodland({
		cacheSize: obj.config.cacheSize,
		defaultHost: obj.config.default,
		defaultHeaders: obj.config.headers,
		hosts: Reflect.ownKeys(obj.config.hosts),
		seed: obj.config.seed
	});

	// Decorating file path pre-middleware
	obj.router.onconnect = decorate;

	// Making up for the ETag middleware
	obj.router.onfinish = (req, res) => obj.log(obj.clf(req, res, res._headers), "info");

	if (typeof errHandler === "function") {
		obj.router.onerror = errHandler;
	} else {
		obj.router.onerror = (req, res, e) => {
			let body, status;

			if (isNaN(e.message)) {
				status = 500;
				body = e.message;
				obj.log(body, "error");
				obj.error(req, res, status, body);
			} else {
				status = Number(e.message);

				if (status === 405 && req.file === void 0) {
					obj.validate(req, res).then(() => {
						if (req.file === void 0) {
							status = 404;
							res.removeHeader("allow");
							req.allow = "";
						}

						obj.error(req, res, status, body);
					}).catch(() => {
						status = 404;
						res.removeHeader("allow");
						req.allow = "";
						obj.error(req, res, status, body);
					});
				} else {
					obj.error(req, res, status, body);
				}
			}
		};
	}

	each([obj.etags.middleware, middleware.timer, middleware.payload], fn => obj.use("/.*", fn, "all", "all").blacklist(fn));
	each([middleware.file, middleware.stream], fn => obj.use("/.*", fn, "get", "all"));

	return obj;
}

module.exports = factory;
