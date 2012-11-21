module.exports = function (grunt) {
	grunt.initConfig({
		pkg : "<json:package.json>",
		meta : {
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
				         " */"
		},
		concat: {
			dist: {
				src : [
					"<banner>",
					"src/intro.js",
					"src/allowed.js",
					"src/allows.js",
					"src/bootstrap.js",
					"src/codes.js",
					"src/config.js",
					"src/factory.js",
					"src/cache.js",
					"src/cached.js",
					"src/echo.js",
					"src/error.js",
					"src/hash.js",
					"src/headers.js",
					"src/log.js",
					"src/proxy.js",
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
					"src/outro.js"
				],
				dest : "lib/turtle.io.js"
			}
		},
		test : {
			files : ["test/**/*.js"]
		},
		watch : {
			files : "<config:lint.files>",
			tasks : "default"
		},
		jshint : {
			options : {
				curly   : true,
				eqeqeq  : true,
				immed   : true,
				latedef : true,
				newcap  : true,
				noarg   : true,
				sub     : true,
				undef   : true,
				boss    : true,
				eqnull  : true,
				node    : true
			},
			globals: {
				exports : true
			}
		}
	});

  	// Replaces occurrances of {{VERSION}} with the value from package.json
  	grunt.registerTask("version", function () {
		var ver = grunt.config("pkg").version,
		    fn  = grunt.config("concat").dist.dest,
		    fp  = grunt.file.read(fn);

		console.log("Setting version to: " + ver);
		grunt.file.write(fn, fp.replace(/\{\{VERSION\}\}/g, ver));
	});

	// Concatting, setting version & testing
	grunt.registerTask("default", "concat version test");
};