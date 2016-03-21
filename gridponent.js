// namespace
var gridponent = gridponent || {};

(function(gp) { 

    /***************\
          API
    \***************/
    
    gp.events = {
        rowSelected: 'rowSelected',
        beforeInit: 'beforeInit',
        afterInit: 'afterInit',
        beforeRead: 'beforeRead',
        beforeAdd: 'beforeAdd',
        beforeCreate: 'beforeCreate',
        beforeUpdate: 'beforeUpdate',
        beforeDelete: 'beforeDelete',
        afterRead: 'afterRead',
        afterCreate: 'afterCreate',
        afterUpdate: 'afterUpdate',
        afterDelete: 'afterDelete',
        afterEdit: 'afterEdit',
        beforeDispose: 'beforeDispose',
        editMode: 'editMode',
        httpError: 'httpError'
    };
    
    gp.api = function ( controller ) {
        this.controller = controller;
    };
    
    gp.api.prototype = {
    
        ready: function(callback) {
            this.controller.ready( callback );
        },
    
        refresh: function ( callback ) {
            this.controller.read( null, callback );
        },
    
        getData: function ( index ) {
            if ( typeof index == 'number' ) return this.controller.config.pageModel.Data[index];
            return this.controller.config.pageModel.Data;
        },
    
        search: function ( searchTerm, callback ) {
            // make sure we pass in a string
            searchTerm = gp.isNullOrEmpty( searchTerm ) ? '' : searchTerm.toString();
            this.controller.search( searchTerm, callback );
        },
    
        sort: function ( name, desc, callback ) {
            // validate the args
            name = gp.isNullOrEmpty( name ) ? '' : name.toString();
            typeof desc == 'boolean' ? desc : desc === 'false' ? false : !!desc;
            this.controller.sort( name, desc, callback );
        },
    
        read: function ( requestModel, callback ) {
            this.controller.read( requestModel, callback );
        },
    
        create: function ( row, callback ) {
            var model = this.controller.addRow( row );
            if ( model != null ) this.controller.createRow( row, model.tableRow, callback );
            else callback( null );
        },
    
        // This would have to be called after having retrieved the row from the table with getData().
        // The controller will attempt to figure out which tr it is by first calling indexOf(row) on the data.
        // So the original row object reference has to be preserved.
        // this function is mainly for testing
        update: function ( row, callback ) {
            var tr = gp.getTableRow( this.controller.config.pageModel.Data, row, this.controller.config.node );
    
            this.controller.updateRow( row, tr, callback );
        },
    
        'delete': function ( row, callback ) {
            this.controller.deleteRow( row, callback, true );
        },
    
        cancel: function ( arg ) { },
    
        dispose: function () {
            this.controller.dispose();
        }
    
    };

    /***************\
     change monitor
    \***************/
    gp.ChangeMonitor = function (node, selector, model, afterSync) {
        var self = this;
        this.model = model;
        this.beforeSync = null;
        this.node = node;
        this.selector = selector;
        this.listener = function (evt) {
            self.syncModel.call(self, evt.target, self.model);
        };
        this.afterSync = afterSync;
    };
    
    gp.ChangeMonitor.prototype = {
        start: function () {
            var self = this;
            // add change event handler to node
            gp.on( this.node, 'change', this.selector, this.listener );
            gp.on( this.node, 'keydown', this.selector, this.handleEnterKey );
            return this;
        },
        handleEnterKey: function ( evt ) {
            // trigger change event
            if ( evt.keyCode == 13 ) {
                evt.target.blur();
            }
        },
        stop: function () {
            // clean up
            gp.off( this.node, 'change', this.listener );
            gp.off( this.node, 'keydown', this.handleEnterKey );
            return this;
        },
        syncModel: function (target, model) {
            // get name and value of target
            var name = target.name,
                val = target.value,
                handled = false,
                type;
    
            try {
                if ( name in model ) {
                    if ( typeof ( this.beforeSync ) === 'function' ) {
                        handled = this.beforeSync( name, val, this.model );
                    }
                    if ( !handled ) {
                        type = gp.getType( model[name] );
                        switch ( type ) {
                            case 'number':
                                model[name] = parseFloat( val );
                                break;
                            case 'boolean':
                                if ( target.type == 'checkbox' ) {
                                    if ( val.toLowerCase() == 'true' ) val = target.checked;
                                    else if ( val.toLowerCase() == 'false' ) val = !target.checked;
                                    else val = target.checked ? val : null;
                                    model[name] = val;
                                }
                                else {
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
            if ( typeof this.config.AfterEdit === 'function' ) {
                gp.off( this.config.node, gp.events.afterEdit, this.config.AfterEdit );
            }
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
            if ( typeof config.Onrowselect == 'function' || gp.rexp.braces.test( config.Onrowselect ) ) {
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
                gp.applyFunc( config.Onrowselect, tr, [row] );
            }
            else {
                // it's a urlTemplate
                window.location = gp.processBodyTemplate( config.Onrowselect, row );
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
            gp.raiseCustomEvent( this.config.node, gp.events.beforeRead, this.config.pageModel );
            this.model.read( this.config.pageModel, function ( model ) {
                gp.shallowCopy( model, self.config.pageModel );
                self.refresh( self.config );
                gp.raiseCustomEvent( this.config.node, gp.events.afterRead, this.config.pageModel );
                gp.applyFunc( callback, self.config.node, self.config.pageModel );
            }, this.handlers.httpErrorHandler );
        },
    
        addRow: function ( row ) {
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
                    return;
                }
    
                if ( row == undefined ) {
                    row = {};
    
                    // create a row using the config object
                    if ( !gp.isNullOrEmpty( this.config.pageModel.Types ) ) {
                        Object.getOwnPropertyNames( this.config.pageModel.Types ).forEach( function ( field ) {
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
                }
    
                // gives external code the opportunity to set defaults on the new row
                gp.raiseCustomEvent( self.config.node, gp.events.beforeAdd, row );
    
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
                    html = col.Readonly ?
                        bodyCellContent.call( this.config, col, row ) :
                        editCellContent.call( this.config, col, row, 'create' );
                    builder.startElem( 'td' ).addClass( 'body-cell' ).addClass( col.BodyCell ).html( html ).endElem();
                } );
    
                tr = builder.close();
    
                gp.prependChild( tbody, tr );
    
                tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', row ).start();
    
                // gives external code the opportunity to initialize UI elements (e.g. datepickers)
                gp.raiseCustomEvent( tr, gp.events.editMode, row );
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
                    self = this;
    
                // if there is no Create configuration setting, we're done here
                if ( !gp.hasValue( this.config.Create ) ) {
                    gp.applyFunc( callback, self.config.node );
                    return;
                }
    
                gp.raiseCustomEvent( this.config.node, gp.events.beforeCreate, row );
    
                // call the data layer with just the row
                // the data layer should respond with an updateModel
                this.model.create( row, function ( updateModel ) {
    
                    try {
                        if ( updateModel.ValidationErrors && updateModel.ValidationErrors.length ) {
                            if ( typeof self.config.Validate === 'function' ) {
                                gp.applyFunc( self.config.Validate, this, [tr, updateModel] );
                            }
                            else {
                                gp.helpers['validation'].call( this, tr, updateModel.ValidationErrors );
                            }
                        }
                        else {
                            // copy the returned row back to the internal data array
                            gp.shallowCopy( updateModel.Row, row );
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
    
                    gp.raiseCustomEvent( tr, gp.events.afterCreate, updateModel );
                    gp.raiseCustomEvent( self.config.node, gp.events.afterEdit, self.config.pageModel );
    
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
                    col = this.config.Columns[i];
                    if ( !col.Readonly ) {
                        cells[i].innerHTML = editCellContent.call( this.config, col, row, 'edit' );
                    }
                }
                gp.addClass( tr, 'edit-mode' );
                tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', row ).start();
    
                // gives external code the opportunity to initialize UI elements (e.g. datepickers)
                gp.raiseCustomEvent( tr, gp.events.editMode, row );
            }
            catch (ex) {
                gp.error( ex );
            }
        },
    
        updateRow: function (row, tr, callback) {
            // save the row and return it to read mode
    
            try {
                var monitor,
                    self = this;
    
                // if there is no Update configuration setting, we're done here
                if ( !gp.hasValue( this.config.Update ) ) {
                    gp.applyFunc( callback, self.config.node );
                    return;
                }
    
                gp.raiseCustomEvent(tr, gp.events.beforeUpdate, row );
    
                // call the data layer with just the row
                // the data layer should respond with an updateModel
                this.model.update( row, function ( updateModel ) {
    
                    try {
                        if ( updateModel.ValidationErrors && updateModel.ValidationErrors.length ) {
                            if ( typeof self.config.Validate === 'function' ) {
                                gp.applyFunc( self.config.Validate, this, [tr, updateModel] );
                            }
                            else {
                                gp.helpers['validation'].call( this, tr, updateModel.ValidationErrors );
                            }
                        }
                        else {
                            // copy the returned row back to the internal data array
                            gp.shallowCopy( updateModel.Row, row );
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
    
                    gp.raiseCustomEvent( tr, gp.events.afterUpdate, updateModel );
                    gp.raiseCustomEvent( self.config.node, gp.events.afterEdit, self.config.pageModel );
    
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
                        // if it didn't error out, we'll assume it succeeded
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
                    catch ( err ) {
                        gp.error( err );
                    }
    
                    gp.raiseCustomEvent( self.config.node, gp.events.afterDelete, row );
                    gp.raiseCustomEvent( self.config.node, gp.events.afterEdit, self.config.pageModel );
    
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
                    index = this.config.pageModel.Data.indexOf( row );
                    this.config.pageModel.Data.splice( index, 1 );
                }
                else {
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

    /***************\
      CustomEvent
    \***************/
    (function () {
    
        function CustomEvent(event, params) {
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
            this.locale = locale || gp.defaultLocale;
            this.currencyCode = currencyCode || gp.defaultCurrencyCode;
            this.supported = (window.Intl !== undefined);
        };
    
        gp.Formatter.prototype = {
            format: function (val, format) {
                var key, dtf, nf, type, options, dt;
                if (!this.supported || !gp.hasValue(val)) return val;
    
                type = gp.getType(val);
                key = (format || '') + '|' + this.locale + '|' + this.currencyCode;
    
                if (type === 'date') {
                    if (key in dateTimeFormatCache) {
                        dtf = dateTimeFormatCache[key];
                    }
                    else {
                        options = getDateTimeFormatOptions(format);
    
                        dtf = new Intl.DateTimeFormat(this.locale, options)
    
                        dateTimeFormatCache[key] = dtf;
                    }
                    return dtf.format(val).replace(ltr, '');
                }
                if (type === 'dateString') {
                    var parts = val.match( /\d+/g );
                    if ( parts.length >= 6 ) {
                        dt = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
                    }
                    else {
                        dt = new Date( parts[0], parts[1] - 1, parts[2] );
                    }
    
                    if (key in dateTimeFormatCache) {
                        dtf = dateTimeFormatCache[key];
                    }
                    else {
                        options = getDateTimeFormatOptions(format);
    
                        dtf = new Intl.DateTimeFormat(this.locale, options)
    
                        dateTimeFormatCache[key] = dtf;
                    }
                    return dtf.format(dt).replace(ltr, '');
                }
                if (type === 'number') {
                    if (key in numberFormatCache) {
                        nf = numberFormatCache[key];
                    }
                    else {
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
            var options = {};
    
            if (gp.hasValue(format)) {
    
                dateTimeTokens.forEach(function (token) {
                    if (!(token[1] in options) && format.match(token[0])) {
                        options[token[1]] = token[2];
                        if ( token.length === 4 ) {
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
            var options = {};
    
            if (gp.hasValue(format)) {
    
                numberTokens.forEach(function (token) {
                    if (!(token[1] in options) && format.match(token[0])) {
                        options[token[1]] = token[2];
                        if (token[2] === 'currency') {
                            options.currency = currencyCode;
                        }
                    }
                });
                var digits = format.match(/\d+/);
                if (digits) {
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
            if ( console && console.error ) {
                console.error( e );
            }
        };
        gp.verbose = /verbose/.test( gp.logging ) ? gp.log : function () { };
        gp.info = /verbose|info/.test( gp.logging ) ? gp.log : function () { };
        gp.warn = /verbose|info|warn/.test( gp.logging ) ? gp.log : function () { };
    
        gp.getAttributes = function ( node ) {
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
            if ( typeof obj !== 'string' ) {
                return obj;
            }
            for ( var i = 0; i < chars.length; i++ ) {
                obj = obj.replace( chars[i], escaped[i] );
            }
            return obj;
        };
    
        gp.camelize = function ( str ) {
            return str.replace( /(?:^|[-_])(\w)/g, function ( _, c ) {
                return c ? c.toUpperCase() : '';
            } );
        };
    
        gp.shallowCopy = function ( from, to ) {
            to = to || {};
            var props = Object.getOwnPropertyNames( from );
            props.forEach( function ( prop ) {
                to[prop] = from[prop];
            } );
            return to;
        };
    
        gp.extend = function ( to, from ) {
            return gp.shallowCopy( from, to );
        };
    
        gp.getType = function ( a ) {
            if ( a === null || a === undefined ) {
                return a;
            }
            if ( a instanceof Date ) {
                return 'date';
            }
            if ( typeof ( a ) === 'string' && gp.rexp.iso8601.test( a ) ) {
                return 'dateString';
            }
            if ( Array.isArray( a ) ) {
                return 'array';
            }
            // 'number','string','boolean','function','object'
            return typeof ( a );
        };
    
        gp.convertClrType = function ( clrType ) {
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
    
            this.handler = function ( evt ) {
    
                var e = evt.target;
    
                // get all the elements that match targetSelector
                var potentials = elem.querySelectorAll( targetSelector );
    
                // find the first element that matches targetSelector
                // usually this will be the first one
                while ( e ) {
                    for ( var j = 0; j < potentials.length; j++ ) {
                        if ( e == potentials[j] ) {
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
                elem.removeEventListener( event, this.handler );
            };
    
            // handle event
            elem.addEventListener( event, this.handler, false );
        };
    
        // this allows us to attach an event handler to the document
        // and handle events that match a selector
        gp.on = function ( elem, event, targetSelector, listener ) {
            // if elem is a selector, convert it to an element
            if ( typeof ( elem ) === 'string' ) {
                elem = document.querySelector( elem );
            }
    
            if ( !gp.hasValue( elem ) ) {
                return;
            }
    
            if ( typeof targetSelector === 'function' ) {
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
            // check for a matching listener store on the element
            var listeners = elem['gp-listeners-' + event];
            if ( listeners ) {
                for ( var i = 0; i < listeners.length; i++ ) {
                    if ( listeners[i].pub === listener ) {
    
                        // remove the event handler
                        listeners[i].priv.remove();
    
                        // remove it from the listener store
                        listeners.splice( i, 1 );
                        return;
                    }
                }
            }
            else {
                elem.removeEventListener( event, listener );
            }
        };
    
        gp.closest = function ( elem, selector, parentNode ) {
            var e, potentials, j;
            parentNode = parentNode || document;
            // if elem is a selector, convert it to an element
            if ( typeof ( elem ) === 'string' ) {
                elem = document.querySelector( elem );
            }
    
            if ( elem ) {
                // start with elem's immediate parent
                e = elem.parentElement;
    
                potentials = parentNode.querySelectorAll( selector );
    
                while ( e ) {
                    for ( j = 0; j < potentials.length; j++ ) {
                        if ( e == potentials[j] ) {
                            return e;
                        }
                    }
                    e = e.parentElement;
                }
            }
        };
    
        gp.in = function ( elem, selector, parent ) {
            parent = parent || document;
            // if elem is a selector, convert it to an element
            if ( typeof ( elem ) === 'string' ) {
                elem = parent.querySelector( elem );
            }
            // if selector is a string, convert it to a node list
            if ( typeof ( selector ) === 'string' ) {
                selector = parent.querySelectorAll( selector );
            }
            for ( var i = 0; i < selector.length; i++ ) {
                if ( selector[i] === elem ) return true;
            }
            return false;
        };
    
        gp.hasValue = function ( val ) {
            return val !== undefined && val !== null;
        };
    
        gp.isNullOrEmpty = function ( val ) {
            // if a string or array is passed, they'll be tested for both null and zero length
            // if any other data type is passed (no length property), it'll only be tested for null
            return gp.hasValue( val ) === false || ( val.length != undefined && val.length === 0 );
        };
    
        gp.coalesce = function ( array ) {
            if ( gp.isNullOrEmpty( array ) ) return array;
    
            for ( var i = 0; i < array.length; i++ ) {
                if ( gp.hasValue( array[i] ) ) {
                    return array[i];
                }
            }
    
            return array[array.length - 1];
        };
    
        gp.getObjectAtPath = function ( path, root ) {
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
                    // convert to int
                    segment = parseInt( /\d+/.exec( segment ) );
                }
                else if ( gp.rexp.quoted.test( segment ) ) {
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
               return function ( func ) {
                   return function () {
                       return call.apply( func, arguments );
                   };
               };
           }( FP.call ) );
    
        var uids = {};
        var slice = callbind( ''.slice );
        var zero = 0;
        var numberToString = callbind( zero.toString );
    
        gp.createUID = function () {
            // id's can't begin with a number
            var key = 'gp' + slice( numberToString( Math.random(), 36 ), 2 );
            return key in uids ? createUID() : uids[key] = key;
        };
    
        gp.hasPositiveWidth = function ( nodes ) {
            if ( gp.isNullOrEmpty( nodes ) ) return false;
            for ( var i = 0; i < nodes.length; i++ ) {
                if ( nodes[i].offsetWidth > 0 ) return true;
            }
            return false;
        };
    
        gp.resolveTemplate = function ( template ) {
            // can be a selector, an inline template, or a function
            var t = gp.getObjectAtPath( template );
            if ( typeof ( t ) === 'function' ) {
                return t;
            }
            else if ( gp.rexp.braces.test( template ) ) {
                return template;
            }
            else {
                t = document.querySelector( template );
                if ( t ) {
                    return t.innerHTML;
                }
            }
            return null;
        };
    
        gp.formatter = new gp.Formatter();
    
        gp.getFormattedValue = function ( row, col, escapeHTML ) {
            var type = ( col.Type || '' ).toLowerCase();
            var val = row[col.Field];
    
            if ( /^(date|datestring)$/.test( type ) ) {
                // apply default formatting to dates
                //return gp.formatDate(val, col.Format || 'M/d/yyyy');
                return gp.formatter.format( val, col.Format );
            }
            if ( type === 'number' && col.Format ) {
                return gp.formatter.format( val, col.Format );
            }
            if ( type === 'string' && escapeHTML ) {
                return gp.escapeHTML( val );
            }
            return val;
        };
    
        gp.supplant = function ( str, o, args ) {
            var self = this, types = /^(string|number|boolean)$/;
            return str.replace( /{{([^{}]*)}}/g,
                function ( a, b ) {
                    var r = o[b];
                    if ( types.test( typeof r ) ) return r;
                    // it's not in o, so check for a function
                    r = gp.getObjectAtPath( b );
                    return typeof r === 'function' ? gp.applyFunc(r, self, args) : '';
                }
            );
        };
    
        gp.processBodyTemplate = function ( template, row, col ) {
            return gp.supplant( template, row, [row, col] );
        };
    
        gp.processHeaderTemplate = function ( template, col ) {
            return gp.supplant(template, col, [col] )
        };
    
        gp.processFooterTemplate = function ( template, col, data ) {
            return gp.supplant( template, col, [col, data] )
        };
    
        gp.trim = function ( str ) {
            if ( gp.isNullOrEmpty( str ) ) return str;
            return str.trim ? str.trim() : str.replace( /^\s+|\s+$/g, '' );
        };
    
        gp.hasClass = function ( el, cn ) {
            return ( ' ' + el.className + ' ' ).indexOf( ' ' + cn + ' ' ) !== -1;
        };
    
        gp.addClass = function ( el, cn ) {
            if ( el instanceof NodeList ) {
                for (var i = 0; i < el.length; i++) {
                    if ( !gp.hasClass( el[i], cn ) ) {
                        el[i].className = ( el[i].className === '' ) ? cn : el[i].className + ' ' + cn;
                    }
                }
            }
            else if ( !gp.hasClass( el, cn ) ) {
                el.className = ( el.className === '' ) ? cn : el.className + ' ' + cn;
            }
        };
    
        gp.removeClass = function ( el, cn ) {
            if ( el instanceof NodeList ) {
                for ( var i = 0; i < el.length; i++ ) {
                    el[i].className = gp.trim(( ' ' + el[i].className + ' ' ).replace( ' ' + cn + ' ', ' ' ) );
                }
            }
            else {
                el.className = gp.trim(( ' ' + el.className + ' ' ).replace( ' ' + cn + ' ', ' ' ) );
            }
        };
    
        gp.prependChild = function ( node, child ) {
            if ( typeof node === 'string' ) node = document.querySelector( node );
            if ( !node.firstChild ) {
                node.appendChild( child );
            }
            else {
                node.insertBefore( child, node.firstChild );
            }
            return child;
        };
    
        gp.getRowModel = function ( data, tr ) {
            var index = parseInt( tr.attributes['data-index'].value );
            return data[index];
        };
    
        gp.getTableRow = function ( data, row, node ) {
            var index = data.indexOf( row );
            if ( index == -1 ) return;
            return node.querySelector( 'tr[data-index="' + index + '"]' );
        };
    
        gp.raiseCustomEvent = function ( node, name, detail ) {
            var event = new CustomEvent( name, { bubbles: true, detail: detail, cancelable: true } );
            node.dispatchEvent( event );
            return event;
        };
    
        gp.addBusy = function( evt ) {
            var tblContainer = evt.target.querySelector( 'div.table-container' )
                || gp.closest( evt.target, 'div.table-container' );
    
            if ( tblContainer ) {
                gp.addClass( tblContainer, 'busy' );
            }
        };
    
        gp.removeBusy = function ( evt ) {
            var tblContainer = evt.target.querySelector( 'div.table-container' );
            tblContainer = tblContainer || document.querySelector( 'div.table-container.busy' )
                || gp.closest( evt.target, 'div.table-container' );
    
            if ( tblContainer ) {
                gp.removeClass( tblContainer, 'busy' );
            }
            else {
            }
        };
    
        gp.applyFunc = function ( callback, context, args, error ) {
            if ( typeof callback !== 'function' ) return;
            // anytime there's the possibility of executing 
            // user-supplied code, wrap it with a try-catch block
            // so it doesn't affect my component
            // keep your sloppy JavaScript OUT of my area
            try {
                if ( args == undefined ) {
                    return callback.call( context );
                }
                else {
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
            var html = new gp.StringBuilder();
            if ( typeof ( this.ToolbarTemplate ) === 'function' ) {
                html.add( gp.applyFunc( this.ToolbarTemplate, this ) );
            }
            else {
                html.add( this.ToolbarTemplate );
            }
            return html.toString();
        },
    
        thead: function () {
            var self = this;
            var html = new gp.StringBuilder();
            var sort, template, classes;
            html.add( '<thead>' );
            html.add( '<tr>' );
            this.Columns.forEach( function ( col ) {
                sort = '';
                if ( self.Sorting ) {
                    // if sort isn't specified, use the field
                    sort = gp.escapeHTML( gp.coalesce( [col.Sort, col.Field] ) );
                }
                else {
                    // only provide sorting where it is explicitly specified
                    if ( gp.hasValue( col.Sort ) ) {
                        sort = gp.escapeHTML( col.Sort );
                    }
                }
    
                html.add( '<th class="header-cell ' + ( col.HeaderClass || '' ) + '" data-sort="' + sort + '">' );
    
                // check for a template
                if ( col.HeaderTemplate ) {
                    if ( typeof ( col.HeaderTemplate ) === 'function' ) {
                        html.add( gp.applyFunc( col.HeaderTemplate, self, [col] ) );
                    }
                    else {
                        html.add( gp.processHeaderTemplate.call( this, col.HeaderTemplate, col ) );
                    }
                }
                else if ( sort != '' ) {
                    html.add( '<label class="table-sort">' )
                    .add( '<input type="radio" name="OrderBy" value="' + sort + '" />' )
                    .add( gp.coalesce( [col.Header, col.Field, sort] ) )
                    .add( '</label>' );
                }
                else {
                    html.add( gp.coalesce( [col.Header, col.Field, '&nbsp;'] ) );
                }
                html.add( '</th>' );
            } );
            html.add( '</tr>' )
                .add( '</thead>' );
            return html.toString();
        },
    
        tableRows: function () {
            var self = this;
            var html = new gp.StringBuilder();
            this.pageModel.Data.forEach( function ( row, index ) {
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
                if ( typeof ( col.BodyTemplate ) === 'function' ) {
                    html.add( gp.applyFunc( col.BodyTemplate, this, [row, col] ) );
                }
                else {
                    html.add( gp.processBodyTemplate.call( this, col.BodyTemplate, row, col ) );
                }
            }
            else if ( col.Commands && col.Commands.length ) {
                html.add( '<div class="btn-group" role="group">' );
                col.Commands.forEach( function ( cmd, index ) {
                    if ( cmd == 'Edit' && gp.hasValue( self.Update ) ) {
                        html.add( '<button type="button" class="btn btn-default btn-xs" value="' )
                            .add( cmd )
                            .add( '">' )
                            .add( '<span class="glyphicon glyphicon-edit"></span>' )
                            .add( cmd )
                            .add( '</button>' );
                    }
                    else if ( cmd == 'Delete' && gp.hasValue( self.Delete ) ) {
                        html.add( '<button type="button" class="btn btn-danger btn-xs" value="Delete">' )
                            .add( '<span class="glyphicon glyphicon-remove"></span>Delete' )
                            .add( '</button>' );
                    }
                    else {
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
                // show a checkmark for bools
                if ( type === 'boolean' ) {
                    if ( val === true ) {
                        html.add( '<span class="glyphicon glyphicon-ok"></span>' );
                    }
                }
                else {
                    html.add( val );
                }
            }
            return html.toString();
        },
    
        editCellContent: function ( col, row, mode ) {
            var template, html = new gp.StringBuilder();
    
            // check for a template
            if ( col.EditTemplate ) {
                if ( typeof ( col.EditTemplate ) === 'function' ) {
                    html.add( gp.applyFunc( col.EditTemplate, this, [row, col] ) );
                }
                else {
                    html.add( gp.processBodyTemplate.call( this, col.EditTemplate, row, col ) );
                }
            }
            else if ( col.Commands ) {
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
                var val = row[col.Field];
                // render empty cell if this field doesn't exist in the data
                if ( val === undefined ) return '';
                // render null as empty string
                if ( val === null ) val = '';
                html.add( '<input class="form-control" name="' + col.Field + '" type="' );
                switch ( col.Type ) {
                    case 'date':
                    case 'dateString':
                        //val = gp.getLocalISOString( val ).substring( 0, 10 );
                        html.add( 'text" data-type="date" value="' + gp.escapeHTML( val ) + '" />' );
                        break;
                    case 'number':
                        html.add( 'number" value="' + gp.escapeHTML( val ) + '" />' );
                        break;
                    case 'boolean':
                        html.add( 'checkbox" value="true"' );
                        if ( val ) {
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
            var builder = new gp.StringBuilder(), input, msg;
            builder.add( 'Please correct the following errors:\r\n' );
            // remove error class from inputs
            gp.removeClass( tr.querySelectorAll( '[name].error' ), 'error' );
            validationErrors.forEach( function ( v ) {
                input = tr.querySelector( '[name="' + v.Key + '"]' );
                if ( input ) {
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
            var html = new gp.StringBuilder();
            if ( col.FooterTemplate ) {
                if ( typeof ( col.FooterTemplate ) === 'function' ) {
                    html.add( gp.applyFunc( col.FooterTemplate, this, [col, this.pageModel.Data] ) );
                }
                else {
                    html.add( gp.processFooterTemplate.call( this, col.FooterTemplate, col, this.pageModel.Data ) );
                }
            }
            return html.toString();
        },
    
        setPagerFlags: function () {
            this.pageModel.IsFirstPage = this.pageModel.Page === 1;
            this.pageModel.IsLastPage = this.pageModel.Page === this.pageModel.PageCount;
            this.pageModel.HasPages = this.pageModel.PageCount > 1;
            this.pageModel.PreviousPage = this.pageModel.Page === 1 ? 1 : this.pageModel.Page - 1;
            this.pageModel.NextPage = this.pageModel.Page === this.pageModel.PageCount ? this.pageModel.PageCount : this.pageModel.Page + 1;
        },
    
        sortStyle: function () {
            var html = new gp.StringBuilder();
            if ( gp.isNullOrEmpty( this.pageModel.OrderBy ) === false ) {
                html.add( '#' + this.ID + ' thead th.header-cell[data-sort="' + gp.escapeHTML(this.pageModel.OrderBy) + '"] > label:after' )
                    .add( '{ content: ' );
                if ( this.pageModel.Desc ) {
                    html.add( '"\\e114"; }' );
                }
                else {
                    html.add( '"\\e113"; }' );
                }
            }
            return html.toString();
        },
    
        columnWidthStyle: function () {
            var self = this,
                html = new gp.StringBuilder(),
                index = 0,
                bodyCols = document.querySelectorAll( '#' + this.ID + ' .table-body > table > tbody > tr:first-child > td' );
    
            // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
            this.Columns.forEach( function ( col ) {
                if ( col.Width ) {
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
            var html = new gp.StringBuilder();
            if ( this.FixedHeaders ) {
                html.add( ' fixed-headers' );
            }
            if ( this.FixedFooters ) {
                html.add( ' fixed-footers' );
            }
            if ( this.Pager ) {
                html.add( ' pager-' + this.Pager );
            }
            if ( this.Responsive ) {
                html.add( ' responsive' );
            }
            if ( this.Search ) {
                html.add( ' search-' + this.Search );
            }
            if ( this.Onrowselect ) {
                html.add( ' selectable' );
            }
            return html.toString();
        }
    
    };
    

    /***************\
         http        
    \***************/
    gp.Http = function () { };
    
    gp.Http.prototype = {
        serialize: function ( obj ) {
            // creates a query string from a simple object
            var props = Object.getOwnPropertyNames( obj );
            var out = [];
            props.forEach( function ( prop ) {
                out.push( encodeURIComponent( prop ) + '=' + ( gp.isNullOrEmpty( obj[prop] ) ? '' : encodeURIComponent( obj[prop] ) ) );
            } );
            return out.join( '&' );
        },
        createXhr: function ( type, url, callback, error ) {
            var xhr = new XMLHttpRequest();
            xhr.open(type.toUpperCase(), url, true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.onload = function () {
                var response = ( gp.rexp.json.test( xhr.responseText ) ? JSON.parse( xhr.responseText ) : xhr.responseText );
                if ( xhr.status == 200 ) {
                    callback( response, xhr );
                }
                else {
                    gp.applyFunc( error, xhr, response );
                }
            }
            xhr.onerror = error;
            return xhr;
        },
        get: function (url, callback, error) {
            var xhr = this.createXhr('GET', url, callback, error);
            xhr.send();
        },
        post: function ( url, data, callback, error ) {
            var s = this.serialize( data );
            var xhr = this.createXhr( 'POST', url, callback, error );
            xhr.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8' );
            xhr.send( s );
        },
        'delete': function ( url, data, callback, error ) {
            var s = this.serialize( data );
            var xhr = this.createXhr( 'DELETE', url, callback, error );
            xhr.setRequestHeader( 'Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8' );
            xhr.send( s );
        }
    
    };

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
            var requestModel = new gp.PagingModel();
            var controller = new gp.Controller( self.config, model, requestModel );
            this.node.api = new gp.api( controller );
            this.renderLayout( this.config );
            this.addBusyHandlers();
    
            if ( typeof this.config.Ready === 'function' ) {
                controller.ready( this.config.Ready );
            }
    
            if ( typeof this.config.AfterEdit === 'function' ) {
                gp.on( this.config.node, gp.events.afterEdit, this.config.AfterEdit );
            }
    
            // events should be raised AFTER the node is added to the DOM or they won't bubble
            // this problem occurs when nodes are created and then added to the DOM programmatically 
            // that means initialize has to return before it raises any events
            setTimeout( function () {
                // provides a hook for extensions
                gp.raiseCustomEvent( self.config.node, gp.events.beforeInit, self.config );
    
                gp.raiseCustomEvent( self.config.node, gp.events.beforeRead, self.config.pageModel );
    
                model.read( requestModel,
                    function ( data ) {
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
                        gp.raiseCustomEvent( self.config.node, gp.events.httpError, e );
                        alert( 'An error occurred while carrying out your request.' );
                        gp.error( e );
                    }
    
                );
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
            var options = 'Onrowselect SearchFunction Read Create Update Delete Validate Ready AfterEdit'.split(' ');
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
                // look for a type by Field first, then by Sort
                var field = gp.hasValue( col.Field ) ? col.Field : col.Sort;
                if ( gp.isNullOrEmpty( field ) ) return;
                if ( config.pageModel.Types && config.pageModel.Types[field] != undefined ) {
                    col.Type = gp.convertClrType( config.pageModel.Types[field] )
                }
                else {
                    if ( config.pageModel.Data.length ) {
                        // if we haven't found a value after 200 iterations, give up
                        for ( var i = 0; i < config.pageModel.Data.length && i < 200 ; i++ ) {
                            if ( config.pageModel.Data[i][field] !== null ) {
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
         model
    \***************/
    gp.Model = function ( config ) {
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
            var self = this;
    
    
            this.dal.read(
                requestModel,
                function ( arg ) { gp.applyFunc( callback, self, arg ); },
                function ( arg ) { gp.applyFunc( error, self, arg ); }
            );
        },
    
        create: function ( row, callback, error) {
            var self = this, url;
    
            // config.Create can be a function or a URL
            if ( typeof this.config.Create === 'function' ) {
                // call the function, set the API as the context
                gp.applyFunc(this.config.Create, this.config.node.api, [row, callback, error], error);
            }
            else {
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
            var self = this, url;
    
            // config.Update can be a function or URL
            if ( typeof this.config.Update === 'function' ) {
                gp.applyFunc(this.config.Update, this.config.node.api, [row, callback, error], error);
            }
            else {
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
            var self = this, url;
            if ( typeof this.config.Delete === 'function' ) {
                gp.applyFunc(this.config.Delete, this.config.node.api, [row, callback, error], error);
            }
            else {
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
        this.node = parent || null;
    };
    
    gp.NodeBuilder.prototype = {
    
        startElem: function ( tagName ) {
            var n = document.createElement( tagName );
    
            if ( this.node ) {
                this.node.appendChild( n );
            }
    
            this.node = n;
    
            return this;
        },
    
        addClass: function ( name ) {
            if ( gp.isNullOrEmpty( name ) ) return this;
    
            var hasClass = ( ' ' + this.node.className + ' ' ).indexOf( ' ' + name + ' ' ) !== -1;
    
            if ( !hasClass ) {
                this.node.className = ( this.node.className === '' ) ? name : this.node.className + ' ' + name;
            }
    
            return this;
        },
    
        html: function ( html ) {
            this.node.innerHTML = gp.hasValue( html ) ? html : '';
            return this;
        },
    
        endElem: function () {
            if ( this.node.parentElement ) {
                this.node = this.node.parentElement;
            }
            return this;
        },
    
        attr: function ( name, value ) {
            var attr = document.createAttribute( name );
    
            if ( value != undefined ) {
                attr.value = gp.escapeHTML( value );
            }
    
            this.node.setAttributeNode( attr );
    
            return this;
        },
    
        close: function () {
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
        var self = this;
        var dict = {};
    
        // create mirror properties
        var props = Object.getOwnPropertyNames( obj );
    
        props.forEach(function (prop) {
            Object.defineProperty(self, prop, {
                get: function () {
                    return dict[prop];
                },
                set: function (value) {
                    if (dict[prop] != value) {
                        var oldValue = dict[prop];
                        dict[prop] = value;
                        if ( typeof onPropertyChanged === 'function' ) {
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
        this.url = url;
    };
    
    gp.ServerPager.prototype = {
        read: function ( model, callback, error ) {
            var copy = gp.shallowCopy( model );
            // delete anything we don't want to send to the server
            var props = Object.getOwnPropertyNames( copy ).forEach(function(prop){
                if ( /^(Page|Top|OrderBy|Desc|Search)$/i.test( prop ) == false ) {
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
        var value, self = this;
        this.data = config.pageModel.Data;
        this.columns = config.Columns.filter(function (c) {
            return c.Field !== undefined || c.Sort !== undefined;
        });
        if (typeof config.SearchFunction === 'function') {
            this.searchFilter = config.SearchFunction;
        }
        else {
            this.searchFilter = function (row, search) {
                var s = search.toLowerCase();
                for (var i = 0; i < self.columns.length; i++) {
                    value = gp.getFormattedValue( row, self.columns[i], false );
                    if (gp.hasValue(value) && value.toString().toLowerCase().indexOf(s) !== -1) {
                        return true;
                    }
                }
                return false;
            };
        }
    };
    
    gp.ClientPager.prototype = {
        read: function (model, callback, error) {
            try {
                var self = this,
                    search,
                    skip = this.getSkip( model );
    
                // don't modify the original array
                model.Data = this.data.slice(0, this.data.length);
    
                // filter first
                if ( !gp.isNullOrEmpty( model.Search ) ) {
                    // make sure searchTerm is a string and trim it
                    search = gp.trim( model.Search.toString() );
                    model.Data = model.Data.filter(function (row) {
                        return self.searchFilter(row, search);
                    });
                }
    
                // set TotalRows after filtering, but before paging
                model.TotalRows = model.Data.length;
    
                // then sort
                if (gp.isNullOrEmpty(model.OrderBy) === false) {
                    var col = this.getColumnByField( this.columns, model.OrderBy );
                    if (gp.hasValue(col)) {
                        var sortFunction = this.getSortFunction( col, model.Desc );
                        var fieldName = col.Field || col.Sort;
                        model.Data.sort( function ( row1, row2 ) {
                            return sortFunction( row1[fieldName], row2[fieldName] );
                        });
                    }
                }
    
                // then page
                if (model.Top !== -1) {
                    model.Data = model.Data.slice(skip).slice(0, model.Top);
                }
            }
            catch (ex) {
                gp.error( ex );
            }
            callback(model);
        },
        getSkip: function ( model ) {
            var data = model;
            if ( data.PageCount == 0 ) {
                return 0;
            }
            if ( data.Page < 1 ) {
                data.Page = 1;
            }
            else if ( data.Page > data.PageCount ) {
                return data.Page = data.PageCount;
            }
            return ( data.Page - 1 ) * data.Top;
        },
        getColumnByField: function ( columns, field ) {
            var col = columns.filter(function (c) { return c.Field === field || c.Sort === field });
            return col.length ? col[0] : null;
        },
        getSortFunction: function (col, desc) {
            if ( /^(number|date|boolean)$/.test( col.Type ) ) {
                if ( desc ) {
                    return this.diffSortDesc;
                }
                return this.diffSortAsc;
            }
            else {
                if ( desc ) {
                    return this.stringSortDesc;
                }
                return this.stringSortAsc;
            }
        },
        diffSortDesc: function(a, b) {
            return b - a;
        },
        diffSortAsc: function(a, b) {
            return a - b;
        },
        stringSortDesc: function (a, b) {
            if (a === null) {
                if (b != null) {
                    return 1;
                }
                return 0;
            }
            else if (b === null) {
                // we already know a isn't null
                return -1;
            }
    
            // string sorting is the default if no type was detected
            // so make sure what we're sorting is a string
    
            if ( a.toString().toLowerCase() > b.toString().toLowerCase() ) {
                return -1;
            }
            if ( a.toString().toLowerCase() < b.toString().toLowerCase() ) {
                return 1;
            }
    
            return 0;
        },
        stringSortAsc: function (a, b) {
            if (a === null) {
                if (b != null) {
                    return -1;
                }
                return 0;
            }
            else if (b === null) {
                // we already know a isn't null
                return 1;
            }
    
            // string sorting is the default if no type was detected
            // so make sure what we're sorting is a string
    
            if ( a.toString().toLowerCase() > b.toString().toLowerCase() ) {
                return 1;
            }
            if ( a.toString().toLowerCase() < b.toString().toLowerCase() ) {
                return -1;
            }
    
            return 0;
        }
    };
    
    /***************\
      FunctionPager
    \***************/
    
    gp.FunctionPager = function ( config ) {
        this.config = config;
    };
    
    gp.FunctionPager.prototype = {
        read: function ( model, callback, error ) {
            try {
                var type,
                    result = this.config.Read( model, callback );
    
                // if the function returned a value instead of using the callback
                // check its type
                if ( result != undefined ) {
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
                    gp.applyFunc( error, this, ex );
                }
                else {
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
                return self.Page - 1;
            }
        });
    
        Object.defineProperty(self, 'PageCount', {
            get: function () {
                if ( self.Top > 0 ) {
                    return Math.ceil( self.TotalRows / self.Top );
                }
                if ( self.TotalRows === 0 ) return 0;
                return 1;
            }
        });
    
        Object.defineProperty(self, 'Skip', {
            get: function () {
                if (self.Top !== -1) {
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
                return self.Page - 1;
            }
        });
    
        Object.defineProperty(self, 'PageCount', {
            get: function () {
                if ( self.Top > 0 ) {
                    return Math.ceil( self.TotalRows / self.Top );
                }
                if ( self.TotalRows === 0 ) return 0;
                return 1;
            }
        });
    
        Object.defineProperty(self, 'Skip', {
            get: function () {
                if (self.Top !== -1) {
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
    
        var isReady = false;
    
        var completed = function (event) {
            // readyState === "complete" is good enough for us to call the dom ready in oldIE
            if (document.addEventListener || event.type === "load" || document.readyState === "complete") {
                isReady = true;
                detach();
                fn();
            }
        };
    
        var detach = function () {
            if (document.addEventListener) {
                document.removeEventListener("DOMContentLoaded", completed, false);
                window.removeEventListener("load", completed, false);
    
            } else {
                document.detachEvent("onreadystatechange", completed);
                window.detachEvent("onload", completed);
            }
        };
    
        if (document.readyState === "complete") {
            // Handle it asynchronously to allow scripts the opportunity to delay ready
            setTimeout(fn);
    
            // Standards-based browsers support DOMContentLoaded
        } else if (document.addEventListener) {
            // Use the handy event callback
            document.addEventListener("DOMContentLoaded", completed, false);
    
            // A fallback to window.onload, that will always work
            window.addEventListener("load", completed, false);
    
            // If IE event model is used
        } else {
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
                (function doScrollCheck() {
                    if (!isReady) {
    
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
        this.out = [];
    };
    
    gp.StringBuilder.prototype = {
    
        add: function ( str ) {
            this.out.push( str );
            return this;
        },
    
        toString: function ( ) {
            return this.out.join('');
        }
    
    };

    /***************\
       UpdateModel
    \***************/
    gp.UpdateModel = function ( row, validationErrors ) {
    
        this.Row = row;
        this.ValidationErrors = validationErrors;
        this.Original = gp.shallowCopy( row );
    
    };

    /***************\
       Gridponent
    \***************/
    
    // check for web component support
    if (document.registerElement) {
    
        gp.Gridponent = Object.create(HTMLElement.prototype);
    
        gp.Gridponent.createdCallback = function () {
            var init = new gp.Initializer( this );
            gp.ready( init.initialize.bind( init ) );
        };
    
        gp.Gridponent.detachedCallback = function () {
            this.api.dispose();
        };
    
        document.registerElement('grid-ponent', {
            prototype: gp.Gridponent
        });
    }
    else {
        // no web component support
        // provide a static function to initialize grid-ponent elements manually
        gp.initialize = function (root) {
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
        var out = [];
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                if (!model.FixedHeaders) {
                        out.push(gp.helpers['thead'].call(model));
                    }
            out.push('<tbody>');
                    out.push(gp.helpers['tableRows'].call(model));
            out.push('</tbody>');
                if (model.Footer && !model.FixedFooters) {
                        out.push(gp.templates['gridponent-tfoot'](model));
                    }
            out.push('</table>');
        return out.join('');
    };
    gp.templates['gridponent-cells'] = function(model, arg) {
        var out = [];
        model.Columns.forEach(function(col, index) {
                out.push('    <td class="body-cell ');
        out.push(col.BodyClass);
        out.push('" ');
        if (col.BodyStyle) {
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
        var out = [];
        out.push(gp.helpers['setPagerFlags'].call(model));
                if (model.pageModel.HasPages) {
                out.push('<div class="btn-group">');
        out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsFirstPage) {
        out.push(' disabled ');
        }
        out.push('" title="First page">');
        out.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>');
                        if (model.pageModel.IsFirstPage == false) {
            out.push('<input type="radio" name="Page" value="1" />');
                        }
            out.push('</label>');
            out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsFirstPage) {
        out.push(' disabled ');
        }
        out.push('" title="Previous page">');
        out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
                        if (model.pageModel.IsFirstPage == false) {
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
        out.push(' disabled ');
        }
        out.push('" title="Next page">');
        out.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>');
                        if (model.pageModel.IsLastPage == false) {
            out.push('            <input type="radio" name="Page" value="');
        out.push(model.pageModel.NextPage);
        out.push('" />');
                        }
            out.push('</label>');
            out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsLastPage) {
        out.push(' disabled ');
        }
        out.push('" title="Last page">');
        out.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>');
                        if (model.pageModel.IsLastPage == false) {
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
        var out = [];
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                out.push(gp.templates['gridponent-tfoot'](model));
            out.push('</table>');
        return out.join('');
    };
    gp.templates['gridponent-tfoot'] = function(model, arg) {
        var out = [];
        out.push('<tfoot>');
        out.push('<tr>');
                    model.Columns.forEach(function(col, index) {
            out.push('<td class="footer-cell">');
                        out.push(gp.helpers['footerCell'].call(model, col));
            out.push('</td>');
                    });
            out.push('</tr>');
        out.push('</tfoot>');
        return out.join('');
    };
    gp.templates['gridponent'] = function(model, arg) {
        var out = [];
        out.push('<div class="gp table-container');
        out.push(gp.helpers['containerClasses'].call(model));
        out.push('" id="');
        out.push(model.ID);
        out.push('">');
                if (model.Search || model.Create || model.ToolbarTemplate) {
            out.push('<div class="table-toolbar">');
                        if (model.ToolbarTemplate) {
                                out.push(gp.helpers['toolbarTemplate'].call(model));
                            } else {
                                if (model.Search) {
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
            out.push('<button class="btn btn-default" type="button" value="AddRow">');
        out.push('<span class="glyphicon glyphicon-plus"></span>Add');
        out.push('</button>');
                            }
                            }
            out.push('</div>');
                }
                    if (model.FixedHeaders) {
            out.push('<div class="table-header">');
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                            out.push(gp.helpers['thead'].call(model));
            out.push('</table>');
        out.push('</div>');
                }
            out.push('    <div class="table-body ');
        if (model.FixedHeaders) {
        out.push('table-scroll');
        }
        out.push('" style="');
        out.push(model.Style);
        out.push('">');
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                        if (!model.FixedHeaders) {
                                out.push(gp.helpers['thead'].call(model));
                            }
            out.push('</table>');
        out.push('</div>');
                if (model.FixedFooters) {
            out.push('<div class="table-footer">');
                        out.push(gp.templates['gridponent-table-footer'](model));
            out.push('</div>');
                }
                    if (model.Pager) {
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


})(gridponent);
