"use strict";

const tinyhttptest = require("tiny-httptest"),
	path = require("path"),
	server = require(path.join("..", "index.js"));

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
	it("GET / (416 / 'Partial response - invalid')", function () {
		return tinyhttptest({url: "http://localhost:8002/", headers: {range: "a-b"}})
			.expectStatus(416)
			.expectBody(/Range Not Satisfiable/)
			.end();
	});

	it("GET / (416 / 'Partial response - invalid #2')", function () {
		return tinyhttptest({url: "http://localhost:8002/", headers: {range: "5-0"}})
			.expectStatus(416)
			.expectBody(/Range Not Satisfiable/)
			.end();
	});

	it("POST / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({url: "http://localhost:8002/", method: "post"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("PUT / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({url: "http://localhost:8002/", method: "put"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("PATCH / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({url: "http://localhost:8002/", method: "patch"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("DELETE / (405 / 'Method Not Allowed')", function () {
		return tinyhttptest({url: "http://localhost:8002/", method: "delete"})
			.expectStatus(405)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectBody(/Method Not Allowed/)
			.end();
	});

	it("GET /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8002/nothere.html"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /nothere.html%3fa=b?=c (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8002/nothere.html%3fa=b?=c"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /nothere.x_%22%3E%3Cimg%20src=x%20onerror=prompt(1)%3E.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8002/nothere.x_%22%3E%3Cimg%20src=x%20onerror=prompt(1)%3E.html"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectBody(/Not Found/)
			.end();
	});

	// 405 is a result of a cached route that leads to a file system based 404 on GET
	it("POST /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8002/nothere.html", method: "post"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectBody(/Not Found/)
			.end();
	});

	it("PUT /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8002/nothere.html", method: "put"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectBody(/Not Found/)
			.end();
	});

	it("PATCH /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8002/nothere.html", method: "patch"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectBody(/Not Found/)
			.end();
	});

	it("DELETE /nothere.html (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8002/nothere.html", method: "delete"})
			.expectStatus(404)
			.expectHeader("allow", undefined)
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /../README (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8002/../README"})
			.expectStatus(404)
			.expectBody(/Not Found/)
			.end();
	});

	it("GET /././../README (404 / 'Not Found')", function () {
		return tinyhttptest({url: "http://localhost:8002/././../README"})
			.expectStatus(404)
			.expectBody(/Not Found/)
			.end();
	});
});
