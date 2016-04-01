/***************\
   controller
\***************/
gp.Controller = function (config, model, requestModel) {
    var self = this;
    this.config = config;
    this.model = model;
    this.requestModel = requestModel;
    if (config.pager) {
        this.requestModel.top = 25;
    }
    this.monitor = null;
    this.handlers = {
        readHandler: self.read.bind( self ),
        commandHandler: self.commandHandler.bind( self ),
        rowSelectHandler: self.rowSelectHandler.bind( self ),
        httpErrorHandler: self.httpErrorHandler.bind(self)
    };
    this.done = false;
    this.callbacks = [];
    this.eventDelegates = {};
};

gp.Controller.prototype = {

    init: function () {
        var self = this;
        this.monitorToolbars( this.config.node );
        this.addCommandHandlers( this.config.node );
        this.addRowSelectHandler( this.config );
        this.addRefreshEventHandler( this.config );
        this.done = true;
        this.callbacks.forEach( function ( callback ) {
            gp.tryFunc( callback, self.config );
        } );
    },

    ready: function(callback) {
        if ( this.done ) {
            gp.tryFunc( callback, this.config );
        }
        else {
            this.callbacks.push( callback );
        }
    },

    addDelegate: function( event, delegate) {
        this.eventDelegates[event] = this.eventDelegates[event] || [];
        this.eventDelegates[event].push( delegate );
    },

    invokeDelegates: function ( context, event, args ) {
        var proceed = true,
            delegates = this.eventDelegates[event];
        if ( Array.isArray(delegates) ) {
            delegates.forEach( function ( delegate ) {
                if ( proceed === false ) return;
                proceed = gp.applyFunc( delegate, context, args );
            } );
        }
        return proceed;
    },

    monitorToolbars: function (node) {
        var self = this;
        // monitor changes to search, sort, and paging
        this.monitor = new gp.ChangeMonitor( node, '.table-toolbar [name], thead input, .table-pager input', this.config.pageModel, function ( evt ) {
            self.read();
            // reset the radio inputs
            var radios = node.querySelectorAll( 'thead input[type=radio], .table-pager input[type=radio]' );
            for (var i = 0; i < radios.length; i++) {
                radios[i].checked = false;
            }
        } );
        this.monitor.beforeSync = function ( name, value, model ) {
            gp.info( 'beforeSync called' );
            // the sort property requires special handling
            if (name === 'sort') {
                if (model[name] === value) {
                    model.desc = !model.desc;
                }
                else {
                    model[name] = value;
                    model.desc = false;
                }
                // let the monitor know that syncing has been handled
                return true;
            }
            return false;
        };
        this.monitor.start();
    },

    addCommandHandlers: function (node) {
        // listen for command button clicks
        gp.on( node, 'click', 'button[value]', this.handlers.commandHandler );
    },

    removeCommandHandlers: function(node) {
        gp.off( node, 'click', this.handlers.commandHandler );
    },

    commandHandler: function ( evt ) {
        var command, lower, tr, row, node = this.config.node;
        command = evt.selectedTarget.attributes['value'].value;
        if ( gp.hasValue( command ) ) lower = command.toLowerCase();
        tr = gp.closest( evt.selectedTarget, 'tr[data-index]', node );
        row = tr ? gp.getRowModel( this.config.pageModel.data, tr ) : null;
        switch ( lower ) {
            case 'addrow':
                this.addRow();
                break;
            case 'create':
                this.createRow( row, tr );
                break;
            case 'edit':
                this.editRow( row, tr );
                break;
            case 'update':
                this.updateRow( row, tr );
                break;
            case 'cancel':
                this.cancelEdit( row, tr );
                break;
            case 'delete':
            case 'destroy':
                this.deleteRow( row, tr );
                break;
            default:
                // check for a custom command
                var cmd = gp.getObjectAtPath( command );
                if ( typeof cmd === 'function' ) {
                    gp.applyFunc( cmd, node.api, [row, tr] );
                }
                break;
        }
    },

    addRowSelectHandler: function ( config ) {
        // it's got to be either a function or a URL template
        if ( typeof config.onrowselect == 'function' || gp.rexp.braces.test( config.onrowselect ) ) {
            // add click handler
            gp.on( config.node, 'click', 'div.table-body > table > tbody > tr > td.body-cell', this.handlers.rowSelectHandler );
        }
    },

    removeRowSelectHandler: function() {
        gp.off( this.config.node, 'click', this.handlers.rowSelectHandler );
    },

    rowSelectHandler: function ( evt ) {
        var config = this.config,
            tr = gp.closest( evt.selectedTarget, 'tr', config.node ),
            trs = config.node.querySelectorAll( 'div.table-body > table > tbody > tr.selected' ),
            type = typeof config.onrowselect,
            row,
            proceed;

        if ( type === 'string' && config.onrowselect.indexOf( '{{' ) !== -1 ) type = 'urlTemplate';

        // remove previously selected class
        for ( var i = 0; i < trs.length; i++ ) {
            gp.removeClass( trs[i], 'selected' );
        }

        // add selected class
        gp.addClass( tr, 'selected' );
        // get the row for this tr
        row = gp.getRowModel( config.pageModel.data, tr );

        // ensure row selection doesn't interfere with button clicks in the row
        // by making sure the evt target is a body cell
        if ( evt.target != evt.selectedTarget ) return;

        proceed = this.invokeDelegates( tr, gp.events.rowselected, {
            row: row,
            tableRow: tr
        } );

        if ( proceed === false ) return;

        if ( type === 'function' ) {
            gp.applyFunc( config.onrowselect, tr, [row] );
        }
        else {
            // it's a urlTemplate
            window.location = gp.processBodyTemplate( config.onrowselect, row );
        }
    },

    addRefreshEventHandler: function ( config ) {
        if ( config.refreshevent ) {
            gp.on( document, config.refreshevent, this.handlers.readHandler );
        }
    },

    removeRefreshEventHandler: function ( config ) {
        if ( config.refreshevent ) {
            gp.off( document, config.refreshevent, this.handlers.readHandler );
        }
    },

    search: function(searchTerm, callback) {
        this.config.pageModel.search = searchTerm;
        var searchBox = this.config.node.querySelector( 'div.table-toolbar input[name=search' );
        searchBox.value = searchTerm;
        this.read(null, callback);
    },

    sort: function(field, desc, callback) {
        this.config.pageModel.sort = field;
        this.config.pageModel.desc = ( desc == true );
        this.read(null, callback);
    },

    read: function ( requestModel, callback ) {
        var self = this, proceed = true;
        if ( requestModel ) {
            gp.shallowCopy( requestModel, this.config.pageModel );
        }
        proceed = this.invokeDelegates( this.config.node, gp.events.beforeread, this.config.pageModel );
        if ( proceed === false ) return;
        gp.info( 'read.pageModel:', this.config.pageModel );
        this.model.read( this.config.pageModel, function ( model ) {
            // models coming from the server should be lower-cased
            gp.shallowCopy( model, self.config.pageModel, true );
            self.refresh( self.config );
            self.invokeDelegates( self.config.node, gp.events.onread, this.config.pageModel );
            gp.applyFunc( callback, self.config.node, self.config.pageModel );
        }, this.handlers.httpErrorHandler );
    },

    addRow: function ( row ) {
        var self = this,
            tbody,
            rowIndex,
            bodyCellContent,
            editCellContent,
            builder,
            tr,
            html,
            field;

        try {

            if ( !gp.hasValue( this.config.create ) ) {
                return;
            }

            if ( row == undefined ) {
                row = {};

                // set defaults
                this.config.columns.forEach( function ( col ) {
                    var field = col.field || col.sort;
                    if ( gp.hasValue( field ) ) {
                        if ( gp.hasValue( col.Type ) ) {
                            row[field] = gp.getDefaultValue( col.Type );
                        }
                        else {
                            row[field] = '';
                        }
                    }
                } );

                // overwrite defaults with a model if specified
                if ( typeof this.config.model == 'object' ) {
                    gp.shallowCopy( this.config.model, row );
                }
            }

            // add the new row to the internal data array
            this.config.pageModel.data.push( row );

            tbody = this.config.node.querySelector( 'div.table-body > table > tbody' );
            rowIndex = this.config.pageModel.data.indexOf( row );
            bodyCellContent = gp.helpers['bodyCellContent'];
            editCellContent = gp.helpers['editCellContent'];

            // use a NodeBuilder to create a tr[data-index=rowIndex].create-mode
            builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-index', rowIndex ).addClass( 'create-mode' );

            // add td.body-cell elements to the tr
            this.config.columns.forEach( function ( col ) {
                html = col.readonly ?
                    bodyCellContent.call( this.config, col, row ) :
                    editCellContent.call( this.config, col, row, 'create' );
                builder.startElem( 'td' ).addClass( 'body-cell' ).addClass( col.BodyCell ).html( html ).endElem();
            } );

            tr = builder.close();

            gp.prependChild( tbody, tr );

            tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', row ).start();

            // gives external code the opportunity to initialize UI elements (e.g. datepickers)
            this.invokeDelegates( tr, gp.events.editmode, {
                row: row,
                tableRow: tr
            } );
        }
        catch ( ex ) {
            gp.error( ex );
        }

        return {
            row: row,
            tableRow: tr
        };
    },

    createRow: function (row, tr, callback) {
        try {
            var monitor,
                self = this,
                returnedRow;

            // if there is no create configuration setting, we're done here
            if ( !gp.hasValue( this.config.create ) ) {
                gp.applyFunc( callback, self.config.node );
                return;
            }

            this.invokeDelegates( this.config.node, gp.events.beforecreate, row );

            // call the data layer with just the row
            // the data layer should respond with an updateModel
            this.model.create( row, function ( updateModel ) {

                try {
                    if ( updateModel.ValidationErrors && updateModel.ValidationErrors.length ) {
                        if ( typeof self.config.validate === 'function' ) {
                            gp.applyFunc( self.config.validate, this, [tr, updateModel] );
                        }
                        else {
                            gp.helpers['validation'].call( this, tr, updateModel.ValidationErrors );
                        }
                    }
                    else {
                        // copy the returned row back to the internal data array
                        returnedRow = gp.hasValue( updateModel.Row ) ? updateModel.Row : ( updateModel.Data && updateModel.Data.length ) ? updateModel.Data[0] : row;
                        gp.shallowCopy( returnedRow, row );
                        // refresh the UI
                        self.restoreCells( self.config, row, tr );
                        // dispose of the ChangeMonitor
                        monitor = tr['gp-change-monitor'];
                        if ( monitor ) {
                            monitor.stop();
                            monitor = null;
                        }
                    }
                }
                catch ( err ) {
                    gp.error( err );
                }

                self.invokeDelegates( tr, gp.events.oncreate, updateModel );
                self.invokeDelegates( self.config.node, gp.events.onedit, self.config.pageModel );

                gp.applyFunc( callback, self.config.node, updateModel );
            },
            this.handlers.httpErrorHandler );
        }
        catch ( ex ) {
            gp.error( ex );
        }
    },

    editRow: function (row, tr) {
        try {
            // put the row in edit mode

            // IE9 can't set innerHTML of tr, so iterate through each cell
            // besides, that way we can just skip readonly cells
            var editCellContent = gp.helpers['editCellContent'];
            var col, cells = tr.querySelectorAll( 'td.body-cell' );
            for ( var i = 0; i < cells.length; i++ ) {
                col = this.config.columns[i];
                if ( !col.readonly ) {
                    cells[i].innerHTML = editCellContent.call( this.config, col, row, 'edit' );
                }
            }
            gp.addClass( tr, 'edit-mode' );
            tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', row ).start();

            // gives external code the opportunity to initialize UI elements (e.g. datepickers)
            this.invokeDelegates( tr, gp.events.editmode, {
                row: row,
                tableRow: tr
            } );
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    updateRow: function (row, tr, callback) {
        // save the row and return it to read mode

        try {
            var monitor,
                self = this,
                updatedRow;

            // if there is no update configuration setting, we're done here
            if ( !gp.hasValue( this.config.update ) ) {
                gp.applyFunc( callback, self.config.node );
                return;
            }

            this.invokeDelegates(tr, gp.events.beforeupdate, row );

            // call the data layer with just the row
            // the data layer should respond with an updateModel
            this.model.update( row, function ( updateModel ) {

                try {
                    if ( updateModel.ValidationErrors && updateModel.ValidationErrors.length ) {
                        if ( typeof self.config.validate === 'function' ) {
                            gp.applyFunc( self.config.validate, this, [tr, updateModel] );
                        }
                        else {
                            gp.helpers['validation'].call( this, tr, updateModel.ValidationErrors );
                        }
                    }
                    else {
                        // copy the returned row back to the internal data array
                        returnedRow = gp.hasValue( updateModel.Row ) ? updateModel.Row : ( updateModel.Data && updateModel.Data.length ) ? updateModel.Data[0] : row;
                        gp.shallowCopy( returnedRow, row );
                        // refresh the UI
                        self.restoreCells( self.config, row, tr );
                        // dispose of the ChangeMonitor
                        monitor = tr['gp-change-monitor'];
                        if ( monitor ) {
                            monitor.stop();
                            monitor = null;
                        }
                    }
                }
                catch (err) {
                    gp.error( err );
                }

                self.invokeDelegates( tr, gp.events.onupdate, updateModel );
                self.invokeDelegates( self.config.node, gp.events.onedit, self.config.pageModel );

                gp.applyFunc( callback, self.config.node, updateModel );
            },
            this.handlers.httpErrorHandler );
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    // we don't require a tr parameter because it may not be in the grid
    deleteRow: function (row, callback, skipConfirm) {
        try {
            if ( !gp.hasValue( this.config.destroy ) ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            var self = this,
                confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' ),
                message,
                tr = gp.getTableRow(this.config.pageModel.data, row, this.config.node);

            if ( !confirmed ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            this.invokeDelegates(this.config.node, gp.events.beforedestroy, row );

            this.model.destroy( row, function ( response ) {

                try {
                    // if it didn't error out, we'll assume it succeeded
                    // remove the row from the model
                    var index = self.config.pageModel.data.indexOf( row );
                    if ( index != -1 ) {
                        self.config.pageModel.data.splice( index, 1 );
                        // if the row is currently being displayed, refresh the grid
                        if ( tr ) {
                            self.refresh( self.config );
                        }
                    }
                }
                catch ( err ) {
                    gp.error( err );
                }

                self.invokeDelegates( self.config.node, gp.events.ondestroy, row );
                self.invokeDelegates( self.config.node, gp.events.onedit, self.config.pageModel );

                gp.applyFunc( callback, self.config.node, response );
            },
            self.handlers.httpErrorHandler );
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    cancelEdit: function (row, tr) {
        try {
            var tbl = gp.closest( tr, 'table', this.config.node ), index;

            if ( gp.hasClass( tr, 'create-mode' ) ) {
                // remove row and tr
                tbl.deleteRow( tr.rowIndex );
                index = this.config.pageModel.data.indexOf( row );
                this.config.pageModel.data.splice( index, 1 );
            }
            else {
                // replace the ObjectProxy with the original row
                this.config.Row = row;
                this.restoreCells( this.config, row, tr );
            }

            this.invokeDelegates( tr, 'cancelEdit', {
                row: row,
                tableRow: tr
            } );
        }
        catch ( ex ) {
            gp.error( ex );
        }
    },

    refresh: function ( config ) {
        // inject table rows, footer, pager and header style.
        var node = config.node;

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
        sortStyle.innerHTML = gp.helpers.sortStyle.call( config );
    },

    restoreCells: function ( config, row, tr ) {
        var col,
            i = 0;
        helper = gp.helpers['bodyCellContent'],
        cells = tr.querySelectorAll( 'td.body-cell' );
        for ( ; i < cells.length; i++ ) {
            col = config.columns[i];
            cells[i].innerHTML = helper.call( this.config, col, row );
        }
        gp.removeClass( tr, 'edit-mode' );
        gp.removeClass( tr, 'create-mode' );
    },

    httpErrorHandler: function ( e ) {
        this.invokeDelegates( this.config.node, gp.events.httpError, e );
        alert( 'An error occurred while carrying out your request.' );
        gp.error( e );
    },

    removeBusyHandlers: function () {
        gp.off( this.config.node, gp.events.beforeread, gp.addBusy );
        gp.off( this.config.node, gp.events.onread, gp.removeBusy );
        gp.off( this.config.node, gp.events.beforeupdate, gp.addBusy );
        gp.off( this.config.node, gp.events.onupdate, gp.removeBusy );
        gp.off( this.config.node, gp.events.beforedestroy, gp.addBusy );
        gp.off( this.config.node, gp.events.ondestroy, gp.removeBusy );
        gp.off( this.config.node, gp.events.httpError, gp.removeBusy );
    },

    dispose: function () {
        this.removeRefreshEventHandler( this.config );
        this.removeBusyHandlers();
        this.removeRowSelectHandler();
        this.removeCommandHandlers( this.config.node );
        this.monitor.stop();
        if ( typeof this.config.onread === 'function' ) {
            gp.off( this.config.node, gp.events.onread, this.config.onread );
        }
        if ( typeof this.config.onedit === 'function' ) {
            gp.off( this.config.node, gp.events.onedit, this.config.onedit );
        }
    }

};