/***************\
   Initializer
\***************/
gp.Initializer = function ( node ) {
    this.node = node;
};

gp.Initializer.prototype = {

    initialize: function ( callback ) {
        this.config = this.getConfig( this.node );
        return this.initializeOptions( this.config, callback );
    },

    initializeOptions: function ( options, callback ) {
        var self = this;
        options.pageModel = {};
        options.ID = gp.createUID();
        this.config = options;
        this.config.node = this.node;
        this.config.map = new gp.DataMap();
        var dal = new gp.Model( this.config );
        var requestModel = new gp.PagingModel();
        var controller = new gp.Controller( self.config, dal, requestModel );
        this.node.api = new gp.api( controller );
        this.config.footer = this.resolveFooter( this.config );
        this.renderLayout( this.config );

        setTimeout( function () {
            self.addEventDelegates( self.config, controller );

            // provides a hook for extensions
            controller.invokeDelegates( gp.events.beforeInit, self.config );

            // we need both beforeinit and beforeread because beforeread is used after every read in the controller
            // and beforeinit happens just once after the node is created, but before first read
            controller.invokeDelegates( gp.events.beforeRead, self.config.pageModel );

            dal.read( requestModel,
                function ( data ) {
                    try {
                        gp.shallowCopy( data, self.config.pageModel, true );
                        //self.config.pageModel = data;
                        self.resolveTypes( self.config );
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
        } );

        return this.config;
    },

    getConfig: function (node) {
        var self = this,
            obj,
            colNode,
            colConfig,
            templates,
            config = gp.getAttributes( node ),
            gpColumns = config.node.querySelectorAll( 'gp-column' );

        // modal or inline
        config.editmode = config.editmode || 'inline';

        config.columns = [];

        // create the column configurations
        templates = 'header body edit footer'.split( ' ' );
        for ( var i = 0; i < gpColumns.length; i++ ) {
            colNode = gpColumns[i];
            colConfig = gp.getAttributes(colNode);
            config.columns.push(colConfig);
            this.resolveCommands(colConfig);
            this.resolveTemplates( templates, colConfig, colNode );
        }


        // resolve the top level configurations
        var options = 'onrowselect searchfunction read create update destroy validate model'.split(' ');
        options.forEach( function ( option ) {

            if ( gp.hasValue(config[option]) ) {
                // see if this config option points to an object
                // otherwise it must be a URL
                obj = gp.getObjectAtPath( config[option] );

                if ( gp.hasValue( obj ) ) config[option] = obj;
            }

        } );


        // resolve the various templates
        this.resolveTemplates( ['toolbar', 'footer'], config, config.node );

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

    renderLayout: function ( config ) {
        var self = this;
        try {
            config.node.innerHTML = gp.templates['gridponent']( config );
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

            var body = node.querySelector( 'div.table-body' );
            var footer = node.querySelector( 'div.table-footer' );
            var pager = node.querySelector( 'div.table-pager' );
            var sortStyle = node.querySelector( 'style.sort-style' );

            body.innerHTML = gp.templates['gridponent-body']( config );
            if ( footer ) {
                footer.innerHTML = gp.templates['gridponent-table-footer']( config );
            }
            if ( pager ) {
                pager.innerHTML = gp.templates['gridponent-pager']( config );
            }
            sortStyle = gp.helpers.sortStyle.call( config );

            // sync column widths
            if ( config.fixedheaders || config.fixedfooters ) {
                var nodes = node.querySelectorAll( '.table-body > table > tbody > tr:first-child > td' );

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

    syncColumnWidths: function (config) {
        var html = gp.helpers.columnWidthStyle.call( config );
        config.node.querySelector( 'style.column-width-style' ).innerHTML = html;
    },

    resolveFooter: function (config) {
        for (var i = 0; i < config.columns.length; i++) {
            if (config.columns[i].footertemplate) return true;
        }
        return false;
    },

    resolveTemplates: function ( names, config, node ) {
        var selector,
            template,
            prop,
            selectorTemplate = 'script[type="text/html"][data-template*="{{name}}"],template[data-template*="{{name}}"]';
        names.forEach( function ( n ) {
            selector = gp.supplant( selectorTemplate, { name: n } );
            template = node.querySelector( selector );
            if ( template != null ) {
                for ( var i = 0; i < node.children.length; i++ ) {
                    if ( node.children[i] == template ) {
                        prop = gp.camelize( n ) + 'template';
                        config[prop] = template.innerHTML;
                        return;
                    }
                }
            }
        } );
    },

    resolveCommands: function (col) {
        if ( typeof col.commands == 'string' ) {
            col.commands = col.commands.split( ',' );
        }
    },

    resolveTypes: function ( config ) {
        var field,
            hasData = config && config.pageModel && config.pageModel.data && config.pageModel.data.length;

        config.columns.forEach( function ( col ) {
            field = gp.hasValue( col.field ) ? col.field : col.sort;
            if ( gp.isNullOrEmpty( field ) ) return;
            if ( config.model ) {
                // look for a type by field first, then by sort
                if ( gp.hasValue( config.model[field] ) ) {
                    col.Type = gp.getType( config.model[field] );
                }
            }
            if ( !gp.hasValue( col.Type ) && hasData ) {
                // if we haven't found a value after 200 iterations, give up
                for ( var i = 0; i < config.pageModel.data.length && i < 200 ; i++ ) {
                    if ( config.pageModel.data[i][field] !== null ) {
                        col.Type = gp.getType( config.pageModel.data[i][field] );
                        break;
                    }
                }
            }
        } );
    }

};