module.exports = function(grunt) {
    
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
            },
            my_target: {
                files: {
                    'build/<%= pkg.name %>.min.js': ['build/<%= pkg.name %>.js']
                }
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
        },
        less: {
            development:  {
                files:{
                    'build/<%= pkg.name %>.css':'src/<%= pkg.name %>.less'
                }
            }
        },
        cssmin: {
            target: {
                files: [{
                    expand: true,
                    cwd: 'build',
                    src: ['*.css', '!*.min.css'],
                    dest: 'build',
                    ext: '.min.css'
                  }]
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.loadNpmTasks('assemble-less');

    grunt.loadNpmTasks('grunt-contrib-cssmin');
    
    // Default task(s).
    grunt.registerTask('default', ['uglify']);
    
};