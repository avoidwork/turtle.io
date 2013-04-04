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
					"src/allowed.js",
					"src/allows.js",
					"src/codes.js",
					"src/config.js",
					"src/diff.js",
					"src/encode.js",
					"src/factory.js",
					"src/cache.js",
					"src/cached.js",
					"src/compressed.js",
					"src/compression.js",
					"src/echo.js",
					"src/error.js",
					"src/hash.js",
					"src/headers.js",
					"src/log.js",
					"src/proxy.js",
					"src/redirect.js",
					"src/request.js",
					"src/respond.js",
					"src/restart.js",
					"src/start.js",
					"src/status.js",
					"src/stop.js",
					"src/unset.js",
					"src/verbs.js",
					"src/write.js",
					"src/handler.js",
					"src/messages.js",
					"src/prep.js",
					"src/probes.js",
					"src/outro.js"
				],
				dest : "lib/<%= pkg.name %>.js"
			}
		},
		nodeunit : {
			all : ["test/**/*.js"]
		}
	});

	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks("grunt-contrib-nodeunit");

	grunt.registerTask("test", ["nodeunit"]);

	grunt.registerTask("version", function () {
		var cfg = grunt.config("pkg"),
		    ver = cfg.version,
		    fn  = "lib/" + cfg.name + ".js",
		    fp  = grunt.file.read(fn);

		console.log("Setting version to: " + ver);
		grunt.file.write(fn, fp.replace(/\{\{VERSION\}\}/g, ver));
	});

	// Concatting, setting version & testing
	grunt.registerTask("default", ["concat", "version", "test"]);
};