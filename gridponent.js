// code coverage
var cov = cov || {};
cov.covered = [];
cov.cover = function(index) {
	cov.covered[index] = true;
	if (cov.callout) {
	    cov.callout(index);
	}
};


/***************\
   Gridponent
\***************/

var gridponent = gridponent || function ( elem, options ) {
cov.cover(1);
    // check for a selector
    if ( typeof elem == 'string' ) {
cov.cover(2);
        elem = document.querySelector( elem );
    }
    if (elem instanceof HTMLElement) {
cov.cover(3);
        // has this already been initialized?
        if ( elem.api ) return elem.api;

        if ( options ) {
cov.cover(4);
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

    rowselected: 'rowselected',
    beforeinit: 'beforeinit',
    // turn progress indicator on
    beforeread: 'beforeread',
    // turn progress indicator on
    beforecreate: 'beforecreate',
    // turn progress indicator on
    beforeupdate: 'beforeupdate',
    // turn progress indicator on
    beforedestroy: 'beforedestroy',
    // turn progress indicator off
    onread: 'onread',
    // turn progress indicator off
    oncreate: 'oncreate',
    // turn progress indicator off
    onupdate: 'onupdate',
    // turn progress indicator off
    ondestroy: 'ondestroy',
    // raised after create, update and delete
    onedit: 'onedit',
    // gives external code the opportunity to initialize UI elements (e.g. datepickers)
    editmode: 'editmode',
    // turn progress indicator off
    httpError: 'httpError',
    // happens once after the grid is fully initialized and databound
    ready: 'ready'
};


gp.api = function ( controller ) {
cov.cover(5);
    this.controller = controller;
};

gp.api.prototype = {

    ready: function(callback) {
cov.cover(6);
        this.controller.ready( callback );
    },

    refresh: function ( callback ) {
cov.cover(7);
        this.controller.read( null, callback );
    },

    getData: function ( index ) {
cov.cover(8);
        if ( typeof index == 'number' ) return this.controller.config.pageModel.data[index];
        return this.controller.config.pageModel.data;
    },

    getTableRow: function( dataRow ) {
cov.cover(9);
        return gp.getTableRow(
            this.controller.config.pageModel.data,
            dataRow,
            this.controller.config.node
        );
    },

    search: function ( searchTerm, callback ) {
cov.cover(10);
        // make sure we pass in a string
        searchTerm = gp.isNullOrEmpty( searchTerm ) ? '' : searchTerm.toString();
        this.controller.search( searchTerm, callback );
    },

    sort: function ( name, desc, callback ) {
cov.cover(11);
        // validate the args
        name = gp.isNullOrEmpty( name ) ? '' : name.toString();
        typeof desc == 'boolean' ? desc : desc === 'false' ? false : !!desc;
        this.controller.sort( name, desc, callback );
    },

    read: function ( requestModel, callback ) {
cov.cover(12);
        this.controller.read( requestModel, callback );
    },

    create: function ( row, callback ) {
cov.cover(13);
        var model = this.controller.addRow( row );
        if ( model != null ) this.controller.createRow( row, model.tableRow, callback );
        else callback( null );
    },

    // This would have to be called after having retrieved the row from the table with getData().
    // The controller will attempt to figure out which tr it is by first calling indexOf(row) on the data.
    // So the original row object reference has to be preserved.
    // this function is mainly for testing
    update: function ( row, callback ) {
cov.cover(14);
        var tr = gp.getTableRow( this.controller.config.pageModel.data, row, this.controller.config.node );

        this.controller.updateRow( row, tr, callback );
    },

    'destroy': function ( row, callback ) {
cov.cover(15);
        this.controller.deleteRow( row, callback, true );
    },

    cancel: function ( arg ) { },

    dispose: function () {
cov.cover(16);
        this.controller.dispose();
    }

};

/***************\
 change monitor
\***************/
gp.ChangeMonitor = function (node, selector, model, afterSync) {
cov.cover(17);
    var self = this;
    this.model = model;
    this.beforeSync = null;
    this.node = node;
    this.selector = selector;
    this.listener = function (evt) {
cov.cover(18);
        self.syncModel.call(self, evt.target, self.model);
    };
    this.afterSync = afterSync;
};

gp.ChangeMonitor.prototype = {
    start: function () {
cov.cover(19);
        var self = this;
        // add change event handler to node
        gp.on( this.node, 'change', this.selector, this.listener );
        gp.on( this.node, 'keydown', this.selector, this.handleEnterKey );
        return this;
    },
    handleEnterKey: function ( evt ) {
cov.cover(20);
        // trigger change event
        if ( evt.keyCode == 13 ) {
cov.cover(21);
            evt.target.blur();
        }
    },
    stop: function () {
cov.cover(22);
        // clean up
        gp.off( this.node, 'change', this.listener );
        gp.off( this.node, 'keydown', this.handleEnterKey );
        return this;
    },
    syncModel: function (target, model) {
cov.cover(23);
        // get name and value of target
        var name = target.name,
            val = target.value,
            handled = false,
            type;

        try {
            if ( name in model ) {
cov.cover(24);
                if ( typeof ( this.beforeSync ) === 'function' ) {
cov.cover(25);
                    handled = this.beforeSync( name, val, this.model );
                }
                if ( !handled ) {
cov.cover(26);
                    type = gp.getType( model[name] );
                    switch ( type ) {
                        case 'number':
                            model[name] = parseFloat( val );
cov.cover(27);
                            break;
                        case 'boolean':
                            if ( target.type == 'checkbox' ) {
cov.cover(28);
                                if ( val.toLowerCase() == 'true' ) val = target.checked;
                                else if ( val.toLowerCase() == 'false' ) val = !target.checked;
                                else val = target.checked ? val : null;
                                model[name] = val;
                            }
                            else {
cov.cover(29);
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
cov.cover(30);
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
cov.cover(31);
    var self = this;
    this.config = config;
    this.model = model;
    this.requestModel = requestModel;
    if (config.pager) {
cov.cover(32);
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
cov.cover(33);
        var self = this;
        this.monitorToolbars( this.config.node );
        this.addCommandHandlers( this.config.node );
        this.addRowSelectHandler( this.config );
        this.addRefreshEventHandler( this.config );
        this.done = true;
        this.callbacks.forEach( function ( callback ) {
cov.cover(34);
            gp.tryFunc( callback, self.config );
        } );
    },

    ready: function(callback) {
cov.cover(35);
        if ( this.done ) {
cov.cover(36);
            gp.tryFunc( callback, this.config );
        }
        else {
cov.cover(37);
            this.callbacks.push( callback );
        }
    },

    addDelegate: function( event, delegate) {
cov.cover(38);
        this.eventDelegates[event] = this.eventDelegates[event] || [];
        this.eventDelegates[event].push( delegate );
    },

    invokeDelegates: function ( context, event, args ) {
cov.cover(39);
        var proceed = true,
            delegates = this.eventDelegates[event];
        if ( Array.isArray(delegates) ) {
cov.cover(40);
            delegates.forEach( function ( delegate ) {
cov.cover(41);
                if ( proceed === false ) return;
                proceed = gp.applyFunc( delegate, context, args );
            } );
        }
        return proceed;
    },

    monitorToolbars: function (node) {
cov.cover(42);
        var self = this;
        // monitor changes to search, sort, and paging
        this.monitor = new gp.ChangeMonitor( node, '.table-toolbar [name], thead input, .table-pager input', this.config.pageModel, function ( evt ) {
cov.cover(43);
            self.read();
            // reset the radio inputs
            var radios = node.querySelectorAll( 'thead input[type=radio], .table-pager input[type=radio]' );
            for (var i = 0; i < radios.length; i++) {
                radios[i].checked = false;
            }
        } );
        this.monitor.beforeSync = function ( name, value, model ) {
cov.cover(44);
            // the sort property requires special handling
            if (name === 'sort') {
cov.cover(45);
                if (model[name] === value) {
cov.cover(46);
                    model.desc = !model.desc;
                }
                else {
cov.cover(47);
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
cov.cover(48);
        // listen for command button clicks
        gp.on( node, 'click', 'button[value]', this.handlers.commandHandler );
    },

    removeCommandHandlers: function(node) {
cov.cover(49);
        gp.off( node, 'click', this.handlers.commandHandler );
    },

    commandHandler: function ( evt ) {
cov.cover(50);
        var command, lower, tr, row, node = this.config.node;
        command = evt.selectedTarget.attributes['value'].value;
        if ( gp.hasValue( command ) ) lower = command.toLowerCase();
        tr = gp.closest( evt.selectedTarget, 'tr[data-index]', node );
        row = tr ? gp.getRowModel( this.config.pageModel.data, tr ) : null;
        switch ( lower ) {
            case 'addrow':
                this.addRow();
cov.cover(51);
                break;
            case 'create':
                this.createRow( row, tr );
cov.cover(52);
                break;
            case 'edit':
                this.editRow( row, tr );
cov.cover(53);
                break;
            case 'update':
                this.updateRow( row, tr );
cov.cover(54);
                break;
            case 'cancel':
                this.cancelEdit( row, tr );
cov.cover(55);
                break;
            case 'delete':
            case 'destroy':
                this.deleteRow( row, tr );
cov.cover(56);
                break;
            default:
                // check for a custom command
                var cmd = gp.getObjectAtPath( command );
                if ( typeof cmd === 'function' ) {
cov.cover(57);
                    gp.applyFunc( cmd, node.api, [row, tr] );
                }
                break;
        }
    },

    addRowSelectHandler: function ( config ) {
cov.cover(58);
        // it's got to be either a function or a URL template
        if ( typeof config.onrowselect == 'function' || gp.rexp.braces.test( config.onrowselect ) ) {
cov.cover(59);
            // add click handler
            gp.on( config.node, 'click', 'div.table-body > table > tbody > tr > td.body-cell', this.handlers.rowSelectHandler );
        }
    },

    removeRowSelectHandler: function() {
cov.cover(60);
        gp.off( this.config.node, 'click', this.handlers.rowSelectHandler );
    },

    rowSelectHandler: function ( evt ) {
cov.cover(61);
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
cov.cover(62);
            gp.applyFunc( config.onrowselect, tr, [row] );
        }
        else {
cov.cover(63);
            // it's a urlTemplate
            window.location = gp.processBodyTemplate( config.onrowselect, row );
        }
    },

    addRefreshEventHandler: function ( config ) {
cov.cover(64);
        if ( config.refreshevent ) {
cov.cover(65);
            gp.on( document, config.refreshevent, this.handlers.readHandler );
        }
    },

    removeRefreshEventHandler: function ( config ) {
cov.cover(66);
        if ( config.refreshevent ) {
cov.cover(67);
            gp.off( document, config.refreshevent, this.handlers.readHandler );
        }
    },

    search: function(searchTerm, callback) {
cov.cover(68);
        this.config.pageModel.search = searchTerm;
        var searchBox = this.config.node.querySelector( 'div.table-toolbar input[name=search' );
        searchBox.value = searchTerm;
        this.read(null, callback);
    },

    sort: function(field, desc, callback) {
cov.cover(69);
        this.config.pageModel.sort = field;
        this.config.pageModel.desc = ( desc == true );
        this.read(null, callback);
    },

    read: function ( requestModel, callback ) {
cov.cover(70);
        var self = this, proceed = true;
        if ( requestModel ) {
cov.cover(71);
            gp.shallowCopy( requestModel, this.config.pageModel );
        }
        proceed = this.invokeDelegates( this.config.node, gp.events.beforeread, this.config.pageModel );
        if ( proceed === false ) return;
        this.model.read( this.config.pageModel, function ( model ) {
cov.cover(72);
            // models coming from the server should be lower-cased
            gp.shallowCopy( model, self.config.pageModel, true );
            self.refresh( self.config );
            self.invokeDelegates( self.config.node, gp.events.onread, this.config.pageModel );
            gp.applyFunc( callback, self.config.node, self.config.pageModel );
        }, this.handlers.httpErrorHandler );
    },

    addRow: function ( row ) {
cov.cover(73);
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
cov.cover(74);
                return;
            }

            if ( row == undefined ) {
cov.cover(75);
                row = {};

                // set defaults
                this.config.columns.forEach( function ( col ) {
cov.cover(76);
                    var field = col.field || col.sort;
                    if ( gp.hasValue( field ) ) {
cov.cover(77);
                        if ( gp.hasValue( col.Type ) ) {
cov.cover(78);
                            row[field] = gp.getDefaultValue( col.Type );
                        }
                        else {
cov.cover(79);
                            row[field] = '';
                        }
                    }
                } );

                // overwrite defaults with a model if specified
                if ( typeof this.config.model == 'object' ) {
cov.cover(80);
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
cov.cover(81);
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
cov.cover(82);
        try {
            var monitor,
                self = this,
                returnedRow;

            // if there is no create configuration setting, we're done here
            if ( !gp.hasValue( this.config.create ) ) {
cov.cover(83);
                gp.applyFunc( callback, self.config.node );
                return;
            }

            this.invokeDelegates( this.config.node, gp.events.beforecreate, row );

            // call the data layer with just the row
            // the data layer should respond with an updateModel
            this.model.create( row, function ( updateModel ) {
cov.cover(84);

                try {
                    if ( updateModel.ValidationErrors && updateModel.ValidationErrors.length ) {
cov.cover(85);
                        if ( typeof self.config.validate === 'function' ) {
cov.cover(86);
                            gp.applyFunc( self.config.validate, this, [tr, updateModel] );
                        }
                        else {
cov.cover(87);
                            gp.helpers['validation'].call( this, tr, updateModel.ValidationErrors );
                        }
                    }
                    else {
cov.cover(88);
                        // copy the returned row back to the internal data array
                        returnedRow = gp.hasValue( updateModel.Row ) ? updateModel.Row : ( updateModel.Data && updateModel.Data.length ) ? updateModel.Data[0] : row;
                        gp.shallowCopy( returnedRow, row );
                        // refresh the UI
                        self.restoreCells( self.config, row, tr );
                        // dispose of the ChangeMonitor
                        monitor = tr['gp-change-monitor'];
                        if ( monitor ) {
cov.cover(89);
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
cov.cover(90);
        try {
            // put the row in edit mode

            // IE9 can't set innerHTML of tr, so iterate through each cell
            // besides, that way we can just skip readonly cells
            var editCellContent = gp.helpers['editCellContent'];
            var col, cells = tr.querySelectorAll( 'td.body-cell' );
            for ( var i = 0; i < cells.length; i++ ) {
                col = this.config.columns[i];
                if ( !col.readonly ) {
cov.cover(91);
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
cov.cover(92);
        // save the row and return it to read mode

        try {
            var monitor,
                self = this,
                updatedRow;

            // if there is no update configuration setting, we're done here
            if ( !gp.hasValue( this.config.update ) ) {
cov.cover(93);
                gp.applyFunc( callback, self.config.node );
                return;
            }

            this.invokeDelegates(tr, gp.events.beforeupdate, row );

            // call the data layer with just the row
            // the data layer should respond with an updateModel
            this.model.update( row, function ( updateModel ) {
cov.cover(94);

                try {
                    if ( updateModel.ValidationErrors && updateModel.ValidationErrors.length ) {
cov.cover(95);
                        if ( typeof self.config.validate === 'function' ) {
cov.cover(96);
                            gp.applyFunc( self.config.validate, this, [tr, updateModel] );
                        }
                        else {
cov.cover(97);
                            gp.helpers['validation'].call( this, tr, updateModel.ValidationErrors );
                        }
                    }
                    else {
cov.cover(98);
                        // copy the returned row back to the internal data array
                        returnedRow = gp.hasValue( updateModel.Row ) ? updateModel.Row : ( updateModel.Data && updateModel.Data.length ) ? updateModel.Data[0] : row;
                        gp.shallowCopy( returnedRow, row );
                        // refresh the UI
                        self.restoreCells( self.config, row, tr );
                        // dispose of the ChangeMonitor
                        monitor = tr['gp-change-monitor'];
                        if ( monitor ) {
cov.cover(99);
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
cov.cover(100);
        try {
            if ( !gp.hasValue( this.config.destroy ) ) {
cov.cover(101);
                gp.applyFunc( callback, this.config.node );
                return;
            }

            var self = this,
                confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' ),
                message,
                tr = gp.getTableRow(this.config.pageModel.data, row, this.config.node);

            if ( !confirmed ) {
cov.cover(102);
                gp.applyFunc( callback, this.config.node );
                return;
            }

            this.invokeDelegates(this.config.node, gp.events.beforedestroy, row );

            this.model.destroy( row, function ( response ) {
cov.cover(103);

                try {
                    // if it didn't error out, we'll assume it succeeded
                    // remove the row from the model
                    var index = self.config.pageModel.data.indexOf( row );
                    if ( index != -1 ) {
cov.cover(104);
                        self.config.pageModel.data.splice( index, 1 );
                        // if the row is currently being displayed, refresh the grid
                        if ( tr ) {
cov.cover(105);
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
cov.cover(106);
        try {
            var tbl = gp.closest( tr, 'table', this.config.node ), index;

            if ( gp.hasClass( tr, 'create-mode' ) ) {
cov.cover(107);
                // remove row and tr
                tbl.deleteRow( tr.rowIndex );
                index = this.config.pageModel.data.indexOf( row );
                this.config.pageModel.data.splice( index, 1 );
            }
            else {
cov.cover(108);
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
cov.cover(109);
        // inject table rows, footer, pager and header style.
        var node = config.node;

        var body = node.querySelector( 'div.table-body' );
        var footer = node.querySelector( 'div.table-footer' );
        var pager = node.querySelector( 'div.table-pager' );
        var sortStyle = node.querySelector( 'style.sort-style' );

        body.innerHTML = gp.templates['gridponent-body']( config );
        if ( footer ) {
cov.cover(110);
            footer.innerHTML = gp.templates['gridponent-table-footer']( config );
        }
        if ( pager ) {
cov.cover(111);
            pager.innerHTML = gp.templates['gridponent-pager']( config );
        }
        sortStyle.innerHTML = gp.helpers.sortStyle.call( config );
    },

    restoreCells: function ( config, row, tr ) {
cov.cover(112);
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
cov.cover(113);
        this.invokeDelegates( this.config.node, gp.events.httpError, e );
        alert( 'An error occurred while carrying out your request.' );
        gp.error( e );
    },

    removeBusyHandlers: function () {
cov.cover(114);
        gp.off( this.config.node, gp.events.beforeread, gp.addBusy );
        gp.off( this.config.node, gp.events.onread, gp.removeBusy );
        gp.off( this.config.node, gp.events.beforeupdate, gp.addBusy );
        gp.off( this.config.node, gp.events.onupdate, gp.removeBusy );
        gp.off( this.config.node, gp.events.beforedestroy, gp.addBusy );
        gp.off( this.config.node, gp.events.ondestroy, gp.removeBusy );
        gp.off( this.config.node, gp.events.httpError, gp.removeBusy );
    },

    dispose: function () {
cov.cover(115);
        this.removeRefreshEventHandler( this.config );
        this.removeBusyHandlers();
        this.removeRowSelectHandler();
        this.removeCommandHandlers( this.config.node );
        this.monitor.stop();
        if ( typeof this.config.onread === 'function' ) {
cov.cover(116);
            gp.off( this.config.node, gp.events.onread, this.config.onread );
        }
        if ( typeof this.config.onedit === 'function' ) {
cov.cover(117);
            gp.off( this.config.node, gp.events.onedit, this.config.onedit );
        }
    }

};

/***************\
  CustomEvent
\***************/
(function () {
cov.cover(118);

    function CustomEvent(event, params) {
cov.cover(119);
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
cov.cover(120);
        var type = gp.getType( val );

        try {
            if ( /^(date|dateString)$/.test( type ) ) {
cov.cover(121);
                return moment( val ).format( format );
            }
            if ( type === 'number' ) {
cov.cover(122);
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
cov.cover(123);

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
cov.cover(124);
        if ( console && console.error ) {
cov.cover(125);
            console.error( e );
        }
    };
    gp.verbose = /verbose/.test( gp.logging ) ? gp.log : function () { };
    gp.info = /verbose|info/.test( gp.logging ) ? gp.log : function () { };
    gp.warn = /verbose|info|warn/.test( gp.logging ) ? gp.log : function () { };

    gp.getAttributes = function ( node ) {
cov.cover(126);
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
cov.cover(127);
        if ( typeof obj !== 'string' ) {
cov.cover(128);
            return obj;
        }
        for ( var i = 0; i < chars.length; i++ ) {
            obj = obj.replace( chars[i], escaped[i] );
        }
        return obj;
    };

    gp.camelize = function ( str ) {
cov.cover(129);
        return str.toLowerCase().replace( '-', '' );
    };

    gp.shallowCopy = function ( from, to, lowerCase ) {
cov.cover(130);
        to = to || {};
        var p, props = Object.getOwnPropertyNames( from );
        props.forEach( function ( prop ) {
cov.cover(131);
            p = lowerCase ? prop.toLowerCase() : prop;
            to[p] = from[prop];
        } );
        return to;
    };

    gp.extend = function ( to, from ) {
cov.cover(132);
        return gp.shallowCopy( from, to );
    };

    gp.getType = function ( a ) {
cov.cover(133);
        if ( a === null || a === undefined ) {
cov.cover(134);
            return a;
        }
        if ( a instanceof Date ) {
cov.cover(135);
            return 'date';
        }
        if ( typeof ( a ) === 'string' && gp.rexp.iso8601.test( a ) ) {
cov.cover(136);
            return 'dateString';
        }
        if ( Array.isArray( a ) ) {
cov.cover(137);
            return 'array';
        }
        // 'number','string','boolean','function','object'
        return typeof ( a );
    };

    gp.convertClrType = function ( clrType ) {
cov.cover(138);
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
cov.cover(139);
            case 'DateTime':
                return 'date';
cov.cover(140);
            case 'Boolean':
                return 'boolean';
cov.cover(141);
            default:
                return 'string';
        }
    };

    gp.getDefaultValue = function ( type ) {
cov.cover(142);
        switch ( type ) {
            case 'number':
                return 0;
cov.cover(143);
            case 'boolean':
                return false;
cov.cover(144);
            case 'date':
            default:
                return null;
cov.cover(145);
        }
    };

    var proxyListener = function ( elem, event, targetSelector, listener ) {
cov.cover(146);

        this.handler = function ( evt ) {
cov.cover(147);

            var e = evt.target;

            // get all the elements that match targetSelector
            var potentials = elem.querySelectorAll( targetSelector );

            // find the first element that matches targetSelector
            // usually this will be the first one
            while ( e ) {
                for ( var j = 0; j < potentials.length; j++ ) {
                    if ( e == potentials[j] ) {
cov.cover(148);
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
cov.cover(149);
            elem.removeEventListener( event, this.handler );
        };

        // handle event
        elem.addEventListener( event, this.handler, false );
    };

    // this allows us to attach an event handler to the document
    // and handle events that match a selector
    gp.on = function ( elem, event, targetSelector, listener ) {
cov.cover(150);
        // if elem is a selector, convert it to an element
        if ( typeof ( elem ) === 'string' ) {
cov.cover(151);
            elem = document.querySelector( elem );
        }

        if ( !gp.hasValue( elem ) ) {
cov.cover(152);
            return;
        }

        if ( typeof targetSelector === 'function' ) {
cov.cover(153);
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
cov.cover(154);
        // check for a matching listener store on the element
        var listeners = elem['gp-listeners-' + event];
        if ( listeners ) {
cov.cover(155);
            for ( var i = 0; i < listeners.length; i++ ) {
                if ( listeners[i].pub === listener ) {
cov.cover(156);

                    // remove the event handler
                    listeners[i].priv.remove();

                    // remove it from the listener store
                    listeners.splice( i, 1 );
                    return;
                }
            }
        }
        else {
cov.cover(157);
            elem.removeEventListener( event, listener );
        }
    };

    gp.closest = function ( elem, selector, parentNode ) {
cov.cover(158);
        var e, potentials, j;
        parentNode = parentNode || document;
        // if elem is a selector, convert it to an element
        if ( typeof ( elem ) === 'string' ) {
cov.cover(159);
            elem = document.querySelector( elem );
        }

        if ( elem ) {
cov.cover(160);
            // start with elem's immediate parent
            e = elem.parentElement;

            potentials = parentNode.querySelectorAll( selector );

            while ( e ) {
                for ( j = 0; j < potentials.length; j++ ) {
                    if ( e == potentials[j] ) {
cov.cover(161);
                        return e;
                    }
                }
                e = e.parentElement;
            }
        }
    };

    gp.in = function ( elem, selector, parent ) {
cov.cover(162);
        parent = parent || document;
        // if elem is a selector, convert it to an element
        if ( typeof ( elem ) === 'string' ) {
cov.cover(163);
            elem = parent.querySelector( elem );
        }
        // if selector is a string, convert it to a node list
        if ( typeof ( selector ) === 'string' ) {
cov.cover(164);
            selector = parent.querySelectorAll( selector );
        }
        for ( var i = 0; i < selector.length; i++ ) {
            if ( selector[i] === elem ) return true;
        }
        return false;
    };

    gp.hasValue = function ( val ) {
cov.cover(165);
        return val !== undefined && val !== null;
    };

    gp.isNullOrEmpty = function ( val ) {
cov.cover(166);
        // if a string or array is passed, they'll be tested for both null and zero length
        // if any other data type is passed (no length property), it'll only be tested for null
        return gp.hasValue( val ) === false || ( val.length != undefined && val.length === 0 );
    };

    gp.coalesce = function ( array ) {
cov.cover(167);
        if ( gp.isNullOrEmpty( array ) ) return array;

        for ( var i = 0; i < array.length; i++ ) {
            if ( gp.hasValue( array[i] ) ) {
cov.cover(168);
                return array[i];
            }
        }

        return array[array.length - 1];
    };

    gp.getObjectAtPath = function ( path, root ) {
cov.cover(169);
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
cov.cover(170);
                // convert to int
                segment = parseInt( /\d+/.exec( segment ) );
            }
            else if ( gp.rexp.quoted.test( segment ) ) {
cov.cover(171);
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
cov.cover(172);
           return function ( func ) {
cov.cover(173);
               return function () {
cov.cover(174);
                   return call.apply( func, arguments );
               };
           };
       }( FP.call ) );

    var uids = {};
    var slice = callbind( ''.slice );
    var zero = 0;
    var numberToString = callbind( zero.toString );

    gp.createUID = function () {
cov.cover(175);
        // id's can't begin with a number
        var key = 'gp' + slice( numberToString( Math.random(), 36 ), 2 );
        return key in uids ? createUID() : uids[key] = key;
    };

    gp.hasPositiveWidth = function ( nodes ) {
cov.cover(176);
        if ( gp.isNullOrEmpty( nodes ) ) return false;
        for ( var i = 0; i < nodes.length; i++ ) {
            if ( nodes[i].offsetWidth > 0 ) return true;
        }
        return false;
    };

    gp.resolveTemplate = function ( template ) {
cov.cover(177);
        // can be a selector, an inline template, or a function
        var t = gp.getObjectAtPath( template );
        if ( typeof ( t ) === 'function' ) {
cov.cover(178);
            return t;
        }
        else if ( gp.rexp.braces.test( template ) ) {
cov.cover(179);
            return template;
        }
        else {
cov.cover(180);
            t = document.querySelector( template );
            if ( t ) {
cov.cover(181);
                return t.innerHTML;
            }
        }
        return null;
    };

    gp.formatter = new gp.Formatter();

    gp.getFormattedValue = function ( row, col, escapeHTML ) {
cov.cover(182);
        var type = ( col.Type || '' ).toLowerCase();
        var val = row[col.field];

        if ( /^(date|datestring)$/.test( type ) ) {
cov.cover(183);
            return gp.formatter.format( val, col.format );
        }
        if ( type === 'number' && col.format ) {
cov.cover(184);
            return gp.formatter.format( val, col.format );
        }
        if ( type === 'string' && escapeHTML ) {
cov.cover(185);
            return gp.escapeHTML( val );
        }
        return val;
    };

    gp.supplant = function ( str, o, args ) {
cov.cover(186);
        var self = this, types = /^(string|number|boolean)$/;
        return str.replace( /{{([^{}]*)}}/g,
            function ( a, b ) {
cov.cover(187);
                var r = o[b];
                if ( types.test( typeof r ) ) return r;
                // it's not in o, so check for a function
                r = gp.getObjectAtPath( b );
                return typeof r === 'function' ? gp.applyFunc(r, self, args) : '';
            }
        );
    };

    gp.processBodyTemplate = function ( template, row, col ) {
cov.cover(188);
        return gp.supplant( template, row, [row, col] );
    };

    gp.processHeaderTemplate = function ( template, col ) {
cov.cover(189);
        return gp.supplant(template, col, [col] )
    };

    gp.processFooterTemplate = function ( template, col, data ) {
cov.cover(190);
        return gp.supplant( template, col, [col, data] )
    };

    gp.trim = function ( str ) {
cov.cover(191);
        if ( gp.isNullOrEmpty( str ) ) return str;
        return str.trim ? str.trim() : str.replace( /^\s+|\s+$/g, '' );
    };

    gp.hasClass = function ( el, cn ) {
cov.cover(192);
        return ( ' ' + el.className + ' ' ).indexOf( ' ' + cn + ' ' ) !== -1;
    };

    gp.addClass = function ( el, cn ) {
cov.cover(193);
        if ( el instanceof NodeList ) {
cov.cover(194);
            for (var i = 0; i < el.length; i++) {
                if ( !gp.hasClass( el[i], cn ) ) {
cov.cover(195);
                    el[i].className = ( el[i].className === '' ) ? cn : el[i].className + ' ' + cn;
                }
            }
        }
        else if ( !gp.hasClass( el, cn ) ) {
cov.cover(196);
            el.className = ( el.className === '' ) ? cn : el.className + ' ' + cn;
        }
    };

    gp.removeClass = function ( el, cn ) {
cov.cover(197);
        if ( el instanceof NodeList ) {
cov.cover(198);
            for ( var i = 0; i < el.length; i++ ) {
                el[i].className = gp.trim(( ' ' + el[i].className + ' ' ).replace( ' ' + cn + ' ', ' ' ) );
            }
        }
        else {
cov.cover(199);
            el.className = gp.trim(( ' ' + el.className + ' ' ).replace( ' ' + cn + ' ', ' ' ) );
        }
    };

    gp.prependChild = function ( node, child ) {
cov.cover(200);
        if ( typeof node === 'string' ) node = document.querySelector( node );
        if ( !node.firstChild ) {
cov.cover(201);
            node.appendChild( child );
        }
        else {
cov.cover(202);
            node.insertBefore( child, node.firstChild );
        }
        return child;
    };

    gp.getRowModel = function ( data, tr ) {
cov.cover(203);
        var index = parseInt( tr.attributes['data-index'].value );
        return data[index];
    };

    gp.getTableRow = function ( data, row, node ) {
cov.cover(204);
        var index = data.indexOf( row );
        if ( index == -1 ) return;
        return node.querySelector( 'tr[data-index="' + index + '"]' );
    };

    gp.raiseCustomEvent = function ( node, name, detail ) {
cov.cover(205);
        var event = new CustomEvent( name, { bubbles: true, detail: detail, cancelable: true } );
        node.dispatchEvent( event );
        return event;
    };

    gp.addBusy = function( evt ) {
cov.cover(206);
        var tblContainer = evt.target.querySelector( 'div.table-container' )
            || gp.closest( evt.target, 'div.table-container' );

        if ( tblContainer ) {
cov.cover(207);
            gp.addClass( tblContainer, 'busy' );
        }
    };

    gp.removeBusy = function ( evt ) {
cov.cover(208);
        var tblContainer = evt.target.querySelector( 'div.table-container' );
        tblContainer = tblContainer || document.querySelector( 'div.table-container.busy' )
            || gp.closest( evt.target, 'div.table-container' );

        if ( tblContainer ) {
cov.cover(209);
            gp.removeClass( tblContainer, 'busy' );
        }
        else {
cov.cover(210);
        }
    };

    gp.applyFunc = function ( callback, context, args, error ) {
cov.cover(211);
        if ( typeof callback !== 'function' ) return;
        // anytime there's the possibility of executing 
        // user-supplied code, wrap it with a try-catch block
        // so it doesn't affect my component
        try {
            if ( args == undefined ) {
cov.cover(212);
                return callback.call( context );
            }
            else {
cov.cover(213);
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
cov.cover(214);
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
cov.cover(215);
        var html = new gp.StringBuilder();
        if ( typeof ( this.toolbartemplate ) === 'function' ) {
cov.cover(216);
            html.add( gp.applyFunc( this.toolbartemplate, this ) );
        }
        else {
cov.cover(217);
            html.add( this.toolbartemplate );
        }
        return html.toString();
    },

    thead: function () {
cov.cover(218);
        var self = this;
        var html = new gp.StringBuilder();
        var sort, template, classes;
        html.add( '<thead>' );
        html.add( '<tr>' );
        this.columns.forEach( function ( col ) {
cov.cover(219);
            sort = '';
            if ( self.sorting ) {
cov.cover(220);
                // if sort isn't specified, use the field
                sort = gp.escapeHTML( gp.coalesce( [col.sort, col.field] ) );
            }
            else {
cov.cover(221);
                // only provide sorting where it is explicitly specified
                if ( gp.hasValue( col.sort ) ) {
cov.cover(222);
                    sort = gp.escapeHTML( col.sort );
                }
            }

            html.add( '<th class="header-cell ' + ( col.headerclass || '' ) + '" data-sort="' + sort + '">' );

            // check for a template
            if ( col.headertemplate ) {
cov.cover(223);
                if ( typeof ( col.headertemplate ) === 'function' ) {
cov.cover(224);
                    html.add( gp.applyFunc( col.headertemplate, self, [col] ) );
                }
                else {
cov.cover(225);
                    html.add( gp.processHeaderTemplate.call( this, col.headertemplate, col ) );
                }
            }
            else if ( sort != '' ) {
cov.cover(226);
                html.add( '<label class="table-sort">' )
                    .add( '<input type="radio" name="sort" value="' )
                    .escape( sort )
                    .add( '" />' )
                    .escape( gp.coalesce( [col.header, col.field, sort] ) )
                    .add( '</label>' );
            }
            else {
cov.cover(227);
                html.escape( gp.coalesce( [col.header, col.field, ''] ) );
            }
            html.add( '</th>' );
        } );
        html.add( '</tr>' )
            .add( '</thead>' );
        return html.toString();
    },

    tableRows: function () {
cov.cover(228);
        var self = this;
        var html = new gp.StringBuilder();
        this.pageModel.data.forEach( function ( row, index ) {
cov.cover(229);
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
cov.cover(230);
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
cov.cover(231);
            if ( typeof ( col.bodytemplate ) === 'function' ) {
cov.cover(232);
                html.add( gp.applyFunc( col.bodytemplate, this, [row, col] ) );
            }
            else {
cov.cover(233);
                html.add( gp.processBodyTemplate.call( this, col.bodytemplate, row, col ) );
            }
        }
        else if ( col.commands && col.commands.length ) {
cov.cover(234);
            html.add( '<div class="btn-group" role="group">' );
            col.commands.forEach( function ( cmd, index ) {
cov.cover(235);
                if ( cmd == 'edit' && gp.hasValue( self.update ) ) {
cov.cover(236);
                    html.add( '<button type="button" class="btn btn-default btn-xs" value="' )
                        .add( cmd )
                        .add( '">' )
                        .add( '<span class="glyphicon glyphicon-edit"></span>' )
                        .add( 'Edit' )
                        .add( '</button>' );
                }
                else if ( cmd == 'destroy' && gp.hasValue( self.destroy ) ) {
cov.cover(237);
                    html.add( '<button type="button" class="btn btn-danger btn-xs" value="destroy">' )
                        .add( '<span class="glyphicon glyphicon-remove"></span>Delete' )
                        .add( '</button>' );
                }
                else {
cov.cover(238);
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
cov.cover(239);
            // show a checkmark for bools
            if ( type === 'boolean' ) {
cov.cover(240);
                if ( val === true ) {
cov.cover(241);
                    html.add( '<span class="glyphicon glyphicon-ok"></span>' );
                }
            }
            else {
cov.cover(242);
                html.add( val );
            }
        }
        return html.toString();
    },

    editCellContent: function ( col, row, mode ) {
cov.cover(243);
        var template, html = new gp.StringBuilder();

        // check for a template
        if ( col.edittemplate ) {
cov.cover(244);
            if ( typeof ( col.edittemplate ) === 'function' ) {
cov.cover(245);
                html.add( gp.applyFunc( col.edittemplate, this, [row, col] ) );
            }
            else {
cov.cover(246);
                html.add( gp.processBodyTemplate.call( this, col.edittemplate, row, col ) );
            }
        }
        else if ( col.commands ) {
cov.cover(247);
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
cov.cover(248);
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
cov.cover(249);
                    break;
                case 'number':
                    html.add( 'number" value="' + gp.escapeHTML( val ) + '" />' );
cov.cover(250);
                    break;
                case 'boolean':
                    html.add( 'checkbox" value="true"' );
cov.cover(251);
                    if ( val ) {
cov.cover(252);
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
cov.cover(253);
        var builder = new gp.StringBuilder(), input, msg;
        builder.add( 'Please correct the following errors:\r\n' );
        // remove error class from inputs
        gp.removeClass( tr.querySelectorAll( '[name].error' ), 'error' );
        validationErrors.forEach( function ( v ) {
cov.cover(254);
            input = tr.querySelector( '[name="' + v.Key + '"]' );
            if ( input ) {
cov.cover(255);
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
cov.cover(256);
        var html = new gp.StringBuilder();
        if ( col.footertemplate ) {
cov.cover(257);
            if ( typeof ( col.footertemplate ) === 'function' ) {
cov.cover(258);
                html.add( gp.applyFunc( col.footertemplate, this, [col, this.pageModel.data] ) );
            }
            else {
cov.cover(259);
                html.add( gp.processFooterTemplate.call( this, col.footertemplate, col, this.pageModel.data ) );
            }
        }
        return html.toString();
    },

    setPagerFlags: function () {
cov.cover(260);
        this.pageModel.IsFirstPage = this.pageModel.page === 1;
        this.pageModel.IsLastPage = this.pageModel.page === this.pageModel.pagecount;
        this.pageModel.HasPages = this.pageModel.pagecount > 1;
        this.pageModel.PreviousPage = this.pageModel.page === 1 ? 1 : this.pageModel.page - 1;
        this.pageModel.NextPage = this.pageModel.page === this.pageModel.pagecount ? this.pageModel.pagecount : this.pageModel.page + 1;
    },

    sortStyle: function () {
cov.cover(261);
        var html = new gp.StringBuilder();
        if ( gp.isNullOrEmpty( this.pageModel.sort ) === false ) {
cov.cover(262);
            html.add( '#' + this.ID + ' thead th.header-cell[data-sort="' + gp.escapeHTML( this.pageModel.sort ) + '"] > label:after' )
                .add( '{ content: ' );
            if ( this.pageModel.desc ) {
cov.cover(263);
                html.add( '"\\e114"; }' );
            }
            else {
cov.cover(264);
                html.add( '"\\e113"; }' );
            }
        }
        return html.toString();
    },

    columnWidthStyle: function () {
cov.cover(265);
        var self = this,
            html = new gp.StringBuilder(),
            index = 0,
            bodyCols = document.querySelectorAll( '#' + this.ID + ' .table-body > table > tbody > tr:first-child > td' );

        // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
        this.columns.forEach( function ( col ) {
cov.cover(266);
            if ( col.width ) {
cov.cover(267);
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
cov.cover(268);
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
cov.cover(269);
        var html = new gp.StringBuilder();
        if ( this.fixedheaders ) {
cov.cover(270);
            html.add( ' fixed-headers' );
        }
        if ( this.fixedfooters ) {
cov.cover(271);
            html.add( ' fixed-footers' );
        }
        if ( this.pager ) {
cov.cover(272);
            html.add( ' pager-' + this.pager );
        }
        if ( this.responsive ) {
cov.cover(273);
            html.add( ' responsive' );
        }
        if ( this.search ) {
cov.cover(274);
            html.add( ' search-' + this.search );
        }
        if ( this.onrowselect ) {
cov.cover(275);
            html.add( ' selectable' );
        }
        return html.toString();
    }

};


/***************\
   Initializer
\***************/
gp.Initializer = function ( node ) {
cov.cover(276);
    this.node = node;
};

gp.Initializer.prototype = {

    initialize: function ( callback ) {
cov.cover(277);
        this.config = this.getConfig( this.node );
        return this.initializeOptions( this.config, callback );
    },

    initializeOptions: function ( options, callback ) {
cov.cover(278);
        var self = this;
        options.pageModel = {};
        options.ID = gp.createUID();
        this.config = options;
        this.config.node = this.node;
        var dal = new gp.Model( this.config );
        var requestModel = new gp.PagingModel();
        var controller = new gp.Controller( self.config, dal, requestModel );
        this.addEventDelegates( this.config, controller );
        this.node.api = new gp.api( controller );
        this.renderLayout( this.config );
        this.addBusyHandlers();

        setTimeout( function () {
cov.cover(279);
            // provides a hook for extensions
            controller.invokeDelegates( self.config.node, gp.events.beforeinit, self.config );

            // we need both beforeinit and beforeread because beforeread is used after every read in the controller
            // and beforeinit happens just once after the node is created, but before first read
            controller.invokeDelegates( self.config.node, gp.events.beforeread, self.config.pageModel );

            dal.read( requestModel,
                function ( data ) {
cov.cover(280);
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
                    controller.invokeDelegates( self.config.node, gp.events.onread, self.config.pageModel );
                },
                function ( e ) {
cov.cover(281);
                    controller.invokeDelegates( self.config.node, gp.events.httpError, e );
                    alert( 'An error occurred while carrying out your request.' );
                    gp.error( e );
                }

            );
        } );

        return this.config;
    },

    addBusyHandlers: function () {
cov.cover(282);
        gp.on( this.config.node, gp.events.beforeread, gp.addBusy );
        gp.on( this.config.node, gp.events.onread, gp.removeBusy );
        gp.on( this.config.node, gp.events.beforecreate, gp.addBusy );
        gp.on( this.config.node, gp.events.oncreate, gp.removeBusy );
        gp.on( this.config.node, gp.events.beforeupdate, gp.addBusy );
        gp.on( this.config.node, gp.events.onupdate, gp.removeBusy );
        gp.on( this.config.node, gp.events.beforedestroy, gp.addBusy );
        gp.on( this.config.node, gp.events.ondestroy, gp.removeBusy );
        gp.on( this.config.node, gp.events.httpError, gp.removeBusy );
    },

    getConfig: function (node) {
cov.cover(283);
        var self = this,
            obj,
            colNode,
            colConfig,
            templates,
            config = gp.getAttributes( node ),
            gpColumns = config.node.querySelectorAll( 'gp-column' );

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

        config.Footer = this.resolveFooter( config );

        // resolve the top level configurations
        var options = 'onrowselect searchfunction read create update destroy validate model'.split(' ');
        options.forEach( function ( option ) {
cov.cover(284);

            if ( gp.hasValue(config[option]) ) {
cov.cover(285);
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
cov.cover(286);
        var self = this, fn, api = config.node.api;
        Object.getOwnPropertyNames( gp.events ).forEach( function ( event ) {
cov.cover(287);
            fn = config[event];
            if ( typeof fn === 'string' ) {
cov.cover(288);
                fn = gp.getObjectAtPath( fn );
            }

            // event delegates must point to a function
            if ( typeof fn == 'function' ) {
cov.cover(289);
                config[event] = fn;
                controller.addDelegate( event, fn );
            }
        } );
    },

    renderLayout: function ( config ) {
cov.cover(290);
        var self = this;
        try {
            config.node.innerHTML = gp.templates['gridponent']( config );
        }
        catch ( ex ) {
            gp.error( ex );
        }
    },

    render: function ( config ) {
cov.cover(291);
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
cov.cover(292);
                footer.innerHTML = gp.templates['gridponent-table-footer']( config );
            }
            if ( pager ) {
cov.cover(293);
                pager.innerHTML = gp.templates['gridponent-pager']( config );
            }
            sortStyle = gp.helpers.sortStyle.call( config );

            // sync column widths
            if ( config.fixedheaders || config.fixedfooters ) {
cov.cover(294);
                var nodes = node.querySelectorAll( '.table-body > table > tbody > tr:first-child > td' );

                if ( gp.hasPositiveWidth( nodes ) ) {
cov.cover(295);
                    // call syncColumnWidths twice because the first call causes things to shift around a bit
                    self.syncColumnWidths( config )
                    self.syncColumnWidths( config )
                }

                window.addEventListener( 'resize', function () {
cov.cover(296);
                    self.syncColumnWidths( config );
                } );
            }
        }
        catch ( ex ) {
            gp.error( ex );
        }
    },

    syncColumnWidths: function (config) {
cov.cover(297);
        var html = gp.helpers.columnWidthStyle.call( config );
        config.node.querySelector( 'style.column-width-style' ).innerHTML = html;
    },

    resolveFooter: function (config) {
cov.cover(298);
        for (var i = 0; i < config.columns.length; i++) {
            if (config.columns[i].footertemplate) return true;
        }
        return false;
    },

    resolveTemplates: function ( names, config, node ) {
cov.cover(299);
        var selector,
            template,
            prop,
            selectorTemplate = 'script[type="text/html"][data-template*="{{name}}"],template[data-template*="{{name}}"]';
        names.forEach( function ( n ) {
cov.cover(300);
            selector = gp.supplant( selectorTemplate, { name: n } );
            template = node.querySelector( selector );
            if ( template != null ) {
cov.cover(301);
                for ( var i = 0; i < node.children.length; i++ ) {
                    if ( node.children[i] == template ) {
cov.cover(302);
                        prop = gp.camelize( n ) + 'template';
                        config[prop] = template.innerHTML;
                        return;
                    }
                }
            }
        } );
    },

    resolveCommands: function (col) {
cov.cover(303);
        if ( typeof col.commands == 'string' ) {
cov.cover(304);
            col.commands = col.commands.split( ',' );
        }
    },

    resolveTypes: function ( config ) {
cov.cover(305);
        var field,
            hasData = config && config.pageModel && config.pageModel.data && config.pageModel.data.length;

        config.columns.forEach( function ( col ) {
cov.cover(306);
            field = gp.hasValue( col.field ) ? col.field : col.sort;
            if ( gp.isNullOrEmpty( field ) ) return;
            if ( config.model ) {
cov.cover(307);
                // look for a type by field first, then by sort
                if ( gp.hasValue( config.model[field] ) ) {
cov.cover(308);
                    col.Type = gp.getType( config.model[field] );
                }
            }
            if ( !gp.hasValue( col.Type ) && hasData ) {
cov.cover(309);
                // if we haven't found a value after 200 iterations, give up
                for ( var i = 0; i < config.pageModel.data.length && i < 200 ; i++ ) {
                    if ( config.pageModel.data[i][field] !== null ) {
cov.cover(310);
                        col.Type = gp.getType( config.pageModel.data[i][field] );
                        break;
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
cov.cover(311);
    gp.Http = function () { };

    // http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
    var routes = {
        read: /read/i,
        update: /update/i,
        create: /create/i,
        destroy: /Delete/i
    };

    gp.Http.prototype = {
        serialize: function (obj, props) {
cov.cover(312);
            // creates a query string from a simple object
            var self = this;
            props = props || Object.getOwnPropertyNames(obj);
            var out = [];
            props.forEach(function (prop) {
cov.cover(313);
                out.push(encodeURIComponent(prop) + '=' + encodeURIComponent(obj[prop]));
            });
            return out.join('&');
        },
        deserialize: function (queryString) {
cov.cover(314);
            var nameValue, split = queryString.split( '&' );
            var obj = {};
            if ( !queryString ) return obj;
            split.forEach( function ( s ) {
cov.cover(315);
                nameValue = s.split( '=' );
                var val = nameValue[1];
                if ( !val ) {
cov.cover(316);
                    obj[nameValue[0]] = null;
                }
                else if ( /true|false/i.test( val ) ) {
cov.cover(317);
                    obj[nameValue[0]] = ( /true/i.test( val ) );
                }
                else if ( parseFloat( val ).toString() === val ) {
cov.cover(318);
                    obj[nameValue[0]] = parseFloat( val );
                }
                else {
cov.cover(319);
                    obj[nameValue[0]] = val;
                }
            } );
            return obj;
        },
        get: function (url, callback, error) {
cov.cover(320);
            if (routes.read.test(url)) {
cov.cover(321);
                var index = url.substring(url.indexOf('?'));
                if (index !== -1) {
cov.cover(322);
                    var queryString = url.substring(index + 1);
                    var model = this.deserialize(queryString);
                    this.post(url.substring(0, index), model, callback, error);
                }
                else {
cov.cover(323);
                    this.post(url, null, callback, error);
                }
            }
            else if (routes.create.test(url)) {
cov.cover(324);
                var result = { "ProductID": 0, "Name": "", "ProductNumber": "", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": "", "SafetyStockLevel": 0, "ReorderPoint": 0, "StandardCost": 0, "ListPrice": 0, "Size": "", "SizeUnitMeasureCode": "", "WeightUnitMeasureCode": "", "Weight": 0, "DaysToManufacture": 0, "ProductLine": "", "Class": "", "Style": "", "ProductSubcategoryID": 0, "ProductModelID": 0, "SellStartDate": "2007-07-01T00:00:00", "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "00000000-0000-0000-0000-000000000000", "ModifiedDate": "2008-03-11T10:01:36.827", "Markup": null };
                callback(result);
            }
            else {
cov.cover(325);
                throw 'Not found: ' + url;
            }
        },
        post: function (url, model, callback, error) {
cov.cover(326);
            model = model || {};
            if (routes.read.test(url)) {
cov.cover(327);
                getData(model, callback);
            }
            else if ( routes.create.test( url ) ) {
cov.cover(328);
                data.products.push( model );
                callback( new gp.UpdateModel( model ) );
            }
            else if ( routes.update.test( url ) ) {
cov.cover(329);
                callback( new gp.UpdateModel(model) );
            }
            else {
cov.cover(330);
                throw '404 Not found: ' + url;
            }
        },
        'destroy': function ( url, model, callback, error ) {
cov.cover(331);
            model = model || {};
            var index = data.products.indexOf( model );
            callback( {
                Success: true,
                Message: ''
            } );
        }
    };

    var getData = function (model, callback) {
cov.cover(332);
        var count, d = data.products.slice( 0, this.data.length );

        if (!gp.isNullOrEmpty(model.search)) {
cov.cover(333);
            var props = Object.getOwnPropertyNames(d[0]);
            var search = model.search.toLowerCase();
            d = d.filter(function (row) {
cov.cover(334);
                for (var i = 0; i < props.length; i++) {
                    if (row[props[i]] && row[props[i]].toString().toLowerCase().indexOf(search) !== -1) {
cov.cover(335);
                        return true;
                    }
                }
                return false;
            });
        }
        if (!gp.isNullOrEmpty(model.sort)) {
cov.cover(336);
            if (model.desc) {
cov.cover(337);
                d.sort(function (row1, row2) {
cov.cover(338);
                    var a = row1[model.sort];
                    var b = row2[model.sort];
                    if (a === null) {
cov.cover(339);
                        if (b != null) {
cov.cover(340);
                            return 1;
                        }
                    }
                    else if (b === null) {
cov.cover(341);
                        // we already know a isn't null
                        return -1;
                    }
                    if (a > b) {
cov.cover(342);
                        return -1;
                    }
                    if (a < b) {
cov.cover(343);
                        return 1;
                    }

                    return 0;
                });
            }
            else {
cov.cover(344);
                d.sort(function (row1, row2) {
cov.cover(345);
                    var a = row1[model.sort];
                    var b = row2[model.sort];
                    if (a === null) {
cov.cover(346);
                        if (b != null) {
cov.cover(347);
                            return -1;
                        }
                    }
                    else if (b === null) {
cov.cover(348);
                        // we already know a isn't null
                        return 1;
                    }
                    if (a > b) {
cov.cover(349);
                        return 1;
                    }
                    if (a < b) {
cov.cover(350);
                        return -1;
                    }

                    return 0;
                });
            }
        }
        count = d.length;
        if (model.top !== -1) {
cov.cover(351);
            model.data = d.slice(model.skip).slice(0, model.top);
        }
        else {
cov.cover(352);
            model.data = d;
        }
        model.ValidationErrors = [];
        setTimeout(function () {
cov.cover(353);
            callback(model);
        });

    };

})(gridponent);

/***************\
     model
\***************/
gp.Model = function ( config ) {
cov.cover(354);
    this.config = config;
    this.reader = null;
    var type = gp.getType( config.read );
    switch ( type ) {
        case 'string':
            this.reader = new gp.ServerPager( config.read );
cov.cover(355);
            break;
        case 'function':
            this.reader = new gp.FunctionPager( config );
cov.cover(356);
            break;
        case 'object':
            // read is a PagingModel
            this.config.pageModel = config.read;
cov.cover(357);
            this.reader = new gp.ClientPager( this.config );
            break;
        case 'array':
            this.config.pageModel.data = this.config.read;
cov.cover(358);
            this.reader = new gp.ClientPager( this.config );
            break;
        default:
            throw 'Unsupported read configuration';
    }
};

gp.Model.prototype = {

    read: function ( requestModel, done, fail ) {
cov.cover(359);
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
cov.cover(360);
        var self = this, url;

        // config.create can be a function or a URL
        if ( typeof this.config.create === 'function' ) {
cov.cover(361);
            // call the function, set the API as the context
            gp.applyFunc(this.config.create, this.config.node.api, [row, done, fail], fail);
        }
        else {
cov.cover(362);
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
cov.cover(363);
        var self = this, url;

        // config.update can be a function or URL
        if ( typeof this.config.update === 'function' ) {
cov.cover(364);
            gp.applyFunc(this.config.update, this.config.node.api, [row, done, fail], fail);
        }
        else {
cov.cover(365);
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
cov.cover(366);
        var self = this, url;
        if ( typeof this.config.destroy === 'function' ) {
cov.cover(367);
            gp.applyFunc(this.config.destroy, this.config.node.api, [row, done, fail], fail);
        }
        else {
cov.cover(368);
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
cov.cover(369);
    this.node = parent || null;
};

gp.NodeBuilder.prototype = {

    startElem: function ( tagName ) {
cov.cover(370);
        var n = document.createElement( tagName );

        if ( this.node ) {
cov.cover(371);
            this.node.appendChild( n );
        }

        this.node = n;

        return this;
    },

    addClass: function ( name ) {
cov.cover(372);
        if ( gp.isNullOrEmpty( name ) ) return this;

        var hasClass = ( ' ' + this.node.className + ' ' ).indexOf( ' ' + name + ' ' ) !== -1;

        if ( !hasClass ) {
cov.cover(373);
            this.node.className = ( this.node.className === '' ) ? name : this.node.className + ' ' + name;
        }

        return this;
    },

    html: function ( html ) {
cov.cover(374);
        this.node.innerHTML = gp.hasValue( html ) ? html : '';
        return this;
    },

    endElem: function () {
cov.cover(375);
        if ( this.node.parentElement ) {
cov.cover(376);
            this.node = this.node.parentElement;
        }
        return this;
    },

    attr: function ( name, value ) {
cov.cover(377);
        var attr = document.createAttribute( name );

        if ( value != undefined ) {
cov.cover(378);
            attr.value = gp.escapeHTML( value );
        }

        this.node.setAttributeNode( attr );

        return this;
    },

    close: function () {
cov.cover(379);
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
cov.cover(380);
    var self = this;
    var dict = {};

    // create mirror properties
    var props = Object.getOwnPropertyNames( obj );

    props.forEach(function (prop) {
cov.cover(381);
        Object.defineProperty(self, prop, {
            get: function () {
cov.cover(382);
                return dict[prop];
            },
            set: function (value) {
cov.cover(383);
                if (dict[prop] != value) {
cov.cover(384);
                    var oldValue = dict[prop];
                    dict[prop] = value;
                    if ( typeof onPropertyChanged === 'function' ) {
cov.cover(385);
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
cov.cover(386);
    this.url = url;
};

gp.ServerPager.prototype = {
    read: function ( model, callback, error ) {
cov.cover(387);
        var copy = gp.shallowCopy( model );
        // delete anything we don't want to send to the server
        var props = Object.getOwnPropertyNames( copy ).forEach(function(prop){
cov.cover(388);
            if ( /^(page|top|sort|desc|search)$/i.test( prop ) == false ) {
cov.cover(389);
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
cov.cover(390);
    var value, self = this;
    this.data = config.pageModel.data;
    this.columns = config.columns.filter(function (c) {
cov.cover(391);
        return c.field !== undefined || c.sort !== undefined;
    });
    if (typeof config.searchfunction === 'function') {
cov.cover(392);
        this.searchFilter = config.searchfunction;
    }
    else {
cov.cover(393);
        this.searchFilter = function (row, search) {
cov.cover(394);
            var s = search.toLowerCase();
            for (var i = 0; i < self.columns.length; i++) {
                value = gp.getFormattedValue( row, self.columns[i], false );
                if (gp.hasValue(value) && value.toString().toLowerCase().indexOf(s) !== -1) {
cov.cover(395);
                    return true;
                }
            }
            return false;
        };
    }
};

gp.ClientPager.prototype = {
    read: function (model, callback, error) {
cov.cover(396);
        try {
            var self = this,
                search,
                skip = this.getSkip( model );

            // don't modify the original array
            model.data = this.data.slice(0, this.data.length);

            // filter first
            if ( !gp.isNullOrEmpty( model.search ) ) {
cov.cover(397);
                // make sure searchTerm is a string and trim it
                search = gp.trim( model.search.toString() );
                model.data = model.data.filter(function (row) {
cov.cover(398);
                    return self.searchFilter(row, search);
                });
            }

            // set totalrows after filtering, but before paging
            model.totalrows = model.data.length;

            // then sort
            if (gp.isNullOrEmpty(model.sort) === false) {
cov.cover(399);
                var col = this.getColumnByField( this.columns, model.sort );
                if (gp.hasValue(col)) {
cov.cover(400);
                    var sortFunction = this.getSortFunction( col, model.desc );
                    model.data.sort( function ( row1, row2 ) {
cov.cover(401);
                        return sortFunction( row1[model.sort], row2[model.sort] );
                    });
                }
            }

            // then page
            if (model.top !== -1) {
cov.cover(402);
                model.data = model.data.slice(skip).slice(0, model.top);
            }
        }
        catch (ex) {
            gp.error( ex );
        }
        callback(model);
    },
    getSkip: function ( model ) {
cov.cover(403);
        var data = model;
        if ( data.pagecount == 0 ) {
cov.cover(404);
            return 0;
        }
        if ( data.page < 1 ) {
cov.cover(405);
            data.page = 1;
        }
        else if ( data.page > data.pagecount ) {
cov.cover(406);
            return data.page = data.pagecount;
        }
        return ( data.page - 1 ) * data.top;
    },
    getColumnByField: function ( columns, field ) {
cov.cover(407);
        var col = columns.filter(function (c) { return c.field === field || c.sort === field });
        return col.length ? col[0] : null;
    },
    getSortFunction: function (col, desc) {
cov.cover(408);
        if ( /^(number|date|boolean)$/.test( col.Type ) ) {
cov.cover(409);
            if ( desc ) {
cov.cover(410);
                return this.diffSortDesc;
            }
            return this.diffSortAsc;
        }
        else {
cov.cover(411);
            if ( desc ) {
cov.cover(412);
                return this.stringSortDesc;
            }
            return this.stringSortAsc;
        }
    },
    diffSortDesc: function(a, b) {
cov.cover(413);
        return b - a;
    },
    diffSortAsc: function(a, b) {
cov.cover(414);
        return a - b;
    },
    stringSortDesc: function (a, b) {
cov.cover(415);
        if ( gp.hasValue( a ) === false ) {
cov.cover(416);
            if ( gp.hasValue( b ) ) {
cov.cover(417);
                return 1;
            }
            return 0;
        }
        else if ( gp.hasValue( b ) === false ) {
cov.cover(418);
            // we already know a isn't null
            return -1;
        }

        // string sorting is the default if no type was detected
        // so make sure what we're sorting is a string

        if ( a.toString().toLowerCase() > b.toString().toLowerCase() ) {
cov.cover(419);
            return -1;
        }
        if ( a.toString().toLowerCase() < b.toString().toLowerCase() ) {
cov.cover(420);
            return 1;
        }

        return 0;
    },
    stringSortAsc: function (a, b) {
cov.cover(421);
        if (gp.hasValue(a) === false) {
cov.cover(422);
            if (gp.hasValue(b)) {
cov.cover(423);
                return -1;
            }
            return 0;
        }
        else if (gp.hasValue(b) === false) {
cov.cover(424);
            // we already know a isn't null
            return 1;
        }

        // string sorting is the default if no type was detected
        // so make sure what we're sorting is a string

        if ( a.toString().toLowerCase() > b.toString().toLowerCase() ) {
cov.cover(425);
            return 1;
        }
        if ( a.toString().toLowerCase() < b.toString().toLowerCase() ) {
cov.cover(426);
            return -1;
        }

        return 0;
    }
};

/***************\
  FunctionPager
\***************/

gp.FunctionPager = function ( config ) {
cov.cover(427);
    this.config = config;
};

gp.FunctionPager.prototype = {
    read: function ( model, callback, error ) {
cov.cover(428);
        try {
            var self = this,
                result = this.config.read( model, function ( result ) {
cov.cover(429);
                    if ( gp.hasValue( result ) ) {
cov.cover(430);
                        result = self.resolveResult( result );
                        if ( gp.hasValue( result ) ) {
cov.cover(431);
                            callback( result );
                        }
                        else {
cov.cover(432);
                            error( 'Unsupported return value.' );
                        }
                    }
                    else {
cov.cover(433);
                        callback();
                    }
                } );
            // check if the function returned a value instead of using the callback
            if ( gp.hasValue( result ) ) {
cov.cover(434);
                result = this.resolveResult( result );
                if ( gp.hasValue( result ) ) {
cov.cover(435);
                    callback( result );
                }
                else {
cov.cover(436);
                    error( 'Unsupported return value.' );
                }
            }
        }
        catch (ex) {
            if (typeof error === 'function') {
cov.cover(437);
                gp.applyFunc( error, this, ex );
            }
            else {
cov.cover(438);
                gp.applyFunc( callback, this, this.config );
            }
            gp.error( ex );
        }
    },
    resolveResult: function ( result ) {
cov.cover(439);
        if ( result != undefined ) {
cov.cover(440);
            var type = gp.getType( result );
            if ( type == 'array' ) {
cov.cover(441);
                //  wrap the array in a PagingModel
                return new gp.PagingModel( result );
            }
            else if ( type == 'object' ) {
cov.cover(442);
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
cov.cover(443);
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
cov.cover(444);
            return self.page - 1;
        }
    });

    Object.defineProperty(self, 'pagecount', {
        get: function () {
cov.cover(445);
            if ( self.top > 0 ) {
cov.cover(446);
                return Math.ceil( self.totalrows / self.top );
            }
            if ( self.totalrows === 0 ) return 0;
            return 1;
        }
    });

    Object.defineProperty(self, 'skip', {
        get: function () {
cov.cover(447);
            if (self.top !== -1) {
cov.cover(448);
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
cov.cover(449);

    var isReady = false;

    var completed = function (event) {
cov.cover(450);
        // readyState === "complete" is good enough for us to call the dom ready in oldIE
        if (document.addEventListener || event.type === "load" || document.readyState === "complete") {
cov.cover(451);
            isReady = true;
            detach();
            fn();
        }
    };

    var detach = function () {
cov.cover(452);
        if (document.addEventListener) {
cov.cover(453);
            document.removeEventListener("DOMContentLoaded", completed, false);
            window.removeEventListener("load", completed, false);

        } else {
cov.cover(454);
            document.detachEvent("onreadystatechange", completed);
            window.detachEvent("onload", completed);
        }
    };

    if (document.readyState === "complete") {
cov.cover(455);
        // Handle it asynchronously to allow scripts the opportunity to delay ready
        setTimeout(fn);

        // Standards-based browsers support DOMContentLoaded
    } else if (document.addEventListener) {
cov.cover(456);
        // Use the handy event callback
        document.addEventListener("DOMContentLoaded", completed, false);

        // A fallback to window.onload, that will always work
        window.addEventListener("load", completed, false);

        // If IE event model is used
    } else {
cov.cover(457);
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
cov.cover(458);
            (function doScrollCheck() {
cov.cover(459);
                if (!isReady) {
cov.cover(460);

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
cov.cover(461);
    this.out = [];
};

gp.StringBuilder.prototype = {

    add: function ( str ) {
cov.cover(462);
        this.out.push( str );
        return this;
    },

    escape: function(str) {
cov.cover(463);
        this.out.push( gp.escapeHTML( str ) );
        return this;
    },

    toString: function ( ) {
cov.cover(464);
        return this.out.join('');
    }

};

/***************\
    templates
\***************/
gp.templates = gp.templates || {};
gp.templates['gridponent-body'] = function(model, arg) {
cov.cover(465);
    var out = [];
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
            if (!model.fixedheaders) {
cov.cover(466);
                    out.push(gp.helpers['thead'].call(model));
                }
        out.push('<tbody>');
                out.push(gp.helpers['tableRows'].call(model));
        out.push('</tbody>');
            if (model.Footer && !model.fixedfooters) {
cov.cover(467);
                    out.push(gp.templates['gridponent-tfoot'](model));
                }
        out.push('</table>');
    return out.join('');
};
gp.templates['gridponent-cells'] = function(model, arg) {
cov.cover(468);
    var out = [];
    model.columns.forEach(function(col, index) {
cov.cover(469);
            out.push('    <td class="body-cell ');
    out.push(col.bodyclass);
    out.push('" ');
    if (col.bodystyle) {
cov.cover(470);
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
cov.cover(471);
    var out = [];
    out.push(gp.helpers['setPagerFlags'].call(model));
            if (model.pageModel.HasPages) {
cov.cover(472);
            out.push('<div class="btn-group">');
    out.push('        <label class="ms-page-index btn btn-default ');
    if (model.pageModel.IsFirstPage) {
cov.cover(473);
    out.push(' disabled ');
    }
    out.push('" title="First page">');
    out.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>');
                    if (model.pageModel.IsFirstPage == false) {
cov.cover(474);
        out.push('<input type="radio" name="Page" value="1" />');
                    }
        out.push('</label>');
        out.push('        <label class="ms-page-index btn btn-default ');
    if (model.pageModel.IsFirstPage) {
cov.cover(475);
    out.push(' disabled ');
    }
    out.push('" title="Previous page">');
    out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
                    if (model.pageModel.IsFirstPage == false) {
cov.cover(476);
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
cov.cover(477);
    out.push(' disabled ');
    }
    out.push('" title="Next page">');
    out.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>');
                    if (model.pageModel.IsLastPage == false) {
cov.cover(478);
        out.push('            <input type="radio" name="Page" value="');
    out.push(model.pageModel.NextPage);
    out.push('" />');
                    }
        out.push('</label>');
        out.push('        <label class="ms-page-index btn btn-default ');
    if (model.pageModel.IsLastPage) {
cov.cover(479);
    out.push(' disabled ');
    }
    out.push('" title="Last page">');
    out.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>');
                    if (model.pageModel.IsLastPage == false) {
cov.cover(480);
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
cov.cover(481);
    var out = [];
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
            out.push(gp.templates['gridponent-tfoot'](model));
        out.push('</table>');
    return out.join('');
};
gp.templates['gridponent-tfoot'] = function(model, arg) {
cov.cover(482);
    var out = [];
    out.push('<tfoot>');
    out.push('<tr>');
                model.columns.forEach(function(col, index) {
cov.cover(483);
        out.push('<td class="footer-cell">');
                    out.push(gp.helpers['footerCell'].call(model, col));
        out.push('</td>');
                });
        out.push('</tr>');
    out.push('</tfoot>');
    return out.join('');
};
gp.templates['gridponent'] = function(model, arg) {
cov.cover(484);
    var out = [];
    out.push('<div class="gp table-container');
    out.push(gp.helpers['containerClasses'].call(model));
    out.push('" id="');
    out.push(model.ID);
    out.push('">');
            if (model.search || model.create || model.toolbartemplate) {
cov.cover(485);
        out.push('<div class="table-toolbar">');
                    if (model.toolbartemplate) {
cov.cover(486);
                            out.push(gp.helpers['toolbartemplate'].call(model));
                        } else {
cov.cover(487);
                            if (model.search) {
cov.cover(488);
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
cov.cover(489);
        out.push('<button class="btn btn-default" type="button" value="AddRow">');
    out.push('<span class="glyphicon glyphicon-plus"></span>Add');
    out.push('</button>');
                        }
                        }
        out.push('</div>');
            }
                if (model.fixedheaders) {
cov.cover(490);
        out.push('<div class="table-header">');
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
                        out.push(gp.helpers['thead'].call(model));
        out.push('</table>');
    out.push('</div>');
            }
        out.push('    <div class="table-body ');
    if (model.fixedheaders) {
cov.cover(491);
    out.push('table-scroll');
    }
    out.push('" style="');
    out.push(model.style);
    out.push('">');
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
                    if (!model.fixedheaders) {
cov.cover(492);
                            out.push(gp.helpers['thead'].call(model));
                        }
        out.push('</table>');
    out.push('</div>');
            if (model.fixedfooters) {
cov.cover(493);
        out.push('<div class="table-footer">');
                    out.push(gp.templates['gridponent-table-footer'](model));
        out.push('</div>');
            }
                if (model.pager) {
cov.cover(494);
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
cov.cover(495);

    this.Row = row;
    this.ValidationErrors = validationErrors;
    this.Original = gp.shallowCopy( row );

};

// check for web component support
if (document.registerElement) {
cov.cover(496);

    gp.Gridponent = Object.create(HTMLElement.prototype);

    gp.Gridponent.createdCallback = function () {
cov.cover(497);
        var init = new gp.Initializer( this );
        gp.ready( init.initialize.bind( init ) );
    };

    gp.Gridponent.detachedCallback = function () {
cov.cover(498);
        this.api.dispose();
    };

    document.registerElement('grid-ponent', {
        prototype: gp.Gridponent
    });
}
else {
cov.cover(499);
    // no web component support
    // provide a static function to initialize grid-ponent elements manually
    gp.initialize = function (root) {
cov.cover(500);
        root = root || document;
        var node, nodes = root.querySelectorAll( 'grid-ponent' );
        for ( var i = 0; i < nodes.length; i++ ) {
            new gp.Initializer( nodes[i] ).initialize();
        }
    };

    gp.ready( gp.initialize );
}

})(gridponent);
cov.maxCoverage = 500;

