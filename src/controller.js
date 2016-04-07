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
    this.addBusyDelegates();
};

gp.Controller.prototype = {

    init: function () {
        var self = this;
        this.monitorToolbars( this.config.node );
        this.addCommandHandlers( this.config.node );
        this.addRowSelectHandler( this.config );
        this.addRefreshEventHandler( this.config );
        this.done = true;
        this.invokeDelegates( gp.events.ready, this.config.node.api );
    },

    addBusyDelegates: function () {
        this.addDelegate( gp.events.beforeread, this.addBusy );
        this.addDelegate( gp.events.onread, this.removeBusy );
        this.addDelegate( gp.events.beforeedit, this.addBusy );
        this.addDelegate( gp.events.onedit, this.removeBusy );
        this.addDelegate( gp.events.httpError, this.removeBusy );
    },

    addBusy: function () {
        // this function executes with the api as its context
        var tblContainer = this.config.node.querySelector( 'div.table-container' );

        if ( tblContainer ) {
            gp.addClass( tblContainer, 'busy' );
        }
    },

    removeBusy: function () {
        // this function executes with the api as its context
        var tblContainer = this.config.node.querySelector( 'div.table-container' );

        if ( tblContainer ) {
            gp.removeClass( tblContainer, 'busy' );
        }
        else {
            gp.log( 'could not remove busy class' );
        }
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

    invokeDelegates: function ( event, args ) {
        var self = this,
            proceed = true,
            delegates = this.eventDelegates[event];
        if ( Array.isArray(delegates) ) {
            delegates.forEach( function ( delegate ) {
                if ( proceed === false ) return;
                proceed = gp.applyFunc( delegate, self.config.node.api, args );
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
        var command, lower, elem, dataItem,
            node = this.config.node,
            command = evt.selectedTarget.attributes['value'].value;

        if ( gp.hasValue( command ) ) lower = command.toLowerCase();

        switch ( lower ) {
            case 'addrow':
                this.addRow();
                break;
            case 'edit':
                // the button is inside either a table row or a modal
                elem = gp.closest( evt.selectedTarget, 'tr[data-uid],div.modal', node );
                dataItem = elem ? this.config.map.get( elem ) : null;
                dataItem = this.config.map.get( elem );
                this.editRow( dataItem, elem );
                break;
            case 'delete':
            case 'destroy':
                elem = gp.closest( evt.selectedTarget, 'tr[data-uid],div.modal', node );
                dataItem = elem ? this.config.map.get( elem ) : null;
                this.deleteRow( dataItem, elem );
                break;
        }
    },

    getEditor: function(dataItem) {
        var self = this, editor;

        if ( this.config.editmode == 'modal' ) {
            editor = new gp.ModalEditor( this.config, this.model );
        }
        else {
            editor = new gp.TableRowEditor( this.config, this.model );
        }

        editor.beforeEdit = function ( model ) {
            self.invokeDelegates( gp.events.beforeedit, model );
        };

        editor.afterEdit = function ( model ) {
            self.invokeDelegates( gp.events.onedit, model );
        };

        return editor;
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
        dataItem = config.map.get( tr );

        // ensure dataItem selection doesn't interfere with button clicks in the dataItem
        // by making sure the evt target is a body cell
        if ( evt.target != evt.selectedTarget ) return;

        proceed = this.invokeDelegates( gp.events.rowselected, {
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
        proceed = this.invokeDelegates( gp.events.beforeread, this.config.node.api );
        if ( proceed === false ) return;
        this.model.read( this.config.pageModel, function ( model ) {
            // standardize capitalization of incoming data
            gp.shallowCopy( model, self.config.pageModel, true );
            self.config.map.clear();
            self.refresh( self.config );
            self.invokeDelegates( gp.events.onread, self.config.node.api );
            gp.applyFunc( callback, self.config.node, self.config.pageModel );
        }, this.handlers.httpErrorHandler );
    },

    addRow: function ( dataItem ) {

        var editor = this.getEditor();

        var model = editor.add();

        this.invokeDelegates( gp.events.editmode, model );

        return editor;

    },

    // elem is either a tabel row or a modal
    createRow: function (dataItem, elem, callback) {
        try {
            var monitor,
                self = this,
                returnedRow;

            // if there is no create configuration setting, we're done here
            if ( !gp.hasValue( this.config.create ) ) {
                gp.applyFunc( callback, self.config.node );
                return;
            }

            this.invokeDelegates( gp.events.beforecreate, dataItem );

            // call the data layer with just the dataItem
            // the data layer should respond with an updateModel
            this.model.create( dataItem, function ( updateModel ) {

                try {
                    // standardize capitalization of incoming data
                    updateModel = gp.shallowCopy( updateModel, null, true );

                    // copy the returned dataItem back to the internal data array
                    returnedRow = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem : ( updateModel.Data && updateModel.Data.length ) ? updateModel.Data[0] : dataItem;
                    gp.shallowCopy( returnedRow, dataItem );

                    // add the new dataItem to the internal data array
                    self.config.pageModel.data.push( dataItem );

                    self.refresh();
                }
                catch ( err ) {
                    gp.error( err );
                }

                self.invokeDelegates( gp.events.oncreate, { elem: elem, model: updateModel } );
                self.invokeDelegates( gp.events.onedit, self.config.pageModel );

                gp.applyFunc( callback, self.config.node, updateModel );
            },
            this.handlers.httpErrorHandler );
        }
        catch ( ex ) {
            this.removeBusy();
            this.httpErrorHandler( e );
        }
    },

    editRow: function ( dataItem, elem ) {

        var editor = this.getEditor();
        var model = editor.edit( dataItem, elem );

        this.invokeDelegates( gp.events.editmode, model );

        return editor;
    },

    updateRow: function (dataItem, callback) {

        try {
            var self = this,
                updatedRow;

            // if there is no update configuration setting, we're done here
            if ( !gp.hasValue( this.config.update ) ) {
                gp.applyFunc( callback, self.config.node );
                return;
            }

            this.invokeDelegates( gp.events.beforeupdate, {
                dataItem: dataItem
            } );

            // call the data layer with just the dataItem
            // the data layer should respond with an updateModel
            this.model.update( dataItem, function ( updateModel ) {

                try {
                    // standardize capitalization of incoming data
                    updateModel = gp.shallowCopy( updateModel, null, true );

                    // copy the returned dataItem back to the internal data array
                    returnedRow = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem :
                        ( updateModel.data && updateModel.data.length ) ? updateModel.data[0] : dataItem;
                    gp.shallowCopy( returnedRow, dataItem );

                    self.refresh();
                }
                catch (err) {
                    gp.error( err );
                }

                self.invokeDelegates( gp.events.onupdate, { model: updateModel } );
                self.invokeDelegates( gp.events.onedit, { model: updateModel } );

                gp.applyFunc( callback, self.config.node, updateModel );
            },
            this.handlers.httpErrorHandler );
        }
        catch (ex) {
            this.removeBusy();
            this.httpErrorHandler( e );
        }
    },

    // we don't require a tr parameter because it may not be in the grid
    deleteRow: function ( dataItem, callback, skipConfirm ) {
        try {
            if ( !gp.hasValue( this.config.destroy ) ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            var self = this,
                confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' ),
                message,
                tr = gp.getTableRow( this.config.map, dataItem, this.config.node );

            if ( !confirmed ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            this.invokeDelegates( gp.events.beforeedit, {
                type: 'destroy',
                dataItem: dataItem,
                elem: tr
            } );

            this.model.destroy( dataItem, function ( response ) {

                try {
                    if ( !response || !response.errors ) {
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
                }
                catch ( err ) {
                    gp.error( err );
                }

                self.invokeDelegates( gp.events.onedit, {
                    type: 'destroy',
                    dataItem: dataItem,
                    elem: tr
                } );

                gp.applyFunc( callback, self.config.node.api, response );
            },
            self.handlers.httpErrorHandler );
        }
        catch ( e ) {
            this.removeBusy();
            this.httpErrorHandler( e );
        }
    },

    refresh: function () {
        // inject table rows, footer, pager and header style.
        var node = this.config.node,
            body = node.querySelector( 'div.table-body' ),
            footer = node.querySelector( 'div.table-footer' ),
            pager = node.querySelector( 'div.table-pager' ),
            sortStyle = node.querySelector( 'style.sort-style' );

        this.config.map.clear();

        body.innerHTML = gp.templates['gridponent-body']( this.config );
        if ( footer ) {
            footer.innerHTML = gp.templates['gridponent-table-footer']( this.config );
        }
        if ( pager ) {
            pager.innerHTML = gp.templates['gridponent-pager']( this.config );
        }
        sortStyle.innerHTML = gp.helpers.sortStyle.call( this.config );
    },

    httpErrorHandler: function ( e ) {
        this.invokeDelegates( gp.events.httpError, e );
        alert( 'An error occurred while carrying out your request.' );
        gp.error( e );
    },

    dispose: function () {
        this.removeRefreshEventHandler( this.config );
        this.removeRowSelectHandler();
        this.removeCommandHandlers( this.config.node );
        this.monitor.stop();
    }

};