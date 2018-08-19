module.exports = function (grunt) {
	grunt.initConfig({
		eslint: {
			target: [
				"index.js",
				"Gruntfile.js",
				"lib/*.js",
				"test/*.js"
			]
		},
		mochaTest: {
			options: {
				reporter: "spec"
			},
			test: {
				src: ["test/*_test.js"]
			}
		}
	});

	// tasks
	grunt.loadNpmTasks("grunt-eslint");
	grunt.loadNpmTasks("grunt-mocha-test");

	// aliases
	grunt.registerTask("test", ["eslint", "mochaTest"]);
	grunt.registerTask("default", ["test"]);
};
