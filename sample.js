"use strict";

var turtleio = require("./lib/turtle.io"),
    server   = turtleio();

server.get("/status", function (req, res) {
	server.respond(req, res, server.status());
}, "test");

server.start( {
	default : "test",
	root    : "./sites",
	vhosts  : {
		"test"  : "test"
	}
} );
