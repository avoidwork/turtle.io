module.exports = function (grunt) {
	grunt.initConfig({
		pkg : grunt.file.readJSON("package.json"),
		concat : {
			options : {
				banner : "/**\n" + 
				         " * <%= pkg.name %>\n" +
				         " *\n" +
				         " * @author <%= pkg.author.name %> <<%= pkg.author.email %>>\n" +
				         " * @copyright <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>\n" +
				         " * @license <%= pkg.licenses[0].type %> <<%= pkg.licenses[0].url %>>\n" +
				         " * @link <%= pkg.homepage %>\n" +
				         " * @module <%= pkg.name %>\n" +
				         " * @version <%= pkg.version %>\n" +
				         " */\n"
			},
			dist : {
				src : [
					"src/app.js"
				],
				dest : "lib/app.js"
			}
		},
		shell: {
			closure: {
				command: "cd lib\nclosure-compiler --js app.js --js_output_file app.min.js --create_source_map ./app.map"
			},
			sourcemap: {
				command: "echo //@ sourceMappingURL=app.map >> lib/app.min.js"
			}
		}
	});

	grunt.loadNpmTasks("grunt-shell");
	grunt.loadNpmTasks("grunt-contrib-concat");

	grunt.registerTask("test", ["nodeunit"]);

	grunt.registerTask("compress", function () {
		process.platform !== "win32" ? grunt.task.run("shell") : console.log("Couldn't compress files on your OS")
	});

	grunt.registerTask("default", ["concat", "compress"]);
};