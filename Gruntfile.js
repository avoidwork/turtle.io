module.exports = function (grunt) {
	grunt.initConfig({
		pkg : grunt.file.readJSON("package.json"),
		concat: {
			options : {
				banner : "/**\n" + 
				         " * <%= pkg.name %>\n" +
				         " *\n" +
				         " * <%= pkg.description %>\n" +
				         " *\n" +
				         " * @author <%= pkg.author.name %> <<%= pkg.author.email %>>\n" +
				         " * @copyright <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>\n" +
				         " * @license <%= pkg.license %>\n" +
				         " * @link <%= pkg.homepage %>\n" +
				         " * @version <%= pkg.version %>\n" +
				         " */\n"
			},
			dist: {
				src : [
					"src/intro.js",
					"src/regex.js",
					"src/codes.js",
					"src/levels.js",
					"src/messages.js",
					"src/constructor.js",
					"src/allowed.js",
					"src/allows.js",
					"src/blacklist.js",
					"src/connect.js",
					"src/compress.js",
					"src/compression.js",
					"src/decorate.js",
					"src/encode.js",
					"src/error.js",
					"src/etag.js",
					"src/handle.js",
					"src/hash.js",
					"src/headers.js",
					"src/host.js",
					"src/log.js",
					"src/page.js",
					"src/pipeline.js",
					"src/prep.js",
					"src/probes.js",
					"src/proxy.js",
					"src/redirect.js",
					"src/register.js",
					"src/request.js",
					"src/respond.js",
					"src/restart.js",
					"src/route.js",
					"src/routes.js",
					"src/run.js",
					"src/signal.js",
					"src/start.js",
					"src/status.js",
					"src/stop.js",
					"src/unregister.js",
					"src/url.js",
					"src/use.js",
					"src/verbs.js",
					"src/watch.js",
					"src/write.js",
					"src/factory.js",
					"src/outro.js"
				],
				dest : "lib/<%= pkg.name %>.es6.js"
			}
		},
		babel: {
			options: {
				sourceMap: false
			},
			dist: {
				files: {
					"lib/<%= pkg.name %>.js": "lib/<%= pkg.name %>.es6.js"
				}
			}
		},
		mochaTest : {
			options: {
				reporter: "spec"
			},
			test : {
				src : ["test/*_test.js"]
			}
		},
		sed : {
			"version" : {
				pattern : "{{VERSION}}",
				replacement : "<%= pkg.version %>",
				path : ["<%= concat.dist.dest %>"]
			}
		},
		watch : {
			js : {
				files : "<%= concat.dist.src %>",
				tasks : "default"
			},
			pkg: {
				files : "package.json",
				tasks : "default"
			}
		}
	});

	// tasks
	grunt.loadNpmTasks("grunt-sed");
	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks("grunt-mocha-test");
	grunt.loadNpmTasks("grunt-nsp-package");
	grunt.loadNpmTasks("grunt-babel");

	// aliases
	grunt.registerTask("test", ["mochaTest"]);
	grunt.registerTask("build", ["concat", "sed", "babel"]);
	grunt.registerTask("validate", "validate-package");
	grunt.registerTask("default", ["build", "test"]);
	grunt.registerTask("package", ["validate", "default"]);
};
