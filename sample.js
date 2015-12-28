"use strict";

var path = require("path"),
    server = require(path.join(__dirname, "lib", "index"))();

server.get("/echo", function (req, res) {
	res.send(req.parsed.query);
});

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
