var hippie = require("hippie"),
	path = require("path"),
	server = require(path.join("..", "index.js")),
	etag = "";

function request () {
	return hippie().base("http://localhost:8002");
}

server({
	default: "test",
	root: path.join(__dirname, "..", "sites"),
	port: 8002,
	logging: {
		enabled: false
	},
	hosts: {
		test: "test"
	}
}).start();

describe("Invalid Requests", function () {
	it("GET / (416 / 'Partial response - invalid')", function (done) {
		request()
			.get("/")
			.header("range", "a-b")
			.expectStatus(416)
			.expectBody(/Range Not Satisfiable/)
			.end(function (err, res) {
				if (err) throw err;
				etag = res.headers.etag;
				done();
			});
	});

	it("GET / (416 / 'Partial response - invalid #2')", function (done) {
		request()
			.get("/")
			.header("range", "5-0")
			.expectStatus(416)
			.expectBody(/Range Not Satisfiable/)
			.end(function (err, res) {
				if (err) throw err;
				etag = res.headers.etag;
				done();
			});
	});

	it("POST / (405 / 'Method Not Allowed')", function (done) {
		request()
			.post("/")
			.expectStatus(405)
			.expectHeader("status", "405 Method Not Allowed")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("PUT / (405 / 'Method Not Allowed')", function (done) {
		request()
			.put("/")
			.expectStatus(405)
			.expectHeader("status", "405 Method Not Allowed")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("PATCH / (405 / 'Method Not Allowed')", function (done) {
		request()
			.patch("/")
			.expectStatus(405)
			.expectHeader("status", "405 Method Not Allowed")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("DELETE / (405 / 'Method Not Allowed')", function (done) {
		request()
			.del("/")
			.expectStatus(405)
			.expectHeader("status", "405 Method Not Allowed")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("GET /nothere.html (404 / 'Not Found')", function (done) {
		request()
			.get("/nothere.html")
			.expectStatus(404)
			.expectHeader("status", "404 Not Found")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("GET /nothere.html%3fa=b?=c (404 / 'Not Found')", function (done) {
		request()
			.get("/nothere.html%3fa=b?=c")
			.expectStatus(404)
			.expectHeader("status", "404 Not Found")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	// 405 is a result of a cached route that leads to a file system based 404 on GET
	it("POST /nothere.html (405 / 'Method Not Allowed')", function (done) {
		request()
			.post("/nothere.html")
			.expectStatus(405)
			.expectHeader("status", "405 Method Not Allowed")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("PUT /nothere.html (405 / 'Method Not Allowed')", function (done) {
		request()
			.put("/nothere.html")
			.expectStatus(405)
			.expectHeader("status", "405 Method Not Allowed")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("PATCH /nothere.html (405 / 'Method Not Allowed')", function (done) {
		request()
			.patch("/nothere.html")
			.expectStatus(405)
			.expectHeader("status", "405 Method Not Allowed")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("DELETE /nothere.html (405 / 'Method Not Allowed')", function (done) {
		request()
			.del("/nothere.html")
			.expectStatus(405)
			.expectHeader("status", "405 Method Not Allowed")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("GET /../README (404 / 'Not Found')", function (done) {
		request()
			.get("/../README")
			.expectStatus(404)
			.expectHeader("status", "404 Not Found")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("GET /././../README (404 / 'Not Found')", function (done) {
		request()
			.get("/././../README")
			.expectStatus(404)
			.expectHeader("status", "404 Not Found")
			.expectBody(/Not Found/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});
});
