"use strict";

var path = require("path"),
    turtleio = require(path.join(__dirname, "index")),
    server = turtleio();

server.get("/status", function (req, res) {
	server.respond(req, res, server.status());
}, "test");

server.start({
	default: "test",
	root: path.join(__dirname, "sites"),
	vhosts: {
		test: "test"
	}
});
