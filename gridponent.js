// code coverage
var cov = cov || {};
cov.covered = [];
cov.cover = function(index) {
	cov.covered[index] = true;
	if (cov.callout) {
	    cov.callout(index);
	}
};

// namespace
var gridponent = gridponent || {};

(function(gp) { 

    /***************\
          API
    \***************/
    
    gp.events = {
        beforeInit: 'beforeInit',
        afterInit: 'afterInit',
        beforeRead: 'beforeRead',
        beforeAdd: 'beforeAdd',
        beforeCreate: 'beforeCreate',
        beforeUpdate: 'beforeUpdate',
        beforeDelete: 'beforeDelete',
        beforeEditMode: 'beforeEditMode',
        afterRead: 'afterRead',
        afterAdd: 'afterAdd',
        afterCreate: 'afterCreate',
        afterUpdate: 'afterUpdate',
        afterDelete: 'afterDelete',
        afterEditMode: 'afterEditMode',
        beforeDispose: 'beforeDispose',
        httpError: 'httpError',
        rowSelected: 'rowSelected'
    };
    
    gp.api = function ( controller ) {
cov.cover(1);
        this.controller = controller;
    };
    
    gp.api.prototype = {
    
        ready: function(callback) {
cov.cover(2);
            this.controller.ready( callback );
        },
    
        refresh: function ( callback ) {
cov.cover(3);
            this.controller.read( null, callback );
        },
    
        getData: function ( index ) {
cov.cover(4);
            if ( typeof index == 'number' ) return this.controller.config.pageModel.Data[index];
            return this.controller.config.pageModel.Data;
        },
    
        search: function ( searchTerm, callback ) {
cov.cover(5);
            // make sure we pass in a string
            searchTerm = gp.isNullOrEmpty( searchTerm ) ? '' : searchTerm.toString();
            this.controller.search( searchTerm, callback );
        },
    
        sort: function ( name, desc, callback ) {
cov.cover(6);
            // validate the args
            name = gp.isNullOrEmpty( name ) ? '' : name.toString();
            typeof desc == 'boolean' ? desc : desc === 'false' ? false : !!desc;
            this.controller.sort( name, desc, callback );
        },
    
        read: function ( requestModel, callback ) {
cov.cover(7);
            this.controller.read( requestModel, callback );
        },
    
        create: function ( row, callback ) {
cov.cover(8);
            var model = this.controller.addRow( row );
            if ( model != null ) this.controller.createRow( row, model.tableRow, callback );
            else callback( null );
        },
    
        // This would have to be called after having retrieved the row from the table with getData().
        // The controller will attempt to figure out which tr it is by first calling indexOf(row) on the data.
        // So the original row object reference has to be preserved.
        // this function is mainly for testing
        update: function ( row, callback ) {
cov.cover(9);
            var tr = gp.getTableRow( this.controller.config.pageModel.Data, row, this.controller.config.node );
    
            this.controller.updateRow( row, tr, callback );
        },
    
        'delete': function ( row, callback ) {
cov.cover(10);
            this.controller.deleteRow( row, callback, true );
        },
    
        cancel: function ( arg ) { },
    
        dispose: function () {
cov.cover(11);
            this.controller.dispose();
        }
    
    };

    /***************\
     change monitor
    \***************/
    gp.ChangeMonitor = function (node, selector, model, afterSync) {
cov.cover(12);
        var self = this;
        this.model = model;
        this.beforeSync = null;
        this.node = node;
        this.selector = selector;
        this.listener = function (evt) {
cov.cover(13);
            self.syncModel.call(self, evt.target, self.model);
        };
        this.afterSync = afterSync;
    };
    
    gp.ChangeMonitor.prototype = {
        start: function () {
cov.cover(14);
            var self = this;
            // add change event handler to node
            gp.on( this.node, 'change', this.selector, this.listener );
            gp.on( this.node, 'keydown', this.selector, this.handleEnterKey );
            return this;
        },
        handleEnterKey: function ( evt ) {
cov.cover(15);
            // trigger change event
            if ( evt.keyCode == 13 ) {
cov.cover(16);
                evt.target.blur();
            }
        },
        stop: function () {
cov.cover(17);
            // clean up
            gp.off( this.node, 'change', this.listener );
            gp.off( this.node, 'keydown', this.handleEnterKey );
            return this;
        },
        syncModel: function (target, model) {
cov.cover(18);
            // get name and value of target
            var name = target.name,
                val = target.value,
                handled = false,
                type;
    
            try {
                if ( name in model ) {
cov.cover(19);
                    if ( typeof ( this.beforeSync ) === 'function' ) {
cov.cover(20);
                        handled = this.beforeSync( name, val, this.model );
                    }
                    if ( !handled ) {
cov.cover(21);
                        type = gp.getType( model[name] );
                        switch ( type ) {
                            case 'number':
                                model[name] = parseFloat( val );
                                break;
                            case 'boolean':
                                if ( target.type == 'checkbox' ) {
cov.cover(22);
                                    if ( val.toLowerCase() == 'true' ) val = target.checked;
                                    else if ( val.toLowerCase() == 'false' ) val = !target.checked;
                                    else val = target.checked ? val : null;
                                    model[name] = val;
                                }
                                else {
cov.cover(23);
                                    model[name] = ( val.toLowerCase() == 'true' );
                                }
                                break;
                            default:
                                model[name] = val;
                        }
                    }
                }
    
                // always fire this because the toolbar may contain inputs from a template
                // which are not represented in the page model (e.g. a custom filter)
                if ( typeof this.afterSync === 'function' ) {
cov.cover(24);
                    this.afterSync( target, model );
                }
    
            } catch ( e ) {
                gp.error( e );
            }
        }
    };

    /***************\
       controller
    \***************/
    gp.Controller = function (config, model, requestModel) {
cov.cover(25);
        var self = this;
        this.config = config;
        this.model = model;
        this.requestModel = requestModel;
        if (config.Pager) {
cov.cover(26);
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
cov.cover(27);
            var self = this;
            this.monitorToolbars( this.config.node );
            this.addCommandHandlers( this.config.node );
            this.addRowSelectHandler( this.config );
            this.addRefreshEventHandler( this.config );
            this.done = true;
            this.callbacks.forEach( function ( callback ) {
cov.cover(28);
                gp.tryFunc( callback, self.config );
            } );
        },
    
        ready: function(callback) {
cov.cover(29);
            if ( this.done ) {
cov.cover(30);
                gp.tryFunc( callback, this.config );
            }
            else {
cov.cover(31);
                this.callbacks.push( callback );
            }
        },
    
        dispose: function () {
cov.cover(32);
            gp.raiseCustomEvent( this.config.node, gp.events.beforeDispose );
            this.removeRefreshEventHandler( this.config );
            this.removeBusyHandlers();
            this.removeRowSelectHandler();
            this.removeCommandHandlers( this.config.node );
            this.monitor.stop();
        },
    
        monitorToolbars: function (node) {
cov.cover(33);
            var self = this;
            // monitor changes to search, sort, and paging
            this.monitor = new gp.ChangeMonitor( node, '.table-toolbar [name], thead input, .table-pager input', this.config.pageModel, function ( evt ) {
cov.cover(34);
                self.read();
                // reset the radio inputs
                var radios = node.querySelectorAll( 'thead input[type=radio], .table-pager input[type=radio]' );
                for (var i = 0; i < radios.length; i++) {
                    radios[i].checked = false;
                }
            } );
            this.monitor.beforeSync = function ( name, value, model ) {
cov.cover(35);
                // the OrderBy property requires special handling
                if (name === 'OrderBy') {
cov.cover(36);
                    if (model[name] === value) {
cov.cover(37);
                        model.Desc = !model.Desc;
                    }
                    else {
cov.cover(38);
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
cov.cover(39);
            // listen for command button clicks
            gp.on( node, 'click', 'button[value]', this.handlers.commandHandler );
        },
    
        removeCommandHandlers: function(node) {
cov.cover(40);
            gp.off( node, 'click', this.handlers.commandHandler );
        },
    
        commandHandler: function(evt) {
cov.cover(41);
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
                    // check for a custom command
                    var cmd = gp.getObjectAtPath( command );
                    if ( typeof cmd === 'function' ) {
cov.cover(42);
                        gp.applyFunc( cmd, node.api, [row, tr] );
                    }
                    break;
            }
        },
    
        addRowSelectHandler: function ( config ) {
cov.cover(43);
            // it's got to be either a function or a URL template
            if ( typeof config.Onrowselect == 'function' || gp.rexp.braces.test( config.Onrowselect ) ) {
cov.cover(44);
                // add click handler
                gp.on( config.node, 'click', 'div.table-body > table > tbody > tr > td.body-cell', this.handlers.rowSelectHandler );
            }
        },
    
        removeRowSelectHandler: function() {
cov.cover(45);
            gp.off( this.config.node, 'click', this.handlers.rowSelectHandler );
        },
    
        rowSelectHandler: function ( evt ) {
cov.cover(46);
            var config = this.config,
                tr = gp.closest( evt.selectedTarget, 'tr', config.node ),
                trs = config.node.querySelectorAll( 'div.table-body > table > tbody > tr.selected' ),
                type = typeof config.Onrowselect,
                row;
    
            if ( type === 'string' && config.Onrowselect.indexOf( '{{' ) !== -1 ) type = 'urlTemplate';
    
            // remove previously selected class
            for ( var i = 0; i < trs.length; i++ ) {
                gp.removeClass( trs[i], 'selected' );
            }
    
            // add selected class
            gp.addClass( tr, 'selected' );
            // get the row for this tr
            row = gp.getRowModel( config.pageModel.Data, tr );
    
            // ensure row selection doesn't interfere with button clicks in the row
            // by making sure the evt target is a body cell
            if ( evt.target != evt.selectedTarget ) return;
    
            var customEvt = gp.raiseCustomEvent( tr, gp.events.rowSelected, {
                row: row,
                tableRow: tr
            } );
    
            if ( customEvt.cancel ) return;
    
            if ( type === 'function' ) {
cov.cover(47);
                gp.applyFunc( config.Onrowselect, tr, [row] );
            }
            else {
cov.cover(48);
                // it's a urlTemplate
                window.location = gp.processBodyTemplate( config.Onrowselect, row );
            }
        },
    
        addRefreshEventHandler: function ( config ) {
cov.cover(49);
            if ( config.RefreshEvent ) {
cov.cover(50);
                gp.on( document, config.RefreshEvent, this.handlers.readHandler );
            }
        },
    
        removeRefreshEventHandler: function ( config ) {
cov.cover(51);
            if ( config.RefreshEvent ) {
cov.cover(52);
                gp.off( document, config.RefreshEvent, this.handlers.readHandler );
            }
        },
    
        search: function(searchTerm, callback) {
cov.cover(53);
            this.config.pageModel.Search = searchTerm;
            var searchBox = this.config.node.querySelector( 'div.table-toolbar input[name=Search' );
            searchBox.value = searchTerm;
            this.read(null, callback);
        },
    
        sort: function(field, desc, callback) {
cov.cover(54);
            this.config.pageModel.OrderBy = field;
            this.config.pageModel.Desc = ( desc == true );
            this.read(null, callback);
        },
    
        read: function ( requestModel, callback ) {
cov.cover(55);
            var self = this;
            if ( requestModel ) {
cov.cover(56);
                gp.shallowCopy( requestModel, this.config.pageModel );
            }
            gp.raiseCustomEvent( this.config.node, gp.events.beforeRead, this.config.pageModel );
            this.model.read( this.config.pageModel, function ( model ) {
cov.cover(57);
                gp.shallowCopy( model, self.config.pageModel );
                self.refresh( self.config );
                gp.raiseCustomEvent( this.config.node, gp.events.afterRead, this.config.pageModel );
                gp.applyFunc( callback, self.config.node, self.config.pageModel );
            }, this.handlers.httpErrorHandler );
        },
    
        addRow: function ( row ) {
cov.cover(58);
            var self = this,
                table,
                tbody,
                rowIndex,
                bodyCellContent,
                editCellContent,
                builder,
                props,
                jsType,
                tr,
                html;
    
            try {
    
                if ( !gp.hasValue( this.config.Create ) ) {
cov.cover(59);
                    return;
                }
    
                if ( row == undefined ) {
cov.cover(60);
                    row = {};
    
                    // create a row using the config object
                    if ( !gp.isNullOrEmpty( this.config.pageModel.Types ) ) {
cov.cover(61);
                        Object.getOwnPropertyNames( this.config.pageModel.Types ).forEach( function ( field ) {
cov.cover(62);
                            jsType = gp.convertClrType( self.config.pageModel.Types[field] );
                            row[field] = gp.getDefaultValue( jsType );
                        } );
                    }
                    else if ( this.config.pageModel.Data.length > 0 ) {
cov.cover(63);
                        Object.getOwnPropertyNames( this.config.pageModel.Data[0] ).forEach( function ( field ) {
cov.cover(64);
                            jsType = gp.getType( self.config.pageModel.Data[0][field] );
                            row[field] = gp.getDefaultValue( jsType );
                        } );
                    }
                    else {
cov.cover(65);
                        this.config.Columns.foreach( function ( col ) {
cov.cover(66);
                            if ( gp.hasValue( gp.Field ) ) {
cov.cover(67);
                                row[Field] = '';
                            }
                        } );
                    }
                }
    
                gp.raiseCustomEvent( this.config.node, gp.events.beforeAdd, row );
    
                // add the new row to the internal data array
                this.config.pageModel.Data.push( row );
    
                tbody = this.config.node.querySelector( 'div.table-body > table > tbody' );
                rowIndex = this.config.pageModel.Data.indexOf( row );
                bodyCellContent = gp.helpers['bodyCellContent'];
                editCellContent = gp.helpers['editCellContent'];
    
                // use a NodeBuilder to create a tr[data-index=rowIndex].create-mode
                builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-index', rowIndex ).addClass( 'create-mode' );
    
                // add td.body-cell elements to the tr
                this.config.Columns.forEach( function ( col ) {
cov.cover(68);
                    html = col.Readonly ?
                        bodyCellContent.call( this.config, col, row ) :
                        editCellContent.call( this.config, col, row, 'create' );
                    builder.startElem( 'td' ).addClass( 'body-cell' ).addClass( col.BodyCell ).html( html ).endElem();
                } );
    
                tr = builder.close();
    
                gp.prependChild( tbody, tr );
    
                tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', row ).start();
    
                gp.raiseCustomEvent( this.config.node, gp.events.afterAdd, {
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
cov.cover(69);
            try {
                var monitor,
                    self = this;
    
                // if there is no Create configuration setting, we're done here
                if ( !gp.hasValue( this.config.Create ) ) {
cov.cover(70);
                    gp.applyFunc( callback, self.config.node );
                    return;
                }
    
                gp.raiseCustomEvent( this.config.node, gp.events.beforeCreate, row );
    
                // call the data layer with just the row
                // the data layer should respond with an updateModel
                this.model.create( row, function ( updateModel ) {
cov.cover(71);
    
                    try {
                        if ( updateModel.ValidationErrors && updateModel.ValidationErrors.length ) {
cov.cover(72);
                            if ( typeof self.config.Validate === 'function' ) {
cov.cover(73);
                                gp.applyFunc( self.config.Validate, this, [tr, updateModel] );
                            }
                            else {
cov.cover(74);
                                gp.helpers['validation'].call( this, tr, updateModel.ValidationErrors );
                            }
                        }
                        else {
cov.cover(75);
                            // copy the returned row back to the internal data array
                            gp.shallowCopy( updateModel.Row, row );
                            // refresh the UI
                            self.restoreCells( self.config, row, tr );
                            // dispose of the ChangeMonitor
                            monitor = tr['gp-change-monitor'];
                            if ( monitor ) {
cov.cover(76);
                                monitor.stop();
                                monitor = null;
                            }
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
cov.cover(77);
            try {
                // put the row in edit mode
    
                gp.raiseCustomEvent( tr, gp.events.beforeEditMode, {
                    row: row,
                    tableRow: tr
                } );
    
                // IE9 can't set innerHTML of tr, so iterate through each cell
                // besides, that way we can just skip readonly cells
                var editCellContent = gp.helpers['editCellContent'];
                var col, cells = tr.querySelectorAll( 'td.body-cell' );
                for ( var i = 0; i < cells.length; i++ ) {
                    col = this.config.Columns[i];
                    if ( !col.Readonly ) {
cov.cover(78);
                        cells[i].innerHTML = editCellContent.call( this.config, col, row, 'edit' );
                    }
                }
                gp.addClass( tr, 'edit-mode' );
                tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', row ).start();
                gp.raiseCustomEvent( tr, gp.events.afterEditMode, {
                    row: row,
                    tableRow: tr
                } );
            }
            catch (ex) {
                gp.error( ex );
            }
        },
    
        updateRow: function (row, tr, callback) {
cov.cover(79);
            // save the row and return it to read mode
    
            try {
                var monitor,
                    self = this;
    
                // if there is no Update configuration setting, we're done here
                if ( !gp.hasValue( this.config.Update ) ) {
cov.cover(80);
                    gp.applyFunc( callback, self.config.node );
                    return;
                }
    
                gp.raiseCustomEvent(tr, gp.events.beforeUpdate, row );
    
                // call the data layer with just the row
                // the data layer should respond with an updateModel
                this.model.update( row, function ( updateModel ) {
cov.cover(81);
    
                    try {
                        if ( updateModel.ValidationErrors && updateModel.ValidationErrors.length ) {
cov.cover(82);
                            if ( typeof self.config.Validate === 'function' ) {
cov.cover(83);
                                gp.applyFunc( self.config.Validate, this, [tr, updateModel] );
                            }
                            else {
cov.cover(84);
                                gp.helpers['validation'].call( this, tr, updateModel.ValidationErrors );
                            }
                        }
                        else {
cov.cover(85);
                            // copy the returned row back to the internal data array
                            gp.shallowCopy( updateModel.Row, row );
                            // refresh the UI
                            self.restoreCells( self.config, row, tr );
                            // dispose of the ChangeMonitor
                            monitor = tr['gp-change-monitor'];
                            if ( monitor ) {
cov.cover(86);
                                monitor.stop();
                                monitor = null;
                            }
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
cov.cover(87);
            try {
                if ( !gp.hasValue( this.config.Delete ) ) {
cov.cover(88);
                    gp.applyFunc( callback, this.config.node );
                    return;
                }
    
                var self = this,
                    confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' ),
                    message,
                    tr = gp.getTableRow(this.config.pageModel.Data, row, this.config.node);
    
                if ( !confirmed ) {
cov.cover(89);
                    gp.applyFunc( callback, this.config.node );
                    return;
                }
    
                gp.raiseCustomEvent(this.config.node, gp.events.beforeDelete, row );
    
                this.model.delete( row, function ( response ) {
cov.cover(90);
    
                    try {
                        // if it didn't error out, we'll assume it succeeded
                        // remove the row from the model
                        var index = self.config.pageModel.Data.indexOf( row );
                        if ( index != -1 ) {
cov.cover(91);
                            self.config.pageModel.Data.splice( index, 1 );
                            // if the row is currently being displayed, refresh the grid
                            if ( tr ) {
cov.cover(92);
                                self.refresh( self.config );
                            }
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
cov.cover(93);
            try {
                var tbl = gp.closest( tr, 'table', this.config.node ), index;
    
                if ( gp.hasClass( tr, 'create-mode' ) ) {
cov.cover(94);
                    // remove row and tr
                    tbl.deleteRow( tr.rowIndex );
                    index = this.config.pageModel.Data.indexOf( row );
                    this.config.pageModel.Data.splice( index, 1 );
                }
                else {
cov.cover(95);
                    // replace the ObjectProxy with the original row
                    this.config.Row = row;
                    this.restoreCells( this.config, row, tr );
                }
    
                gp.raiseCustomEvent( tr, 'cancelEdit', {
                    row: row,
                    tableRow: tr
                } );
            }
            catch ( ex ) {
                gp.error( ex );
            }
        },
    
        refresh: function ( config ) {
cov.cover(96);
            // inject table rows, footer, pager and header style.
            var node = config.node;
    
            var body = node.querySelector( 'div.table-body' );
            var footer = node.querySelector( 'div.table-footer' );
            var pager = node.querySelector( 'div.table-pager' );
            var sortStyle = node.querySelector( 'style.sort-style' );
    
            body.innerHTML = gp.templates['gridponent-body']( config );
            if ( footer ) {
cov.cover(97);
                footer.innerHTML = gp.templates['gridponent-table-footer']( config );
            }
            if ( pager ) {
cov.cover(98);
                pager.innerHTML = gp.templates['gridponent-pager']( config );
            }
            sortStyle.innerHTML = gp.helpers.sortStyle.call( config );
        },
    
        restoreCells: function ( config, row, tr ) {
cov.cover(99);
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
cov.cover(100);
            gp.raiseCustomEvent( this.config.node, gp.events.httpError, e );
            alert( 'An error occurred while carrying out your request.' );
            gp.error( e );
        },
    
        removeBusyHandlers: function () {
cov.cover(101);
            gp.off( this.config.node, gp.events.beforeRead, gp.addBusy );
            gp.off( this.config.node, gp.events.afterRead, gp.removeBusy );
            gp.off( this.config.node, gp.events.beforeUpdate, gp.addBusy );
            gp.off( this.config.node, gp.events.afterUpdate, gp.removeBusy );
            gp.off( this.config.node, gp.events.beforeDelete, gp.addBusy );
            gp.off( this.config.node, gp.events.afterDelete, gp.removeBusy );
            gp.off( this.config.node, gp.events.httpError, gp.removeBusy );
        }
    };

    /***************\
      CustomEvent
    \***************/
    (function () {
cov.cover(102);
    
        function CustomEvent(event, params) {
cov.cover(103);
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }
    
        CustomEvent.prototype = window.Event.prototype;
    
        window.CustomEvent = CustomEvent;
    
    })();

    /***************\
       formatter
    \***************/
    
    // This is a wrapper for the Intl global object.
    // It allows the use of common format strings for dates and numbers.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
    (function () {
cov.cover(104);
    
        // IE inserts unicode left-to-right-mark characters into the formatted string, 
        // causing the length property to return invalid results, even though the strings look the same.
        // This is unacceptable because it makes equality operations fail.
        var ltr = /\u200E/g;
    
        // constructing Intl.DateTimeFormat objects is resource intensive, so cache them by format, locale, and currencyCode
        var dateTimeFormatCache = {};
        var numberFormatCache = {};
    
        gp.defaultLocale = 'en-US';
    
        gp.defaultCurrencyCode = 'USD';
    
        gp.Formatter = function (locale, currencyCode) {
cov.cover(105);
            this.locale = locale || gp.defaultLocale;
            this.currencyCode = currencyCode || gp.defaultCurrencyCode;
            this.supported = (window.Intl !== undefined);
        };
    
        gp.Formatter.prototype = {
            format: function (val, format) {
cov.cover(106);
                var key, dtf, nf, type, options, dt;
                if (!this.supported || !gp.hasValue(val)) return val;
    
                type = gp.getType(val);
                key = (format || '') + '|' + this.locale + '|' + this.currencyCode;
    
                if (type === 'date') {
cov.cover(107);
                    if (key in dateTimeFormatCache) {
cov.cover(108);
                        dtf = dateTimeFormatCache[key];
                    }
                    else {
cov.cover(109);
                        options = getDateTimeFormatOptions(format);
    
                        dtf = new Intl.DateTimeFormat(this.locale, options)
    
                        dateTimeFormatCache[key] = dtf;
                    }
                    return dtf.format(val).replace(ltr, '');
                }
                if (type === 'dateString') {
cov.cover(110);
                    var parts = val.match( /\d+/g );
                    if ( parts.length >= 6 ) {
cov.cover(111);
                        dt = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
                    }
                    else {
cov.cover(112);
                        dt = new Date( parts[0], parts[1] - 1, parts[2] );
                    }
    
                    if (key in dateTimeFormatCache) {
cov.cover(113);
                        dtf = dateTimeFormatCache[key];
                    }
                    else {
cov.cover(114);
                        options = getDateTimeFormatOptions(format);
    
                        dtf = new Intl.DateTimeFormat(this.locale, options)
    
                        dateTimeFormatCache[key] = dtf;
                    }
                    return dtf.format(dt).replace(ltr, '');
                }
                if (type === 'number') {
cov.cover(115);
                    if (key in numberFormatCache) {
cov.cover(116);
                        nf = numberFormatCache[key];
                    }
                    else {
cov.cover(117);
                        options = getNumberFormatOptions(format, this.currencyCode);
                        nf = new Intl.NumberFormat(this.locale, options);
                        numberFormatCache[key] = nf;
                    }
                    return nf.format(val).replace(ltr, '');
                }
    
                return val;
            }
        };
    
        var dateTimeTokens = [
            [/yyyy/g, 'year', 'numeric'],
            [/yy/g, 'year', '2-digit'],
            [/MMMM/g, 'month', 'long'],
            [/MMM/g, 'month', 'short'],
            [/MM/g, 'month', '2-digit'],
            [/M/g, 'month', 'numeric'],
            [/dd/g, 'day', '2-digit'],
            [/d/g, 'day', 'numeric'],
            [/HH/g, 'hour', '2-digit', 'hour24'],
            [/H/g, 'hour', 'numeric', 'hour24'],
            [/hh/g, 'hour', '2-digit', 'hour12'],
            [/h/g, 'hour', 'numeric', 'hour12'],
            [/mm/g, 'minute', '2-digit'],
            [/m/g, 'minute', 'numeric'],
            [/ss/g, 'second', '2-digit'],
            [/s/g, 'second', 'numeric'],
            [/www/g, 'weekday', 'long'],
            [/ww/g, 'weekday', 'short'],
            [/w/g, 'weekday', 'narrow'],
            [/eee/g, 'era', 'long'],
            [/ee/g, 'era', 'short'],
            [/e/g, 'era', 'narrow'],
            [/tt/g, 'timeZoneName', 'long'],
            [/t/g, 'timeZoneName', 'short']
        ];
    
        function getDateTimeFormatOptions(format) {
cov.cover(118);
            var options = {};
    
            if (gp.hasValue(format)) {
cov.cover(119);
    
                dateTimeTokens.forEach(function (token) {
cov.cover(120);
                    if (!(token[1] in options) && format.match(token[0])) {
cov.cover(121);
                        options[token[1]] = token[2];
                        if ( token.length === 4 ) {
cov.cover(122);
                            // set hour12 to true|false
                            options.hour12 = (token[3] === 'hour12');
                        }
                    }
                });
    
            }
    
            return options;
        }
    
        var numberTokens = [
            [/N/, 'style', 'decimal'],
            [/P/, 'style', 'percent'],
            [/C/, 'style', 'currency']
        ];
    
        function getNumberFormatOptions(format, currencyCode) {
cov.cover(123);
            var options = {};
    
            if (gp.hasValue(format)) {
cov.cover(124);
    
                numberTokens.forEach(function (token) {
cov.cover(125);
                    if (!(token[1] in options) && format.match(token[0])) {
cov.cover(126);
                        options[token[1]] = token[2];
                        if (token[2] === 'currency') {
cov.cover(127);
                            options.currency = currencyCode;
                        }
                    }
                });
                var digits = format.match(/\d+/);
                if (digits) {
cov.cover(128);
                    options.minimumFractionDigits = options.maximumFractionDigits = parseInt(digits);
                }
            }
    
            return options;
        }
    
    })();

    /***************\
         globals
    \***************/
    ( function ( gp ) {
cov.cover(129);
    
        gp.rexp = {
            splitPath: /[^\[\]\.\s]+|\[\d+\]/g,
            indexer: /\[\d+\]/,
            iso8601: /^[012][0-9]{3}-[01][0-9]-[0123][0-9]/,
            quoted: /^['"].+['"]$/,
            trueFalse: /true|false/i,
            braces: /{{.+?}}/g,
            json: /^\{.*\}$|^\[.*\]$/
        };
    
        // logging
        gp.logging = 'info';
        gp.log = ( window.console ? window.console.log.bind( window.console ) : function () { } );
        gp.error = function ( e ) {
cov.cover(130);
            if ( console && console.error ) {
cov.cover(131);
                console.error( e );
            }
        };
        gp.verbose = /verbose/.test( gp.logging ) ? gp.log : function () { };
        gp.info = /verbose|info/.test( gp.logging ) ? gp.log : function () { };
        gp.warn = /verbose|info|warn/.test( gp.logging ) ? gp.log : function () { };
    
        gp.getAttributes = function ( node ) {
cov.cover(132);
            var config = {}, name, attr, attrs = node.attributes;
            config.node = node;
            for ( var i = attrs.length - 1; i >= 0; i-- ) {
                attr = attrs[i];
                name = gp.camelize( attr.name );
                // convert "true", "false" and empty to boolean
                config[name] = gp.rexp.trueFalse.test( attr.value ) || attr.value === '' ?
                    ( attr.value === "true" || attr.value === '' ) : attr.value;
            }
            return config;
        };
    
        var chars = [/&/g, /</g, />/g, /"/g, /'/g, /`/g];
    
        var escaped = ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&#96;'];
    
        gp.escapeHTML = function ( obj ) {
cov.cover(133);
            if ( typeof obj !== 'string' ) {
cov.cover(134);
                return obj;
            }
            for ( var i = 0; i < chars.length; i++ ) {
                obj = obj.replace( chars[i], escaped[i] );
            }
            return obj;
        };
    
        gp.camelize = function ( str ) {
cov.cover(135);
            return str.replace( /(?:^|[-_])(\w)/g, function ( _, c ) {
cov.cover(136);
                return c ? c.toUpperCase() : '';
            } );
        };
    
        gp.shallowCopy = function ( from, to ) {
cov.cover(137);
            to = to || {};
            var props = Object.getOwnPropertyNames( from );
            props.forEach( function ( prop ) {
cov.cover(138);
                to[prop] = from[prop];
            } );
            return to;
        };
    
        gp.extend = function ( to, from ) {
cov.cover(139);
            return gp.shallowCopy( from, to );
        };
    
        gp.getLocalISOString = function ( date ) {
cov.cover(140);
            if ( typeof date === 'string' ) return date;
            var offset = date.getTimezoneOffset();
            var adjustedDate = new Date( date.valueOf() - ( offset * 60000 ) );
            return adjustedDate.toISOString();
        };
    
        gp.getType = function ( a ) {
cov.cover(141);
            if ( a === null || a === undefined ) {
cov.cover(142);
                return a;
            }
            if ( a instanceof Date ) {
cov.cover(143);
                return 'date';
            }
            if ( typeof ( a ) === 'string' && gp.rexp.iso8601.test( a ) ) {
cov.cover(144);
                return 'dateString';
            }
            if ( Array.isArray( a ) ) {
cov.cover(145);
                return 'array';
            }
            // 'number','string','boolean','function','object'
            return typeof ( a );
        };
    
        gp.convertClrType = function ( clrType ) {
cov.cover(146);
            switch ( clrType ) {
                case 'Decimal':
                case 'Double':
                case 'Int16':
                case 'Int32':
                case 'Int64':
                case 'Single':
                case 'Byte':
                case 'UInt16':
                case 'UInt32':
                case 'UInt64':
                    return 'number';
                case 'DateTime':
                    return 'date';
                case 'Boolean':
                    return 'boolean';
                default:
                    return 'string';
            }
        };
    
        gp.getDefaultValue = function ( type ) {
cov.cover(147);
            switch ( type ) {
                case 'number':
                    return 0;
                case 'boolean':
                    return false;
                case 'date':
                default:
                    return null;
            }
        };
    
        var proxyListener = function ( elem, event, targetSelector, listener ) {
cov.cover(148);
    
            this.handler = function ( evt ) {
cov.cover(149);
    
                var e = evt.target;
    
                // get all the elements that match targetSelector
                var potentials = elem.querySelectorAll( targetSelector );
    
                // find the first element that matches targetSelector
                // usually this will be the first one
                while ( e ) {
                    for ( var j = 0; j < potentials.length; j++ ) {
                        if ( e == potentials[j] ) {
cov.cover(150);
                            // don't modify the listener's context to preserve the ability to use bind()
                            // set selectedTarget to the matching element instead
                            evt.selectedTarget = e;
                            listener( evt );
                            return;
                        }
                    }
                    e = e.parentElement;
                }
            };
    
            this.remove = function () {
cov.cover(151);
                elem.removeEventListener( event, this.handler );
            };
    
            // handle event
            elem.addEventListener( event, this.handler, false );
        };
    
        // this allows us to attach an event handler to the document
        // and handle events that match a selector
        gp.on = function ( elem, event, targetSelector, listener ) {
cov.cover(152);
            // if elem is a selector, convert it to an element
            if ( typeof ( elem ) === 'string' ) {
cov.cover(153);
                elem = document.querySelector( elem );
            }
    
            if ( !gp.hasValue( elem ) ) {
cov.cover(154);
                return;
            }
    
            if ( typeof targetSelector === 'function' ) {
cov.cover(155);
                elem.addEventListener( event, targetSelector, false );
                return;
            }
    
            var proxy = new proxyListener( elem, event, targetSelector, listener );
    
            // use an array to store privateListener 
            // so we can remove the handler with gp.off
            var propName = 'gp-listeners-' + event;
            var listeners = elem[propName] || ( elem[propName] = [] );
            listeners.push( {
                pub: listener,
                priv: proxy
            } );
    
            return elem;
        };
    
        gp.off = function ( elem, event, listener ) {
cov.cover(156);
            // check for a matching listener store on the element
            var listeners = elem['gp-listeners-' + event];
            if ( listeners ) {
cov.cover(157);
                for ( var i = 0; i < listeners.length; i++ ) {
                    if ( listeners[i].pub === listener ) {
cov.cover(158);
    
                        // remove the event handler
                        listeners[i].priv.remove();
    
                        // remove it from the listener store
                        listeners.splice( i, 1 );
                        return;
                    }
                }
            }
            else {
cov.cover(159);
                elem.removeEventListener( event, listener );
            }
        };
    
        gp.closest = function ( elem, selector, parentNode ) {
cov.cover(160);
            var e, potentials, j;
            parentNode = parentNode || document;
            // if elem is a selector, convert it to an element
            if ( typeof ( elem ) === 'string' ) {
cov.cover(161);
                elem = document.querySelector( elem );
            }
    
            if ( elem ) {
cov.cover(162);
                // start with elem's immediate parent
                e = elem.parentElement;
    
                potentials = parentNode.querySelectorAll( selector );
    
                while ( e ) {
                    for ( j = 0; j < potentials.length; j++ ) {
                        if ( e == potentials[j] ) {
cov.cover(163);
                            return e;
                        }
                    }
                    e = e.parentElement;
                }
            }
        };
    
        gp.in = function ( elem, selector, parent ) {
cov.cover(164);
            parent = parent || document;
            // if elem is a selector, convert it to an element
            if ( typeof ( elem ) === 'string' ) {
cov.cover(165);
                elem = parent.querySelector( elem );
            }
            // if selector is a string, convert it to a node list
            if ( typeof ( selector ) === 'string' ) {
cov.cover(166);
                selector = parent.querySelectorAll( selector );
            }
            for ( var i = 0; i < selector.length; i++ ) {
                if ( selector[i] === elem ) return true;
            }
            return false;
        };
    
        gp.hasValue = function ( val ) {
cov.cover(167);
            return val !== undefined && val !== null;
        };
    
        gp.isNullOrEmpty = function ( val ) {
cov.cover(168);
            // if a string or array is passed, they'll be tested for both null and zero length
            // if any other data type is passed (no length property), it'll only be tested for null
            return gp.hasValue( val ) === false || ( val.length != undefined && val.length === 0 );
        };
    
        gp.coalesce = function ( array ) {
cov.cover(169);
            if ( gp.isNullOrEmpty( array ) ) return array;
    
            for ( var i = 0; i < array.length; i++ ) {
                if ( gp.hasValue( array[i] ) ) {
cov.cover(170);
                    return array[i];
                }
            }
    
            return array[array.length - 1];
        };
    
        gp.getObjectAtPath = function ( path, root ) {
cov.cover(171);
            if ( !path ) return;
    
            path = Array.isArray( path ) ? path : path.match( gp.rexp.splitPath );
    
            if ( path[0] === 'window' ) path = path.splice( 1 );
    
            // o is our placeholder
            var o = root || window,
                segment;
    
            for ( var i = 0; i < path.length; i++ ) {
                // is this segment an array index?
                segment = path[i];
                if ( gp.rexp.indexer.test( segment ) ) {
cov.cover(172);
                    // convert to int
                    segment = parseInt( /\d+/.exec( segment ) );
                }
                else if ( gp.rexp.quoted.test( segment ) ) {
cov.cover(173);
                    segment = segment.slice( 1, -1 );
                }
    
                o = o[segment];
    
                if ( o === undefined ) return;
            }
    
            return o;
        };
    
        var FP = Function.prototype;
    
        var callbind = FP.bind
           ? FP.bind.bind( FP.call )
           : ( function ( call ) {
cov.cover(174);
               return function ( func ) {
cov.cover(175);
                   return function () {
cov.cover(176);
                       return call.apply( func, arguments );
                   };
               };
           }( FP.call ) );
    
        var uids = {};
        var slice = callbind( ''.slice );
        var zero = 0;
        var numberToString = callbind( zero.toString );
    
        gp.createUID = function () {
cov.cover(177);
            // id's can't begin with a number
            var key = 'gp' + slice( numberToString( Math.random(), 36 ), 2 );
            return key in uids ? createUID() : uids[key] = key;
        };
    
        gp.hasPositiveWidth = function ( nodes ) {
cov.cover(178);
            if ( gp.isNullOrEmpty( nodes ) ) return false;
            for ( var i = 0; i < nodes.length; i++ ) {
                if ( nodes[i].offsetWidth > 0 ) return true;
            }
            return false;
        };
    
        gp.resolveTemplate = function ( template ) {
cov.cover(179);
            // can be a selector, an inline template, or a function
            var t = gp.getObjectAtPath( template );
            if ( typeof ( t ) === 'function' ) {
cov.cover(180);
                return t;
            }
            else if ( gp.rexp.braces.test( template ) ) {
cov.cover(181);
                return template;
            }
            else {
cov.cover(182);
                t = document.querySelector( template );
                if ( t ) {
cov.cover(183);
                    return t.innerHTML;
                }
            }
            return null;
        };
    
        gp.formatter = new gp.Formatter();
    
        gp.getFormattedValue = function ( row, col, escapeHTML ) {
cov.cover(184);
            var type = ( col.Type || '' ).toLowerCase();
            var val = row[col.Field];
    
            if ( /^(date|datestring)$/.test( type ) ) {
cov.cover(185);
                // apply default formatting to dates
                //return gp.formatDate(val, col.Format || 'M/d/yyyy');
                return gp.formatter.format( val, col.Format );
            }
            if ( type === 'number' && col.Format ) {
cov.cover(186);
                return gp.formatter.format( val, col.Format );
            }
            if ( type === 'string' && escapeHTML ) {
cov.cover(187);
                return gp.escapeHTML( val );
            }
            return val;
        };
    
        gp.supplant = function ( str, o, args ) {
cov.cover(188);
            var self = this, types = /^(string|number|boolean)$/;
            return str.replace( /{{([^{}]*)}}/g,
                function ( a, b ) {
cov.cover(189);
                    var r = o[b];
                    if ( types.test( typeof r ) ) return r;
                    // it's not in o, so check for a function
                    r = gp.getObjectAtPath( b );
                    return typeof r === 'function' ? gp.applyFunc(r, self, args) : '';
                }
            );
        };
    
        gp.processBodyTemplate = function ( template, row, col ) {
cov.cover(190);
            return gp.supplant( template, row, [row, col] );
        };
    
        gp.processHeaderTemplate = function ( template, col ) {
cov.cover(191);
            return gp.supplant(template, col, [col] )
        };
    
        gp.processFooterTemplate = function ( template, col, data ) {
cov.cover(192);
            return gp.supplant( template, col, [col, data] )
        };
    
        gp.trim = function ( str ) {
cov.cover(193);
            if ( gp.isNullOrEmpty( str ) ) return str;
            return str.trim ? str.trim() : str.replace( /^\s+|\s+$/g, '' );
        };
    
        gp.hasClass = function ( el, cn ) {
cov.cover(194);
            return ( ' ' + el.className + ' ' ).indexOf( ' ' + cn + ' ' ) !== -1;
        };
    
        gp.addClass = function ( el, cn ) {
cov.cover(195);
            if ( el instanceof NodeList ) {
cov.cover(196);
                for (var i = 0; i < el.length; i++) {
                    if ( !gp.hasClass( el[i], cn ) ) {
cov.cover(197);
                        el[i].className = ( el[i].className === '' ) ? cn : el[i].className + ' ' + cn;
                    }
                }
            }
            else if ( !gp.hasClass( el, cn ) ) {
cov.cover(198);
                el.className = ( el.className === '' ) ? cn : el.className + ' ' + cn;
            }
        };
    
        gp.removeClass = function ( el, cn ) {
cov.cover(199);
            if ( el instanceof NodeList ) {
cov.cover(200);
                for ( var i = 0; i < el.length; i++ ) {
                    el[i].className = gp.trim(( ' ' + el[i].className + ' ' ).replace( ' ' + cn + ' ', ' ' ) );
                }
            }
            else {
cov.cover(201);
                el.className = gp.trim(( ' ' + el.className + ' ' ).replace( ' ' + cn + ' ', ' ' ) );
            }
        };
    
        gp.prependChild = function ( node, child ) {
cov.cover(202);
            if ( typeof node === 'string' ) node = document.querySelector( node );
            if ( !node.firstChild ) {
cov.cover(203);
                node.appendChild( child );
            }
            else {
cov.cover(204);
                node.insertBefore( child, node.firstChild );
            }
            return child;
        };
    
        gp.getRowModel = function ( data, tr ) {
cov.cover(205);
            var index = parseInt( tr.attributes['data-index'].value );
            return data[index];
        };
    
        gp.getTableRow = function ( data, row, node ) {
cov.cover(206);
            var index = data.indexOf( row );
            if ( index == -1 ) return;
            return node.querySelector( 'tr[data-index="' + index + '"]' );
        };
    
        gp.raiseCustomEvent = function ( node, name, detail ) {
cov.cover(207);
            var event = new CustomEvent( name, { bubbles: true, detail: detail, cancelable: true } );
            node.dispatchEvent( event );
            return event;
        };
    
        gp.addBusy = function( evt ) {
cov.cover(208);
            var tblContainer = evt.target.querySelector( 'div.table-container' )
                || gp.closest( evt.target, 'div.table-container' );
    
            if ( tblContainer ) {
cov.cover(209);
                gp.addClass( tblContainer, 'busy' );
            }
        };
    
        gp.removeBusy = function ( evt ) {
cov.cover(210);
            var tblContainer = evt.target.querySelector( 'div.table-container' );
            tblContainer = tblContainer || document.querySelector( 'div.table-container.busy' )
                || gp.closest( evt.target, 'div.table-container' );
    
            if ( tblContainer ) {
cov.cover(211);
                gp.removeClass( tblContainer, 'busy' );
            }
            else {
cov.cover(212);
            }
        };
    
        gp.applyFunc = function ( callback, context, args, error ) {
cov.cover(213);
            if ( typeof callback !== 'function' ) return;
            // anytime there's the possibility of executing 
            // user-supplied code, wrap it with a try-catch block
            // so it doesn't affect my component
            // keep your sloppy JavaScript OUT of my area
            try {
                if ( args == undefined ) {
cov.cover(214);
                    return callback.call( context );
                }
                else {
cov.cover(215);
                    args = Array.isArray( args ) ? args : [args];
                    return callback.apply( context, args );
                }
            }
            catch ( e ) {
                error = error || gp.error;
                gp.applyFunc( error, context, e );
            }
        };
    
        gp.tryFunc = function(callback, arg) {
cov.cover(216);
            try {
                callback( arg );
            }
            catch ( e ) {
                gp.error( e );
            }
        };
    
    } )( gridponent );

    /***************\
      table helpers
    \***************/
    
    gp.helpers = {
    
        toolbarTemplate: function () {
cov.cover(217);
            var html = new gp.StringBuilder();
            if ( typeof ( this.ToolbarTemplate ) === 'function' ) {
cov.cover(218);
                html.add( gp.applyFunc( this.ToolbarTemplate, this ) );
            }
            else {
cov.cover(219);
                html.add( this.ToolbarTemplate );
            }
            return html.toString();
        },
    
        thead: function () {
cov.cover(220);
            var self = this;
            var html = new gp.StringBuilder();
            var sort, template, classes;
            html.add( '<thead>' );
            html.add( '<tr>' );
            this.Columns.forEach( function ( col ) {
cov.cover(221);
                sort = '';
                if ( self.Sorting ) {
cov.cover(222);
                    // if sort isn't specified, use the field
                    sort = gp.escapeHTML( gp.coalesce( [col.Sort, col.Field] ) );
                }
                else {
cov.cover(223);
                    // only provide sorting where it is explicitly specified
                    if ( gp.hasValue( col.Sort ) ) {
cov.cover(224);
                        sort = gp.escapeHTML( col.Sort );
                    }
                }
    
                html.add( '<th class="header-cell ' + ( col.HeaderClass || '' ) + '" data-sort="' + sort + '">' );
    
                // check for a template
                if ( col.HeaderTemplate ) {
cov.cover(225);
                    if ( typeof ( col.HeaderTemplate ) === 'function' ) {
cov.cover(226);
                        html.add( gp.applyFunc( col.HeaderTemplate, self, [col] ) );
                    }
                    else {
cov.cover(227);
                        html.add( gp.processHeaderTemplate.call( this, col.HeaderTemplate, col ) );
                    }
                }
                else if ( sort != '' ) {
cov.cover(228);
                    html.add( '<label class="table-sort">' )
                    .add( '<input type="radio" name="OrderBy" value="' + sort + '" />' )
                    .add( gp.coalesce( [col.Header, col.Field, sort] ) )
                    .add( '</label>' );
                }
                else {
cov.cover(229);
                    html.add( gp.coalesce( [col.Header, col.Field, '&nbsp;'] ) );
                }
                html.add( '</th>' );
            } );
            html.add( '</tr>' )
                .add( '</thead>' );
            return html.toString();
        },
    
        tableRows: function () {
cov.cover(230);
            var self = this;
            var html = new gp.StringBuilder();
            this.pageModel.Data.forEach( function ( row, index ) {
cov.cover(231);
                self.Row = row;
                html.add( '<tr data-index="' )
                .add( index )
                .add( '">' )
                .add( gp.templates['gridponent-cells']( self ) )
                .add( '</tr>' );
            } );
            return html.toString();
        },
    
        bodyCellContent: function ( col, row ) {
cov.cover(232);
            var self = this,
                template,
                format,
                hasDeleteBtn = false,
                row = row || this.Row,
                val = gp.getFormattedValue( row, col, true ),
                type = ( col.Type || '' ).toLowerCase(),
                html = new gp.StringBuilder();
    
            // check for a template
            if ( col.BodyTemplate ) {
cov.cover(233);
                if ( typeof ( col.BodyTemplate ) === 'function' ) {
cov.cover(234);
                    html.add( gp.applyFunc( col.BodyTemplate, this, [row, col] ) );
                }
                else {
cov.cover(235);
                    html.add( gp.processBodyTemplate.call( this, col.BodyTemplate, row, col ) );
                }
            }
            else if ( col.Commands && col.Commands.length ) {
cov.cover(236);
                html.add( '<div class="btn-group" role="group">' );
                col.Commands.forEach( function ( cmd, index ) {
cov.cover(237);
                    if ( cmd == 'Edit' && gp.hasValue( self.Update ) ) {
cov.cover(238);
                        html.add( '<button type="button" class="btn btn-default btn-xs" value="' )
                            .add( cmd )
                            .add( '">' )
                            .add( '<span class="glyphicon glyphicon-edit"></span>' )
                            .add( cmd )
                            .add( '</button>' );
                    }
                    else if ( cmd == 'Delete' && gp.hasValue( self.Delete ) ) {
cov.cover(239);
                        html.add( '<button type="button" class="btn btn-danger btn-xs" value="Delete">' )
                            .add( '<span class="glyphicon glyphicon-remove"></span>Delete' )
                            .add( '</button>' );
                    }
                    else {
cov.cover(240);
                        html.add( '<button type="button" class="btn btn-default btn-xs" value="' )
                            .add( cmd )
                            .add( '">' )
                            .add( '<span class="glyphicon glyphicon-cog"></span>' )
                            .add( cmd )
                            .add( '</button>' );
                    }
                } );
    
                html.add( '</div>' );
            }
            else if ( gp.hasValue( val ) ) {
cov.cover(241);
                // show a checkmark for bools
                if ( type === 'boolean' ) {
cov.cover(242);
                    if ( val === true ) {
cov.cover(243);
                        html.add( '<span class="glyphicon glyphicon-ok"></span>' );
                    }
                }
                else {
cov.cover(244);
                    html.add( val );
                }
            }
            return html.toString();
        },
    
        editCellContent: function ( col, row, mode ) {
cov.cover(245);
            var template, html = new gp.StringBuilder();
    
            // check for a template
            if ( col.EditTemplate ) {
cov.cover(246);
                if ( typeof ( col.EditTemplate ) === 'function' ) {
cov.cover(247);
                    html.add( gp.applyFunc( col.EditTemplate, this, [row, col] ) );
                }
                else {
cov.cover(248);
                    html.add( gp.processBodyTemplate.call( this, col.EditTemplate, row, col ) );
                }
            }
            else if ( col.Commands ) {
cov.cover(249);
                html.add( '<div class="btn-group" role="group">' )
                    .add( '<button type="button" class="btn btn-primary btn-xs" value="' )
                    .add( mode == 'create' ? 'Create' : 'Update' )
                    .add( '">' )
                    .add( '<span class="glyphicon glyphicon-save"></span>Save' )
                    .add( '</button>' )
                    .add( '<button type="button" class="btn btn-default btn-xs" value="Cancel">' )
                    .add( '<span class="glyphicon glyphicon-remove"></span>Cancel' )
                    .add( '</button>' )
                    .add( '</div>' );
            }
            else {
cov.cover(250);
                var val = row[col.Field];
                // render empty cell if this field doesn't exist in the data
                if ( val === undefined ) return '';
                // render null as empty string
                if ( val === null ) val = '';
                html.add( '<input class="form-control" name="' + col.Field + '" type="' );
                switch ( col.Type ) {
                    case 'date':
                    case 'dateString':
                        // use the required format for the date input element
                        val = gp.getLocalISOString( val ).substring( 0, 10 );
                        html.add( 'date" value="' + gp.escapeHTML( val ) + '" />' );
                        break;
                    case 'number':
                        html.add( 'number" value="' + gp.escapeHTML( val ) + '" />' );
                        break;
                    case 'boolean':
                        html.add( 'checkbox" value="true"' );
                        if ( val ) {
cov.cover(251);
                            html.add( ' checked="checked"' );
                        }
                        html.add( ' />' );
                        break;
                    default:
                        html.add( 'text" value="' + gp.escapeHTML( val ) + '" />' );
                        break;
                }
            }
            return html.toString();
        },
    
        validation: function ( tr, validationErrors ) {
cov.cover(252);
            var builder = new gp.StringBuilder(), input, msg;
            builder.add( 'Please correct the following errors:\r\n' );
            // remove error class from inputs
            gp.removeClass( tr.querySelectorAll( '[name].error' ), 'error' );
            validationErrors.forEach( function ( v ) {
cov.cover(253);
                input = tr.querySelector( '[name="' + v.Key + '"]' );
                if ( input ) {
cov.cover(254);
                    gp.addClass( input, 'error' );
                }
                builder.add( v.Key + ':\r\n' );
                // extract the error message
                msg = v.Value.Errors.map( function ( e ) { return '    - ' + e.ErrorMessage + '\r\n'; } ).join( '' );
                builder.add( msg );
            } );
            alert( builder.toString() );
        },
    
        footerCell: function ( col ) {
cov.cover(255);
            var html = new gp.StringBuilder();
            if ( col.FooterTemplate ) {
cov.cover(256);
                if ( typeof ( col.FooterTemplate ) === 'function' ) {
cov.cover(257);
                    html.add( gp.applyFunc( col.FooterTemplate, this, [col, this.pageModel.Data] ) );
                }
                else {
cov.cover(258);
                    html.add( gp.processFooterTemplate.call( this, col.FooterTemplate, col, this.pageModel.Data ) );
                }
            }
            return html.toString();
        },
    
        setPagerFlags: function () {
cov.cover(259);
            this.pageModel.IsFirstPage = this.pageModel.Page === 1;
            this.pageModel.IsLastPage = this.pageModel.Page === this.pageModel.PageCount;
            this.pageModel.HasPages = this.pageModel.PageCount > 1;
            this.pageModel.PreviousPage = this.pageModel.Page === 1 ? 1 : this.pageModel.Page - 1;
            this.pageModel.NextPage = this.pageModel.Page === this.pageModel.PageCount ? this.pageModel.PageCount : this.pageModel.Page + 1;
        },
    
        sortStyle: function () {
cov.cover(260);
            var html = new gp.StringBuilder();
            if ( gp.isNullOrEmpty( this.pageModel.OrderBy ) === false ) {
cov.cover(261);
                html.add( '#' + this.ID + ' thead th.header-cell[data-sort="' + gp.escapeHTML(this.pageModel.OrderBy) + '"] > label:after' )
                    .add( '{ content: ' );
                if ( this.pageModel.Desc ) {
cov.cover(262);
                    html.add( '"\\e114"; }' );
                }
                else {
cov.cover(263);
                    html.add( '"\\e113"; }' );
                }
            }
            return html.toString();
        },
    
        columnWidthStyle: function () {
cov.cover(264);
            var self = this,
                html = new gp.StringBuilder(),
                index = 0,
                bodyCols = document.querySelectorAll( '#' + this.ID + ' .table-body > table > tbody > tr:first-child > td' );
    
            // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
            this.Columns.forEach( function ( col ) {
cov.cover(265);
                if ( col.Width ) {
cov.cover(266);
                    // fixed width should include the body
                    html.add( '#' + self.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                        .add( '#' + self.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' )
                        .add( ',' )
                        .add( '#' + self.ID + ' > .table-body > table > thead th:nth-child(' + ( index + 1 ) + '),' )
                        .add( '#' + self.ID + ' > .table-body > table > tbody td:nth-child(' + ( index + 1 ) + ')' )
                        .add( '{ width:' )
                        .add( col.Width );
                    if ( isNaN( col.Width ) == false ) html.add( 'px' );
                    html.add( ';}' );
                }
                else if ( bodyCols.length && ( self.FixedHeaders || self.FixedFooters ) ) {
cov.cover(267);
                    // sync header and footer to body
                    width = bodyCols[index].offsetWidth;
                    html.add( '#' +self.ID + ' .table-header th.header-cell:nth-child(' +( index +1 ) + '),' )
                        .add( '#' +self.ID + ' .table-footer td.footer-cell:nth-child(' +( index +1 ) + ')' )
                        .add( '{ width:' )
                        .add( bodyCols[index].offsetWidth )
                        .add( 'px;}' );
                }
                index++;
            } );
    
    
            return html.toString();
        },
    
        containerClasses: function () {
cov.cover(268);
            var html = new gp.StringBuilder();
            if ( this.FixedHeaders ) {
cov.cover(269);
                html.add( ' fixed-headers' );
            }
            if ( this.FixedFooters ) {
cov.cover(270);
                html.add( ' fixed-footers' );
            }
            if ( this.Pager ) {
cov.cover(271);
                html.add( ' pager-' + this.Pager );
            }
            if ( this.Responsive ) {
cov.cover(272);
                html.add( ' responsive' );
            }
            if ( this.Search ) {
cov.cover(273);
                html.add( ' search-' + this.Search );
            }
            if ( this.Onrowselect ) {
cov.cover(274);
                html.add( ' selectable' );
            }
            return html.toString();
        }
    
    };
    

    /***************\
       Initializer
    \***************/
    gp.Initializer = function ( node ) {
cov.cover(275);
        this.node = node;
    };
    
    gp.Initializer.prototype = {
    
        initialize: function (callback) {
cov.cover(276);
            var self = this;
            this.config = this.getConfig(this.node);
            this.node.config = this.config;
            var model = new gp.Model( this.config );
            var requestModel = new gp.PagingModel();
            var controller = new gp.Controller( self.config, model, requestModel );
            this.node.api = new gp.api( controller );
            this.renderLayout( this.config );
            this.addBusyHandlers();
    
            // events should be raised AFTER the node is added to the DOM or they won't bubble
            // this problem occurs when nodes are created and then added to the DOM programmatically 
            // that means initialize has to return before it raises any events
            setTimeout( function () {
cov.cover(277);
                // provides a hook for extensions
                gp.raiseCustomEvent( self.config.node, gp.events.beforeInit, self.config );
    
                gp.raiseCustomEvent( self.config.node, gp.events.beforeRead, self.config.pageModel );
    
                model.read( requestModel,
                    function ( data ) {
cov.cover(278);
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
                        gp.raiseCustomEvent( self.config.node, gp.events.afterRead, self.config.pageModel );
                        gp.raiseCustomEvent( self.config.node, gp.events.afterInit, self.config );
                    },
                    function (e) {
cov.cover(279);
                        gp.raiseCustomEvent( self.config.node, gp.events.httpError, e );
                        alert( 'An error occurred while carrying out your request.' );
                        gp.error( e );
                    }
    
                );
            } );
    
            return this.config;
        },
    
        addBusyHandlers: function () {
cov.cover(280);
            gp.on( this.config.node, gp.events.beforeRead, gp.addBusy );
            gp.on( this.config.node, gp.events.afterRead, gp.removeBusy );
            gp.on( this.config.node, gp.events.beforeUpdate, gp.addBusy );
            gp.on( this.config.node, gp.events.afterUpdate, gp.removeBusy );
            gp.on( this.config.node, gp.events.beforeDelete, gp.addBusy );
            gp.on( this.config.node, gp.events.afterDelete, gp.removeBusy );
            gp.on( this.config.node, gp.events.httpError, gp.removeBusy );
        },
    
        getConfig: function (node) {
cov.cover(281);
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
cov.cover(282);
    
                if ( gp.hasValue(config[option]) ) {
cov.cover(283);
                    // see if this config option points to an object
                    // otherwise it must be a URL
                    obj = gp.getObjectAtPath( config[option] );
    
                    if ( gp.hasValue( obj ) ) config[option] = obj;
                }
    
            } );
    
            if ( gp.hasValue( config.ToolbarTemplate ) ) {
cov.cover(284);
                config.ToolbarTemplate = gp.resolveTemplate( config.ToolbarTemplate );
            }
    
            return config;
        },
    
        renderLayout: function ( config ) {
cov.cover(285);
            var self = this;
            try {
                config.node.innerHTML = gp.templates['gridponent']( config );
            }
            catch ( ex ) {
                gp.error( ex );
            }
        },
    
        render: function ( config ) {
cov.cover(286);
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
cov.cover(287);
                    footer.innerHTML = gp.templates['gridponent-table-footer']( config );
                }
                if ( pager ) {
cov.cover(288);
                    pager.innerHTML = gp.templates['gridponent-pager']( config );
                }
                sortStyle = gp.helpers.sortStyle.call( config );
    
                // sync column widths
                if ( config.FixedHeaders || config.FixedFooters ) {
cov.cover(289);
                    var nodes = node.querySelectorAll( '.table-body > table > tbody > tr:first-child > td' );
    
                    if ( gp.hasPositiveWidth( nodes ) ) {
cov.cover(290);
                        // call syncColumnWidths twice because the first call causes things to shift around a bit
                        self.syncColumnWidths( config )
                        self.syncColumnWidths( config )
                    }
    
                    window.addEventListener( 'resize', function () {
cov.cover(291);
                        self.syncColumnWidths( config );
                    } );
                }
            }
            catch ( ex ) {
                gp.error( ex );
            }
        },
    
        syncColumnWidths: function (config) {
cov.cover(292);
            var html = gp.helpers.columnWidthStyle.call( config );
            config.node.querySelector( 'style.column-width-style' ).innerHTML = html;
        },
    
        resolveFooter: function (config) {
cov.cover(293);
            for (var i = 0; i < config.Columns.length; i++) {
                if (config.Columns[i].FooterTemplate) return true;
            }
            return false;
        },
    
        resolveTemplates: function (column) {
cov.cover(294);
            var props = 'HeaderTemplate BodyTemplate EditTemplate FooterTemplate'.split(' ');
            props.forEach(function (prop) {
cov.cover(295);
                column[prop] = gp.resolveTemplate(column[prop]);
            });
        },
    
        resolveCommands: function (col) {
cov.cover(296);
            if (col.Commands) {
cov.cover(297);
                col.Commands = col.Commands.split(',');
            }
        },
    
        resolvePaging: function ( config ) {
cov.cover(298);
            // if we've got all the data, do paging/sorting/searching on the client
    
        },
    
        resolveTypes: function ( config ) {
cov.cover(299);
            if ( !config || !config.pageModel || ( !config.pageModel.Data && !config.pageModel.Types ) ) return;
            config.Columns.forEach( function ( col ) {
cov.cover(300);
                // look for a type by Field first, then by Sort
                var field = gp.hasValue( col.Field ) ? col.Field : col.Sort;
                if ( gp.isNullOrEmpty( field ) ) return;
                if ( config.pageModel.Types && config.pageModel.Types[field] != undefined ) {
cov.cover(301);
                    col.Type = gp.convertClrType( config.pageModel.Types[field] )
                }
                else {
cov.cover(302);
                    if ( config.pageModel.Data.length ) {
cov.cover(303);
                        // if we haven't found a value after 200 iterations, give up
                        for ( var i = 0; i < config.pageModel.Data.length && i < 200 ; i++ ) {
                            if ( config.pageModel.Data[i][field] !== null ) {
cov.cover(304);
                                col.Type = gp.getType( config.pageModel.Data[i][field] );
                                break;
                            }
                        }
                    }
                }
            } );
        }
    
    };

    /***************\
       mock-http
    \***************/
    (function (gp) {
cov.cover(305);
        gp.Http = function () { };
    
        // http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
        var routes = {
            read: /Read/,
            update: /Update/,
            create: /Create/,
            'delete': /Delete/
        };
    
        gp.Http.prototype = {
            serialize: function (obj, props) {
cov.cover(306);
                // creates a query string from a simple object
                var self = this;
                props = props || Object.getOwnPropertyNames(obj);
                var out = [];
                props.forEach(function (prop) {
cov.cover(307);
                    out.push(encodeURIComponent(prop) + '=' + encodeURIComponent(obj[prop]));
                });
                return out.join('&');
            },
            deserialize: function (queryString) {
cov.cover(308);
                var nameValue, split = queryString.split( '&' );
                var obj = {};
                if ( !queryString ) return obj;
                split.forEach( function ( s ) {
cov.cover(309);
                    nameValue = s.split( '=' );
                    var val = nameValue[1];
                    if ( !val ) {
cov.cover(310);
                        obj[nameValue[0]] = null;
                    }
                    else if ( /true|false/i.test( val ) ) {
cov.cover(311);
                        obj[nameValue[0]] = ( /true/i.test( val ) );
                    }
                    else if ( parseFloat( val ).toString() === val ) {
cov.cover(312);
                        obj[nameValue[0]] = parseFloat( val );
                    }
                    else {
cov.cover(313);
                        obj[nameValue[0]] = val;
                    }
                } );
                return obj;
            },
            get: function (url, callback, error) {
cov.cover(314);
                if (routes.read.test(url)) {
cov.cover(315);
                    var index = url.substring(url.indexOf('?'));
                    if (index !== -1) {
cov.cover(316);
                        var queryString = url.substring(index + 1);
                        var model = this.deserialize(queryString);
                        this.post(url.substring(0, index), model, callback, error);
                    }
                    else {
cov.cover(317);
                        this.post(url, null, callback, error);
                    }
                }
                else if (routes.create.test(url)) {
cov.cover(318);
                    var result = { "ProductID": 0, "Name": "", "ProductNumber": "", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": "", "SafetyStockLevel": 0, "ReorderPoint": 0, "StandardCost": 0, "ListPrice": 0, "Size": "", "SizeUnitMeasureCode": "", "WeightUnitMeasureCode": "", "Weight": 0, "DaysToManufacture": 0, "ProductLine": "", "Class": "", "Style": "", "ProductSubcategoryID": 0, "ProductModelID": 0, "SellStartDate": "2007-07-01T00:00:00", "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "00000000-0000-0000-0000-000000000000", "ModifiedDate": "2008-03-11T10:01:36.827", "Markup": null };
                    callback(result);
                }
                else {
cov.cover(319);
                    throw 'Not found: ' + url;
                }
            },
            post: function (url, model, callback, error) {
cov.cover(320);
                model = model || {};
                if (routes.read.test(url)) {
cov.cover(321);
                    getData(model, callback);
                }
                else if ( routes.create.test( url ) ) {
cov.cover(322);
                    data.products.push( model );
                    callback( new gp.UpdateModel( model ) );
                }
                else if ( routes.update.test( url ) ) {
cov.cover(323);
                    callback( new gp.UpdateModel(model) );
                }
                else {
cov.cover(324);
                    throw '404 Not found: ' + url;
                }
            },
            'delete': function ( url, model, callback, error ) {
cov.cover(325);
                model = model || {};
                var index = data.products.indexOf( model );
                callback( {
                    Success: true,
                    Message: ''
                } );
            }
        };
    
        var getData = function (model, callback) {
cov.cover(326);
            var count, d = data.products;
            if (!gp.isNullOrEmpty(model.Search)) {
cov.cover(327);
                var props = Object.getOwnPropertyNames(d[0]);
                var search = model.Search.toLowerCase();
                d = d.filter(function (row) {
cov.cover(328);
                    for (var i = 0; i < props.length; i++) {
                        if (row[props[i]] && row[props[i]].toString().toLowerCase().indexOf(search) !== -1) {
cov.cover(329);
                            return true;
                        }
                    }
                    return false;
                });
            }
            if (!gp.isNullOrEmpty(model.OrderBy)) {
cov.cover(330);
                if (model.Desc) {
cov.cover(331);
                    d.sort(function (row1, row2) {
cov.cover(332);
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
                        if (a === null) {
cov.cover(333);
                            if (b != null) {
cov.cover(334);
                                return 1;
                            }
                        }
                        else if (b === null) {
cov.cover(335);
                            // we already know a isn't null
                            return -1;
                        }
                        if (a > b) {
cov.cover(336);
                            return -1;
                        }
                        if (a < b) {
cov.cover(337);
                            return 1;
                        }
    
                        return 0;
                    });
                }
                else {
cov.cover(338);
                    d.sort(function (row1, row2) {
cov.cover(339);
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
                        if (a === null) {
cov.cover(340);
                            if (b != null) {
cov.cover(341);
                                return -1;
                            }
                        }
                        else if (b === null) {
cov.cover(342);
                            // we already know a isn't null
                            return 1;
                        }
                        if (a > b) {
cov.cover(343);
                            return 1;
                        }
                        if (a < b) {
cov.cover(344);
                            return -1;
                        }
    
                        return 0;
                    });
                }
            }
            count = d.length;
            if (model.Top !== -1) {
cov.cover(345);
                model.Data = d.slice(model.Skip).slice(0, model.Top);
            }
            else {
cov.cover(346);
                model.Data = d;
            }
            model.ValidationErrors = [];
            setTimeout(function () {
cov.cover(347);
                callback(model);
            });
    
        };
    
    })(gridponent);

    /***************\
         model
    \***************/
    gp.Model = function ( config ) {
cov.cover(348);
        this.config = config;
        this.dal = null;
        var type = gp.getType( config.Read );
        switch ( type ) {
            case 'string':
                this.dal = new gp.ServerPager( config.Read );
                break;
            case 'function':
                this.dal = new gp.FunctionPager( config );
                break;
            case 'object':
                // Read is a PagingModel
                this.config.pageModel = config.Read;
                this.dal = new gp.ClientPager( this.config );
                break;
            case 'array':
                this.config.pageModel.Data = this.config.Read;
                this.dal = new gp.ClientPager( this.config );
                break;
            default:
                throw 'Unsupported Read configuration';
        }
    };
    
    gp.Model.prototype = {
    
        read: function ( requestModel, callback, error ) {
cov.cover(349);
            var self = this;
    
    
            this.dal.read(
                requestModel,
                function ( arg ) { gp.applyFunc( callback, self, arg ); },
                function ( arg ) { gp.applyFunc( error, self, arg ); }
            );
        },
    
        create: function ( row, callback, error) {
cov.cover(350);
            var self = this, url;
    
            // config.Create can be a function or a URL
            if ( typeof this.config.Create === 'function' ) {
cov.cover(351);
                // call the function, set the API as the context
                gp.applyFunc(this.config.Create, this.config.node.api, [row, callback, error], error);
            }
            else {
cov.cover(352);
                // the url can be a template
                url = gp.supplant( this.config.Create, row );
                // call the URL
                var http = new gp.Http();
                http.post(
                    url,
                    row,
                    function ( arg ) { gp.applyFunc( callback, self, arg ); },
                    function ( arg ) { gp.applyFunc( error, self, arg ); }
                );
            }
        },
    
        update: function (row, callback, error) {
cov.cover(353);
            var self = this, url;
    
            // config.Update can be a function or URL
            if ( typeof this.config.Update === 'function' ) {
cov.cover(354);
                gp.applyFunc(this.config.Update, this.config.node.api, [row, callback, error], error);
            }
            else {
cov.cover(355);
                // the url can be a template
                url = gp.supplant( this.config.Update, row );
                var http = new gp.Http();
                http.post(
                    url,
                    row,
                    function ( arg ) { gp.applyFunc( callback, self, arg ); },
                    function ( arg ) { gp.applyFunc( error, self, arg ); }
                );
            }
        },
    
        'delete': function (row, callback, error) {
cov.cover(356);
            var self = this, url;
            if ( typeof this.config.Delete === 'function' ) {
cov.cover(357);
                gp.applyFunc(this.config.Delete, this.config.node.api, [row, callback, error], error);
            }
            else {
cov.cover(358);
                // the url can be a template
                url = gp.supplant( this.config.Delete, row );
                var http = new gp.Http();
                http.delete(
                    url,
                    row,
                    function ( arg ) { gp.applyFunc( callback, self, arg ); },
                    function ( arg ) { gp.applyFunc( error, self, arg ); }
                );
            }
        }
    
    };

    /***************\
       NodeBuilder
    \***************/
    
    gp.NodeBuilder = function ( parent ) {
cov.cover(359);
        this.node = parent || null;
    };
    
    gp.NodeBuilder.prototype = {
    
        startElem: function ( tagName ) {
cov.cover(360);
            var n = document.createElement( tagName );
    
            if ( this.node ) {
cov.cover(361);
                this.node.appendChild( n );
            }
    
            this.node = n;
    
            return this;
        },
    
        addClass: function ( name ) {
cov.cover(362);
            if ( gp.isNullOrEmpty( name ) ) return this;
    
            var hasClass = ( ' ' + this.node.className + ' ' ).indexOf( ' ' + name + ' ' ) !== -1;
    
            if ( !hasClass ) {
cov.cover(363);
                this.node.className = ( this.node.className === '' ) ? name : this.node.className + ' ' + name;
            }
    
            return this;
        },
    
        html: function ( html ) {
cov.cover(364);
            this.node.innerHTML = gp.hasValue( html ) ? html : '';
            return this;
        },
    
        endElem: function () {
cov.cover(365);
            if ( this.node.parentElement ) {
cov.cover(366);
                this.node = this.node.parentElement;
            }
            return this;
        },
    
        attr: function ( name, value ) {
cov.cover(367);
            var attr = document.createAttribute( name );
    
            if ( value != undefined ) {
cov.cover(368);
                attr.value = gp.escapeHTML( value );
            }
    
            this.node.setAttributeNode( attr );
    
            return this;
        },
    
        close: function () {
cov.cover(369);
            while ( this.node.parentElement ) {
                this.node = this.node.parentElement;
            }
            return this.node;
        }
    
    };

    /***************\
       ObjectProxy
    \***************/
    gp.ObjectProxy = function (obj, onPropertyChanged ) {
cov.cover(370);
        var self = this;
        var dict = {};
    
        // create mirror properties
        var props = Object.getOwnPropertyNames( obj );
    
        props.forEach(function (prop) {
cov.cover(371);
            Object.defineProperty(self, prop, {
                get: function () {
cov.cover(372);
                    return dict[prop];
                },
                set: function (value) {
cov.cover(373);
                    if (dict[prop] != value) {
cov.cover(374);
                        var oldValue = dict[prop];
                        dict[prop] = value;
                        if ( typeof onPropertyChanged === 'function' ) {
cov.cover(375);
                            gp.applyFunc( onPropertyChanged, self, [self, prop, oldValue, value] );
                        }
                    }
                }
            });
            dict[prop] = obj[prop];
        });
    };

    /***************\
    server-side pager
    \***************/
    gp.ServerPager = function (url) {
cov.cover(376);
        this.url = url;
    };
    
    gp.ServerPager.prototype = {
        read: function ( model, callback, error ) {
cov.cover(377);
            var copy = gp.shallowCopy( model );
            // delete anything we don't want to send to the server
            var props = Object.getOwnPropertyNames( copy ).forEach(function(prop){
cov.cover(378);
                if ( /^(Page|Top|OrderBy|Desc|Search)$/i.test( prop ) == false ) {
cov.cover(379);
                    delete copy[prop];
                }
            });
            var h = new gp.Http();
            h.post(this.url, copy, callback, error);
        }
    };
    
    
    /***************\
    client-side pager
    \***************/
    gp.ClientPager = function (config) {
cov.cover(380);
        var value, self = this;
        this.data = config.pageModel.Data;
        this.columns = config.Columns.filter(function (c) {
cov.cover(381);
            return c.Field !== undefined || c.Sort !== undefined;
        });
        if (typeof config.SearchFunction === 'function') {
cov.cover(382);
            this.searchFilter = config.SearchFunction;
        }
        else {
cov.cover(383);
            this.searchFilter = function (row, search) {
cov.cover(384);
                var s = search.toLowerCase();
                for (var i = 0; i < self.columns.length; i++) {
                    value = gp.getFormattedValue( row, self.columns[i], false );
                    if (gp.hasValue(value) && value.toString().toLowerCase().indexOf(s) !== -1) {
cov.cover(385);
                        return true;
                    }
                }
                return false;
            };
        }
    };
    
    gp.ClientPager.prototype = {
        read: function (model, callback, error) {
cov.cover(386);
            try {
                var self = this,
                    search,
                    skip = this.getSkip( model );
    
                // don't modify the original array
                model.Data = this.data.slice(0, this.data.length);
    
                // filter first
                if ( !gp.isNullOrEmpty( model.Search ) ) {
cov.cover(387);
                    // make sure searchTerm is a string and trim it
                    search = gp.trim( model.Search.toString() );
                    model.Data = model.Data.filter(function (row) {
cov.cover(388);
                        return self.searchFilter(row, search);
                    });
                }
    
                // set TotalRows after filtering, but before paging
                model.TotalRows = model.Data.length;
    
                // then sort
                if (gp.isNullOrEmpty(model.OrderBy) === false) {
cov.cover(389);
                    var col = this.getColumnByField( this.columns, model.OrderBy );
                    if (gp.hasValue(col)) {
cov.cover(390);
                        var sortFunction = this.getSortFunction( col, model.Desc );
                        var fieldName = col.Field || col.Sort;
                        model.Data.sort( function ( row1, row2 ) {
cov.cover(391);
                            return sortFunction( row1[fieldName], row2[fieldName] );
                        });
                    }
                }
    
                // then page
                if (model.Top !== -1) {
cov.cover(392);
                    model.Data = model.Data.slice(skip).slice(0, model.Top);
                }
            }
            catch (ex) {
                gp.error( ex );
            }
            callback(model);
        },
        getSkip: function ( model ) {
cov.cover(393);
            var data = model;
            if ( data.PageCount == 0 ) {
cov.cover(394);
                return 0;
            }
            if ( data.Page < 1 ) {
cov.cover(395);
                data.Page = 1;
            }
            else if ( data.Page > data.PageCount ) {
cov.cover(396);
                return data.Page = data.PageCount;
            }
            return ( data.Page - 1 ) * data.Top;
        },
        getColumnByField: function ( columns, field ) {
cov.cover(397);
            var col = columns.filter(function (c) { return c.Field === field || c.Sort === field });
            return col.length ? col[0] : null;
        },
        getSortFunction: function (col, desc) {
cov.cover(398);
            if ( /^(number|date|boolean)$/.test( col.Type ) ) {
cov.cover(399);
                if ( desc ) {
cov.cover(400);
                    return this.diffSortDesc;
                }
                return this.diffSortAsc;
            }
            else {
cov.cover(401);
                if ( desc ) {
cov.cover(402);
                    return this.stringSortDesc;
                }
                return this.stringSortAsc;
            }
        },
        diffSortDesc: function(a, b) {
cov.cover(403);
            return b - a;
        },
        diffSortAsc: function(a, b) {
cov.cover(404);
            return a - b;
        },
        stringSortDesc: function (a, b) {
cov.cover(405);
            if (a === null) {
cov.cover(406);
                if (b != null) {
cov.cover(407);
                    return 1;
                }
                return 0;
            }
            else if (b === null) {
cov.cover(408);
                // we already know a isn't null
                return -1;
            }
    
            // string sorting is the default if no type was detected
            // so make sure what we're sorting is a string
    
            if ( a.toString().toLowerCase() > b.toString().toLowerCase() ) {
cov.cover(409);
                return -1;
            }
            if ( a.toString().toLowerCase() < b.toString().toLowerCase() ) {
cov.cover(410);
                return 1;
            }
    
            return 0;
        },
        stringSortAsc: function (a, b) {
cov.cover(411);
            if (a === null) {
cov.cover(412);
                if (b != null) {
cov.cover(413);
                    return -1;
                }
                return 0;
            }
            else if (b === null) {
cov.cover(414);
                // we already know a isn't null
                return 1;
            }
    
            // string sorting is the default if no type was detected
            // so make sure what we're sorting is a string
    
            if ( a.toString().toLowerCase() > b.toString().toLowerCase() ) {
cov.cover(415);
                return 1;
            }
            if ( a.toString().toLowerCase() < b.toString().toLowerCase() ) {
cov.cover(416);
                return -1;
            }
    
            return 0;
        }
    };
    
    /***************\
      FunctionPager
    \***************/
    
    gp.FunctionPager = function ( config ) {
cov.cover(417);
        this.config = config;
    };
    
    gp.FunctionPager.prototype = {
        read: function ( model, callback, error ) {
cov.cover(418);
            try {
                var type,
                    result = this.config.Read( model, callback );
    
                // if the function returned a value instead of using the callback
                // check its type
                if ( result != undefined ) {
cov.cover(419);
                    type = gp.getType(result);
                    switch (type) {
                        case 'string':
                            // assume it's a url, make an HTTP call
                            new gp.ServerPager( result ).read( model, callback, error );
                            break;
                        case 'array':
                            // assume it's a row, wrap it in a PagingModel
                            callback( new gp.PagingModel( result ) );
                            break;
                        case 'object':
                            // assume a PagingModel
                            callback( result );
                            break;
                        default:
                            gp.applyFunc( error, this, 'Read returned a value which could not be resolved.' );
                            break;
                    }
                }
            }
            catch (ex) {
                if (typeof error === 'function') {
cov.cover(420);
                    gp.applyFunc( error, this, ex );
                }
                else {
cov.cover(421);
                    gp.applyFunc( callback, this, this.config );
                }
                gp.error( ex );
            }
        }
    };

    /***************\
      RequestModel
    \***************/
    gp.RequestModel = function (data) {
cov.cover(422);
        var self = this;
        // properites are capitalized here because that's the convention for server-side classes (C#)
        // we want the serialized version of the corresponding server-side class to look exactly like this prototype
    
        this.Top = -1; // this is a flag to let the pagers know if paging is enabled
        this.Page = 1;
        this.OrderBy = '';
        this.Desc = false;
        this.Search = '';
        this.Data = data;
        this.TotalRows = 0;
    
        Object.defineProperty(self, 'PageIndex', {
            get: function () {
cov.cover(423);
                return self.Page - 1;
            }
        });
    
        Object.defineProperty(self, 'PageCount', {
            get: function () {
cov.cover(424);
                if ( self.Top > 0 ) {
cov.cover(425);
                    return Math.ceil( self.TotalRows / self.Top );
                }
                if ( self.TotalRows === 0 ) return 0;
                return 1;
            }
        });
    
        Object.defineProperty(self, 'Skip', {
            get: function () {
cov.cover(426);
                if (self.Top !== -1) {
cov.cover(427);
                    if (self.PageCount === 0) return 0;
                    if (self.Page < 1) self.Page = 1;
                    else if (self.Page > self.PageCount) return self.Page = self.PageCount;
                    return self.PageIndex * self.Top;
                }
                return 0;
            }
        });
    };

    /***************\
      PagingModel
    \***************/
    gp.PagingModel = function (data) {
cov.cover(428);
        var self = this;
        // properites are capitalized here because that's the convention for server-side classes (C#)
        // we want the serialized version of the corresponding server-side class to look exactly like this prototype
    
        this.Top = -1; // this is a flag to let the pagers know if paging is enabled
        this.Page = 1;
        this.OrderBy = '';
        this.Desc = false;
        this.Search = '';
        this.Data = data;
        this.TotalRows = 0;
    
        Object.defineProperty(self, 'PageIndex', {
            get: function () {
cov.cover(429);
                return self.Page - 1;
            }
        });
    
        Object.defineProperty(self, 'PageCount', {
            get: function () {
cov.cover(430);
                if ( self.Top > 0 ) {
cov.cover(431);
                    return Math.ceil( self.TotalRows / self.Top );
                }
                if ( self.TotalRows === 0 ) return 0;
                return 1;
            }
        });
    
        Object.defineProperty(self, 'Skip', {
            get: function () {
cov.cover(432);
                if (self.Top !== -1) {
cov.cover(433);
                    if (self.PageCount === 0) return 0;
                    if (self.Page < 1) self.Page = 1;
                    else if (self.Page > self.PageCount) return self.Page = self.PageCount;
                    return self.PageIndex * self.Top;
                }
                return 0;
            }
        });
    };

    // pilfered from JQuery
    /*!
     * jQuery JavaScript Library v2.1.4
     * http://jquery.com/
     *
     * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
     * Released under the MIT license
     * http://jquery.org/license
     *
     * Date: 2015-04-28T16:01Z
     */
    gp.ready = function (fn) {
cov.cover(434);
    
        var isReady = false;
    
        var completed = function (event) {
cov.cover(435);
            // readyState === "complete" is good enough for us to call the dom ready in oldIE
            if (document.addEventListener || event.type === "load" || document.readyState === "complete") {
cov.cover(436);
                isReady = true;
                detach();
                fn();
            }
        };
    
        var detach = function () {
cov.cover(437);
            if (document.addEventListener) {
cov.cover(438);
                document.removeEventListener("DOMContentLoaded", completed, false);
                window.removeEventListener("load", completed, false);
    
            } else {
cov.cover(439);
                document.detachEvent("onreadystatechange", completed);
                window.detachEvent("onload", completed);
            }
        };
    
        if (document.readyState === "complete") {
cov.cover(440);
            // Handle it asynchronously to allow scripts the opportunity to delay ready
            setTimeout(fn);
    
            // Standards-based browsers support DOMContentLoaded
        } else if (document.addEventListener) {
cov.cover(441);
            // Use the handy event callback
            document.addEventListener("DOMContentLoaded", completed, false);
    
            // A fallback to window.onload, that will always work
            window.addEventListener("load", completed, false);
    
            // If IE event model is used
        } else {
cov.cover(442);
            // Ensure firing before onload, maybe late but safe also for iframes
            document.attachEvent("onreadystatechange", completed);
    
            // A fallback to window.onload, that will always work
            window.attachEvent("onload", completed);
    
            // If IE and not a frame
            // continually check to see if the document is ready
            var top = false;
    
            try {
                top = window.frameElement == null && document.documentElement;
            } catch (e) { }
    
            if (top && top.doScroll) {
cov.cover(443);
                (function doScrollCheck() {
cov.cover(444);
                    if (!isReady) {
cov.cover(445);
    
                        try {
                            // Use the trick by Diego Perini
                            // http://javascript.nwbox.com/IEContentLoaded/
                            top.doScroll("left");
                        } catch (e) {
                            return setTimeout(doScrollCheck, 50);
                        }
    
                        // detach all dom ready events
                        detach();
    
                        fn();
                    }
                })();
            }
        }
    };

    /***************\
      StringBuilder
    \***************/
    
    gp.StringBuilder = function () {
cov.cover(446);
        this.out = [];
    };
    
    gp.StringBuilder.prototype = {
    
        add: function ( str ) {
cov.cover(447);
            this.out.push( str );
            return this;
        },
    
        toString: function ( ) {
cov.cover(448);
            return this.out.join('');
        }
    
    };

    /***************\
       UpdateModel
    \***************/
    gp.UpdateModel = function ( row, validationErrors ) {
cov.cover(449);
    
        this.Row = row;
        this.ValidationErrors = validationErrors;
        this.Original = gp.shallowCopy( row );
    
    };

    /***************\
       Gridponent
    \***************/
    
    // check for web component support
    if (document.registerElement) {
cov.cover(450);
    
        gp.Gridponent = Object.create(HTMLElement.prototype);
    
        gp.Gridponent.createdCallback = function () {
cov.cover(451);
            var init = new gp.Initializer( this );
            gp.ready( init.initialize.bind( init ) );
        };
    
        gp.Gridponent.detachedCallback = function () {
cov.cover(452);
            this.api.dispose();
        };
    
        document.registerElement('grid-ponent', {
            prototype: gp.Gridponent
        });
    }
    else {
cov.cover(453);
        // no web component support
        // provide a static function to initialize grid-ponent elements manually
        gp.initialize = function (root) {
cov.cover(454);
            root = root || document;
            var node, nodes = root.querySelectorAll( 'grid-ponent' );
            for ( var i = 0; i < nodes.length; i++ ) {
                new gp.Initializer( nodes[i] ).initialize();
            }
        };
    
        gp.ready( gp.initialize );
    }

    /***************\
        templates
    \***************/
    gp.templates = gp.templates || {};
    gp.templates['gridponent-body'] = function(model, arg) {
cov.cover(455);
        var out = [];
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                if (!model.FixedHeaders) {
cov.cover(456);
                        out.push(gp.helpers['thead'].call(model));
                    }
            out.push('<tbody>');
                    out.push(gp.helpers['tableRows'].call(model));
            out.push('</tbody>');
                if (model.Footer && !model.FixedFooters) {
cov.cover(457);
                        out.push(gp.templates['gridponent-tfoot'](model));
                    }
            out.push('</table>');
        return out.join('');
    };
    gp.templates['gridponent-cells'] = function(model, arg) {
cov.cover(458);
        var out = [];
        model.Columns.forEach(function(col, index) {
cov.cover(459);
                out.push('    <td class="body-cell ');
        out.push(col.BodyClass);
        out.push('" ');
        if (col.BodyStyle) {
cov.cover(460);
        out.push(' style="');
        out.push(col.BodyStyle);
        out.push('"');
        }
        out.push('>');
                    out.push(gp.helpers['bodyCellContent'].call(model, col));
            out.push('</td>');
        });
                return out.join('');
    };
    gp.templates['gridponent-pager'] = function(model, arg) {
cov.cover(461);
        var out = [];
        out.push(gp.helpers['setPagerFlags'].call(model));
                if (model.pageModel.HasPages) {
cov.cover(462);
                out.push('<div class="btn-group">');
        out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsFirstPage) {
cov.cover(463);
        out.push(' disabled ');
        }
        out.push('" title="First page">');
        out.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>');
                        if (model.pageModel.IsFirstPage == false) {
cov.cover(464);
            out.push('<input type="radio" name="Page" value="1" />');
                        }
            out.push('</label>');
            out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsFirstPage) {
cov.cover(465);
        out.push(' disabled ');
        }
        out.push('" title="Previous page">');
        out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
                        if (model.pageModel.IsFirstPage == false) {
cov.cover(466);
            out.push('                <input type="radio" name="Page" value="');
        out.push(model.pageModel.PreviousPage);
        out.push('" />');
                        }
            out.push('</label>');
        out.push('</div>');
        out.push('    <input type="number" name="Page" value="');
        out.push(model.pageModel.Page);
        out.push('" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" />');
        out.push('<span class="page-count">');
        out.push('        of ');
        out.push(model.pageModel.PageCount);
            out.push('</span>');
        out.push('<div class="btn-group">');
        out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsLastPage) {
cov.cover(467);
        out.push(' disabled ');
        }
        out.push('" title="Next page">');
        out.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>');
                        if (model.pageModel.IsLastPage == false) {
cov.cover(468);
            out.push('            <input type="radio" name="Page" value="');
        out.push(model.pageModel.NextPage);
        out.push('" />');
                        }
            out.push('</label>');
            out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsLastPage) {
cov.cover(469);
        out.push(' disabled ');
        }
        out.push('" title="Last page">');
        out.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>');
                        if (model.pageModel.IsLastPage == false) {
cov.cover(470);
            out.push('            <input type="radio" name="Page" value="');
        out.push(model.pageModel.PageCount);
        out.push('" />');
                        }
            out.push('</label>');
        out.push('</div>');
        }
                return out.join('');
    };
    gp.templates['gridponent-table-footer'] = function(model, arg) {
cov.cover(471);
        var out = [];
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                out.push(gp.templates['gridponent-tfoot'](model));
            out.push('</table>');
        return out.join('');
    };
    gp.templates['gridponent-tfoot'] = function(model, arg) {
cov.cover(472);
        var out = [];
        out.push('<tfoot>');
        out.push('<tr>');
                    model.Columns.forEach(function(col, index) {
cov.cover(473);
            out.push('<td class="footer-cell">');
                        out.push(gp.helpers['footerCell'].call(model, col));
            out.push('</td>');
                    });
            out.push('</tr>');
        out.push('</tfoot>');
        return out.join('');
    };
    gp.templates['gridponent'] = function(model, arg) {
cov.cover(474);
        var out = [];
        out.push('<div class="gp table-container');
        out.push(gp.helpers['containerClasses'].call(model));
        out.push('" id="');
        out.push(model.ID);
        out.push('">');
                if (model.Search || model.Create || model.ToolbarTemplate) {
cov.cover(475);
            out.push('<div class="table-toolbar">');
                        if (model.ToolbarTemplate) {
cov.cover(476);
                                out.push(gp.helpers['toolbarTemplate'].call(model));
                            } else {
cov.cover(477);
                                if (model.Search) {
cov.cover(478);
            out.push('<div class="input-group gridponent-searchbox">');
        out.push('<input type="text" name="Search" class="form-control" placeholder="Search...">');
        out.push('<span class="input-group-btn">');
        out.push('<button class="btn btn-default" type="button">');
        out.push('<span class="glyphicon glyphicon-search"></span>');
        out.push('</button>');
        out.push('</span>');
        out.push('</div>');
                            }
                                if (model.Create) {
cov.cover(479);
            out.push('<button class="btn btn-default" type="button" value="AddRow">');
        out.push('<span class="glyphicon glyphicon-plus"></span>Add');
        out.push('</button>');
                            }
                            }
            out.push('</div>');
                }
                    if (model.FixedHeaders) {
cov.cover(480);
            out.push('<div class="table-header">');
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                            out.push(gp.helpers['thead'].call(model));
            out.push('</table>');
        out.push('</div>');
                }
            out.push('    <div class="table-body ');
        if (model.FixedHeaders) {
cov.cover(481);
        out.push('table-scroll');
        }
        out.push('" style="');
        out.push(model.Style);
        out.push('">');
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                        if (!model.FixedHeaders) {
cov.cover(482);
                                out.push(gp.helpers['thead'].call(model));
                            }
            out.push('</table>');
        out.push('</div>');
                if (model.FixedFooters) {
cov.cover(483);
            out.push('<div class="table-footer">');
                        out.push(gp.templates['gridponent-table-footer'](model));
            out.push('</div>');
                }
                    if (model.Pager) {
cov.cover(484);
            out.push('<div class="table-pager"></div>');
                }
            out.push('<style type="text/css" class="sort-style">');
                    out.push(gp.helpers['sortStyle'].call(model));
            out.push('</style>');
        out.push('<style type="text/css" class="column-width-style">');
                    out.push(gp.helpers['columnWidthStyle'].call(model));
            out.push('</style>');
        out.push('<div class="gp-progress-overlay">');
        out.push('<div class="gp-progress gp-progress-container">');
        out.push('<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>');
        out.push('</div>');
        out.push('</div>');
        out.push('</div>');
        return out.join('');
    };
cov.maxCoverage = 484;


})(gridponent);
