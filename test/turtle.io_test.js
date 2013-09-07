var TurtleIO = require("../lib/turtle.io"),
    server   = new TurtleIO();

exports["methods"] = {
	setUp: function (done) {
		done();
	},
	tests: function (test) {
		test.expect(4);
		test.equal(typeof server.restart, "function", "Should be 'function'");
		test.equal(typeof server.start,   "function", "Should be 'function'");
		test.equal(typeof server.stop,    "function", "Should be 'function'");
		test.equal(typeof server.status,  "function", "Should be 'function'");
		test.done();
	}
};

exports["start"] = {
	setUp: function (done) {
		done();
	},
	tests: function (test) {
		test.expect(1);
		test.equal(server.start() instanceof TurtleIO, true, "Should be instance of turtle.io");
		test.done();
	}
};

exports["stop"] = {
	setUp: function (done) {
		done();
	},
	tests: function (test) {
		test.expect(1);
		test.equal(server.stop() instanceof TurtleIO, true, "Should be instance of turtle.io");
		test.done();
	}
};

exports["restart"] = {
	setUp: function (done) {
		done();
	},
	tests: function (test) {
		test.expect(3);
		test.equal(server.start() instanceof TurtleIO,   true, "Should be instance of turtle.io");
		test.equal(server.restart() instanceof TurtleIO, true, "Should be instance of turtle.io");
		test.equal(server.stop() instanceof TurtleIO,    true, "Should be instance of turtle.io");
		test.done();
	}
};
