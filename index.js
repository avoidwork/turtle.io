"use strict";

const path = require("path");
const middleware = require(path.join(__dirname, "lib", "middleware"));
const TurtleIO = require(path.join(__dirname, "lib", "turtleio"));

module.exports = function () {
	let app = new TurtleIO();

	// Setting default middleware
	[middleware.cors, middleware.etag, middleware.connect].forEach(function (i) {
		app.use(i).blacklist(i);
	});

	return app;
};
