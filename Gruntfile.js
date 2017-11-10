module.exports = function (grunt) {
	grunt.initConfig({
		babel: {
			options: {
				sourceMap: false,
				presets: ["env"]
			},
			dist: {
				files: [{
					expand: true,
					cwd: 'src',
					src: ['*.js'],
					dest: 'lib',
					ext: '.js'
				}]
			}
		},
		eslint: {
			target: ["src/*.js"]
		},
		mochaTest : {
			options: {
				reporter: "spec"
			},
			test : {
				src : ["test/*_test.js"]
			}
		}
	});

	// tasks
	grunt.loadNpmTasks("grunt-babel");
	grunt.loadNpmTasks("grunt-eslint");
	grunt.loadNpmTasks("grunt-mocha-test");

	// aliases
	grunt.registerTask("test", ["eslint", "mochaTest"]);
	grunt.registerTask("default", ["babel", "test"]);
};
