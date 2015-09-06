const array = require("retsu");
const path = require("path");
const middleware = require(path.join(__dirname, "middleware.js"));
const TurtleIO = require(path.join(__dirname, "turtleio.js"));

function factory () {
	let app = new TurtleIO();

	// Setting default middleware
	array.each([middleware.cors, middleware.etag, middleware.connect], function (i) {
		app.use(i).blacklist(i);
	});

	return app;
}

module.exports = factory;
