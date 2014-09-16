module.exports = function(grunt) {
    "use strict";

    var pkg = grunt.file.readJSON("package.json");

    grunt.initConfig({
        pkg: pkg,
        watch: {
            jasmine: {
                files: ["src/*.js", "test/spec/*.spec.js"],
                tasks: ["karma:watch:run"]
            }
        },
        karma: {
            options: {
                configFile: "test/karma.conf.js"
            },
            watch: {
                background: true,
                reporters: ["coverage", "progress"]
            },
            unit: {
                singleRun: true,
                reporters: ["dots"]
            },
            coveralls: {
                singleRun: true,
                reporters: ["coverage", "dots", "coveralls"],
                coverageReporter: {
                    type: "lcovonly",
                    dir: "coverage/"
                }
            }
        },
        jshint: {
            all: ["Gruntfile.js", "src/*.js", "test/spec/*.spec.js"],
            options: {
                jshintrc: ".jshintrc"
            }
        },
        shell: {
            bower: {
                command: "bower install"
            }
        },
        connect: {
            watch: {
                options: {
                    hostname: "*",
                    base: "../"
                }
            }
        },
    });

    Object.keys(pkg.devDependencies).forEach(function(name) {
        if (!name.indexOf("grunt-")) grunt.loadNpmTasks(name);
    });

    grunt.registerTask("test", ["jshint", "karma:unit"]);
    grunt.registerTask("travis", ["jshint", "karma:coveralls"]);
    grunt.registerTask("dev", ["jshint", "karma:watch", "connect", "watch"]);
    grunt.registerTask("publish", "Publish a new version", function(version) {
        grunt.task.run([
            "shell:bower",
            "test",
            "github_publish:" + version,
            "shell:bower"
        ]);
    });
};
