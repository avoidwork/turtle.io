var turtle = require("../lib/turtle.io"),
    server = new turtle();

exports["methods"] = {
	setUp: function (done) {
		this.methods = ["restart", "start", "stop", "status"];
		done();
	},
	tests: function (test) {
		test.expect(4);
		test.equal(typeof server[this.methods[0]], "function", "Should be 'function");
		test.equal(typeof server[this.methods[1]], "function", "Should be 'function");
		test.equal(typeof server[this.methods[2]], "function", "Should be 'function");
		test.equal(typeof server[this.methods[3]], "function", "Should be 'function");
		test.done();
	}
};