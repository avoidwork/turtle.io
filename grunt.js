module.exports = function (grunt) {
  grunt.initConfig({
	pkg : "<json:package.json>",
	meta : {
		  banner : "/**\n" + 
				   " * <%= pkg.name %>\n" +
				   " *\n" +
				   " * @author <%= pkg.author.name %> <<%= pkg.author.email %>>\n" +
				   " * @copyright <%= pkg.author.name %> <%= grunt.template.today('yyyy') %>\n" +
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
			"src/factory.js",
			"src/restart.js",
			"src/start.js",
			"src/status.js",
			"src/stop.js",
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

  grunt.registerTask("default", "concat test");
};