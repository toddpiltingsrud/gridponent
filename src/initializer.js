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

        model.read( requestModel, function ( data ) {
            self.config.pageModel = data;
            self.resolvePaging( self.config );
            self.resolveTypes( self.config );
            self.render( self.config );
            controller.monitorToolbars( self.config.node );
            controller.addCommandHandlers( self.config.node );
            controller.handleRowSelect( self.config );

            if ( typeof callback === 'function' ) callback( self.config );
        } );

        return this.config;

    },

    getConfig: function (node) {
        var self = this;
        var obj, config = gp.getAttributes(node);
        config.Columns = [];
        config.pageModel = {};
        config.ID = gp.createUID();
        for (var i = 0; i < node.children.length; i++) {
            var col = node.children[i];
            var colConfig = gp.getAttributes(col);
            config.Columns.push(colConfig);
            this.resolveCommands(colConfig);
            this.resolveTemplates(colConfig);
        }
        config.Footer = this.resolveFooter(config);
        var options = 'Onrowselect SearchFunction Read Create Update Destroy Validate'.split(' ');
        options.forEach( function ( option ) {

            if ( gp.hasValue(config[option]) ) {
                // see if this config option points to an object
                // otherwise it must be a URL
                obj = gp.getObjectAtPath( config[option] );

                if ( gp.hasValue( obj ) ) config[option] = obj;
            }

        } );
        gp.info('getConfig.config:', config);
        return config;
    },

    render: function ( config ) {
        var self = this;
        try {
            var node = config.node;

            node.innerHTML = gp.templates['gridponent']( config );

            // sync column widths
            if ( config.FixedHeaders || config.FixedFooters ) {
                var nodes = node.querySelectorAll( '.table-body > table > tbody > tr:first-child > td' );

                if ( gp.hasPositiveWidth( nodes ) ) {
                    // call syncColumnWidths twice because the first call causes things to shift around a bit
                    self.syncColumnWidths( config )
                    self.syncColumnWidths( config )
                }
                //else {
                //    new gp.polar(function () {
                //        return gp.hasPositiveWidth(nodes);
                //    }, function () {
                //        self.syncColumnWidths.call(config)
                //        self.syncColumnWidths.call(config)
                //    });
                //}

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
        var props = 'HeaderTemplate Template EditTemplate FooterTemplate'.split(' ');
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
        if ( !config || !config.pageModel || !config.pageModel.Data ) return;
        config.Columns.forEach( function ( col ) {
            for ( var i = 0; i < config.pageModel.Data.length; i++ ) {
                if ( config.pageModel.Data[i][col.Field] !== null ) {
                    col.Type = gp.getType( config.pageModel.Data[i][col.Field] );
                    break;
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