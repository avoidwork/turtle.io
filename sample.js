var turtle = require("./lib/turtle.io"),
    server = new turtle(),
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

server.get("/status", function (res, req, timer) {
	server.respond(res, req, server.status(), 200, undefined, timer);
}, "localhost");

server.start(config);