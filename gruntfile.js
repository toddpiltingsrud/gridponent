module.exports = function(grunt) {
    
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            build: {
                src: 'build/<%= pkg.name %>.js',
                dest: 'build/<%= pkg.name %>.min.js'
            }
        },
        concat: {
            options:{
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                separator: '\n'
            },
            dist: {
                src: [
                    'src/a-gridponent.js',
                    'src/api.js',
                    'src/controller.js',
                    'src/custom-event-polyfill.js',
                    'src/data-layer.js',
                    'src/datamap.js',
                    'src/editors.js',
                    'src/http.js',
                    'src/initializer.js',
                    'src/injector.js',
                    'src/model-sync.js',
                    'src/pagers.js',
                    'src/request-model.js',
                    'src/response-model.js',
                    'src/string-builder.js',
                    'src/templates.js',
                    'src/utils.js',
                    'src/z-webcomponent.js'
                ],
                dest: 'build/<%= pkg.name %>.js'
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.loadNpmTasks('grunt-contrib-concat');

    // Default task(s).
    grunt.registerTask('default', ['uglify']);
    
};