"use strict";

var path = require("path"),
    turtleio = require(path.join(__dirname, "lib", "index")),
    server = turtleio();

server.get("/status", function (req, res) {
	server.respond(req, res, server.status());
}, "test");

server.start({
	default: "test",
	root: path.join(__dirname, "sites"),
	logs: {
		stdout: true
	},
	vhosts: {
		test: "test"
	}
});
