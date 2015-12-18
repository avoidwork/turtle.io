module.exports = function (grunt) {
	grunt.initConfig({
		babel: {
			options: {
				sourceMap: false,
				presets: ["babel-preset-es2015"]
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
	grunt.loadNpmTasks("grunt-nsp-package");

	// aliases
	grunt.registerTask("test", ["eslint", "mochaTest"]);
	grunt.registerTask("validate", "validate-package");
	grunt.registerTask("default", ["babel", "test"]);
	grunt.registerTask("package", ["validate", "default"]);
};
