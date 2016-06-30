"use strict";

const path = require("path"),
	lru = require("tiny-lru"),
	woodland = require("woodland"),
	middleware = require(path.join(__dirname, "lib", "middleware.js")),
	TurtleIO = require(path.join(__dirname, "lib", "turtleio.js")),
	utility = require(path.join(__dirname, "lib", "utility.js")),
	version = require(path.join(__dirname, "package.json")).version;

function factory (cfg = {}, errHandler = null) {
	let obj = new TurtleIO();

	function decorate(req, res, next) {
		req.server = obj;

		res.redirect = (target, status = 302) => {
			return obj.send(req, res, "", status, {location: target});
		};

		res.respond = (arg, status, headers) => {
			return obj.send(req, res, arg, status, headers);
		};

		res.error = (status, arg) => {
			return obj.error(req, res, status, arg);
		};

		res.send = (arg, status, headers) => {
			return obj.send(req, res, arg, status, headers);
		};

		next();
	}

	function route (req, res) {
		obj.route(req, res);
	}

	utility.merge(obj.config, cfg);

	if (!obj.config.headers.server) {
		obj.config.headers.server = "turtle.io/" + version + " (" + utility.capitalize(process.platform) + ")";
	}

	if (!obj.config.headers["x-powered-by"]) {
		obj.config.headers["x-powered-by"] = "node.js/" + process.versions.node.replace(/^v/, "");
	}

	obj.etags = lru(obj.config.cacheSize);
	obj.router = woodland({cacheSize: obj.config.cacheSize, defaultHost: obj.config.default, defaultHeaders: obj.config.headers, hosts: Object.keys(obj.config.hosts), seed: obj.config.seed});

	if (typeof errHandler === "function") {
		obj.router.onerror = errHandler;
	} else {
		obj.router.onerror = (req, res, e) => {
			let body, status;

			if (isNaN(e.message)) {
				status = 500;
				body = e.message;
				obj.log(body, "error");
			} else {
				status = Number(e.message);
			}

			return obj.error(req, res, status, body);
		};
	}

	obj.router.onfinish = (req, res) => {
		obj.log(obj.clf(req, res, res.headers), "info");
	};

	// Setting default middleware
	[middleware.timer, decorate, middleware.payload, middleware.etag, middleware.cors].forEach(i => {
		obj.use(i, "all", "all").blacklist(i);
	});

	// Binding for proper context
	obj.request = obj.request.bind(obj);

	// Routing requests to files on disk by default
	Object.keys(obj.config.hosts).forEach(host => {
		obj.use("/.*", obj.request, "GET", host).blacklist(obj.request);
	});

	return obj;
}

module.exports = factory;
