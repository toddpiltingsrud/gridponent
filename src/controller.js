/***************\
   controller
\***************/
gp.Controller = function (config, model, requestModel) {
    var self = this;
    this.config = config;
    this.model = model;
    this.requestModel = requestModel;
    if (config.Pager) {
        this.requestModel.Top = 25;
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

    dispose: function () {
        gp.raiseCustomEvent( this.config.node, gp.events.beforeDispose );
        this.removeRefreshEventHandler( this.config );
        this.removeBusyHandlers();
        this.removeRowSelectHandler();
        this.removeCommandHandlers( this.config.node );
        this.monitor.stop();
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
            // the OrderBy property requires special handling
            if (name === 'OrderBy') {
                if (model[name] === value) {
                    model.Desc = !model.Desc;
                }
                else {
                    model[name] = value;
                    model.Desc = false;
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

    commandHandler: function(evt) {
        var command, tr, row, node = this.config.node;
        command = evt.selectedTarget.attributes['value'].value;
        tr = gp.closest( evt.selectedTarget, 'tr[data-index]', node );
        row = tr ? gp.getRowModel( this.config.pageModel.Data, tr ) : null;
        switch ( command ) {
            case 'AddRow':
                this.addRow();
                break;
            case 'Create':
                this.createRow( row, tr );
                break;
            case 'Edit':
                this.editRow( row, tr );
                break;
            case 'Update':
                this.updateRow( row, tr );
                break;
            case 'Cancel':
                this.cancelEdit( row, tr );
                break;
            case 'Delete':
                this.deleteRow( row, tr );
                break;
            default:
                // check the api for an extension
                if ( command in node.api ) {
                    gp.applyFunc( node.api[command], node.api, [row, tr] );
                }
                else {
                    var cmd = gp.getObjectAtPath( command );
                    if ( typeof cmd === 'function' ) {
                        gp.applyFunc( cmd, node.api, [row, tr] );
                    }
                }
                break;
        }
    },

    addRowSelectHandler: function ( config ) {
        if ( gp.hasValue( config.Onrowselect ) ) {
            // it's got to be either a function or a URL template
            if ( /function|urlTemplate/.test( typeof config.Onrowselect ) ) {
                // add click handler
                gp.on( config.node, 'click', 'div.table-body > table > tbody > tr > td.body-cell', this.handlers.rowSelectHandler );
            }
        }
    },

    removeRowSelectHandler: function() {
        gp.off( this.config.node, 'click', this.handlers.rowSelectHandler );
    },

    rowSelectHandler: function ( evt ) {
        var config = this.config,
            tr = gp.closest( evt.selectedTarget, 'tr', config.node ),
            trs = config.node.querySelectorAll( 'div.table-body > table > tbody > tr.selected' ),
            type = typeof config.Onrowselect;

        if ( type === 'string' && config.Onrowselect.indexOf( '{{' ) !== -1 ) type = 'urlTemplate';

        // remove previously selected class
        for ( var i = 0; i < trs.length; i++ ) {
            gp.removeClass( trs[i], 'selected' );
        }

        // add selected class
        gp.addClass( tr, 'selected' );
        // get the model for this row
        model = gp.getRowModel( config.pageModel.Data, tr );

        // ensure row selection doesn't interfere with button clicks in the row
        // by making sure the evt target is a body cell
        if ( evt.target == evt.selectedTarget ) {
            if ( type === 'function' ) {
                gp.applyFunc( config.Onrowselect, tr, [model] );
            }
            else {
                // it's a urlTemplate
                window.location = gp.processBodyTemplate( config.Onrowselect, model );
            }
        }
    },

    addRefreshEventHandler: function ( config ) {
        if ( config.RefreshEvent ) {
            gp.on( document, config.RefreshEvent, this.handlers.readHandler );
        }
    },

    removeRefreshEventHandler: function ( config ) {
        if ( config.RefreshEvent ) {
            gp.off( document, config.RefreshEvent, this.handlers.readHandler );
        }
    },

    search: function(searchTerm, callback) {
        this.config.pageModel.Search = searchTerm;
        var searchBox = this.config.node.querySelector( 'div.table-toolbar input[name=Search' );
        searchBox.value = searchTerm;
        this.read(null, callback);
    },

    sort: function(field, desc, callback) {
        this.config.pageModel.OrderBy = field;
        this.config.pageModel.Desc = ( desc == true );
        this.read(null, callback);
    },

    read: function ( requestModel, callback ) {
        var self = this;
        if ( requestModel ) {
            gp.shallowCopy( requestModel, this.config.pageModel );
        }
        gp.raiseCustomEvent( this.config.node, gp.events.beforeRead, { model: this.config.pageModel } );
        gp.info( 'read.pageModel:', this.config.pageModel );
        this.model.read( this.config.pageModel, function ( model ) {
            gp.shallowCopy( model, self.config.pageModel );
            self.refresh( self.config );
            gp.raiseCustomEvent( this.config.node, gp.events.afterRead, { model: this.config.pageModel } );
            gp.applyFunc( callback, self.config.node, self.config.pageModel );
        }, this.handlers.httpErrorHandler );
    },

    addRow: function ( callback ) {
        try {
            var self = this,
                updateModel,
                tbody,
                rowIndex,
                bodyCellContent,
                editCellContent,
                builder,
                props,
                jsType,
                row = {};

            if ( !gp.hasValue( this.config.Create ) ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            // create a row using the config object
            if ( !gp.isNullOrEmpty( this.config.pageModel.Types ) ) {
                Object.getOwnPropertyNames(this.config.pageModel.Types).forEach( function ( field ) {
                    jsType = gp.convertClrType( self.config.pageModel.Types[field] );
                    row[field] = gp.getDefaultValue( jsType );
                } );
            }
            else if ( this.config.pageModel.Data.length > 0 ) {
                Object.getOwnPropertyNames( this.config.pageModel.Data[0] ).forEach( function ( field ) {
                    jsType = gp.getType( self.config.pageModel.Data[0][field] );
                    row[field] = gp.getDefaultValue( jsType );
                } );
            }
            else {
                this.config.Columns.foreach( function ( col ) {
                    if ( gp.hasValue( gp.Field ) ) {
                        row[Field] = '';
                    }
                } );
            }

            gp.raiseCustomEvent( this.config.node, gp.events.beforeAdd, row );

            // add the new row to the internal data array
            this.config.pageModel.Data.push( row );

            // wrap the new row in an UpdateModel
            updateModel = new gp.UpdateModel( row );

            tbody = this.config.node.querySelector( 'div.table-body > table > tbody' );
            rowIndex = this.config.pageModel.Data.indexOf( row );
            bodyCellContent = gp.helpers['bodyCellContent'];
            editCellContent = gp.helpers['editCellContent'];

            // use a NodeBuilder to create a tr[data-index=rowIndex].create-mode
            builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-index', rowIndex ).addClass( 'create-mode' );

            // add td.body-cell elements to the tr
            this.config.Columns.forEach( function ( col ) {
                var html = col.Readonly
                    ? bodyCellContent.call( this.config, col, row )
                    : editCellContent.call( this.config, col, row, 'create' );
                builder.startElem( 'td' ).addClass( 'body-cell' ).html( html ).endElem();
            } );

            var tr = builder.close();

            gp.prependChild( tbody, tr );

            tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', row ).start();

            tr['gp-update-model'] = updateModel;

            gp.raiseCustomEvent( this.config.node, gp.events.afterCreate, {
                model: updateModel,
                tableRow: tr
            } );

            gp.applyFunc( callback, this.config.node, row );
        }
        catch ( ex ) {
            gp.error( ex );

            gp.applyFunc( callback, this.config.node );
        }
    },

    createRow: function (row, tr, callback) {
        try {
            var monitor,
                self = this,
                updateModel = tr['gp-update-model'];

            // if there is no Update configuration setting or model, we're done here
            if ( !gp.hasValue( this.config.Create ) || !updateModel ) {
                gp.applyFunc( callback, self.config.node );
                return;
            }

            gp.raiseCustomEvent( this.config.node, gp.events.beforeCreate, row );

            // call the data layer
            this.model.create( updateModel.Row, function ( returnedUpdateModel ) {

                try {
                    if ( returnedUpdateModel.ValidationErrors && returnedUpdateModel.ValidationErrors.length ) {
                        if ( typeof self.config.Validate === 'function' ) {
                            gp.applyFunc( self.config.Validate, this, [tr, returnedUpdateModel] );
                        }
                        else {
                            gp.helpers['validation'].call( this, tr, returnedUpdateModel.ValidationErrors );
                        }
                    }
                    else {
                        // copy the returned row back to the internal data array
                        gp.shallowCopy( returnedUpdateModel.Row, row );
                        // refresh the UI
                        self.restoreCells( self.config, row, tr );
                        // dispose of the ChangeMonitor
                        monitor = tr['gp-change-monitor'];
                        if ( monitor ) {
                            monitor.stop();
                            monitor = null;
                        }
                        // dispose of the updateModel
                        delete tr['gp-update-model'];
                    }
                }
                catch ( err ) {
                    gp.error( err );
                }

                gp.raiseCustomEvent( tr, gp.events.afterCreate, updateModel );

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

            var updateModel = tr['gp-update-model'] = new gp.UpdateModel( row );

            gp.raiseCustomEvent( tr, gp.events.beforeEditMode, {
                model: updateModel,
                tableRow: tr
            } );

            // IE9 can't set innerHTML of tr, so iterate through each cell
            // besides, that way we can just skip readonly cells
            var editCellContent = gp.helpers['editCellContent'];
            var col, cells = tr.querySelectorAll( 'td.body-cell' );
            for ( var i = 0; i < cells.length; i++ ) {
                col = this.config.Columns[i];
                if ( !col.Readonly ) {
                    cells[i].innerHTML = editCellContent.call( this.config, col, row, 'edit' );
                }
            }
            gp.addClass( tr, 'edit-mode' );
            tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', updateModel.Row ).start();
            gp.raiseCustomEvent( tr, gp.events.afterEditMode, {
                model: updateModel,
                tableRow: tr
            } );

            return this.config.updateModel;
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
                updateModel = tr['gp-update-model'];

            // if there is no Update configuration setting or model, we're done here
            if ( !gp.hasValue( this.config.Update ) || !updateModel) {
                gp.applyFunc( callback, self.config.node );
                return;
            }

            gp.raiseCustomEvent(tr, 'beforeUpdate', updateModel );

            // call the data layer
            this.model.update( updateModel.Row, function ( returnedUpdateModel ) {

                try {
                    if ( returnedUpdateModel.ValidationErrors && returnedUpdateModel.ValidationErrors.length ) {
                        if ( typeof self.config.Validate === 'function' ) {
                            gp.applyFunc( self.config.Validate, this, [tr, returnedUpdateModel] );
                        }
                        else {
                            gp.helpers['validation'].call( this, tr, returnedUpdateModel.ValidationErrors );
                        }
                    }
                    else {
                        // copy the returned row back to the internal data array
                        gp.shallowCopy( returnedUpdateModel.Row, row );
                        // refresh the UI
                        self.restoreCells( self.config, row, tr );
                        // dispose of the ChangeMonitor
                        monitor = tr['gp-change-monitor'];
                        if ( monitor ) {
                            monitor.stop();
                            monitor = null;
                        }
                        // dispose of the updateModel
                        delete tr['gp-update-model'];
                    }
                }
                catch (err) {
                    gp.error( err );
                }

                gp.raiseCustomEvent( tr, gp.events.afterUpdate, updateModel );

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
            if ( !gp.hasValue( this.config.Delete ) ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            var self = this,
                confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' ),
                message,
                tr = gp.getTableRow(this.config.pageModel.Data, row, this.config.node);

            if ( !confirmed ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            gp.raiseCustomEvent(this.config.node, gp.events.beforeDelete, row );

            this.model.delete( row, function ( response ) {

                try {
                    if ( response.Success == true || response == true ) {
                        // remove the row from the model
                        var index = self.config.pageModel.Data.indexOf( row );
                        if ( index != -1 ) {
                            self.config.pageModel.Data.splice( index, 1 );
                            // if the row is currently being displayed, refresh the grid
                            if ( tr ) {
                                self.refresh( self.config );
                            }
                        }
                    }
                    else {
                        message = response.Message || 'The row could not be deleted.';
                        alert( message );
                    }
                }
                catch ( err ) {
                    gp.error( err );
                }

                gp.raiseCustomEvent( self.config.node, gp.events.afterDelete, row );

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
            if (gp.hasClass(tr, 'create-mode')) {
                // remove row and tr
                tr.remove();
                var index = this.config.pageModel.Data.indexOf(row);
                this.config.pageModel.Data.splice(index, 1);
            }
            else {
                // replace the ObjectProxy with the original row
                this.config.Row = row;
                this.restoreCells(this.config, row, tr);
            }

            gp.raiseCustomEvent(tr, 'cancelEdit', {
                model: row
            });
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    refresh: function ( config ) {
        // inject table rows, footer, pager and header style.
        var node = config.node;

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
        sortStyle.innerHTML = gp.helpers.sortStyle.call( config );
    },

    restoreCells: function ( config, row, tr ) {
        var col,
            i = 0;
        helper = gp.helpers['bodyCellContent'],
        cells = tr.querySelectorAll( 'td.body-cell' );
        for ( ; i < cells.length; i++ ) {
            col = config.Columns[i];
            cells[i].innerHTML = helper.call( this.config, col, row );
        }
        gp.removeClass( tr, 'edit-mode' );
        gp.removeClass( tr, 'create-mode' );
    },

    httpErrorHandler: function ( e ) {
        gp.raiseCustomEvent( this.config.node, gp.events.httpError, e );
        alert( 'An error occurred while carrying out your request.' );
        gp.error( e );
    },

    removeBusyHandlers: function () {
        gp.off( this.config.node, gp.events.beforeRead, gp.addBusy );
        gp.off( this.config.node, gp.events.afterRead, gp.removeBusy );
        gp.off( this.config.node, gp.events.beforeUpdate, gp.addBusy );
        gp.off( this.config.node, gp.events.afterUpdate, gp.removeBusy );
        gp.off( this.config.node, gp.events.beforeDelete, gp.addBusy );
        gp.off( this.config.node, gp.events.afterDelete, gp.removeBusy );
        gp.off( this.config.node, gp.events.httpError, gp.removeBusy );
    }
};