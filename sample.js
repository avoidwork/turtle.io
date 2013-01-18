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
	root   : "./sites",
	vhosts : {
		"localhost" : "test",
		"test"      : "test",
		"test2"     : "test2",
		"all"       : "test"
	}
}

server.get("/status", function (res, req) {
	server.respond(res, req, server.status());
}, "localhost");

server.start(config);