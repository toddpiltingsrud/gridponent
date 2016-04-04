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
        this.invokeDelegates( this.config.node.api, gp.events.ready, this.config.node.api );
    },

    ready: function(callback) {
        if ( this.done ) {
            gp.applyFunc( callback, this.config.node.api, this.config.node.api );
        }
        else {
            this.addDelegate( gp.events.ready, callback );
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
        // listen for command button clicks at the grid level
        gp.on( node, 'click', 'button[value]', this.handlers.commandHandler );
    },

    removeCommandHandlers: function(node) {
        gp.off( node, 'click', this.handlers.commandHandler );
    },

    commandHandler: function ( evt ) {
        // this function handles all the button clicks for the entire grid
        var command, lower, elem, dataItem, node = this.config.node, editor;
        command = evt.selectedTarget.attributes['value'].value;
        if ( gp.hasValue( command ) ) lower = command.toLowerCase();
        // the button is inside either a table row or a modal
        elem = gp.closest( evt.selectedTarget, 'tr[data-index],div.modal', node );
        dataItem = elem ? gp.getRowModel( this.config.pageModel.data, elem ) : null;

        switch ( lower ) {
            case 'addrow':
                this.addRow();
                break;
            //case 'create':
            //    this.createRow( dataItem, elem );
            //    break;
            case 'edit':
                this.editRow(dataItem, elem);
                //editor = getEditor();
                //editor.edit( dataItem );
                break;
            //case 'update':
            //    this.updateRow( dataItem, elem );
            //    break;
            //case 'cancel':
            //    this.cancelEdit( dataItem, elem );
            //    break;
            case 'delete':
            case 'destroy':
                this.deleteRow( dataItem, elem );
                break;
            default:
                // check for a custom command
                var cmd = gp.getObjectAtPath( command );
                if ( typeof cmd === 'function' ) {
                    gp.applyFunc( cmd, node.api, [dataItem, elem] );
                }
                break;
        }
    },

    getEditor: function(dataItem) {
        if ( this.config.editmode == 'modal' ) {
            return new gp.ModalEditor( this.config );
        }
        return new gp.TableRowEditor( this.config );
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
            dataItem,
            proceed;

        if ( type === 'string' && config.onrowselect.indexOf( '{{' ) !== -1 ) type = 'urlTemplate';

        // remove previously selected class
        for ( var i = 0; i < trs.length; i++ ) {
            gp.removeClass( trs[i], 'selected' );
        }

        // add selected class
        gp.addClass( tr, 'selected' );
        // get the dataItem for this tr
        dataItem = gp.getRowModel( config.pageModel.data, tr );

        // ensure dataItem selection doesn't interfere with button clicks in the dataItem
        // by making sure the evt target is a body cell
        if ( evt.target != evt.selectedTarget ) return;

        proceed = this.invokeDelegates( this.config.node.api, gp.events.rowselected, {
            dataItem: dataItem,
            elem: tr
        } );

        if ( proceed === false ) return;

        if ( type === 'function' ) {
            gp.applyFunc( config.onrowselect, tr, [dataItem] );
        }
        else {
            // it's a urlTemplate
            window.location = gp.processBodyTemplate( config.onrowselect, dataItem );
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
        proceed = this.invokeDelegates( this.config.node.api, gp.events.beforeread, this.config.node.api );
        if ( proceed === false ) return;
        this.model.read( this.config.pageModel, function ( model ) {
            // standardize capitalization of incoming data
            gp.shallowCopy( model, self.config.pageModel, true );
            self.refresh( self.config );
            self.invokeDelegates( self.config.node.api, gp.events.onread, self.config.node.api );
            gp.applyFunc( callback, self.config.node, self.config.pageModel );
        }, this.handlers.httpErrorHandler );
    },

    addRow: function ( dataItem ) {

        var editor = this.getEditor();
        editor.add();
        return editor;

        //var tbody,
        //    rowIndex,
        //    bodyCellContent,
        //    editCellContent,
        //    builder,
        //    elem,
        //    html,
        //    field;

        //try {

        //    // if there is no create configuration setting, we're done here
        //    if ( !gp.hasValue( this.config.create ) ) return;

        //    if ( !gp.hasValue( dataItem ) ) {
        //        dataItem = {};

        //        // set defaults
        //        this.config.columns.forEach( function ( col ) {
        //            var field = col.field || col.sort;
        //            if ( gp.hasValue( field ) ) {
        //                if ( gp.hasValue( col.Type ) ) {
        //                    dataItem[field] = gp.getDefaultValue( col.Type );
        //                }
        //                else {
        //                    dataItem[field] = '';
        //                }
        //            }
        //        } );

        //        // overwrite defaults with a model if specified
        //        if ( typeof this.config.model == 'object' ) {
        //            gp.shallowCopy( this.config.model, dataItem );
        //        }
        //    }

        //    //this.config.pageModel.data.push( dataItem );

        //    if ( this.config.editmode == 'modal' ) {
        //        elem = this.modalEdit( dataItem, 'create' );
        //    }
        //    else {
        //        // inline
        //        elem = this.inlineEdit( dataItem, 'create' );
        //    }

        //    // gives external code the opportunity to initialize UI elements (e.g. datepickers)
        //    this.invokeDelegates( this.config.node.api, gp.events.editmode, {
        //        dataItem: dataItem,
        //        elem: elem
        //    } );
        //}
        //catch ( ex ) {
        //    gp.error( ex );
        //}

        //return {
        //    dataItem: dataItem,
        //    elem: elem
        //};
    },

    //// elem is either a tabel row or a modal
    //createRow: function (dataItem, elem, callback) {
    //    try {
    //        var monitor,
    //            self = this,
    //            returnedRow;

    //        // if there is no create configuration setting, we're done here
    //        if ( !gp.hasValue( this.config.create ) ) {
    //            gp.applyFunc( callback, self.config.node );
    //            return;
    //        }

    //        this.invokeDelegates( this.config.node.api, gp.events.beforecreate, dataItem );

    //        // call the data layer with just the dataItem
    //        // the data layer should respond with an updateModel
    //        this.model.create( dataItem, function ( updateModel ) {

    //            try {
    //                // standardize capitalization of incoming data
    //                updateModel = gp.shallowCopy( updateModel, null, true );

    //                if ( updateModel.errors && updateModel.errors.length ) {
    //                    if ( typeof self.config.validate === 'function' ) {
    //                        gp.applyFunc( self.config.validate, this, [elem, updateModel] );
    //                    }
    //                    else {
    //                        gp.helpers['validation'].call( this, elem, updateModel.errors );
    //                    }
    //                }
    //                else {
    //                    // copy the returned dataItem back to the internal data array
    //                    returnedRow = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem : ( updateModel.Data && updateModel.Data.length ) ? updateModel.Data[0] : dataItem;
    //                    gp.shallowCopy( returnedRow, dataItem );

    //                    // add the new dataItem to the internal data array
    //                    self.config.pageModel.data.push( dataItem );

    //                    // refresh the UI
    //                    if ( elem instanceof HTMLTableRowElement ) {
    //                        self.restoreCells( self.config, dataItem, elem );
    //                    }
    //                    else {
    //                        // close the modal and refresh the grid
    //                        $( elem ).modal( 'hide' );
    //                    }

    //                    // dispose of the ChangeMonitor
    //                    monitor = elem['gp-change-monitor'];
    //                    if ( monitor ) {
    //                        monitor.stop();
    //                        monitor = null;
    //                    }
    //                }
    //            }
    //            catch ( err ) {
    //                gp.error( err );
    //            }

    //            self.invokeDelegates( self.config.node.api, gp.events.oncreate, { elem: elem, model: updateModel } );
    //            self.invokeDelegates( self.config.node.api, gp.events.onedit, self.config.pageModel );

    //            gp.applyFunc( callback, self.config.node, updateModel );
    //        },
    //        this.handlers.httpErrorHandler );
    //    }
    //    catch ( ex ) {
    //        gp.error( ex );
    //    }
    //},

    editRow: function ( dataItem, elem ) {

        var editor = this.getEditor();
        editor.edit( dataItem, elem );
        return editor;

        //try {

        //    if ( this.config.editmode == 'modal' ) {

        //        elem = this.modalEdit( dataItem, 'edit' );

        //    }
        //    else {
        //        // inline

        //        elem = this.inlineEdit( dataItem, 'edit', elem );
        //    }

        //    //// put the dataItem in edit mode

        //    //// IE9 can't set innerHTML of elem, so iterate through each cell
        //    //// besides, that way we can just skip readonly cells
        //    //var editCellContent = gp.helpers['editCellContent'];
        //    //var col, cells = tr.querySelectorAll( 'td.body-cell' );
        //    //for ( var i = 0; i < cells.length; i++ ) {
        //    //    col = this.config.columns[i];
        //    //    if ( !col.readonly ) {
        //    //        cells[i].innerHTML = editCellContent.call( this.config, col, dataItem, 'edit' );
        //    //    }
        //    //}
        //    //gp.addClass( tr, 'edit-mode' );
        //    //tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', dataItem ).start();

        //    // gives external code the opportunity to initialize UI elements (e.g. datepickers)
        //    this.invokeDelegates( this.config.node.api, gp.events.editmode, {
        //        dataItem: dataItem,
        //        elem: elem
        //    } );
        //}
        //catch (ex) {
        //    gp.error( ex );
        //}
    },

    //updateRow: function (dataItem, elem, callback) {
    //    // save the dataItem and return it to read mode

    //    try {
    //        var monitor,
    //            self = this,
    //            updatedRow;

    //        // if there is no update configuration setting, we're done here
    //        if ( !gp.hasValue( this.config.update ) ) {
    //            gp.applyFunc( callback, self.config.node );
    //            return;
    //        }

    //        this.invokeDelegates( this.config.node.api, gp.events.beforeupdate, {
    //            dataItem: dataItem,
    //            elem: elem
    //        } );

    //        // call the data layer with just the dataItem
    //        // the data layer should respond with an updateModel
    //        this.model.update( dataItem, function ( updateModel ) {

    //            try {
    //                // standardize capitalization of incoming data
    //                updateModel = gp.shallowCopy( updateModel, null, true );

    //                if ( updateModel.errors && updateModel.errors.length ) {
    //                    if ( typeof self.config.validate === 'function' ) {
    //                        gp.applyFunc( self.config.validate, this, [elem, updateModel] );
    //                    }
    //                    else {
    //                        gp.helpers['validation'].call( this, elem, updateModel.errors );
    //                    }
    //                }
    //                else {
    //                    // copy the returned dataItem back to the internal data array
    //                    returnedRow = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem :
    //                        ( updateModel.Data && updateModel.Data.length ) ? updateModel.Data[0] : dataItem;
    //                    gp.shallowCopy( returnedRow, dataItem );

    //                    if ( elem ) {
    //                        // refresh the UI
    //                        self.restoreCells( self.config, dataItem, elem );
    //                        // dispose of the ChangeMonitor
    //                        monitor = elem['gp-change-monitor'];
    //                        if ( monitor ) {
    //                            monitor.stop();
    //                            monitor = null;
    //                        }
    //                    }
    //                }
    //            }
    //            catch (err) {
    //                gp.error( err );
    //            }

    //            self.invokeDelegates( self.config.node.api, gp.events.onupdate, { elem: elem, model: updateModel } );
    //            self.invokeDelegates( self.config.node.api, gp.events.onedit, { elem: elem, model: updateModel } );

    //            gp.applyFunc( callback, self.config.node, updateModel );
    //        },
    //        this.handlers.httpErrorHandler );
    //    }
    //    catch (ex) {
    //        gp.error( ex );
    //    }
    //},

    // we don't require a elem parameter because it may not be in the grid
    deleteRow: function (dataItem, callback, skipConfirm) {
        try {
            if ( !gp.hasValue( this.config.destroy ) ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            var self = this,
                confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' ),
                message,
                tr = gp.getTableRow(this.config.pageModel.data, dataItem, this.config.node);

            if ( !confirmed ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            this.invokeDelegates(this.config.node.api, gp.events.beforedestroy, dataItem );

            this.model.destroy( dataItem, function ( response ) {

                try {
                    // if it didn't error out, we'll assume it succeeded
                    // remove the dataItem from the model
                    var index = self.config.pageModel.data.indexOf( dataItem );
                    if ( index != -1 ) {
                        self.config.pageModel.data.splice( index, 1 );
                        // if the dataItem is currently being displayed, refresh the grid
                        if ( tr ) {
                            self.refresh( self.config );
                        }
                    }
                }
                catch ( err ) {
                    gp.error( err );
                }

                self.invokeDelegates( self.config.node.api, gp.events.ondestroy, dataItem );
                self.invokeDelegates( self.config.node.api, gp.events.onedit, self.config.pageModel );

                gp.applyFunc( callback, self.config.node, response );
            },
            self.handlers.httpErrorHandler );
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    //cancelEdit: function (dataItem, elem) {
    //    try {
    //        var tbl = gp.closest( elem, 'table', this.config.node ),
    //            index;

    //        if ( gp.hasClass( elem, 'create-mode' ) ) {
    //            // remove elem
    //            if ( elem.rowIndex ) {
    //                // it's a table row
    //                tbl.deleteRow( elem.rowIndex );
    //            }

    //            //index = this.config.pageModel.data.indexOf( dataItem );
    //            //this.config.pageModel.data.splice( index, 1 );
    //        }
    //        else {
    //            // replace the ObjectProxy with the original dataItem
    //            this.config.dataItem = dataItem;
    //            this.restoreCells( this.config, dataItem, elem );
    //        }

    //        this.invokeDelegates( this.config.node.api, 'cancelEdit', {
    //            dataItem: dataItem,
    //            elem: elem
    //        } );
    //    }
    //    catch ( ex ) {
    //        gp.error( ex );
    //    }
    //},

    //inlineEdit: function ( dataItem, mode, tr ) {

    //    var elem,
    //        editCellContent = gp.helpers['editCellContent'];

    //    if ( mode == 'edit' ) {

    //        // replace the cell contents of the table row with edit controls

    //        // IE9 can't set innerHTML of tr, so iterate through each cell
    //        // besides, that way we can just skip readonly cells
    //        var col, cells = tr.querySelectorAll( 'td.body-cell' );
    //        for ( var i = 0; i < cells.length; i++ ) {
    //            col = this.config.columns[i];
    //            if ( !col.readonly ) {
    //                cells[i].innerHTML = editCellContent.call( this.config, col, dataItem, 'edit' );
    //            }
    //        }
    //        gp.addClass( tr, 'edit-mode' );
    //        tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', dataItem ).start();

    //        elem = tr;

    //    }
    //    else {

    //        // prepend a new table row

    //        var tbody = this.config.node.querySelector( 'div.table-body > table > tbody' ),
    //            rowIndex = this.config.pageModel.data.indexOf( dataItem ),
    //            bodyCellContent = gp.helpers['bodyCellContent'],
    //            builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-index', rowIndex ).addClass( 'create-mode' ),
    //            cellContent;

    //        // add td.body-cell elements to the tr
    //        this.config.columns.forEach( function ( col ) {
    //            cellContent = col.readonly ?
    //                bodyCellContent.call( this.config, col, dataItem ) :
    //                editCellContent.call( this.config, col, dataItem, 'create' );
    //            builder.startElem( 'td' ).addClass( 'body-cell' ).addClass( col.BodyCell ).html( cellContent ).endElem();
    //        } );

    //        elem = builder.close();

    //        gp.prependChild( tbody, elem );
    //    }

    //    elem['gp-change-monitor'] = new gp.ChangeMonitor( elem, '[name]', dataItem ).start();

    //    return elem;
    //},

    //modalEdit: function ( dataItem, mode ) {

    //    // mode: create or update
    //    var html = gp.helpers.bootstrapModal( this.config, dataItem, mode );

    //    // append the modal to the top node so button clicks will be picked up by commandHandlder
    //    var modal = $( html ).appendTo( this.config.node ).modal( {
    //        show: true,
    //        keyboard: true
    //    } );

    //    var monitor = new gp.ChangeMonitor( modal[0], '[name]', dataItem ).start();

    //    modal.one( 'hidden.bs.modal', function () {
    //        $( modal ).remove();
    //        monitor.stop();
    //        modal = null;
    //    } );

    //    // return the htmlElement instead of the modal object
    //    // so the return type is consistent with inlineEdit
    //    return modal[0];
    //},

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

    //restoreCells: function ( config, dataItem, tr ) {
    //    var col,
    //        i = 0;
    //    helper = gp.helpers['bodyCellContent'],
    //    cells = tr.querySelectorAll( 'td.body-cell' );
    //    for ( ; i < cells.length; i++ ) {
    //        col = config.columns[i];
    //        cells[i].innerHTML = helper.call( this.config, col, dataItem );
    //    }
    //    gp.removeClass( tr, 'edit-mode' );
    //    gp.removeClass( tr, 'create-mode' );
    //},

    httpErrorHandler: function ( e ) {
        this.invokeDelegates( this.config.node.api, gp.events.httpError, e );
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