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
				         " * @license <%= pkg.licenses[0].type %> <<%= pkg.licenses[0].url %>>\n" +
				         " * @link <%= pkg.homepage %>\n" +
				         " * @version <%= pkg.version %>\n" +
				         " */\n"
			},
			dist: {
				src : [
					"<banner>",
					"src/intro.js",
					"src/constructor.js",
					"src/allowed.js",
					"src/allows.js",
					"src/auth.js",
					"src/codes.js",
					"src/compress.js",
					"src/compression.js",
					"src/encode.js",
					"src/error.js",
					"src/etag.js",
					"src/handle.js",
					"src/handler.js",
					"src/hash.js",
					"src/headers.js",
					"src/host.js",
					"src/levels.js",
					"src/log.js",
					"src/messages.js",
					"src/page.js",
					"src/probes.js",
					"src/prep.js",
					"src/proxy.js",
					"src/redirect.js",
					"src/register.js",
					"src/request.js",
					"src/respond.js",
					"src/restart.js",
					"src/route.js",
					"src/run.js",
					"src/start.js",
					"src/status.js",
					"src/stop.js",
					"src/unregister.js",
					"src/url.js",
					"src/use.js",
					"src/verbs.js",
					"src/watch.js",
					"src/write.js",
					"src/outro.js"
				],
				dest : "lib/<%= pkg.name %>.js"
			}
		},
		jshint : {
			options : {
				jshintrc : ".jshintrc"
			},
			src : "lib/<%= pkg.name %>.js"
		},
		nodeunit : {
			all : ["test/*.js"]
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
	grunt.loadNpmTasks("grunt-contrib-nodeunit");
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks('grunt-contrib-watch');

	// aliases
	grunt.registerTask("test", ["jshint", "nodeunit"]);
	grunt.registerTask("build", ["concat", "sed"]);
	grunt.registerTask("default", ["build", "test"]);
};