/***************\
   Initializer
\***************/
gp.Initializer = function ( node ) {
    this.parent = $( node );
};

gp.Initializer.prototype = {

    initialize: function ( callback ) {
        this.config = this.getConfig( this.parent );
        return this.initializeOptions( this.config, callback );
    },

    initializeOptions: function ( options, callback ) {
        var self = this;
        options.pageModel = {};
        options.ID = gp.createUID();
        this.config = options;
        this.config.map = new gp.DataMap();
        this.config.pageModel = new gp.PagingModel();
        this.config.editmode = this.config.editmode || 'inline';
        this.config.newrowposition = this.config.newrowposition || 'top';

        // this has to be defined before renderLayout
        this.injector = new gp.Injector( {
            $config: this.config,
            $columns: this.config.columns,
            $node: this.config.node,
            $pageModel: this.config.pageModel,
            $map: this.config.map,
            $data: this.config.pageModel.data
        }, gp.templates, null, this.config ); // specify gp.templates as root, null for context, config as override source

        // this has to happen here so we can find the table-container
        this.renderLayout( this.config, this.parent );

        this.config.node = this.parent.find( '.table-container' )[0];
        this.$n = this.parent.find( '.table-container' );

        var dal = new gp.DataLayer( this.config );
        var controller = new gp.Controller( this.config, dal, this.config.pageModel, this.injector );
        this.config.node.api = new gp.api( controller );
        this.config.hasFooter = this.resolveFooter( this.config );
        this.config.preload = this.config.preload === false ? this.config.preload : true;
        this.injector.context = this.config.node.api;

        setTimeout( function () {
            // do this here to give external scripts a chance to run first
            self.resolveTopLevelOptions( self.config );

            self.addEventDelegates( self.config, controller );

            // provides a hook for extensions
            controller.invokeDelegates( gp.events.beforeInit, self.config );

            if ( self.config.preload ) {
                // we need both beforeInit and beforeread because beforeread is used after every read in the controller
                // and beforeInit happens just once after the node is created, but before first read
                controller.invokeDelegates( gp.events.beforeRead, self.config.pageModel );

                dal.read( self.config.pageModel,
                    function ( data ) {
                        try {
                            gp.shallowCopy( data, self.config.pageModel, true );
                            self.injector.setResource( '$data', self.config.pageModel.data );
                            gp.resolveTypes( self.config );
                            self.resolveCommands( self.config );
                            self.render( self.config );
                            controller.init();
                            if ( typeof callback === 'function' ) callback( self.config );
                        } catch ( e ) {
                            gp.error( e );
                        }
                        controller.invokeDelegates( gp.events.onRead, self.config.pageModel );
                    },
                    function ( e ) {
                        controller.invokeDelegates( gp.events.httpError, e );
                        alert( 'An error occurred while carrying out your request.' );
                        gp.error( e );
                    }
                );
            }
            else {
                gp.resolveTypes( self.config );
                self.resolveCommands( self.config );
                controller.init();
            }

        } );

        return this.config;
    },

    getConfig: function ( parentNode ) {
        var self = this,
            obj,
            colConfig,
            templates,
            config = gp.getAttributes( parentNode ),
            gpColumns = $( parentNode ).find( 'gp-column' );

        config.columns = [];

        // create the column configurations
        templates = 'header body edit footer'.split( ' ' );
        gpColumns.each( function () {
            colConfig = gp.getAttributes( this );
            config.columns.push( colConfig );
            self.resolveTemplates( templates, colConfig, this, 'template' );
        } );

        // resolve the various templates
        this.resolveTemplates( Object.getOwnPropertyNames( gp.templates ), config, parentNode, '' );

        return config;
    },

    addEventDelegates: function ( config, controller ) {
        var self = this, name, fn, api = config.node.api;
        Object.getOwnPropertyNames( gp.events ).forEach( function ( event ) {
            name = gp.events[event];
            fn = config[name];
            if ( typeof fn === 'string' ) {
                fn = gp.getObjectAtPath( fn );
            }

            // event delegates must point to a function
            if ( typeof fn == 'function' ) {
                config[name] = fn;
                controller.addDelegate( name, fn );
            }
        } );
    },

    renderLayout: function ( config, parentNode ) {
        try {
            $( parentNode ).html( this.injector.exec('container') );
        }
        catch ( ex ) {
            gp.error( ex );
        }
    },

    render: function ( config ) {
        var self = this;
        try {
            var node = config.node;

            // inject table rows, footer, pager and header style.

            var body = this.$n.find( 'div.table-body' );
            var footer = this.$n.find( 'div.table-footer' );
            var pager = this.$n.find( 'div.table-pager' );

            body.html( self.injector.exec( 'tableBody' ) );
            footer.html( self.injector.exec( 'footerTable' ) );
            pager.html( self.injector.exec( 'pagerBar' ) );
            gp.helpers.sortStyle( config );

            // sync column widths
            if ( config.fixedheaders || config.fixedfooters ) {
                var nodes = this.$n.find( '.table-body > table > tbody > tr:first-child > td' );

                if ( gp.hasPositiveWidth( nodes ) ) {
                    // call syncColumnWidths twice because the first call causes things to shift around a bit
                    self.syncColumnWidths( config )
                    self.syncColumnWidths( config )
                }

                window.addEventListener( 'resize', function () {
                    self.syncColumnWidths( config );
                } );
            }
        }
        catch ( ex ) {
            gp.error( ex );
        }
    },

    syncColumnWidths: function ( config ) {
        var html = this.injector.exec( 'columnWidthStyle' );
        this.$n.find( 'style.column-width-style' ).html( html );
    },

    resolveFooter: function ( config ) {
        for ( var i = 0; i < config.columns.length; i++ ) {
            if ( config.columns[i].footertemplate ) return true;
        }
        return false;
    },

    resolveTopLevelOptions: function(config) {
        // resolve the top level configurations
        var obj, options = 'rowselected searchfunction read create update destroy validate model'.split( ' ' );
        options.forEach( function ( option ) {
            if ( gp.hasValue( config[option] ) ) {
                // see if this config option points to an object
                // otherwise it must be a URL
                obj = gp.getObjectAtPath( config[option] );

                if ( gp.hasValue( obj ) ) config[option] = obj;
            }
        } );
    },

    resolveTemplates: function ( names, config, node, suffix ) {
        var selector,
            template,
            prop,
            $node = $(node),
            selectorTemplate = 'script[type="text/html"][data-template*="{{name}}"],template[data-template*="{{name}}"]';
        names.forEach( function ( n ) {
            selector = gp.supplant( selectorTemplate, { name: n } );
            template = $node.find( selector );
            if ( template.length ) {
                for ( var i = 0; i < $node[0].children.length; i++ ) {
                    if ( $node[0].children[i] == template[0] ) {
                        prop = gp.camelize( n ) + suffix;
                        config[prop] = template[0].innerHTML;
                        return;
                    }
                }
            }
        } );
    },

    resolveCommands: function ( config ) {
        var match, val, commands, index = 0;
        config.columns.forEach( function ( col ) {
            if ( typeof col.commands == 'string' ) {
                commands = [];
                col.commands.split( ',' ).forEach( function ( cmd ) {
                    match = cmd.split( ':' );
                    commands.push( {
                        text: match[0],
                        value: match[1],
                        btnClass: match[2],
                        glyphicon: match[3],
                    } );
                } );
                col.commands = commands;
            }
            if ( Array.isArray( col.commands ) ) {
                col.commands.forEach( function ( cmd ) {
                    cmd.text = cmd.text || cmd.value;
                    cmd.value = cmd.value || cmd.text;
                    cmd.btnClass = cmd.btnClass || ( /delete|destroy/i.test( cmd.text ) ? 'btn-danger' : 'btn-default' );
                    cmd.glyphicon = cmd.glyphicon || ( /delete|destroy/i.test( cmd.text ) ? 'glyphicon-remove' : ( /edit/i.test( cmd.text ) ? 'glyphicon-edit' : 'glyphicon-cog' ) );
                    cmd.func = cmd.func || gp.getObjectAtPath( cmd.value );
                } );
            }
        } );
    }
};