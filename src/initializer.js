/***************\
   Initializer
\***************/
gp.Initializer = function ( node ) {
    this.node = node;
};

gp.Initializer.prototype = {

    initialize: function (callback) {
        var self = this;
        this.config = this.getConfig(this.node);
        this.node.config = this.config;
        var model = new gp.Model( this.config );
        var requestModel = new gp.RequestModel();
        var controller = new gp.Controller( self.config, model, requestModel );
        this.node.api = new gp.api( controller );
        this.renderLayout( this.config );
        this.addBusyHandlers();

        // events should be raised AFTER the node is added to the DOM or they won't bubble
        // this problem occurs when nodes are created and then added to the DOM programmatically 
        // that means initialize has to return before it raises any events
        setTimeout( function () {
            // provides a hook for extensions
            gp.raiseCustomEvent( self.config.node, gp.events.beforeInit, self.config );

            gp.raiseCustomEvent( self.config.node, gp.events.beforeRead, { model: self.config.pageModel } );

            model.read( requestModel, function ( data ) {
                try {
                    self.config.pageModel = data;
                    self.resolvePaging( self.config );
                    self.resolveTypes( self.config );
                    self.render( self.config );
                    controller.init();
                    if ( typeof callback === 'function' ) callback( self.config );
                } catch ( e ) {
                    gp.error( e );
                }
                gp.raiseCustomEvent( self.config.node, gp.events.afterRead, { model: self.config.pageModel } );
                gp.raiseCustomEvent( self.config.node, gp.events.afterInit, self.config );
            } );
        } );

        return this.config;
    },

    addBusyHandlers: function () {
        gp.on( this.config.node, gp.events.beforeRead, gp.addBusy );
        gp.on( this.config.node, gp.events.afterRead, gp.removeBusy );
        gp.on( this.config.node, gp.events.beforeUpdate, gp.addBusy );
        gp.on( this.config.node, gp.events.afterUpdate, gp.removeBusy );
        gp.on( this.config.node, gp.events.beforeDelete, gp.addBusy );
        gp.on( this.config.node, gp.events.afterDelete, gp.removeBusy );
        gp.on( this.config.node, gp.events.httpError, gp.removeBusy );
    },

    getConfig: function (node) {
        var self = this;
        var obj, config = gp.getAttributes( node );
        var gpColumns = config.node.querySelectorAll( 'gp-column' );
        config.Columns = [];
        config.pageModel = {};
        config.ID = gp.createUID();

        for ( var i = 0; i < gpColumns.length; i++ ) {
            var col = gpColumns[i];
            var colConfig = gp.getAttributes(col);
            config.Columns.push(colConfig);
            this.resolveCommands(colConfig);
            this.resolveTemplates(colConfig);
        }
        config.Footer = this.resolveFooter(config);
        var options = 'Onrowselect SearchFunction Read Create Update Delete Validate'.split(' ');
        options.forEach( function ( option ) {

            if ( gp.hasValue(config[option]) ) {
                // see if this config option points to an object
                // otherwise it must be a URL
                obj = gp.getObjectAtPath( config[option] );

                if ( gp.hasValue( obj ) ) config[option] = obj;
            }

        } );

        if ( gp.hasValue( config.ToolbarTemplate ) ) {
            config.ToolbarTemplate = gp.resolveTemplate( config.ToolbarTemplate );
        }

        gp.info('getConfig.config:', config);
        return config;
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
            var footer = node.querySelector( 'tfoot' );
            var pager = node.querySelector( 'div.table-pager' );
            var sortStyle = node.querySelector( 'style.sort-style' );

            body.innerHTML = gp.templates['gridponent-body']( config );
            if ( footer ) {
                footer.innerHTML = gp.templates['gridponent-tfoot']( config );
            }
            if ( pager ) {
                pager.innerHTML = gp.templates['gridponent-pager']( config );
            }
            sortStyle = gp.helpers.sortStyle.call( config );

            // sync column widths
            if ( config.FixedHeaders || config.FixedFooters ) {
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
        for (var i = 0; i < config.Columns.length; i++) {
            if (config.Columns[i].FooterTemplate) return true;
        }
        return false;
    },

    resolveTemplates: function (column) {
        var props = 'HeaderTemplate BodyTemplate EditTemplate FooterTemplate'.split(' ');
        props.forEach(function (prop) {
            column[prop] = gp.resolveTemplate(column[prop]);
        });
    },

    resolveCommands: function (col) {
        if (col.Commands) {
            col.Commands = col.Commands.split(',');
        }
    },

    resolvePaging: function ( config ) {
        // if we've got all the data, do paging/sorting/searching on the client

    },

    resolveTypes: function ( config ) {
        if ( !config || !config.pageModel || ( !config.pageModel.Data && !config.pageModel.Types ) ) return;
        config.Columns.forEach( function ( col ) {
            if ( config.pageModel.Types && config.pageModel.Types[col.Field] != undefined ) {
                col.Type = gp.convertClrType( config.pageModel.Types[col.Field] )
            }
            else {
                for ( var i = 0; i < config.pageModel.Data.length; i++ ) {
                    if ( config.pageModel.Data[i][col.Field] !== null ) {
                        col.Type = gp.getType( config.pageModel.Data[i][col.Field] );
                        break;
                    }
                }
            }
        } );
    }
    //measureTables: function (node) {
    //    // for fixed headers, adjust the padding on the header to match the width of the main table
    //    var header = node.querySelector('.table-header');
    //    var footer = node.querySelector('.table-footer');
    //    if (header || footer) {
    //        var bodyWidth = node.querySelector('.table-body > table').offsetWidth;
    //        var headerWidth = (header || footer).querySelector('table').offsetWidth;
    //        var diff = (headerWidth - bodyWidth);
    //        if (diff !== 0) {
    //            var paddingRight = diff;
    //            gp.log('diff:' + diff + ', paddingRight:' + paddingRight);
    //            if (header) {
    //                header.style.paddingRight = paddingRight.toString() + 'px';
    //            }
    //            if (footer) {
    //                footer.style.paddingRight = paddingRight.toString() + 'px';
    //            }
    //        }
    //    }
    //}

};