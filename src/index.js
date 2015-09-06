const path = require("path");
const middleware = require(path.join(__dirname, "lib", "middleware.js"));
const TurtleIO = require(path.join(__dirname, "lib", "turtleio.js"));

function factory () {
	let app = new TurtleIO();

	// Setting default middleware
	[middleware.cors, middleware.etag, middleware.connect].forEach(function (i) {
		app.use(i).blacklist(i);
	});

	return app;
}

module.exports = factory;
