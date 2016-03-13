﻿// namespace
var gridponent = gridponent || {};

(function(gp) { 

    /***************\
          API
    \***************/
    
    gp.api = function ( controller ) {
        this.controller = controller;
    };
    
    gp.api.prototype = {
    
        ready: function(callback) {
            this.controller.ready( callback );
        },
    
        getData: function ( index ) {
            if ( typeof index == 'number' ) return this.controller.config.pageModel.Data[index];
            return this.controller.config.pageModel.Data;
        },
    
        addRow: function ( row ) {
            this.controller.config.pageModel.Data.push( row );
        },
    
        search: function ( searchTerm, callback ) {
            this.controller.search( searchTerm, callback );
        },
    
        sort: function ( name, desc, callback ) {
            this.controller.sort( name, desc, callback );
        },
    
        read: function ( requestModel, callback ) {
            requestModel = requestModel || this.controller.config.pageModel;
            this.controller.read( requestModel, callback );
        },
    
        create: function (callback) {
            this.controller.createRow(callback);
        },
    
        // This would have to be called after having retrieved the row from the table with getData().
        // The controller will attempt to figure out which tr it is by first calling indexOf(row) on the data.
        // So the original row object reference has to be preserved.
        // this function is mainly for testing
        update: function ( row, callback ) {
            var tr = gp.getTableRow( this.controller.config.pageModel.Data, row, this.controller.config.node );
    
            tr['gp-update-model'] = new gp.UpdateModel( row );
    
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
            rowSelectHandler: self.rowSelectHandler.bind( self )
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
            this.removeReadHandlers();
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
                case 'Create':
                    this.createRow();
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
            this.model.read( this.config.pageModel, function ( model ) {
                gp.shallowCopy( model, self.config.pageModel );
                self.refresh( self.config );
                gp.raiseCustomEvent( this.config.node, gp.events.afterRead, { model: this.config.pageModel } );
                gp.applyFunc( callback, self.config.node, self.config.pageModel );
            } );
        },
    
        createRow: function (callback) {
            try {
                var self = this,
                    updateModel,
                    tbody,
                    rowIndex,
                    bodyCellContent,
                    editCellContent,
                    builder;
    
                if ( !gp.hasValue( this.config.Create ) ) {
                    gp.applyFunc( callback, self.config.node );
                    return;
                }
    
                gp.raiseCustomEvent( self.config.node, gp.events.beforeCreate );
    
                // ask the data layer for a new row
                this.model.create(function (row) {
    
                    // add the new row to the internal data array
                    self.config.pageModel.Data.push( row );
    
                    // wrap the new row in an UpdateModel
                    updateModel = new gp.UpdateModel( row );
    
                    tbody = self.config.node.querySelector( 'div.table-body > table > tbody' );
                    rowIndex = self.config.pageModel.Data.indexOf( row );
                    bodyCellContent = gp.helpers['bodyCellContent'];
                    editCellContent = gp.helpers['editCellContent'];
    
                    // use a NodeBuilder to create a tr[data-index=rowIndex].create-mode
                    builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-index', rowIndex ).addClass('create-mode');
    
                    // add td.body-cell elements to the tr
                    self.config.Columns.forEach( function ( col ) {
                        var html = col.Readonly
                            ? bodyCellContent.call( self.config, col, row )
                            : editCellContent.call( self.config, col, row );
                        builder.startElem( 'td' ).addClass( 'body-cell' ).html(html).endElem();
                    } );
    
                    var tr = builder.close();
    
                    gp.prependChild( tbody, tr );
    
                    tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', row ).start();
    
                    tr['gp-update-model'] = updateModel;
    
                    gp.raiseCustomEvent( self.config.node, gp.events.afterCreate, {
                        model: updateModel,
                        tableRow: tr
                    } );
    
                    gp.applyFunc( callback, self.config.node, row );
                } );
            }
            catch (ex) {
                gp.error( ex );
    
                gp.applyFunc( callback, self.config.node );
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
                        cells[i].innerHTML = editCellContent.call( this.config, col, row );
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
    
                gp.raiseCustomEvent(tr, 'beforeUpdate', {
                    model: updateModel
                });
    
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
    
                    gp.raiseCustomEvent( tr, gp.events.afterUpdate, {
                        model: updateModel
                    } );
    
                    gp.applyFunc( callback, self.config.node, updateModel );
                } );
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
                    url = this.config.Delete,
                    confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' ),
                    message,
                    tr = gp.getTableRow(this.config.pageModel.Data, row, this.config.node);
    
                if ( !confirmed ) {
                    gp.applyFunc( callback, this.config.node );
                    return;
                }
    
                gp.raiseCustomEvent(this.config.node, gp.events.beforeDelete, {
                    row: row
                } );
    
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
    
                    gp.raiseCustomEvent( self.config.node, gp.events.afterDelete, {
                        row: row
                    } );
    
                    gp.applyFunc( callback, self.config.node, response );
                } );
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
        },
    
        removeReadHandlers: function () {
            gp.off( this.config.node, gp.events.beforeRead, gp.addBusy );
            gp.off( this.config.node, gp.events.afterRead, gp.removeBusy );
            gp.off( this.config.node, gp.events.beforeUpdate, gp.addBusy );
            gp.off( this.config.node, gp.events.afterUpdate, gp.removeBusy );
            gp.off( this.config.node, gp.events.beforeDelete, gp.addBusy );
            gp.off( this.config.node, gp.events.afterDelete, gp.removeBusy );
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
            braces: /{{.+?}}/g
        };
    
        // logging
        gp.logging = 'info';
        gp.log = window.console ? window.console.log.bind( window.console ) : function () { };
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
    
        gp.getLocalISOString = function ( date ) {
            if ( typeof date === 'string' ) return date;
            var offset = date.getTimezoneOffset();
            var adjustedDate = new Date( date.valueOf() - ( offset * 60000 ) );
            return adjustedDate.toISOString();
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
            // it's either a selector or a function
            var t = gp.getObjectAtPath( template );
            if ( typeof ( t ) === 'function' ) {
                return t;
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
    
            if ( /date|datestring/.test( type ) ) {
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
            var self = this, types = /string|number|boolean/;
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
            if ( !gp.hasClass( el, cn ) ) {
                el.className = ( el.className === '' ) ? cn : el.className + ' ' + cn;
            }
        };
    
        gp.removeClass = function ( el, cn ) {
            el.className = gp.trim(( ' ' + el.className + ' ' ).replace( ' ' + cn + ' ', ' ' ) );
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
        };
    
        gp.events = {
            beforeInit: 'beforeInit',
            afterInit: 'afterInit',
            beforeRead: 'beforeRead',
            beforeCreate: 'beforeCreate',
            beforeUpdate: 'beforeUpdate',
            beforeDelete: 'beforeDelete',
            beforeEditMode: 'beforeEditMode',
            afterRead: 'afterRead',
            afterCreate: 'afterCreate',
            afterUpdate: 'afterUpdate',
            afterDelete: 'afterDelete',
            afterEditMode: 'afterEditMode',
            beforeDispose: 'beforeDispose'
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
    
        'toolbarTemplate': function () {
            var html = new gp.StringBuilder();
            if ( typeof ( this.ToolbarTemplate ) === 'function' ) {
                html.add( gp.applyFunc( this.ToolbarTemplate, this ) );
            }
            else {
                html.add( this.ToolbarTemplate );
            }
            return html.toString();
        },
    
        'thead': function () {
            var self = this;
            var html = new gp.StringBuilder();
            var sort, type, template;
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
                type = gp.coalesce( [col.Type, ''] ).toLowerCase();
    
                html.add( '<th class="header-cell ' + type + '" data-sort="' + sort + '">' );
    
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
    
        'tableRows': function () {
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
    
        'bodyCellContent': function ( col, row ) {
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
    
        'editCellContent': function ( col, row ) {
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
                    .add( '<button type="button" class="btn btn-primary btn-xs" value="Update">' )
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
    
        'validation': function ( tr, validationErrors ) {
            var builder = new gp.StringBuilder();
            builder.add('Please correct the following errors:\r\n');
            validationErrors.forEach( function ( v ) {
                builder.add(v.Key + ':\r\n');
                // extract the error message
                var msg = v.Value.Errors.map( function ( e ) { return '    - ' + e.ErrorMessage + '\r\n'; } ).join( '' );
                builder.add( msg );
            } );
            alert( builder.toString() );
        },
    
        'footerCell': function ( col ) {
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
    
        'setPagerFlags': function () {
            this.pageModel.IsFirstPage = this.pageModel.Page === 1;
            this.pageModel.IsLastPage = this.pageModel.Page === this.pageModel.PageCount;
            this.pageModel.HasPages = this.pageModel.PageCount > 1;
            this.pageModel.PreviousPage = this.pageModel.Page === 1 ? 1 : this.pageModel.Page - 1;
            this.pageModel.NextPage = this.pageModel.Page === this.pageModel.PageCount ? this.pageModel.PageCount : this.pageModel.Page + 1;
        },
    
        'sortStyle': function () {
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
    
        'columnWidthStyle': function () {
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
    
        'containerClasses': function () {
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
            this.attachReadEvents();
    
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
    
        attachReadEvents: function () {
            gp.on( this.config.node, gp.events.beforeRead, gp.addBusy );
            gp.on( this.config.node, gp.events.afterRead, gp.removeBusy );
            gp.on( this.config.node, gp.events.beforeUpdate, gp.addBusy );
            gp.on( this.config.node, gp.events.afterUpdate, gp.removeBusy );
            gp.on( this.config.node, gp.events.beforeDelete, gp.addBusy );
            gp.on( this.config.node, gp.events.afterDelete, gp.removeBusy );
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

    /***************\
       mock-http
    \***************/
    (function (gp) {
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
                // creates a query string from a simple object
                var self = this;
                props = props || Object.getOwnPropertyNames(obj);
                var out = [];
                props.forEach(function (prop) {
                    out.push(encodeURIComponent(prop) + '=' + encodeURIComponent(obj[prop]));
                });
                return out.join('&');
            },
            deserialize: function (queryString) {
                var nameValue, split = queryString.split( '&' );
                var obj = {};
                if ( !queryString ) return obj;
                split.forEach( function ( s ) {
                    nameValue = s.split( '=' );
                    var val = nameValue[1];
                    if ( !val ) {
                        obj[nameValue[0]] = null;
                    }
                    else if ( /true|false/i.test( val ) ) {
                        obj[nameValue[0]] = ( /true/i.test( val ) );
                    }
                    else if ( parseFloat( val ).toString() === val ) {
                        obj[nameValue[0]] = parseFloat( val );
                    }
                    else {
                        obj[nameValue[0]] = val;
                    }
                } );
                return obj;
            },
            get: function (url, callback, error) {
                if (routes.read.test(url)) {
                    var index = url.substring(url.indexOf('?'));
                    if (index !== -1) {
                        var queryString = url.substring(index + 1);
                        var model = this.deserialize(queryString);
                        this.post(url.substring(0, index), model, callback, error);
                    }
                    else {
                        this.post(url, null, callback, error);
                    }
                }
                else if (routes.create.test(url)) {
                    var result = { "ProductID": 0, "Name": "", "ProductNumber": "", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": "", "SafetyStockLevel": 0, "ReorderPoint": 0, "StandardCost": 0, "ListPrice": 0, "Size": "", "SizeUnitMeasureCode": "", "WeightUnitMeasureCode": "", "Weight": 0, "DaysToManufacture": 0, "ProductLine": "", "Class": "", "Style": "", "ProductSubcategoryID": 0, "ProductModelID": 0, "SellStartDate": "2007-07-01T00:00:00", "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "00000000-0000-0000-0000-000000000000", "ModifiedDate": "2008-03-11T10:01:36.827", "Markup": null };
                    callback(result);
                }
                else {
                    throw 'Not found: ' + url;
                }
            },
            post: function (url, model, callback, error) {
                model = model || {};
                if (routes.read.test(url)) {
                    getData(model, callback);
                }
                else if (routes.update.test(url)) {
                    callback( new gp.UpdateModel(model) );
                }
                else {
                    throw '404 Not found: ' + url;
                }
            },
            'delete': function ( url, model, callback, error ) {
                model = model || {};
                var index = data.products.indexOf( model );
                callback( {
                    Success: true,
                    Message: ''
                } );
            }
        };
    
        var getData = function (model, callback) {
            var count, d = data.products;
            if (!gp.isNullOrEmpty(model.Search)) {
                var props = Object.getOwnPropertyNames(d[0]);
                var search = model.Search.toLowerCase();
                d = d.filter(function (row) {
                    for (var i = 0; i < props.length; i++) {
                        if (row[props[i]] && row[props[i]].toString().toLowerCase().indexOf(search) !== -1) {
                            return true;
                        }
                    }
                    return false;
                });
            }
            if (!gp.isNullOrEmpty(model.OrderBy)) {
                if (model.Desc) {
                    d.sort(function (row1, row2) {
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
                        if (a === null) {
                            if (b != null) {
                                return 1;
                            }
                        }
                        else if (b === null) {
                            // we already know a isn't null
                            return -1;
                        }
                        if (a > b) {
                            return -1;
                        }
                        if (a < b) {
                            return 1;
                        }
    
                        return 0;
                    });
                }
                else {
                    d.sort(function (row1, row2) {
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
                        if (a === null) {
                            if (b != null) {
                                return -1;
                            }
                        }
                        else if (b === null) {
                            // we already know a isn't null
                            return 1;
                        }
                        if (a > b) {
                            return 1;
                        }
                        if (a < b) {
                            return -1;
                        }
    
                        return 0;
                    });
                }
            }
            count = d.length;
            if (model.Top !== -1) {
                model.Data = d.slice(model.Skip).slice(0, model.Top);
            }
            else {
                model.Data = d;
            }
            model.ValidationErrors = [];
            setTimeout(function () {
                callback(model);
            });
    
        };
    
    })(gridponent);

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
                // Read is a RequestModel
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
    
        create: function (callback, error) {
            var self = this,
                args,
                row;
    
            // Create config option can be a function or a URL
            if ( typeof this.config.Create === 'function' ) {
                // call the function, set the API as the context
                gp.applyFunc(this.config.Create, this.config.node.api, [callback, error], error);
            }
            else {
                // call the URL
                var http = new gp.Http();
                http.get(
                    this.config.Create,
                    function ( row ) { gp.applyFunc( callback, self, row ); },
                    function ( arg ) { gp.applyFunc( error, self, row ); }
                );
            }
        },
    
        update: function (row, callback, error) {
            var self = this;
            // config.Update can be a function or URL
            gp.raiseCustomEvent( this.config.node, gp.events.beforeUpdate );
            if ( typeof this.config.Update === 'function' ) {
                gp.applyFunc(this.config.Update, this.config.node.api, [row, callback, error], error);
            }
            else {
                var http = new gp.Http();
                http.post(
                    this.config.Update,
                    row,
                    function ( arg ) { gp.applyFunc( callback, self, arg ); },
                    function ( arg ) { gp.applyFunc( error, self, arg ); }
                );
            }
        },
    
        'delete': function (row, callback, error) {
            var self = this;
            if ( typeof this.config.Delete === 'function' ) {
                gp.applyFunc(this.config.Delete, this.config.node.api, [row, callback, error], error);
            }
            else {
                var http = new gp.Http();
                http.delete(
                    this.config.Delete,
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
            if ( /number|date|boolean/.test( col.Type ) ) {
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
            if (a.toLowerCase() > b.toLowerCase()) {
                return -1;
            }
            if (a.toLowerCase() < b.toLowerCase()) {
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
            if (a.toLowerCase() > b.toLowerCase()) {
                return 1;
            }
            if (a.toLowerCase() < b.toLowerCase()) {
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
                            // assume it's a row, wrap it in a RequestModel
                            callback( new gp.RequestModel( result ) );
                            break;
                        case 'object':
                            // assume a RequestModel
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
        out.push(col.Type);
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
                            }
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
            out.push('<button class="btn btn-default" type="button" value="Create">');
        out.push('<span class="glyphicon glyphicon-plus"></span>Add');
        out.push('</button>');
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
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                            out.push(gp.templates['gridponent-tfoot'](model));
            out.push('</table>');
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
