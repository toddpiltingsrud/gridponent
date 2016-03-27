﻿
/***************\
   Gridponent
\***************/

var gridponent = gridponent || function ( elem, options ) {
    // check for a selector
    if ( typeof elem == 'string' ) {
        elem = document.querySelector( elem );
    }
    if (elem instanceof HTMLElement) {
        // has this already been initialized?
        if ( elem.api ) return elem.api;

        if ( options ) {
            var init = new gridponent.Initializer( elem );
            init.initializeOptions( options );
            return elem.api;
        }
    }
};

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
        if ( typeof index == 'number' ) return this.controller.config.pageModel.data[index];
        return this.controller.config.pageModel.data;
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
        var tr = gp.getTableRow( this.controller.config.pageModel.data, row, this.controller.config.node );

        this.controller.updateRow( row, tr, callback );
    },

    'destroy': function ( row, callback ) {
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

    commandHandler: function(evt) {
        var command, tr, row, node = this.config.node;
        command = evt.selectedTarget.attributes['value'].value;
        tr = gp.closest( evt.selectedTarget, 'tr[data-index]', node );
        row = tr ? gp.getRowModel( this.config.pageModel.data, tr ) : null;
        switch ( command ) {
            case 'AddRow':
                this.addRow();
                break;
            case 'create':
                this.createRow( row, tr );
                break;
            case 'Edit':
                this.editRow( row, tr );
                break;
            case 'update':
                this.updateRow( row, tr );
                break;
            case 'Cancel':
                this.cancelEdit( row, tr );
                break;
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
            row;

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

        var customEvt = gp.raiseCustomEvent( tr, gp.events.rowSelected, {
            row: row,
            tableRow: tr
        } );

        if ( customEvt.cancel ) return;

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

            if ( !gp.hasValue( this.config.create ) ) {
                return;
            }

            if ( row == undefined ) {
                row = {};

                // create a row using the config object
                // check for a Model first
                if ( typeof this.config.Model == 'object' ) {
                    gp.shallowCopy( config.Model, row );
                }
                else if ( this.config.pageModel.data.length > 0 ) {
                    Object.getOwnPropertyNames( this.config.pageModel.data[0] ).forEach( function ( field ) {
                        jsType = gp.getType( self.config.pageModel.data[0][field] );
                        row[field] = gp.getDefaultValue( jsType );
                    } );
                }
                else {
                    this.config.columns.foreach( function ( col ) {
                        if ( gp.hasValue( gp.field ) ) {
                            row[field] = '';
                        }
                    } );
                }
            }

            // gives external code the opportunity to set defaults on the new row
            gp.raiseCustomEvent( self.config.node, gp.events.beforeAdd, row );

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
            gp.raiseCustomEvent( tr, gp.events.editMode, {
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
                self = this;

            // if there is no create configuration setting, we're done here
            if ( !gp.hasValue( this.config.create ) ) {
                gp.applyFunc( callback, self.config.node );
                return;
            }

            gp.raiseCustomEvent( this.config.node, gp.events.beforeCreate, row );

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
                col = this.config.columns[i];
                if ( !col.readonly ) {
                    cells[i].innerHTML = editCellContent.call( this.config, col, row, 'edit' );
                }
            }
            gp.addClass( tr, 'edit-mode' );
            tr['gp-change-monitor'] = new gp.ChangeMonitor( tr, '[name]', row ).start();

            // gives external code the opportunity to initialize UI elements (e.g. datepickers)
            gp.raiseCustomEvent( tr, gp.events.editMode, {
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
                self = this;

            // if there is no update configuration setting, we're done here
            if ( !gp.hasValue( this.config.update ) ) {
                gp.applyFunc( callback, self.config.node );
                return;
            }

            gp.raiseCustomEvent(tr, gp.events.beforeUpdate, row );

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

            gp.raiseCustomEvent(this.config.node, gp.events.beforeDelete, row );

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
                index = this.config.pageModel.data.indexOf( row );
                this.config.pageModel.data.splice( index, 1 );
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
            col = config.columns[i];
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

// Use moment.js to format dates.
// Use numeral.js to format numbers.
gp.Formatter = function () {};

gp.Formatter.prototype = {
    format: function (val, format) {
        var type = gp.getType( val );

        try {
            if ( /^(date|dateString)$/.test( type ) ) {
                return moment( val ).format( format );
            }
            if ( type === 'number' ) {
                // numeral's defaultFormat option doesn't work as of 3/25/2016
                format = format || '0,0';
                return numeral( val ).format( format );
            }
        }
        catch ( e ) {
            gp.error( e );
        }
        return val;
    }
};

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
        return str.toLowerCase().replace( '-', '' );
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
        var val = row[col.field];

        if ( /^(date|datestring)$/.test( type ) ) {
            return gp.formatter.format( val, col.format );
        }
        if ( type === 'number' && col.format ) {
            return gp.formatter.format( val, col.format );
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

    toolbartemplate: function () {
        var html = new gp.StringBuilder();
        if ( typeof ( this.toolbartemplate ) === 'function' ) {
            html.add( gp.applyFunc( this.toolbartemplate, this ) );
        }
        else {
            html.add( this.toolbartemplate );
        }
        return html.toString();
    },

    thead: function () {
        var self = this;
        var html = new gp.StringBuilder();
        var sort, template, classes;
        html.add( '<thead>' );
        html.add( '<tr>' );
        this.columns.forEach( function ( col ) {
            sort = '';
            if ( self.sorting ) {
                // if sort isn't specified, use the field
                sort = gp.escapeHTML( gp.coalesce( [col.sort, col.field] ) );
            }
            else {
                // only provide sorting where it is explicitly specified
                if ( gp.hasValue( col.sort ) ) {
                    sort = gp.escapeHTML( col.sort );
                }
            }

            html.add( '<th class="header-cell ' + ( col.headerclass || '' ) + '" data-sort="' + sort + '">' );

            // check for a template
            if ( col.headertemplate ) {
                if ( typeof ( col.headertemplate ) === 'function' ) {
                    html.add( gp.applyFunc( col.headertemplate, self, [col] ) );
                }
                else {
                    html.add( gp.processHeaderTemplate.call( this, col.headertemplate, col ) );
                }
            }
            else if ( sort != '' ) {
                html.add( '<label class="table-sort">' )
                    .add( '<input type="radio" name="sort" value="' )
                    .escape( sort )
                    .add( '" />' )
                    .escape( gp.coalesce( [col.header, col.field, sort] ) )
                    .add( '</label>' );
            }
            else {
                html.escape( gp.coalesce( [col.header, col.field, '&nbsp;'] ) );
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
        this.pageModel.data.forEach( function ( row, index ) {
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
        if ( col.bodytemplate ) {
            if ( typeof ( col.bodytemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.bodytemplate, this, [row, col] ) );
            }
            else {
                html.add( gp.processBodyTemplate.call( this, col.bodytemplate, row, col ) );
            }
        }
        else if ( col.commands && col.commands.length ) {
            html.add( '<div class="btn-group" role="group">' );
            col.commands.forEach( function ( cmd, index ) {
                if ( cmd == 'Edit' && gp.hasValue( self.update ) ) {
                    html.add( '<button type="button" class="btn btn-default btn-xs" value="' )
                        .add( cmd )
                        .add( '">' )
                        .add( '<span class="glyphicon glyphicon-edit"></span>' )
                        .add( cmd )
                        .add( '</button>' );
                }
                else if ( cmd == 'destroy' && gp.hasValue( self.destroy ) ) {
                    html.add( '<button type="button" class="btn btn-danger btn-xs" value="destroy">' )
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
        else if ( col.commands ) {
            html.add( '<div class="btn-group" role="group">' )
                .add( '<button type="button" class="btn btn-primary btn-xs" value="' )
                .add( mode == 'create' ? 'create' : 'update' )
                .add( '">' )
                .add( '<span class="glyphicon glyphicon-save"></span>Save' )
                .add( '</button>' )
                .add( '<button type="button" class="btn btn-default btn-xs" value="Cancel">' )
                .add( '<span class="glyphicon glyphicon-remove"></span>Cancel' )
                .add( '</button>' )
                .add( '</div>' );
        }
        else {
            var val = row[col.field];
            // render empty cell if this field doesn't exist in the data
            if ( val === undefined ) return '';
            // render null as empty string
            if ( val === null ) val = '';
            html.add( '<input class="form-control" name="' + col.field + '" type="' );
            switch ( col.Type ) {
                case 'date':
                case 'dateString':
                    // Don't bother with date input type.
                    // Indicate the type using data-type attribute so a custom date picker can be used.
                    // This sidesteps the problem of polyfilling browsers that don't support date input type
                    // and makes for a more consistent experience across browsers.
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
        if ( col.footertemplate ) {
            if ( typeof ( col.footertemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.footertemplate, this, [col, this.pageModel.data] ) );
            }
            else {
                html.add( gp.processFooterTemplate.call( this, col.footertemplate, col, this.pageModel.data ) );
            }
        }
        return html.toString();
    },

    setPagerFlags: function () {
        this.pageModel.IsFirstPage = this.pageModel.page === 1;
        this.pageModel.IsLastPage = this.pageModel.page === this.pageModel.pagecount;
        this.pageModel.HasPages = this.pageModel.pagecount > 1;
        this.pageModel.PreviousPage = this.pageModel.page === 1 ? 1 : this.pageModel.page - 1;
        this.pageModel.NextPage = this.pageModel.page === this.pageModel.pagecount ? this.pageModel.pagecount : this.pageModel.page + 1;
    },

    sortStyle: function () {
        var html = new gp.StringBuilder();
        if ( gp.isNullOrEmpty( this.pageModel.sort ) === false ) {
            html.add( '#' + this.ID + ' thead th.header-cell[data-sort="' + gp.escapeHTML( this.pageModel.sort ) + '"] > label:after' )
                .add( '{ content: ' );
            if ( this.pageModel.desc ) {
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
        this.columns.forEach( function ( col ) {
            if ( col.width ) {
                // fixed width should include the body
                html.add( '#' + self.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + self.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' )
                    .add( ',' )
                    .add( '#' + self.ID + ' > .table-body > table > thead th:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + self.ID + ' > .table-body > table > tbody td:nth-child(' + ( index + 1 ) + ')' )
                    .add( '{ width:' )
                    .add( col.width );
                if ( isNaN( col.width ) == false ) html.add( 'px' );
                html.add( ';}' );
            }
            else if ( bodyCols.length && ( self.fixedheaders || self.fixedfooters ) ) {
                // sync header and footer to body
                width = bodyCols[index].offsetWidth;
                html.add( '#' + self.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + self.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' )
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
        if ( this.fixedheaders ) {
            html.add( ' fixed-headers' );
        }
        if ( this.fixedfooters ) {
            html.add( ' fixed-footers' );
        }
        if ( this.pager ) {
            html.add( ' pager-' + this.pager );
        }
        if ( this.responsive ) {
            html.add( ' responsive' );
        }
        if ( this.search ) {
            html.add( ' search-' + this.search );
        }
        if ( this.onrowselect ) {
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
    'destroy': function ( url, data, callback, error ) {
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
        var model = new gp.Model( this.config );
        var requestModel = new gp.PagingModel();
        var controller = new gp.Controller( self.config, model, requestModel );
        this.node.api = new gp.api( controller );
        this.renderLayout( this.config );
        this.addBusyHandlers();

        if ( typeof this.config.ready === 'function' ) {
            controller.ready( this.config.ready );
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

            // we need both beforeInit and beforeRead because beforeRead is used after every read in the controller
            // and beforeInit happens just once after the node is created, but before first read
            gp.raiseCustomEvent( self.config.node, gp.events.beforeRead, self.config.pageModel );

            model.read( requestModel,
                function ( data ) {
                    try {
                        self.config.pageModel = data;
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
                function ( e ) {
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
        var self = this,
            obj,
            colNode,
            colConfig,
            templates,
            config = gp.getAttributes( node ),
            gpColumns = config.node.querySelectorAll( 'gp-column' );

        config.columns = [];
        //config.pageModel = {};
        //config.ID = gp.createUID();

        // create the column configurations
        templates = 'header body edit footer'.split( ' ' );
        for ( var i = 0; i < gpColumns.length; i++ ) {
            colNode = gpColumns[i];
            colConfig = gp.getAttributes(colNode);
            config.columns.push(colConfig);
            this.resolveCommands(colConfig);
            this.resolveTemplates( templates, colConfig, colNode );
        }

        config.Footer = this.resolveFooter( config );

        // resolve the top level configurations
        var options = 'onrowselect searchfunction read create update destroy validate model ready afteredit model'.split(' ');
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
            if ( config.Model ) {
                // look for a type by field first, then by sort
                if ( gp.hasValue( config.Model[field] ) ) {
                    col.Type = gp.getType( config.Model[field] );
                }
            }
            else if ( hasData ) {
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

/***************\
     model
\***************/
gp.Model = function ( config ) {
    this.config = config;
    this.reader = null;
    var type = gp.getType( config.read );
    switch ( type ) {
        case 'string':
            this.reader = new gp.ServerPager( config.read );
            break;
        case 'function':
            this.reader = new gp.FunctionPager( config );
            break;
        case 'object':
            // read is a PagingModel
            this.config.pageModel = config.read;
            this.reader = new gp.ClientPager( this.config );
            break;
        case 'array':
            this.config.pageModel.data = this.config.read;
            this.reader = new gp.ClientPager( this.config );
            break;
        default:
            throw 'Unsupported read configuration';
    }
};

gp.Model.prototype = {

    read: function ( requestModel, done, fail ) {
        var self = this;

        this.reader.read (
            requestModel,
            // make sure we explicitly wrap the arg in an array
            // if arg is an array of data, then applyFunc will end up only grabbing the first row
            function ( arg ) { gp.applyFunc( done, self, [arg] ); },
            function ( arg ) { gp.applyFunc( fail, self, [arg] ); }
        );
    },

    create: function ( row, done, fail) {
        var self = this, url;

        // config.create can be a function or a URL
        if ( typeof this.config.create === 'function' ) {
            // call the function, set the API as the context
            gp.applyFunc(this.config.create, this.config.node.api, [row, done, fail], fail);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.create, row );
            // call the URL
            var http = new gp.Http();
            http.post(
                url,
                row,
                function ( arg ) { gp.applyFunc( done, self, arg ); },
                function ( arg ) { gp.applyFunc( fail, self, arg ); }
            );
        }
    },

    update: function (row, done, fail) {
        var self = this, url;

        // config.update can be a function or URL
        if ( typeof this.config.update === 'function' ) {
            gp.applyFunc(this.config.update, this.config.node.api, [row, done, fail], fail);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.update, row );
            var http = new gp.Http();
            http.post(
                url,
                row,
                function ( arg ) { gp.applyFunc( done, self, arg ); },
                function ( arg ) { gp.applyFunc( fail, self, arg ); }
            );
        }
    },

    'destroy': function (row, done, fail) {
        var self = this, url;
        if ( typeof this.config.destroy === 'function' ) {
            gp.applyFunc(this.config.destroy, this.config.node.api, [row, done, fail], fail);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.destroy, row );
            var http = new gp.Http();
            http.destroy(
                url,
                row,
                function ( arg ) { gp.applyFunc( done, self, arg ); },
                function ( arg ) { gp.applyFunc( fail, self, arg ); }
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
            if ( /^(page|top|sort|desc|search)$/i.test( prop ) == false ) {
                delete copy[prop];
            }
        } );
        var url = gp.supplant( this.url, copy, copy );
        var h = new gp.Http();
        h.post(url, copy, callback, error);
    }
};


/***************\
client-side pager
\***************/
gp.ClientPager = function (config) {
    var value, self = this;
    this.data = config.pageModel.data;
    this.columns = config.columns.filter(function (c) {
        return c.field !== undefined || c.sort !== undefined;
    });
    if (typeof config.searchfunction === 'function') {
        this.searchFilter = config.searchfunction;
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
            model.data = this.data.slice(0, this.data.length);

            // filter first
            if ( !gp.isNullOrEmpty( model.search ) ) {
                // make sure searchTerm is a string and trim it
                search = gp.trim( model.search.toString() );
                model.data = model.data.filter(function (row) {
                    return self.searchFilter(row, search);
                });
            }

            // set totalrows after filtering, but before paging
            model.totalrows = model.data.length;

            // then sort
            if (gp.isNullOrEmpty(model.sort) === false) {
                var col = this.getColumnByField( this.columns, model.sort );
                if (gp.hasValue(col)) {
                    var sortFunction = this.getSortFunction( col, model.desc );
                    model.data.sort( function ( row1, row2 ) {
                        return sortFunction( row1[model.sort], row2[model.sort] );
                    });
                }
            }

            // then page
            if (model.top !== -1) {
                model.data = model.data.slice(skip).slice(0, model.top);
            }
        }
        catch (ex) {
            gp.error( ex );
        }
        callback(model);
    },
    getSkip: function ( model ) {
        var data = model;
        if ( data.pagecount == 0 ) {
            return 0;
        }
        if ( data.page < 1 ) {
            data.page = 1;
        }
        else if ( data.page > data.pagecount ) {
            return data.page = data.pagecount;
        }
        return ( data.page - 1 ) * data.top;
    },
    getColumnByField: function ( columns, field ) {
        var col = columns.filter(function (c) { return c.field === field || c.sort === field });
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
        if ( gp.hasValue( a ) === false ) {
            if ( gp.hasValue( b ) ) {
                return 1;
            }
            return 0;
        }
        else if ( gp.hasValue( b ) === false ) {
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
        if (gp.hasValue(a) === false) {
            if (gp.hasValue(b)) {
                return -1;
            }
            return 0;
        }
        else if (gp.hasValue(b) === false) {
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
            var self = this,
                result = this.config.read( model, function ( result ) {
                    if ( gp.hasValue( result ) ) {
                        result = self.resolveResult( result );
                        if ( gp.hasValue( result ) ) {
                            callback( result );
                        }
                        else {
                            error( 'Unsupported return value.' );
                        }
                    }
                    else {
                        callback();
                    }
                } );
            // check if the function returned a value instead of using the callback
            if ( gp.hasValue( result ) ) {
                result = this.resolveResult( result );
                if ( gp.hasValue( result ) ) {
                    callback( result );
                }
                else {
                    error( 'Unsupported return value.' );
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
    },
    resolveResult: function ( result ) {
        if ( result != undefined ) {
            var type = gp.getType( result );
            if ( type == 'array' ) {
                //  wrap the array in a PagingModel
                return new gp.PagingModel( result );
            }
            else if ( type == 'object' ) {
                // assume it's a PagingModel
                return result;
            }
        }

    }
};

/***************\
  PagingModel
\***************/
gp.PagingModel = function (data) {
    var self = this;
    // properites are capitalized here because that's the convention for server-side classes (C#)
    // we want the serialized version of the corresponding server-side class to look exactly like this prototype

    this.top = -1; // this is a flag to let the pagers know if paging is enabled
    this.page = 1;
    this.sort = '';
    this.desc = false;
    this.search = '';
    this.data = data;
    this.totalrows = (data != undefined && data.length) ? data.length : 0;

    Object.defineProperty(self, 'pageindex', {
        get: function () {
            return self.page - 1;
        }
    });

    Object.defineProperty(self, 'pagecount', {
        get: function () {
            if ( self.top > 0 ) {
                return Math.ceil( self.totalrows / self.top );
            }
            if ( self.totalrows === 0 ) return 0;
            return 1;
        }
    });

    Object.defineProperty(self, 'skip', {
        get: function () {
            if (self.top !== -1) {
                if (self.pagecount === 0) return 0;
                if (self.page < 1) self.page = 1;
                else if (self.page > self.pagecount) return self.page = self.pagecount;
                return self.pageindex * self.top;
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

    escape: function(str) {
        this.out.push( gp.escapeHTML( str ) );
        return this;
    },

    toString: function ( ) {
        return this.out.join('');
    }

};

/***************\
    templates
\***************/
gp.templates = gp.templates || {};
gp.templates['gridponent-body'] = function(model, arg) {
    var out = [];
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
            if (!model.fixedheaders) {
                    out.push(gp.helpers['thead'].call(model));
                }
        out.push('<tbody>');
                out.push(gp.helpers['tableRows'].call(model));
        out.push('</tbody>');
            if (model.Footer && !model.fixedfooters) {
                    out.push(gp.templates['gridponent-tfoot'](model));
                }
        out.push('</table>');
    return out.join('');
};
gp.templates['gridponent-cells'] = function(model, arg) {
    var out = [];
    model.columns.forEach(function(col, index) {
            out.push('    <td class="body-cell ');
    out.push(col.bodyclass);
    out.push('" ');
    if (col.bodystyle) {
    out.push(' style="');
    out.push(col.bodystyle);
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
    out.push(model.pageModel.pagecount);
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
    out.push(model.pageModel.pagecount);
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
                model.columns.forEach(function(col, index) {
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
            if (model.search || model.create || model.toolbartemplate) {
        out.push('<div class="table-toolbar">');
                    if (model.toolbartemplate) {
                            out.push(gp.helpers['toolbartemplate'].call(model));
                        } else {
                            if (model.search) {
        out.push('<div class="input-group gridponent-searchbox">');
    out.push('<input type="text" name="search" class="form-control" placeholder="Search...">');
    out.push('<span class="input-group-btn">');
    out.push('<button class="btn btn-default" type="button">');
    out.push('<span class="glyphicon glyphicon-search"></span>');
    out.push('</button>');
    out.push('</span>');
    out.push('</div>');
                        }
                            if (model.create) {
        out.push('<button class="btn btn-default" type="button" value="AddRow">');
    out.push('<span class="glyphicon glyphicon-plus"></span>Add');
    out.push('</button>');
                        }
                        }
        out.push('</div>');
            }
                if (model.fixedheaders) {
        out.push('<div class="table-header">');
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
                        out.push(gp.helpers['thead'].call(model));
        out.push('</table>');
    out.push('</div>');
            }
        out.push('    <div class="table-body ');
    if (model.fixedheaders) {
    out.push('table-scroll');
    }
    out.push('" style="');
    out.push(model.style);
    out.push('">');
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
                    if (!model.fixedheaders) {
                            out.push(gp.helpers['thead'].call(model));
                        }
        out.push('</table>');
    out.push('</div>');
            if (model.fixedfooters) {
        out.push('<div class="table-footer">');
                    out.push(gp.templates['gridponent-table-footer'](model));
        out.push('</div>');
            }
                if (model.pager) {
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

/***************\
   UpdateModel
\***************/
gp.UpdateModel = function ( row, validationErrors ) {

    this.Row = row;
    this.ValidationErrors = validationErrors;
    this.Original = gp.shallowCopy( row );

};

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

})(gridponent);

