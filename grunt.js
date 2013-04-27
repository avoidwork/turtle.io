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
                   " * @module <%= pkg.name %>\n" +
                   " * @version <%= pkg.version %>\n" +
                   " */"
    },
    concat: {
      dist: {
        src : [
          "<banner>",
          "src/app.js"
        ],
        dest : "assets/app.js"
      }
    },
    lint : {
      files : ["grunt.js"]
    },
    min : {
      "assets/app.min.js" : ["<banner>", "assets/app.js"]
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

  grunt.registerTask("default", "concat version min test");

  grunt.registerTask("version", function () {
    var ver = grunt.config("pkg").version,
        fn  = "assets/app.js",
        fp  = grunt.file.read("assets/app.js");

    console.log("Setting version to: " + ver);
    grunt.file.write(fn, fp.replace(/\{\{VERSION\}\}/g, ver));
  });
};