"use strict";

var TurtleIO = require("./lib/turtle.io"),
    server   = new TurtleIO(),
    config;

config = {
	auth : {
		test2 : {
			authRealm : "Private",
			authList  : ["admin:admin"]
		}
	},
	default : "test",
	root    : "./sites",
	vhosts  : {
		"test"  : "test",
		"test2" : "test2"
	}
}

server.get("/status", function (req, res) {
	this.respond(req, res, this.status());
}, "test");

server.start(config);
