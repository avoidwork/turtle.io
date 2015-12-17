const path = require("path");
const middleware = require(path.join(__dirname, "middleware.js"));
const TurtleIO = require(path.join(__dirname, "turtleio.js"));

function factory () {
	let app = new TurtleIO();

	// Creating default middleware map
	app.middleware.set("all", new Map());

	// Setting default middleware
	[middleware.cors, middleware.etag, middleware.connect].forEach(function (i) {
		app.use(i).blacklist(i);
	});

	return app;
}

module.exports = factory;
