"use strict";

var path = require("path"),
	defer = require("tiny-defer"),
	server;

server = require(path.join(__dirname, "index"))({
	default: "test",
	root: path.join(__dirname, "sites"),
	logging: {
		level: "debug"
	},
	hosts: {
		test: "test"
	}
}, function (req, res, status, body) {
	var deferred = defer();

	res.send(body, status).then(() => {
		deferred.resolve(true);
		console.log("Sent custom error response");
	}).catch(e => {
		deferred.reject(e);
		console.log("Failed to send custom error response");
	});

	return deferred.promise;
});

server.get("/echo", function (req, res) {
	res.send(req.parsed.query);
});

server.start();
