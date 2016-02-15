var hippie = require("hippie"),
	path = require("path"),
	server = require(path.join("..", "index.js")),
	etag = "";

function request () {
	return hippie().base("http://localhost:8001");
}

server({
	default: "test",
	root: path.join(__dirname, "..", "sites"),
	port: 8001,
	logging: {
		enabled: false
	},
	hosts: {
		"test": "test"
	}
}).start();

describe("Valid Requests", function () {
	it("GET / (200 / 'Hello World!')", function (done) {
		request()
			.get("/")
			.expectStatus(200)
			.expectHeader("status", "200 OK")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("transfer-encoding", "chunked")
			.expectHeader("content-length", undefined)
			.expectBody(/Hello world!/)
			.end(function (err, res) {
				if (err) throw err;
				etag = res.headers.etag;
				done();
			});
	});

	it("HEAD / (200 / empty)", function (done) {
		request()
			.head("/")
			.expectStatus(200)
			.expectHeader("status", "200 OK")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/^$/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("GET / (206 / 'Partial response - 0 offset')", function (done) {
		request()
			.get("/")
			.header("range", "0-5")
			.expectStatus(206)
			.expectHeader("status", "206 Partial Content")
			.expectHeader("transfer-encoding", "chunked")
			.expectHeader("content-range", "bytes 0-5/53")
			.expectHeader("content-length", undefined)
			.expectBody(/^\<html>$/)
			.end(function (err, res) {
				if (err) throw err;
				etag = res.headers.etag;
				done();
			});
	});

	it("GET / (206 / 'Partial response - offset')", function (done) {
		request()
			.get("/")
			.header("range", "2-4")
			.expectStatus(206)
			.expectHeader("status", "206 Partial Content")
			.expectHeader("transfer-encoding", "chunked")
			.expectHeader("content-range", "bytes 2-4/53")
			.expectHeader("content-length", undefined)
			.expectBody(/^tml$/)
			.end(function (err, res) {
				if (err) throw err;
				etag = res.headers.etag;
				done();
			});
	});

	it("GET / (304 / empty)", function (done) {
		request()
			.header("If-None-Match", etag)
			.get("/")
			.expectStatus(304)
			.expectHeader("status", "304 Not Modified")
			.expectHeader("content-length", undefined)
			.expectHeader("etag", etag)
			.expectBody(/^$/)
			.end(function (err) {
				if (err) { console.log(err); throw err; }
				done();
			});
	});

	it("GET / (304 / empty / validation)", function (done) {
		request()
			.header("If-None-Match", etag)
			.get("/")
			.expectStatus(304)
			.expectHeader("status", "304 Not Modified")
			.expectHeader("content-length", undefined)
			.expectHeader("etag", etag)
			.expectBody(/^$/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});
});
