/**
 * TurtleIO factory
 *
 * @method factory
 * @return {Object} TurtleIO instance
 */
let factory = function () {
	let app = new TurtleIO();

	// Setting default middleware
	[cors, etag, connect].forEach(function (i) {
		app.use(i).blacklist(i);
	});

	return app;
};
