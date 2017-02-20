"use strict";

const tinyhttptest = require("tiny-httptest"),
	path = require("path"),
	server = require(path.join("..", "index.js"));

server({
	default: "test",
	root: path.join(__dirname, "..", "sites"),
	port: 8001,
	logging: {
		enabled: false
	},
	hosts: {
		test: "test"
	}
}).start();

describe("Valid Requests", function () {
	it("GET / (200 / 'Hello World!')", function () {
		return tinyhttptest({url: "http://localhost:8001/"})
			.etags()
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("transfer-encoding", "chunked")
			.expectHeader("content-length", undefined)
			.expectBody(/Hello world!/)
			.end();
	});

	it("GET / (200 / 'Hello World!' - gzip)", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {"accept-encoding": "gzip"}})
			.expectStatus(200)
			.expectHeader("content-encoding", "gzip")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("transfer-encoding", "chunked")
			.expectHeader("content-length", undefined)
			.end();
	});

	it("GET / (200 / 'Hello World!' - deflate)", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {"accept-encoding": "deflate"}})
			.expectStatus(200)
			.expectHeader("content-encoding", "deflate")
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("transfer-encoding", "chunked")
			.expectHeader("content-length", undefined)
			.end();
	});

	it("HEAD / (200 / empty)", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "head"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/^$/)
			.end();
	});

	it("GET / (304 / empty)", function () {
		return tinyhttptest({url: "http://localhost:8001/"})
			.etags()
			.expectStatus(304)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("content-length", undefined)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (206 / 'Partial response - 0 offset')", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {range: "0-5"}})
			.expectStatus(206)
			.expectHeader("transfer-encoding", "chunked")
			.expectHeader("content-range", /^bytes 0-5\/5(3|8)$/)
			.expectHeader("content-length", undefined)
			.expectBody(/^\<html>$/)
			.end();
	});

	it("GET / (206 / 'Partial response - offset')", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {range: "2-4"}})
			.expectStatus(206)
			.expectHeader("transfer-encoding", "chunked")
			.expectHeader("content-range", /^bytes 2-4\/5(3|8)$/)
			.expectHeader("content-length", undefined)
			.expectBody(/^tml$/)
			.end();
	});

	it("GET / (200 / 'Hello World!' / CORS)", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "OPTIONS"})
			.cors()
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.end().then(() => {
				return tinyhttptest({url: "http://localhost:8001/"})
					.cors()
					.expectStatus(200)
					.expectHeader("allow", "GET, HEAD, OPTIONS")
					.expectHeader("transfer-encoding", "chunked")
					.expectHeader("content-length", undefined)
					.expectBody(/Hello world!/)
					.end();
			});
	});
});
