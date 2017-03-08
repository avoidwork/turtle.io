"use strict";

var path = require("path"),
	defer = require("tiny-defer"),
	server;

server = require(path.join(__dirname, "index"))({
	default: "test",
	root: path.join(__dirname, "sites"),
	headers: {
		"cache-control": "no-cache"
	},
	logging: {
		level: "debug"
	},
	hosts: {
		test: "test",
		test2: "test2"
	}
});

server.get("/echo", function (req, res) {
	res.send(req.parsed.query);
});

server.options("/echo", function (req, res) {
	res.send("stuff");
});

server.start();
