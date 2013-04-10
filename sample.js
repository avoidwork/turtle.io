"use strict";

var cluster = require("cluster"),
    turtle  = require("./lib/turtle.io"),
    cpus    = require("os").cpus().length,
    i       = 0,
    config, server;

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

if (cpus > 1 && cluster.isMaster) {
	while (++i <= cpus) {
		cluster.fork();
	}
}
else {
	server = new turtle();

	server.get("/status", function (res, req, timer) {
		server.respond(res, req, server.status(), 200, undefined, timer);
	}, "localhost");

	server.start(config);
}