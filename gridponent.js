﻿// gridponent.js
// version : 0.1-beta
// author : Todd Piltingsrud
// license : MIT
/***************\
   Gridponent
\***************/

var gridponent = gridponent || function ( elem, options ) {
    'use strict';

    // check for a selector
    if ( typeof elem == 'string' ) {
        elem = document.querySelector( elem );
    }
    if ( elem instanceof HTMLElement ) {
        // has this already been initialized?
        var tblContainer = elem.querySelector( '.table-container' );
        if ( tblContainer && tblContainer.api ) return tblContainer.api;

        var init = new gridponent.Initializer( elem );
        var config = init.initializeOptions( options );
        return config.node.api;
    }
    else {
        throw new Error("Could not resolve selector: " + elem.toString());
    }

};

(function(gp) { 
    'use strict';
/***************\
      API
\***************/

gp.events = {

    rowSelected: 'rowselected',
    beforeInit: 'beforeinit',
    // turn progress indicator on
    beforeRead: 'beforeread',
    // turn progress indicator on
    beforeEdit: 'beforeedit',
    // turn progress indicator off
    onRead: 'onread',
    // turn progress indicator off
    // raised after create, update and delete
    onEdit: 'onedit',
    // gives external code the opportunity to initialize UI elements (e.g. datepickers)
    editReady: 'editready',
    // turn progress indicator off
    httpError: 'httpError',
    // happens once after the grid is fully initialized and databound
    ready: 'ready'
};


gp.api = function ( controller ) {
    this.controller = controller;
    this.config = controller.config;
    this.$n = $( this.config.node );
};

gp.api.prototype = {

    create: function ( dataItem ) {
        this.controller.addRow( dataItem );
        return this;
    },
    
    destroy: function ( dataItem, callback ) {
        this.controller.deleteRow( dataItem, callback, true );
        return this;
    },

    dispose: function () {
        this.controller.dispose();
        return this;
    },

    find: function ( selector ) {
        // include this.$n via addBack
        return this.$n.find( selector ).addBack( selector );
    },

    getData: function ( uidOrTableRow ) {
        if ( uidOrTableRow != undefined ) return this.config.map.get( uidOrTableRow );
        return this.controller.config.requestModel.data;
    },

    getTableRow: function( dataItem ) {
        return gp.getTableRow(
            this.controller.config.map,
            dataItem,
            this.controller.config.node
        );
    },

    read: function ( requestModel, callback ) {
        this.controller.read( requestModel, callback );
        return this;
    },

    refresh: function ( callback ) {
        this.controller.read( null, callback );
        return this;
    },

    saveChanges: function ( dataItem, done ) {
        this.controller.updateRow( dataItem, done );
        return this;
    },

    search: function ( searchTerm, callback ) {
        // make sure we pass in a string
        searchTerm = gp.isNullOrEmpty( searchTerm ) ? '' : searchTerm.toString();
        this.controller.search( searchTerm, callback );
        return this;
    },

    sort: function ( name, desc, callback ) {
        // validate the args
        name = gp.isNullOrEmpty( name ) ? '' : name.toString();
        desc = typeof desc == 'boolean' ? desc : desc === 'false' ? false : !!desc;
        this.controller.sort( name, desc, callback );
        return this;
    },

    toggleBusy: function ( isBusy ) {

        // use the passed in arg if present, else toggle it
        isBusy = ( isBusy === true || isBusy === false ? isBusy : !this.$n.hasClass( 'busy' ) );

        if ( isBusy ) {
            this.$n.addClass( 'busy' );
        }
        else {
            this.$n.removeClass( 'busy' );
        }

        return this;
    }

};

// add a function for each event
Object.getOwnPropertyNames( gp.events ).forEach( function ( evt ) {

    gp.api.prototype[evt] = function ( callback ) {
        if ( typeof callback === 'function' ) {
            this.controller.addDelegate( gp.events[evt], callback );
        }
        return this;
    };

} );

// replace the 'ready' and 'rowSelected' api functions created in the loop above

gp.api.prototype.ready = function ( callback ) {
    this.controller.ready( callback );
    return this;
};


gp.api.prototype.rowSelected = function ( callback ) {
    if ( typeof callback === 'function' ) {
        this.controller.addDelegate( gp.events.rowSelected, callback );
        this.$n.addClass( 'selectable' );
    }
    return this;
};
/***************\
   controller
\***************/
gp.Controller = function ( config, model, requestModel, injector ) {
    this.config = config;
    this.model = model;
    this.$n = $( config.node );
    this.requestModel = requestModel;
    this.injector = injector;
    this.pollInterval = null;
    if ( config.pager ) {
        this.requestModel.top = 25;
    }
    // calling bind returns a new function
    // so to be able to remove the handlers later, 
    // we need to call bind once and store the result
    this.handlers = {
        readHandler: this.read.bind( this ),
        commandHandler: this.commandHandler.bind( this ),
        rowSelectHandler: this.rowSelectHandler.bind( this ),
        httpErrorHandler: this.httpErrorHandler.bind( this ),
        toolbarChangeHandler: this.toolbarChangeHandler.bind( this ),
        toolbarEnterKeyHandler: this.toolbarEnterKeyHandler.bind( this ),
        resizeHandler: this.resizeHandler.bind( this )
    };
    this.done = false;
    this.eventDelegates = {};
    this.addBusyDelegates();
};

gp.Controller.prototype = {

    init: function () {
        var self = this;
        this.addCommandHandlers( this.config.node );
        this.addRowSelectHandler( this.config );
        this.addRefreshEventHandler( this.config );
        this.addToolbarChangeHandler();
        this.addResizeHandler();
        if ( this.config.preload ) {
            this.read( this.config.requestModel, function () {
                self.handlePolling( self.config );
                self.done = true;
                self.invokeDelegates( gp.events.ready, self.config.node.api );
            } );
        }
        else {
            this.handlePolling( this.config );
            this.done = true;
            this.invokeDelegates( gp.events.ready, this.config.node.api );
        }
    },

    addResizeHandler: function() {
        // sync column widths
        if ( this.config.fixedheaders || this.config.fixedfooters ) {
            window.addEventListener( 'resize', this.handlers.resizeHandler )
        }
    },

    removeResizeHandler: function() {
        if ( this.config.fixedheaders || this.config.fixedfooters ) {
            window.removeEventListener( 'resize', this.handlers.resizeHandler )
        }
    },

    resizeHandler: function () {
        // sync column widths
        var html = this.injector.exec( 'columnWidthStyle' );
        this.$n.find( 'style.column-width-style' ).html( html );
    },

    addBusyDelegates: function () {
        this.addDelegate( gp.events.beforeRead, this.addBusy );
        this.addDelegate( gp.events.onRead, this.removeBusy );
        this.addDelegate( gp.events.beforeEdit, this.addBusy );
        this.addDelegate( gp.events.onEdit, this.refreshFooter );
        this.addDelegate( gp.events.onEdit, this.removeBusy );
        this.addDelegate( gp.events.httpError, this.removeBusy );
    },

    addBusy: function () {
        // this function executes with the api as its context
        this.$n.addClass( 'busy' );
    },

    removeBusy: function () {
        // this function executes with the api as its context
        this.$n.removeClass( 'busy' );
    },

    ready: function ( callback ) {
        if ( this.done ) {
            gp.applyFunc( callback, this.config.node.api, this.config.node.api );
        }
        else {
            this.addDelegate( gp.events.ready, callback );
        }
    },

    addDelegate: function ( event, delegate ) {
        this.eventDelegates[event] = this.eventDelegates[event] || [];
        this.eventDelegates[event].push( delegate );
    },

    invokeDelegates: function ( event, args ) {
        var self = this,
            proceed = true,
            delegates = this.eventDelegates[event];
        if ( Array.isArray( delegates ) ) {
            delegates.forEach( function ( delegate ) {
                if ( proceed === false ) return;
                proceed = gp.applyFunc( delegate, self.config.node.api, args );
            } );
        }
        gp.triggerEvent( this.$n, 'gp-' + event );
        return proceed;
    },

    addToolbarChangeHandler: function () {
        // monitor changes to search, sort, and paging
        var selector = '.table-toolbar [name], thead input, .table-pager input';
        this.$n.on( 'change', selector, this.handlers.toolbarChangeHandler );
        this.$n.on( 'keydown', selector, this.handlers.toolbarEnterKeyHandler );
    },

    removeToolbarChangeHandler: function () {
        this.$n.off( 'change', this.handlers.toolbarChangeHandler );
        this.$n.off( 'keydown', this.handlers.toolbarEnterKeyHandler );
    },

    toolbarEnterKeyHandler: function ( evt ) {
        // tracks the search and paging textboxes
        if ( evt.keyCode == 13 ) {
            // trigger change event
            evt.target.blur();
            return;
        }
    },

    toolbarChangeHandler: function ( evt ) {
        // tracks the search and paging textboxes
        var name = evt.target.name,
            model = this.config.requestModel,
            type = gp.getType( model[name] ),
            val = gp.ModelSync.cast( evt.target.value, type );

        model[name] = val;

        this.read();
    },

    addCommandHandlers: function ( node ) {
        // listen for command button clicks at the grid level
        $( node ).on( 'click', 'button[value],a[value]', this.handlers.commandHandler );
    },

    removeCommandHandlers: function ( node ) {
        $( node ).off( 'click', this.handlers.commandHandler );
    },

    commandHandler: function ( evt ) {
        // this function handles all the button clicks for the entire grid
        var lower,
            $btn = $( evt.currentTarget ),
            rowOrModal = $btn.closest( 'tr[data-uid],div.modal', this.config.node ),
            dataItem = rowOrModal.length ? this.config.map.get( rowOrModal[0] ) : null,
            value = $btn.attr('value'),
            cmd = gp.getCommand( this.config.columns, value ),
            model = this.config.requestModel;

        // check for a user-defined command
        if ( cmd && typeof cmd.func === 'function' ) {
            cmd.func.call( this.config.node.api, dataItem );
            return;
        };

        lower = ( value || '' ).toLowerCase();

        switch ( lower ) {
            case 'addrow':
                this.addRow();
                break;
            case 'edit':
                // the button is inside either a table row or a modal
                this.editRow( dataItem, rowOrModal );
                break;
            case 'delete':
            case 'destroy':
                this.deleteRow( dataItem, rowOrModal );
                break;
            case 'page':
                var page = $btn.attr( 'data-page' );
                model.page = parseInt( page );
                this.read();
                break;
            case 'search':
                model.search = this.$n.find( '.table-toolbar input[name=search]' ).val();
                this.read();
                break;
            case 'sort':
                var sort = $btn.attr( 'data-sort' );
                if ( model.sort === sort ) {
                    model.desc = !model.desc;
                }
                else {
                    model.sort = sort;
                    model.desc = false;
                }
                this.read();
                break;
            default:
                // check for a function
                // this is needed in case there's a custom command in the toolbar
                cmd = gp.getObjectAtPath( value );
                if ( typeof cmd == 'function' ) {
                    cmd.call( this.config.node.api, dataItem );
                }
                break;
        }
    },

    getEditor: function ( mode ) {
        var self = this, editor;

        if ( mode == undefined ) {
            editor = new gp.Editor( this.config, this.model, this.injector );
        }
        else if ( mode == 'modal' ) {
            editor = new gp.ModalEditor( this.config, this.model, this.injector );
        }
        else {
            editor = new gp.TableRowEditor( this.config, this.model, this.injector );
        }

        editor.beforeEdit = function ( model ) {
            self.invokeDelegates( gp.events.beforeEdit, model );
        };

        editor.afterEdit = function ( model ) {
            self.invokeDelegates( gp.events.onEdit, model );
        };

        editor.editReady = function ( model ) {
            self.invokeDelegates( gp.events.editReady, model );
        };

        return editor;
    },

    addRowSelectHandler: function ( config ) {
        // always add click handler so we can call api.rowSelected after grid is initialized
        // disable row selection for rows in update or create mode
        this.$n.on( 'click', 'div.table-body > table > tbody > tr:not(.update-mode,.create-mode) > td.body-cell', this.handlers.rowSelectHandler );
    },

    removeRowSelectHandler: function () {
        this.$n.off( 'click', this.handlers.rowSelectHandler );
    },

    rowSelectHandler: function ( evt ) {
        var config = this.config,
            tr = $( evt.target ).closest( 'tr', config.node ),
            selected = this.$n.find( 'div.table-body > table > tbody > tr.selected' ),
            type = typeof config.rowselected,
            dataItem,
            proceed;

        // if this is a button or an element inside a button, return
        if ( $(evt.target).closest( 'a,:input,:button,:submit', config.node ).length > 0 ) {
            return;
        }

        // simple test to see if config.rowselected is a template
        if ( type === 'string' && config.rowselected.indexOf( '{{' ) !== -1 ) type = 'urlTemplate';

        selected.removeClass( 'selected' );

        // add selected class
        $( tr ).addClass( 'selected' );
        // get the dataItem for this tr
        dataItem = config.map.get( tr );

        proceed = this.invokeDelegates( gp.events.rowSelected, dataItem );

        if ( proceed === false ) return;

        if ( type === 'urlTemplate' ) {
            window.location = gp.supplant.call( this.config.node.api, config.rowselected, dataItem );
        }
    },

    addRefreshEventHandler: function ( config ) {
        if ( config.refreshevent ) {
            $( document ).on( config.refreshevent, this.handlers.readHandler );
        }
    },

    removeRefreshEventHandler: function ( config ) {
        if ( config.refreshevent ) {
            $( document ).off( config.refreshevent, this.handlers.readHandler );
        }
    },

    search: function ( searchTerm, callback ) {
        this.config.requestModel.search = searchTerm;
        this.$n.find( 'div.table-toolbar input[name=search]' ).val( searchTerm );
        this.read( null, callback );
    },

    sort: function ( field, desc, callback ) {
        this.config.requestModel.sort = field;
        this.config.requestModel.desc = ( desc == true );
        this.read( null, callback );
    },

    read: function ( requestModel, callback ) {
        var self = this, proceed = true;
        if ( requestModel ) {
            gp.shallowCopy( requestModel, this.config.requestModel );
        }
        proceed = this.invokeDelegates( gp.events.beforeRead, this.config.node.api );
        if ( proceed === false ) return;
        this.model.read( this.config.requestModel, function ( model ) {
            try {
                // do a case-insensitive copy
                gp.shallowCopy( model, self.config.requestModel, true );
                self.injector.setResource( '$data', self.config.requestModel.data );
                self.config.map.clear();
                gp.resolveTypes( self.config );
                self.refresh( self.config );
                self.invokeDelegates( gp.events.onRead, self.config.node.api );
                gp.applyFunc( callback, self.config.node, self.config.requestModel );
            } catch ( e ) {
                self.removeBusy();
                self.httpErrorHandler( e );
            }
        }, this.handlers.httpErrorHandler );
    },

    handlePolling: function ( config ) {
        // for polling to work, we must have a target and a numeric polling interval greater than 0
        if ( !$.isNumeric( config.poll ) || config.poll <= 0 ) return;

        var self = this;

        this.pollInterval = setInterval( function () {
            // does this grid still exist?
            var exists = config.node.ownerDocument.body.contains( config.node );
            if ( !exists ) {
                clearInterval( self.pollInterval );
                self.pollInterval = null;
            }
            else {
                self.read( config.requestModel );
            }
        }, config.poll * 1000 );
    },

    addRow: function ( dataItem ) {

        var editor = this.getEditor( this.config.editmode );

        var model = editor.add(dataItem);

        return editor;
    },

    editRow: function ( dataItem, elem ) {

        var editor = this.getEditor( this.config.editmode );

        var model = editor.edit( dataItem, elem );

        return editor;
    },

    updateRow: function ( dataItem, callback ) {

        try {
            var self = this,
                editor = this.getEditor(),
                tr;

            // if there is no update configuration setting, we're done here
            if ( !gp.hasValue( this.config.update ) ) {
                gp.applyFunc( callback, self.config.node );
                return;
            }

            editor.edit( dataItem );

            editor.save( function (model) {

                tr = gp.getTableRow( self.config.map, dataItem, self.$n[0] );
                if ( tr ) {
                    self.refresh();
                }

                if ( typeof callback === 'function' ) {
                    gp.applyFunc( callback, self, model );
                }

            }, this.httpErrorHandler.bind( this ) );
        }
        catch ( e ) {
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
                tr = gp.getTableRow( this.config.map, dataItem, this.$n[0] );

            if ( !confirmed ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            this.invokeDelegates( gp.events.beforeEdit, {
                type: 'destroy',
                dataItem: dataItem,
                elem: tr
            } );

            this.model.destroy( dataItem, function ( response ) {

                try {
                    if ( !response || !response.errors ) {
                        // if it didn't error out, we'll assume it succeeded
                        // remove the dataItem from the model
                        var index = self.config.requestModel.data.indexOf( dataItem );
                        if ( index != -1 ) {
                            self.config.requestModel.data.splice( index, 1 );
                        }
                        self.refresh( self.config );
                    }
                }
                catch ( err ) {
                    gp.error( err );
                }

                self.invokeDelegates( gp.events.onEdit, {
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
        try {
            // inject table rows, footer, pager and header style.
            var body = this.$n.find( 'div.table-body' ),
                footer = this.$n.find( 'div.table-footer' ),
                pager = this.$n.find( 'div.table-pager' ),
                sortStyle = this.$n.find( 'style.sort-style' );

            this.config.map.clear();

            body.html( this.injector.exec( 'tableBody' ) );
            // if we're not using fixed footers this will have no effect
            footer.html( this.injector.exec( 'footerTable' ) );
            pager.html( this.injector.exec( 'pagerBar' ) );
            sortStyle.html( this.injector.exec( 'sortStyle' ) );
        }
        catch ( e ) {
            gp.error( e );
        }
    },

    refreshFooter: function ( model ) {
        // this is called onEdit
        // refresh the footer after creating or updating a row
        // model.type is the type of operation that was performed
        if ( /^(create|update)$/.test( model.type ) ) {
            try {
                var footer = this.$n.find( 'tfoot' );
                if ( footer.length ) {
                    var footerRow = $( this.controller.injector.exec( 'footer' ) ).find( 'tr' );
                    footer.html( footerRow );
                }
            }
            catch ( e ) {
                gp.error( e );
            }
        }
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
        this.removeToolbarChangeHandler();
        this.removeResizeHandler();
        if ( this.pollInterval ) {
            clearInterval( this.pollInterval );
        }
    }

};
/***************\
  CustomEvent
\***************/
( function () {

    if ( typeof window.CustomEvent === "function" ) return false;

    function CustomEvent( event, params ) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent( 'CustomEvent' );
        evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
        return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;

})();
/***************\
   DataLayer
\***************/
gp.DataLayer = function ( config ) {
    this.config = config;
    this.reader = null;
};

gp.DataLayer.prototype = {
    getReader: function() {
        var type = gp.getType( this.config.read );
        switch ( type ) {
            case 'string':
                return new gp.ServerPager( this.config.read );
                break;
            case 'function':
                return new gp.FunctionPager( this.config );
                break;
            case 'object':
                // is it a RequestModel?
                if ( gp.implements( this.config.read, gp.RequestModel.prototype ) ) {
                    var model = new gp.RequestModel();
                    gp.shallowCopy( this.config.read, model, true );
                    this.config.requestModel = model;

                    // the initializer should have already constructed the requestModel
                    return new gp.ClientPager( this.config );
                }
                throw 'Unsupported read configuration';
                break;
            case 'array':
                this.config.requestModel.data = this.config.read;
                return new gp.ClientPager( this.config );
                break;
            default:
                throw 'Unsupported read configuration';
        }
    },
    read: function ( requestModel, done, fail ) {
        var self = this;

        if ( !this.reader ) {
            this.reader = this.getReader();
        }

        this.reader.read(
            requestModel,
            // make sure we wrap result in an array when we return it
            // if result is an array of data, then applyFunc will end up only grabbing the first dataItem
            function ( result ) {
                result = self.resolveResult( result );
                gp.applyFunc( done, self, [result] );
            },
            function ( result ) { gp.applyFunc( fail, self, [result] ); }
        );
    },

    create: function ( dataItem, done, fail) {
        var self = this, url;

        // config.create can be a function or a URL
        if ( typeof this.config.create === 'function' ) {
            // call the function, set the API as the context
            gp.applyFunc(this.config.create, this.config.node.api, [dataItem, done, fail], fail);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.create, dataItem );
            // call the URL
            var http = new gp.Http();
            http.post(
                url,
                dataItem,
                function ( arg ) { gp.applyFunc( done, self, arg ); },
                function ( arg ) { gp.applyFunc( fail, self, arg ); }
            );
        }
    },

    update: function (dataItem, done, fail) {
        var self = this, url;

        // config.update can be a function or URL
        if ( typeof this.config.update === 'function' ) {
            gp.applyFunc(this.config.update, this.config.node.api, [dataItem, done, fail], fail);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.update, dataItem );
            var http = new gp.Http();
            http.post(
                url,
                dataItem,
                function ( arg ) { gp.applyFunc( done, self, arg ); },
                function ( arg ) { gp.applyFunc( fail, self, arg ); }
            );
        }
    },

    destroy: function (dataItem, done, fail) {
        var self = this, url;

        // config.destroy can be a function or URL
        if ( typeof this.config.destroy === 'function' ) {
            gp.applyFunc(this.config.destroy, this.config.node.api, [dataItem, done, fail], fail);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.destroy, dataItem );
            var http = new gp.Http();
            http.destroy(
                url,
                function ( arg ) { gp.applyFunc( done, self, arg ); },
                function ( arg ) { gp.applyFunc( fail, self, arg ); }
            );
        }
    },

    resolveResult: function ( result ) {
        if ( gp.hasValue( result ) && Array.isArray( result ) ) {
            //  wrap the array in a RequestModel
            return new gp.RequestModel( result );
        }
        return result;
    }


};
/***************\
    datamap
\***************/
gp.DataMap = function () {

    this.uid = 0;
    this.map = {};

};

gp.DataMap.prototype = {

    assign: function ( dataItem ) {
        var i = ++this.uid;

        this.map[i] = dataItem;

        return i;
    },

    get: function ( uidOrElem ) {

        var uid = this.resolveUid(uidOrElem);

        return this.map[uid];
    },

    getUid: function ( dataItem ) {
        var uid, 
            uids = Object.getOwnPropertyNames(this.map);

        for (var i = 0; i < uids.length; i++) {
            uid = uids[i];
            if (this.map[uid] === dataItem) return uid;
        }

        return -1;
    },

    resolveUid: function ( uidOrElem ) {
        var uid = -1;

        if ( $.isNumeric( uidOrElem ) ) {
            uid = parseInt( uidOrElem );
        }
        else {
            uidOrElem = $( uidOrElem ).closest( '[data-uid]' );
            if ( uidOrElem.length === 1 ) {
                uid = parseInt( $( uidOrElem ).attr( 'data-uid' ) );
            }
        }

        if ( isNaN( uid ) ) return -1;

        return uid;
    },

    remove: function ( uidOrElem ) {
        var uid = this.resolveUid( uidOrElem );

        if ( uid in this.map ) {
            delete this.map[uid];
        }
    },

    clear: function () {
        this.uid = 0;
        this.map = {};
    }

};
/***************\
     Editor
\***************/

gp.Editor = function ( config, dal, injector ) {

    this.config = config;
    this.dal = dal;
    this.uid = null;
    this.dataItem = null;
    this.originalDataItem = null;
    this.mode = null;
    this.beforeEdit = null;
    this.afterEdit = null;
    this.editReady = null;
    this.button = null;
    this.$n = $( config.node );
    this.injector = injector;

};

gp.Editor.prototype = {

    add: function ( dataItem ) {
        this.dataItem = dataItem || this.createDataItem();
        this.mode = 'create';

        this.injector
            .setResource( '$dataItem', this.dataItem )
            .setResource( '$mode', this.mode );

        // add the data item to the internal data array
        this.config.requestModel.data.push( this.dataItem );

        // map it
        this.uid = this.config.map.assign( this.dataItem );

        return {
            dataItem: this.dataItem,
            uid: this.uid
        };
    },

    edit: function ( dataItem ) {
        this.dataItem = dataItem;
        this.mode = 'update';
        this.setInjectorContext();
        this.originalDataItem = gp.shallowCopy( dataItem );
        return {
            dataItem: dataItem,
        };
    },

    cancel: function () {
        this.setInjectorContext();
        if ( this.mode === 'create' ) {
            // unmap the dataItem
            this.config.map.remove( this.uid );
            // remove the dataItem from the internal array
            var index = this.config.requestModel.data.indexOf( this.dataItem );
            if ( index !== -1 ) {
                this.config.requestModel.data.slice( index, 1 );
            }
        }
        else if ( this.mode == 'update' && this.originalDataItem ) {
            //restore the dataItem to its original state
            gp.shallowCopy( this.originalDataItem, this.dataItem );
        }

        this.removeCommandHandler();
    },

    httpErrorHandler: function ( e ) {
        alert( 'An error occurred while carrying out your request.' );
        gp.error( e );
    },

    save: function ( done, fail ) {
        // create or update
        var self = this,
            serialized,
            fail = fail || gp.error;

        this.setInjectorContext();

        this.addBusy();

        // it's possible for the API to invoke this save method
        // there won't be a form element in that case
        if ( this.elem ) {
            // serialize the form
            serialized = gp.ModelSync.serialize( this.elem );

            // currently the only supported post format is application/x-www-form-urlencoded
            // so normally there'd be no point in converting the serialized form values to their former types
            // but we can't rely on the server to return an updated model (it may simply return a success/fail message)
            // so we'll convert them anyway
            gp.ModelSync.castValues( serialized, this.config.columns );

            // copy the values back to the original dataItem
            gp.shallowCopy( serialized, this.dataItem );
        }

        if ( typeof this.beforeEdit == 'function' ) {
            this.beforeEdit( {
                type: this.mode,
                dataItem: this.dataItem,
                elem: this.elem
            } );
        }

        if ( this.mode == 'create' ) {

            this.dal.create(
                this.dataItem,
                function(response) {
                    self.handleResponse( response, done, fail );
                },
                function ( e ) {
                    self.removeBusy();
                    gp.applyFunc( fail, self, e );
                }
            );

        }
        else {

            // call the data layer with just the dataItem
            // the data layer should respond with an responseModel
            this.dal.update( this.dataItem, 
                function ( response ) {
                    self.handleResponse( response, done, fail );
                },
                function ( e ) {
                    self.removeBusy();
                    gp.applyFunc( fail, self, e );
                }
            );

        }
    },

    handleResponse: function(response, done, fail) {
        var responseModel;

        try {
            this.injector.setResource( '$mode', null );

            // we're passing in a dataItem so it can compared to the data type of the response
            responseModel = gp.resolveResponseModel( response, this.dataItem );

            if ( gp.hasValue( responseModel.errors ) ) {
                this.validate( responseModel );
            }
            else {
                // copy to local dataItem so updateUI will bind to current data
                // this should be case-sensitive because the dataItem's type is defined by the server
                gp.shallowCopy( responseModel.dataItem, this.dataItem );

                if ( this.elem ) {
                    // refresh the UI
                    this.updateUI( this.config, this.dataItem, this.elem );

                    // if there's a UI, remove the event handler
                    if ( this.removeCommandHandler ) this.removeCommandHandler();
                }
            }
        }
        catch ( err ) {
            var error = fail || gp.error;
            error( err );
        }

        if ( this.button instanceof HTMLElement ) gp.enable( this.button );

        this.removeBusy();

        if ( typeof this.afterEdit == 'function' ) {
            this.afterEdit( {
                type: this.mode,
                dataItem: this.dataItem,
                elem: this.elem
            } );
        }

        gp.applyFunc( done, this.config.node.api, responseModel );
    },

    addBusy: function () {
        this.$n.addClass( 'busy' );
    },

    removeBusy: function () {
        this.$n.removeClass( 'busy' );
    },

    updateUI: function () { },

    validate: function() {},

    createDataItem: function () {
        var field,
            dataItem = {};

        // set defaults
        this.config.columns.forEach( function ( col ) {
            field = col.field || col.sort;
            if ( gp.hasValue( field ) ) {
                if ( gp.hasValue( col.Type ) ) {
                    dataItem[field] = gp.getDefaultValue( col.Type );
                }
                else {
                    dataItem[field] = '';
                }
            }
        } );

        // overwrite defaults with a model if specified
        if ( typeof this.config.model == 'object' ) {
            gp.shallowCopy( this.config.model, dataItem );
        }

        return dataItem;
    },

    setInjectorContext: function () {
        // if we add multiple rows at once, the injector context 
        // will have to be reset upon saving or cancelling
        // because there are multiple editors, but only one injector
        this.injector
            .setResource( '$dataItem', this.dataItem )
            .setResource( '$mode', this.mode );
    }

};

/***************\
 TableRowEditor
\***************/

gp.TableRowEditor = function ( config, dal, injector ) {

    var self = this;

    gp.Editor.call( this, config, dal, injector );

    this.elem = null;
    this.commandHandler = function ( evt ) {
        // handle save or cancel
        var command = $( this ).val();

        if ( /^(create|update|save)$/i.test( command ) ) {
            self.button = evt.target;
            // prevent double clicking
            gp.disable( self.button, 5 );
            self.save(null, self.httpErrorHandler);
        }
        else if ( /^cancel$/i.test( command ) ) self.cancel();
    };

};

gp.TableRowEditor.prototype = Object.create( gp.Editor.prototype );

$.extend(gp.TableRowEditor.prototype, {

    addCommandHandler: function () {
        $( this.elem ).on( 'click', 'button[value]', this.commandHandler );
    },

    removeCommandHandler: function () {
        $( this.elem ).off( 'click', this.commandHandler );
    },

    add: function (dataItem) {
        var tbody = this.$n.find( 'div.table-body > table > tbody' );

        // call the base add function
        // the base function sets the injector's $mode and $dataItem resources
        var obj = gp.Editor.prototype.add.call( this, dataItem );

        this.elem = $( this.injector.exec( 'tableRow', obj.uid ) );

        gp.ModelSync.bindElements( this.dataItem, this.elem );

        this.addCommandHandler();

        if ( this.config.newrowposition === 'top' ) {
            tbody.prepend( this.elem );
        }
        else {
            tbody.append( this.elem );
        }

        if (typeof this.elem[0].scrollIntoView === 'function') this.elem[0].scrollIntoView();

        this.invokeEditReady();

        this.injector.setResource( '$mode', null );

        return {
            dataItem: this.dataItem,
            elem: this.elem
        };
    },

    edit: function ( dataItem, tr ) {

        var cells;

        // replace the cell contents of the table row with edit controls

        // call the base add function
        // the base function sets the injector's $mode and $dataItem resources
        gp.Editor.prototype.edit.call( this, dataItem );

        this.elem = tr;

        this.addCommandHandler();

        // grab a new row from the injector
        cells = this.injector.exec( 'tableRowCells' );

        $( tr ).addClass('update-mode').empty().append( cells );

        gp.ModelSync.bindElements( dataItem, this.elem );

        this.invokeEditReady();

        this.injector.setResource( '$mode', null );

        return {
            dataItem: dataItem,
            elem: this.elem
        };
    },

    cancel: function () {
        
        // base cancel method either removes new dataItem or reverts the existing dataItem
        // the base function sets the injector's $mode and $dataItem resources
        gp.Editor.prototype.cancel.call( this );

        try {
            var tbl = $(this.elem).closest( 'table', this.$n ),
                index;

            if ( $( this.elem ).hasClass( 'create-mode' ) ) {
                // remove elem
                $( this.elem ).remove();
                //tbl[0].deleteRow( $(this.elem)[0].rowIndex );
            }
            else {
                this.updateUI();
            }
        }
        catch ( ex ) {
            gp.error( ex );
        }

    },

    validate: function ( responseModel ) {

        if ( typeof this.config.validate === 'function' ) {
            gp.applyFunc( this.config.validate, this, [this.elem, responseModel] );
        }
        else {

            var self = this,
                builder = new gp.StringBuilder(),
                errors,
                msg;

            builder.add( 'Please correct the following errors:\r\n' );

            // remove error class from inputs
            $( self.elem ).find( '[name].error' ).removeClass( 'error' );

            Object.getOwnPropertyNames( responseModel.errors ).forEach( function ( e ) {

                $( self.elem ).find( '[name="' + e + '"]' ).addClass( 'error' );

                errors = responseModel.errors[e].errors;

                builder
                    .add( e + ':\r\n' )
                    .add(
                    // extract the error message
                    errors.map( function ( m ) { return '    - ' + m + '\r\n'; } ).join( '' )
                );
            } );

            alert( builder.toString() );
        }

    },

    updateUI: function () {
        // take the table row out of edit mode
        var cells;

        this.injector.setResource( '$mode', 'read' );

        cells = this.injector.exec( 'tableRowCells' );

        $( this.elem ).removeClass( 'update-mode create-mode' ).empty().append( cells );
    },

    invokeEditReady: function() {
        if (typeof this.editReady == 'function') {
            this.editReady({
                dataItem: this.dataItem,
                elem: this.elem
            });
        }
    }

});


/***************\
   ModalEditor
\***************/

gp.ModalEditor = function ( config, dal, injector ) {

    gp.TableRowEditor.call( this, config, dal, injector );

};

gp.ModalEditor.prototype = Object.create( gp.Editor.prototype );

$.extend(gp.ModalEditor.prototype, {

    addCommandHandler: gp.TableRowEditor.prototype.addCommandHandler,

    removeCommandHandler: gp.TableRowEditor.prototype.removeCommandHandler,

    validate: gp.TableRowEditor.prototype.validate,

    invokeEditReady: gp.TableRowEditor.prototype.invokeEditReady,

    add: function (dataItem) {
        var self = this,
            html,
            modal;

        // the base function sets the injector's $mode and $dataItem resources
        gp.Editor.prototype.add.call( this, dataItem );

        // mode: create or update
        html = this.injector.exec( 'bootstrapModal' );

        // append the modal to the top node so button clicks will be picked up by commandHandlder
        modal = $( html )
            .appendTo( this.config.node )
            .one( 'shown.bs.modal', function () {
                // IE9 can't add handlers until the modal is completely shown
                self.addCommandHandler();
                self.invokeEditReady();
            } );

        this.elem = modal[0];

        modal.modal( {
            show: true,
            keyboard: true,
            backdrop: 'static'
        } );

        gp.ModelSync.bindElements( this.dataItem, this.elem );

        modal.one( 'hidden.bs.modal', function () {
            $( modal ).remove();
        } );

        return {
            dataItem: this.dataItem,
            elem: this.elem
        };
    },

    edit: function (dataItem) {
        var self = this,
            html,
            modal;

        // the base function sets the injector's $mode and $dataItem resources
        gp.Editor.prototype.edit.call( this, dataItem );

        // mode: create or update
        html = this.injector.exec( 'bootstrapModal' );

        // append the modal to the top node so button clicks will be picked up by commandHandlder
        modal = $( html )
            .appendTo( this.config.node )
            .one( 'shown.bs.modal', self.invokeEditReady.bind( self ) );

        this.elem = modal[0];

        modal.modal( {
            show: true,
            keyboard: true,
            backdrop: 'static'
        } );

        gp.ModelSync.bindElements( dataItem, this.elem );

        modal.one( 'hidden.bs.modal', function () {
            $( modal ).remove();
        } );

        this.addCommandHandler();

        return {
            dataItem: dataItem,
            elem: this.elem
        };

    },

    cancel: function () {

        // base cancel method either removes new dataItem or reverts the existing dataItem
        // the base function sets the injector's $mode and $dataItem resources
        gp.Editor.prototype.cancel.call( this );

        $( this.elem ).modal( 'hide' );
    },

    updateUI: function () {

        var tbody,
            tr,
            newTr,
            cells,
            newCells;

        $( this.elem ).modal( 'hide' );

        newTr = this.injector.exec( 'tableRow', this.uid );

        // if we added a row, add a row to the top of the table
        if ( this.mode == 'create' ) {
            tbody = this.$n.find( 'div.table-body > table > tbody' );

            if ( this.config.newrowposition === 'top' ) {
                tbody.prepend( newTr );
            }
            else {
                tbody.append( newTr );
            }
        }
        else {
            // find the existing table row for the dataItem
            tr = gp.getTableRow( this.config.map, this.dataItem, this.config.node );

            cells = tr.find( 'td.body-cell' );

            newCells = $( newTr ).find( 'td.body-cell' );

            // replace the contents of the existing tr with that of the new one
            cells.each( function ( i ) {
                $(this).empty().append( newCells[i] );
            } );
        }

    }

});
/***************\
     http        
\***************/
gp.Http = function () { };

gp.Http.prototype = {
    get: function ( url, data, callback, error ) {
        $.get( url, data ).done( callback ).fail( error );
    },
    post: function ( url, data, callback, error ) {
        this.ajax( url, data, callback, error, 'POST' );
    },
    destroy: function ( url, callback, error ) {
        this.ajax( url, null, callback, error, 'DELETE' );
    },
    ajax: function ( url, data, callback, error, httpVerb ) {
        $.ajax( {
            url: url,
            type: httpVerb.toUpperCase(),
            data: data,
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
        } )
            .done( callback )
            .fail( function ( response ) {
                if ( response.status ) {
                    // don't know why jQuery calls fail on DELETE
                    if ( response.status == 200 ) {
                        callback( response );
                        return;
                    }
                    // filter out authentication errors, those are usually handled by the browser
                    if ( /401|403|407/.test( response.status ) == false && typeof error == 'function' ) {
                        error( response );
                    }
                }
            } );
    }

};
/***************\
   Initializer
\***************/
gp.Initializer = function ( node ) {
    this.parent = $( node );
};

gp.Initializer.prototype = {

    // this is called when using custom HTML to create grids
    initialize: function ( callback ) {
        this.config = this.getConfig( this.parent );
        return this.initializeOptions( this.config, callback );
    },

    // this is called when using JSON to create grids
    initializeOptions: function ( options, callback ) {
        var self = this;
        options.requestModel = {};
        options.ID = gp.createUID();
        this.config = options;
        this.config.map = new gp.DataMap();
        this.config.requestModel = ( gp.implements( this.config.read, gp.RequestModel.prototype ) ) ? new gp.RequestModel( this.config.read ) : new gp.RequestModel();
        this.config.editmode = this.config.editmode || 'inline';
        this.config.newrowposition = this.config.newrowposition || 'top';

        // this has to be defined before renderLayout
        this.injector = new gp.Injector( {
            $config: this.config,
            $columns: this.config.columns,
            $node: this.config.node,
            $requestModel: this.config.requestModel,
            $map: this.config.map,
            $data: this.config.requestModel.data,
            $mode: 'read'
        }, gp.templates, null, this.config ); // specify gp.templates as root, null for context, config as override source

        this.resolveCustomResource( this.config, this.injector );

        // this has to happen here so we can find the table-container
        // the toolbar is also rendered here so we can call syncToolbar later
        this.renderLayout( this.config, this.parent );

        this.config.node = this.parent.find( '.table-container' )[0];
        this.$n = this.parent.find( '.table-container' );

        var dal = new gp.DataLayer( this.config );
        var controller = new gp.Controller( this.config, dal, this.config.requestModel, this.injector );
        this.config.node.api = new gp.api( controller );
        this.config.hasFooter = this.resolveFooter( this.config );
        this.config.preload = this.config.preload === false ? this.config.preload : true;
        this.injector.context = this.config.node.api;

        setTimeout( function () {
            // do this here to give external scripts a chance to run first
            self.resolveTopLevelOptions( self.config );

            self.syncToolbar( self.config );

            self.addEventDelegates( self.config, controller );

            // provides a hook for extensions
            controller.invokeDelegates( gp.events.beforeInit, self.config );

            gp.resolveTypes( self.config );
            self.resolveCommands( self.config );
            controller.init();
        } );

        return this.config;
    },

    getConfig: function ( parentNode ) {
        var self = this,
            obj,
            colConfig,
            templates,
            config = gp.getAttributes( parentNode ),
            gpColumns = $( parentNode ).find( 'gp-column' );

        config.columns = [];

        // create the column configurations
        templates = 'header body edit footer'.split( ' ' );
        gpColumns.each( function () {
            colConfig = gp.getAttributes( this );
            config.columns.push( colConfig );
            self.resolveTemplates( templates, colConfig, this, 'template' );
        } );

        // resolve the various templates
        this.resolveTemplates( Object.getOwnPropertyNames( gp.templates ), config, parentNode, '' );

        return config;
    },

    addEventDelegates: function ( config, controller ) {
        var self = this, name, fn, api = config.node.api;
        Object.getOwnPropertyNames( gp.events ).forEach( function ( event ) {
            name = gp.events[event];
            fn = config[name];
            if ( typeof fn === 'string' ) {
                fn = gp.getObjectAtPath( fn );
            }

            // event delegates must point to a function
            if ( typeof fn == 'function' ) {
                config[name] = fn;
                controller.addDelegate( name, fn );
            }
        } );
    },

    renderLayout: function ( config, parentNode ) {
        try {
            $( parentNode ).html( this.injector.exec('container') );
        }
        catch ( ex ) {
            gp.error( ex );
        }
    },

    syncToolbar: function(config) {
        try {
            var toolbar = config.node.api.find( 'div.table-toolbar' );

            // if config.read is a RequestModel, bind the toolbar to it
            // if not, unbind the toolbar to set config.requestModel

            if ( gp.implements( config.read, gp.RequestModel.prototype ) ) {
                gp.ModelSync.bindElements( config.read, toolbar );
            }
            else {
                // before first read, make sure the requestModel 
                // reflects the state of the toolbar inputs
                var form = gp.ModelSync.serialize( toolbar );
                // cast the values to the appropriate types
                gp.ModelSync.castModel( form, gp.RequestModel.prototype );
                // copy the values into the requestModel
                gp.shallowCopy( form, config.requestModel );
            }
        } catch ( e ) {
            gp.error( e );
        }
    },

    resolveFooter: function ( config ) {
        for ( var i = 0; i < config.columns.length; i++ ) {
            if ( config.columns[i].footertemplate ) return true;
        }
        return false;
    },

    resolveTopLevelOptions: function(config) {
        // resolve the top level configurations
        var obj, options = 'rowselected searchfunction read create update destroy validate model'.split( ' ' );
        options.forEach( function ( option ) {
            if ( gp.hasValue( config[option] ) ) {
                // see if this config option points to an object
                // otherwise it must be a URL
                obj = gp.getObjectAtPath( config[option] );

                if ( gp.hasValue( obj ) ) config[option] = obj;
            }
        } );
    },

    resolveTemplates: function ( names, config, node, suffix ) {
        var selector,
            template,
            prop,
            $node = $( node ),
            // the data-template attribute can have multiple values: e.g. "edit body"
            selectorTemplate = 'script[type="text/html"][data-template~="{{name}}"],template[data-template~="{{name}}"]';
        names.forEach( function ( n ) {
            selector = gp.supplant( selectorTemplate, { name: n } );
            template = $node.find( selector );
            if ( template.length ) {
                for ( var i = 0; i < $node[0].children.length; i++ ) {
                    if ( $node[0].children[i] == template[0] ) {
                        prop = n + suffix;
                        config[prop] = template[0].innerHTML;
                        return;
                    }
                }
            }
        } );
    },

    resolveCommands: function ( config ) {
        var match, val, commands, index = 0;
        config.columns.forEach( function ( col ) {
            if ( typeof col.commands == 'string' ) {
                commands = [];
                col.commands.split( ',' ).forEach( function ( cmd ) {
                    match = cmd.split( ':' );
                    commands.push( {
                        text: match[0],
                        value: match[1],
                        btnClass: match[2],
                        glyphicon: match[3],
                    } );
                } );
                col.commands = commands;
            }
            if ( Array.isArray( col.commands ) ) {
                col.commands.forEach( function ( cmd ) {
                    cmd.text = cmd.text || cmd.value;
                    cmd.value = cmd.value || cmd.text;
                    cmd.btnClass = cmd.btnClass || ( /delete|destroy/i.test( cmd.text ) ? 'btn-danger' : 'btn-default' );
                    cmd.glyphicon = cmd.glyphicon || ( /delete|destroy/i.test( cmd.text ) ? 'glyphicon-remove' : ( /edit/i.test( cmd.text ) ? 'glyphicon-edit' : 'glyphicon-cog' ) );
                    cmd.func = cmd.func || gp.getObjectAtPath( cmd.value );
                } );
            }
        } );
    },

    resolveCustomResource: function ( config, injector ) {
        if ( config.inject && typeof config.inject == 'string' ) {
            var path = config.inject.match( gp.rexp.splitPath );
            injector.setResource( path[path.length - 1], gp.getObjectAtPath( config.inject ) );
        }
    }
};
/***************\
    Injector
\***************/

gp.Injector = function ( resources, root, context, overrides ) {
    this.resources = resources;
    resources.$injector = this;
    resources.$window = window;
    this.root = root || window;
    this.context = context || this;
    this.overrides = overrides || {};
};

gp.Injector.prototype = {
    setResource: function(name, value) {
        this.resources[name] = value;
        return this;
    },
    base: function ( funcOrName, model ) {
        return this.exec( funcOrName, model, true );
    },
    exec: function ( funcOrName, model, base ) {
        var args, html;
        if ( typeof funcOrName == 'string' ) {
            if ( base ) {
                // call the base function
                funcOrName = this.root[funcOrName];
            }
            else {
                // check for override
                funcOrName = (this.overrides[funcOrName] || this.root[funcOrName]);
            }
        }
        if ( typeof funcOrName == 'function' ) {
            args = this.inject( funcOrName );
            if ( gp.hasValue( model ) ) {
                args.push( model );
            }
            // supply this injector as the context
            return funcOrName.apply( this.context, args );
        }
        else {
            // assume this is a string template
            // execute once against the resources, then against window to allow for functions
            return gp.supplant.call( this.context, funcOrName, this.resources, this.resources );
        }
        return this;
    },
    inject: function ( func ) {
        var self = this,
            params,
            args = [];

        if ( func.$inject ) {
            params = func.$inject;
        }
        else {
            params = this.getParamNames( func );
        }

        params.forEach( function ( param ) {
            if ( self.resources.hasOwnProperty( param ) ) {
                args.push( self.resources[param] );
            }
                // injectable params should start with $
            else if ( param[0] === '$' ) {
                throw "Unrecognized dependency: " + param;
            }
        } );

        return args;
    },
    // http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
    getParamNames: function ( func ) {
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var ARGUMENT_NAMES = /([^\s,]+)/g;
        var fnStr = func.toString().replace( STRIP_COMMENTS, '' );
        var result = fnStr.slice( fnStr.indexOf( '(' ) + 1, fnStr.indexOf( ')' ) ).match( ARGUMENT_NAMES );
        if ( result === null )
            result = [];
        return result;
    }

};
/***************\
   ModelSync
\***************/

gp.ModelSync = {

    rexp: {
        rTrue: /^true$/i,
        rFalse: /^false$/i,
    },

    serialize: function ( form ) {
        var inputs = $( form ).find( ':input[name]' ),
            arr,
            obj = {};

        inputs.each( function () {
            // add properties for each named element in the form
            // so unsuccessful form elements are still explicitly represented
            obj[this.name] = null;
        } );

        arr = $( inputs ).serializeArray();

        arr.forEach( function ( item ) {
            // if there are multiple elements with this name assume an array
            if ( obj[item.name] !== null && !Array.isArray( obj[item.name] ) ) {
                obj[item.name] = [obj[item.name]];
            }
            if ( Array.isArray( obj[item.name] ) ) {
                obj[item.name].push( item.value );
            }
            else {
                obj[item.name] = item.value;
            }
        } );

        return obj;
    },

    bindElements: function ( model, context ) {
        var self = this,
            value;

        Object.getOwnPropertyNames( model ).forEach( function ( prop ) {
            value = model[prop];
            if ( Array.isArray( value ) ) {
                value.forEach( function ( val ) {
                    self.bindElement( prop, val, context );
                } );
            }
            else {
                self.bindElement( prop, value, context );
            }
        } );
    },

    bindElement: function ( prop, value, context ) {
        var self = this,
            clean,
            elem;

        value = gp.hasValue( value ) ? value.toString() : '';

        // is there a checkbox or radio with this name and value?
        // don't select the value because it might throw a syntax error
        elem = $(context).find( '[type=checkbox][name="' + prop + '"],[type=radio][name="' + prop + '"]' );

        if ( elem.length > 0) {

            clean = gp.escapeHTML( value );

            for ( var i = 0; i < elem.length; i++ ) {
                if ( elem[i].value == value || elem[i].value == clean ) {
                    elem[i].checked = true;
                    return;
                }
            }
        }

        // check for boolean
        if ( /^(true|false)$/i.test( value ) ) {
            elem = $( context ).find( '[type=checkbox][name="' + prop + '"][value=true],[type=checkbox][name="' + prop + '"][value=false]' );

            if ( elem.length > 0 ) {
                elem.each( function ( e ) {
                    this.checked = (
                        ( self.rexp.rTrue.test( value ) && self.rexp.rTrue.test( e.value ) )
                        ||
                        ( self.rexp.rFalse.test( value ) && self.rexp.rFalse.test( e.value ) )
                    );
                } );

                return;
            }
        }

        elem = $( context ).find( '[name="' + prop + '"]' );
        if ( elem.length > 0 ) {

            // inputs with a value property
            if ( elem[0].value !== undefined ) {
                elem.val( value );
            }
                // inputs without a value property (e.g. textarea)
            else if ( elem[0].innerHTML !== undefined ) {
                elem.html( value == null ? '' : gp.escapeHTML( value ) );
            }

        }

    },

    castValues: function ( model, columns ) {
        var col;

        Object.getOwnPropertyNames( model ).forEach( function ( prop ) {
            col = gp.getColumnByField( columns, prop );

            if ( col && col.Type ) {
                model[prop] = this.cast( model[prop], col.Type );
            }
        }.bind(this) );
    },

    castModel: function ( model, targetPrototype ) {
        var type,
            val,
            self = this,
            props = Object.getOwnPropertyNames( model );

        props.forEach( function ( prop ) {
            if ( targetPrototype.hasOwnProperty( prop ) ) {
                type = gp.getType( targetPrototype[prop] );
                if ( type ) {
                    val = model[prop];
                    model[prop] = self.cast( val, type );
                }
            }
        } );
    },

    cast: function ( val, dataType ) {
        switch ( dataType ) {
            case 'number':
                if ( $.isNumeric( val ) ) return parseFloat( val );
                break;
            case 'boolean':
                return val != null && val.toLowerCase() == 'true';
                break;
            case null:
            case undefined:
                if ( /true|false/i.test( val ) ) {
                    // assume boolean
                    return val != null && val.toLowerCase() == 'true';
                }
                return val === '' ? null : val;
                break;
            default:
                return val === '' ? null : val;
                break;
        }
    }
};
/***************\
server-side pager
\***************/
gp.ServerPager = function (url) {
    this.url = url;
};

gp.ServerPager.prototype = {
    read: function ( requestModel, callback, error ) {
        // we're going to post a sanitized copy of the requestModel
        var copy = gp.shallowCopy( requestModel );
        // delete anything we don't want to send to the server
        var props = Object.getOwnPropertyNames( copy ).forEach(function(prop){
            if ( /^(page|top|sort|desc|search)$/i.test( prop ) == false ) {
                delete copy[prop];
            }
        } );
        // use the original requestModel to transform the url
        var url = gp.supplant( this.url, requestModel, requestModel );
        var h = new gp.Http();
        h.get(url, copy, callback, error);
    }
};


/***************\
client-side pager
\***************/
gp.ClientPager = function (config) {
    var value, self = this;
    this.data = config.requestModel.data;
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

            // don't replace the original array
            model.data = this.data.slice(0, this.data.length);

            // filter first
            if ( !gp.isNullOrEmpty( model.search ) ) {
                // make sure searchTerm is a string and trim it
                search = $.trim( model.search.toString() );
                model.data = model.data.filter(function (row) {
                    return self.searchFilter(row, search);
                });
            }

            // set total after filtering, but before paging
            model.total = model.data.length;

            // then sort
            if (gp.isNullOrEmpty(model.sort) === false) {
                var col = gp.getColumnByField( this.columns, model.sort );
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
                result = this.config.read( model, callback.bind( this ) );
            // check if the function returned a value instead of using the callback
            if ( gp.hasValue( result ) ) {
                callback( result );
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

    this.top = -1; // this is a flag to let the pagers know if paging is enabled
    this.page = 1;
    this.sort = '';
    this.desc = false;
    this.search = '';

    if ( gp.getType( data ) == 'object' ) {
        gp.shallowCopy( data, this );
    }
    else {
        this.data = data || [];
    }

    this.total = ( data != undefined && data.length ) ? data.length : 0;

    Object.defineProperty(self, 'pageindex', {
        get: function () {
            return self.page - 1;
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
    } );

    Object.defineProperty( self, 'pagecount', {
        get: function () {
            if ( self.top > 0 ) {
                return Math.ceil( self.total / self.top );
            }
            if ( self.total === 0 ) return 0;
            return 1;
        }
    } );
};

gp.RequestModel.prototype = {
    top: -1, // this is a flag to let the pagers know if paging is enabled
    page: 1,
    sort: '',
    desc: false,
    search: '',
    data: [],
    total: 0
};
/***************\
  ResponseModel
\***************/
gp.ResponseModel = function ( dataItem, validationErrors ) {
    this.dataItem = dataItem;
    this.errors = validationErrors;
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

    addFormat: function ( str, args ) {
        if ( !Array.isArray( args ) ) args = [args];
        this.out.push( gp.supplant(str, args) );
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

gp.templates.bodyCellContent = function ( $column, $dataItem, $injector ) {
    var self = this,
        template,
        format,
        val,
        glyphicon,
        btnClass,
        hasDeleteBtn = false,
        type = ( $column.Type || '' ).toLowerCase(),
        html = new gp.StringBuilder();

    if ( $dataItem == null ) return;

    val = gp.getFormattedValue( $dataItem, $column, true );

    // check for a template
    if ( $column.bodytemplate ) {
        if ( typeof ( $column.bodytemplate ) === 'function' ) {
            html.add( gp.applyFunc( $column.bodytemplate, this, [$dataItem, $column] ) );
        }
        else {
            html.add( gp.supplant.call( this, $column.bodytemplate, $dataItem, [$dataItem, $column] ) );
        }
    }
    else if ( $column.commands && $column.commands.length ) {
        html.add( '<div class="btn-group btn-group-xs" role="group">' );
        $column.commands.forEach( function ( cmd, index ) {
            html.add( $injector.exec( 'button', cmd ) );
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
            // getFormattedValue has already escaped html
            html.add( val );
        }
    }
    return html.toString();
};

gp.templates.bodyCellContent.$inject = ['$column', '$dataItem', '$injector'];

gp.templates.bootstrapModal = function ( $config, $dataItem, $injector, $mode ) {
    var title = ( $mode == 'create' ? 'Add' : 'Edit' ),
        uid = $config.map.getUid( $dataItem );

    var html = new gp.StringBuilder();
    html.add( '<div class="modal fade" tabindex="-1" role="dialog" data-uid="' + uid + '">' )
        .add( '<div class="modal-dialog" role="document">' )
        .add( '<div class="modal-content">' )
        .add( '<div class="modal-header">' )
        // the close button for the modal should cancel any edits, so add value="cancel"
        .add( '<button type="button" class="close" aria-label="Close" value="cancel"><span aria-hidden="true">&times;</span></button>' )
        .add( '<h4 class="modal-title">{{title}}</h4>' )
        .add( title )
        .add( '</div>' )
        .add( '<div class="modal-body">' )
        .add( $injector.exec( 'bootstrapModalBody' ) )
        .add( '</div>' )
        .add( '<div class="modal-footer">' )
        .add( $injector.exec( 'bootstrapModalFooter' ) )
        .add( '</div>' )
        .add( '</div>' )
        .add( '<div class="gp-progress-overlay">' )
        .add( '<div class="gp-progress gp-progress-container">' )
        .add( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' )
        .add( '</div>' )
        .add( '</div>' )
        .add( '</div>' )
        .add( '</div>' );

    return html.toString();
};

gp.templates.bootstrapModal.$inject = ['$config', '$dataItem', '$injector', '$mode'];

gp.templates.bootstrapModalBody = function ( $config, $injector ) {

    var self = this,
        body = new gp.StringBuilder();

    // not using a form element here because the modal
    // is added as a child node of the grid component
    // this will cause problems if the grid is inside another form
    // (e.g. jQuery.validate will behave unexpectedly)
    body.add( '<div class="form-horizontal">' );

    $config.columns.forEach( function ( col ) {
        $injector.setResource( '$column', col );
        var canEdit = !col.readonly && ( gp.hasValue( col.field ) || gp.hasValue( col.edittemplate ) );
        if ( !canEdit ) return;

        var formGroupModel = {
            label: null,
            input: $injector.exec( 'editCellContent' ),
            editclass: col.editclass
        };

        // headers become labels
        // check for a template
        if ( col.headertemplate ) {
            if ( typeof ( col.headertemplate ) === 'function' ) {
                formGroupModel.label = ( gp.applyFunc( col.headertemplate, self, [col] ) );
            }
            else {
                formGroupModel.label = ( gp.supplant.call( self, col.headertemplate, [col] ) );
            }
        }
        else {
            formGroupModel.label = gp.escapeHTML( gp.coalesce( [col.header, col.field, ''] ) );
        }

        body.add( $injector.exec( 'formGroup', formGroupModel ) );
    } );

    body.add( '</div>' );

    return body.toString();
};

gp.templates.bootstrapModalBody.$inject = ['$config', '$injector'];

gp.templates.bootstrapModalFooter = function ( $columns, $injector ) {

    // search for a command column
    var cmdColumn = $columns.filter( function ( col ) {
        return col.commands;
    } );

    if ( cmdColumn.length ) {
        // use the editCellContent template to render the buttons
        $injector.setResource( '$column', cmdColumn[0] );
        return $injector.exec( 'editCellContent' );
    }

    // default footer buttons: cancel / save
    return '<div class="btn-group"><button type="button" class="btn btn-default" value="cancel"><span class="glyphicon glyphicon-remove"></span>Close</button><button type="button" class="btn btn-primary" value="save"><span class="glyphicon glyphicon-save"></span>Save changes</button></div>';
};

gp.templates.bootstrapModalFooter.$inject = ['$columns', '$injector'];

gp.templates.button = function ( model ) {
    var template = '<button type="button" class="btn {{btnClass}}" value="{{value}}"><span class="glyphicon {{glyphicon}}"></span>{{text}}</button>';
    return gp.supplant.call( this, template, model );
};

gp.templates.columnWidthStyle = function ( $config, $columns ) {
    // this gets injected into a style element toward the bottom of the component
    var html = new gp.StringBuilder(),
        index = 0,
        bodyCols = document.querySelectorAll( '#' + $config.ID + ' .table-body > table > tbody > tr:first-child > td' ),
        px,
        fixedWidth =
            '#{{0}} .table-header th.header-cell:nth-child({{1}}),' +
            '#{{0}} .table-footer td.footer-cell:nth-child({{1}}),' +
            '#{{0}} > .table-body > table > thead th:nth-child({{1}}),' +
            '#{{0}} > .table-body > table > tbody td:nth-child({{1}})' +
            '{ width:{{2}}{{3}}; }',
        thtd =
            '#{{0}} .table-header th.header-cell:nth-child({{1}}),' +
            '#{{0}} .table-footer td.footer-cell:nth-child({{1}})' +
            '{ width:{{2}}px; }';

    // even though the table might not exist yet, we should still render width styles because there might be fixed widths specified
    $columns.forEach( function ( col ) {
        if ( col.width ) {
            px = ( isNaN( col.width ) == false ) ? 'px' : '';
            html.addFormat( fixedWidth, [$config.ID, index + 1, col.width, px] );
        }
        else if ( bodyCols.length && ( $config.fixedheaders || $config.fixedfooters ) ) {
            // sync header and footer to body
            html.addFormat( thtd, [$config.ID, index + 1, bodyCols[index].offsetWidth] );
        }
        index++;
    } );

    return html.toString();
};

gp.templates.columnWidthStyle.$inject = ['$config', '$columns'];

gp.templates.container = function ( $config, $injector ) {
    // the main layout
    var html = new gp.StringBuilder();
    html.addFormat(
        '<div class="gp table-container {{0}}" id="{{1}}">',
        [$injector.exec( 'containerClasses' ), $config.ID]
    );
    if ( $config.search || $config.create || $config.toolbar ) {
        html.add( '<div class="table-toolbar">' );
        html.add( $injector.exec( 'toolbar' ) );
        html.add( '</div>' );
    }
    if ( $config.fixedheaders ) {
        // render a separate table for fixed headers
        // and sync column widths between this table and the one below
        html.add( '<div class="table-header">' )
            .add( '<table class="table" cellpadding="0" cellspacing="0">' )
            .add( $injector.exec( 'header' ) )
            .add( '</table>' )
            .add( '</div>' );
    }
    html.addFormat( '<div class="table-body{{0}}">', $config.fixedheaders ? ' table-scroll' : '' )
        .add( '<table class="table" cellpadding="0" cellspacing="0"><tbody></tbody></table>' )
        .add( '</div>' );
    if ( $config.fixedfooters ) {
        // render a separate table for fixed footers
        // and sync column widths between this table and the one above
        html.add( '<div class="table-footer"></div>' );
    }
    if ( $config.pager ) {
        html.add( '<div class="table-pager"></div>' );
    }
    html.add( '<style type="text/css" class="column-width-style">' )
        .add( $injector.exec( 'columnWidthStyle' ) )
        .add( '</style>' )
        .add( '<style type="text/css" class="sort-style"></style>' )
        .add( '<div class="gp-progress-overlay">' )
        .add( '<div class="gp-progress gp-progress-container">' )
        .add( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' )
        .add( '</div>' )
        .add( '</div>' )
        .add( '</div>' );
    return html.toString();
};

gp.templates.container.$inject = ['$config', '$injector'];

gp.templates.containerClasses = function ( $config ) {
    var classes = [];
    if ( $config.fixedheaders ) {
        classes.push( 'fixed-headers' );
    }
    if ( $config.fixedfooters ) {
        classes.push( 'fixed-footers' );
    }
    if ( $config.pager ) {
        classes.push( 'pager-' + $config.pager );
    }
    if ( $config.responsive ) {
        classes.push( 'table-responsive' );
    }
    if ( $config.search ) {
        classes.push( 'search-' + $config.search );
    }
    if ( $config.rowselected ) {
        classes.push( 'selectable' );
    }
    if ( $config.containerclass ) {
        classes.push( $config.containerclass ); 
    }
    return classes.join( ' ' );
};

gp.templates.containerClasses.$inject = ['$config'];

gp.templates.editCellContent = function ( $column, $dataItem, $mode, $config, $injector ) {
    var template,
        col = $column,
        html = new gp.StringBuilder();

    // check for a template
    if ( col.edittemplate ) {
        if ( typeof ( col.edittemplate ) === 'function' ) {
            html.add( gp.applyFunc( col.edittemplate, this, [$dataItem, col] ) );
        }
        else {
            html.add( gp.supplant.call( this, col.edittemplate, $dataItem, [$dataItem, col] ) );
        }
    }
    else if ( col.commands ) {
        // render buttons
        html.add( '<div class="btn-group' )
            .add( $config.editmode == 'inline' ? ' btn-group-xs' : '' )
            .add('">')
            .add( $injector.exec('button', {
                btnClass: 'btn-primary',
                value: ( $mode == 'create' ? 'create' : 'update' ),
                glyphicon: 'glyphicon-save',
                text: 'Save'
            } ) )
            .add( '<button type="button" class="btn btn-default" data-dismiss="modal" value="cancel">' )
            .add( '<span class="glyphicon glyphicon-remove"></span>Cancel' )
            .add( '</button>' )
            .add( '</div>' );
    }
    else {
        // render an input of the appropriate type
        var val = $dataItem[col.field];
        // render undefined/null as empty string
        if ( !gp.hasValue( val ) ) val = '';
        html.add( $injector.exec( 'input', { type: col.Type, name: col.field, value: "", required: ($column.required || false) } ) );
    }
    return html.toString();
};

gp.templates.editCellContent.$inject = ['$column', '$dataItem', '$mode', '$config', '$injector'];

gp.templates.footer = function ( $columns, $injector ) {

    var self = this,
        html = new gp.StringBuilder();
    html.add( '<tfoot>' )
        .add( '<tr>' )
    $columns.forEach( function ( col ) {
        $injector.setResource( '$column', col );
        html.add( $injector.exec( 'footerCell' ) );
    } );
    html.add( '</tr>' )
        .add( '</tfoot>' );
    return html.toString();
};

gp.templates.footer.$inject = ['$columns', '$injector'];

gp.templates.footerCell = function ( $injector, $column ) {
    var html = new gp.StringBuilder();
        html.addFormat( '<td class="footer-cell {{0}}">', $column.footerclass )
            .add( $injector.exec( 'footerCellContent' ) )
            .add( '</td>' );
    return html.toString();
};

gp.templates.footerCell.$inject = ['$injector', '$column'];

gp.templates.footerCellContent = function ( $data, $column ) {
    var html = new gp.StringBuilder();
    // there must be a template for footers
    if ( $column.footertemplate ) {
        if ( typeof ( $column.footertemplate ) === 'function' ) {
            html.add( gp.applyFunc( $column.footertemplate, this, [$column, $data] ) );
        }
        else {
            html.add( gp.supplant.call( this, $column.footertemplate, $column, [$column, $data] ) );
        }
    }
    return html.toString();
};

gp.templates.footerCellContent.$inject = ['$data', '$column'];

gp.templates.footerTable = function ($injector) {
    var html = new gp.StringBuilder();
    html.add( '<table class="table" cellpadding="0" cellspacing="0">' )
        .add( $injector.exec( 'footer' ) )
        .add( '</table>' );
    return html.toString();
};

gp.templates.footerTable.$inject = ['$injector'];

gp.templates.formGroup = function ( model ) {
    var template = '<div class="form-group {{editclass}}"><label class="col-sm-4 control-label">{{{label}}}</label><div class="col-sm-6">{{{input}}}</div></div>';
    return gp.supplant.call( this,  template, model );
};

gp.templates.header = function ( $columns, $config, $injector ) {
    // depending on whether or not fixedheaders has been specified
    // this template is rendered either in a table by itself or inside the main table
    var html = new gp.StringBuilder();
    html.add( '<thead><tr>' );
    $columns.forEach( function ( col ) {
        html.add( $injector.setResource( '$column', col ).exec( 'headerCell' ) );
    } );
    html.add( '</tr></thead>' );
    return html.toString();
};

gp.templates.header.$inject = ['$columns', '$config', '$injector'];

gp.templates.headerCell = function ( $column, $config, $injector ) {
    var self = this,
        html = new gp.StringBuilder(),
        sort = '';

    if ( $config.sorting ) {
        // apply sorting to the entire header
        // if sort isn't specified, use the field
        sort = gp.escapeHTML( gp.coalesce( [$column.sort, $column.field] ) );
    }
    else {
        // only provide sorting where it is explicitly specified
        if ( gp.hasValue( $column.sort ) ) {
            sort = gp.escapeHTML( $column.sort );
        }
    }

    html.add( '<th class="header-cell ' + ( $column.headerclass || '' ) + '"' );

    if ( gp.hasValue( sort ) ) {
        html.addFormat( ' data-sort="{{0}}"', sort );
    }

    html.add( '>' );
    html.add( $injector.exec( 'headerCellContent' ) );
    html.add( '</th>' );

    return html.toString();
};

gp.templates.headerCell.$inject = ['$column', '$config', '$injector'];

gp.templates.headerCellContent = function ( $column, $config ) {

    var self = this,
        html = new gp.StringBuilder(),
        sort = '';

    if ( $config.sorting ) {
        // apply sorting to the entire header
        // if sort isn't specified, use the field
        sort = gp.escapeHTML( gp.coalesce( [$column.sort, $column.field] ) );
    }
    else {
        // only provide sorting where it is explicitly specified
        if ( gp.hasValue( $column.sort ) ) {
            sort = gp.escapeHTML( $column.sort );
        }
    }

    // check for a template
    if ( $column.headertemplate ) {
        if ( typeof ( $column.headertemplate ) === 'function' ) {
            html.add( gp.applyFunc( $column.headertemplate, self, [$column] ) );
        }
        else {
            html.add( gp.supplant.call( self, $column.headertemplate, $column, [$column] ) );
        }
    }
    else if ( !gp.isNullOrEmpty( sort ) ) {
        html.addFormat( '<a href="javascript:void(0);" class="table-sort" value="sort" data-sort="{{0}}">', sort )
            .escape( gp.coalesce( [$column.header, $column.field, sort] ) )
            .add( '<span class="glyphicon"></span>' )
            .add( '</a>' );
    }
    else {
        html.escape( gp.coalesce( [$column.header, $column.field, ''] ) );
    }

    return html.toString();
};

gp.templates.headerCellContent.$inject = ['$column', '$config'];

gp.templates.input = function ( model ) {
    var obj = {
        type: ( model.type == 'boolean' ? 'checkbox' : ( model.type == 'number' ? 'number' : 'text' ) ),
        name: model.name,
        value: ( model.type == 'boolean' ? 'true' : ( model.type == 'date' ? gp.format( model.value, 'YYYY-MM-DD' ) : gp.escapeHTML( model.value ) ) ),
        checked: ( model.type == 'boolean' && model.value ? ' checked' : '' ),
        // Don't bother with the date input type.
        // Indicate the type using data-type attribute so a custom date picker can be used.
        // This sidesteps the problem of polyfilling browsers that don't support the date input type
        // and provides a more consistent experience across browsers.
        dataType: ( /^date/.test( model.type ) ? ' data-type="date"' : '' ),
        required: ( model.required ? ' required' : '' )
    };

    var html = gp.supplant.call( this, '<input type="{{type}}" name="{{name}}" value="{{value}}" class="form-control"{{{dataType}}}{{checked}}{{required}} />', obj );

    if ( model.required ) {
        // add a span after the input for required fields
        // default CSS styles render an exclamation sign for this
        // (glyphicon-exclamation-sign)
        html += '<span class="required"></span>';
    }

    return html;
};

gp.templates.pagerBar = function ( $requestModel ) {
    var requestModel = gp.shallowCopy($requestModel),
        html = new gp.StringBuilder();

    requestModel.IsFirstPage = requestModel.page === 1;
    requestModel.IsLastPage = requestModel.page === requestModel.pagecount;
    requestModel.HasPages = requestModel.pagecount > 1;
    requestModel.PreviousPage = requestModel.page === 1 ? 1 : requestModel.page - 1;
    requestModel.NextPage = requestModel.page === requestModel.pagecount ? requestModel.pagecount : requestModel.page + 1;

    requestModel.firstPageClass = (requestModel.IsFirstPage ? 'disabled' : '');
    requestModel.lastPageClass = (requestModel.IsLastPage ? 'disabled' : '');

    if ( requestModel.HasPages ) {
        html.add( '<div class="btn-group">' )
            .add( '<button class="ms-page-index btn btn-default {{firstPageClass}}" title="First page" value="page" data-page="1">' )
            .add( '<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '<button class="ms-page-index btn btn-default {{firstPageClass}}" title="Previous page" value="page" data-page="{{PreviousPage}}">' )
            .add( '<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '</div>' )
            .add( '<input type="number" name="page" value="{{page}}" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" />' )
            .add( '<span class="page-count"> of {{pagecount}}</span>' )
            .add( '<div class="btn-group">' )
            .add( '<button class="ms-page-index btn btn-default {{lastPageClass}}" title="Next page" value="page" data-page="{{NextPage}}">' )
            .add( '<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '<button class="ms-page-index btn btn-default {{lastPageClass}}" title="Last page" value="page" data-page="{{pagecount}}">' )
            .add( '<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '</div>' );
    }
    return gp.supplant.call( this,  html.toString(), requestModel );
};

gp.templates.pagerBar.$inject = ['$requestModel'];

gp.templates.sortStyle = function ( $config ) {
    var model = {
        id: $config.ID,
        sort: $config.requestModel.sort,
        glyph: $config.requestModel.desc ? '\\e114' : '\\e113' // glyphicon-chevron-down, glyphicon-chevron-up
    };
    var template =
        '#{{id}} a.table-sort[data-sort="{{{sort}}}"] > span.glyphicon { display:inline; } ' +
        '#{{id}} a.table-sort[data-sort="{{{sort}}}"] > span.glyphicon:before { content:"{{{glyph}}}"; }';

    if ( !gp.isNullOrEmpty( model.sort ) ) {
        return gp.supplant( template, model );
    }
    return '';
};

gp.templates.sortStyle.$inject = ['$config'];

gp.templates.tableBody = function ( $config, $injector ) {
    var html = new gp.StringBuilder();
    html.addFormat( '<table class="table {{0}}" cellpadding="0" cellspacing="0">', $config.tableclass );
    if ( !$config.fixedheaders ) {
        html.add( $injector.exec( 'header' ) );
    }
    html.add( '<tbody>' )
        .add( $injector.exec( 'tableRows' ) )
        .add( '</tbody>' );
    if ( $config.hasFooter && !$config.fixedfooters ) {
        html.add( $injector.exec( 'footer' ) );
    }
    html.add( '</table>' );
    return html.toString();
};

gp.templates.tableBody.$inject = ['$config', '$injector'];

gp.templates.tableRow = function ( $injector, $mode, uid ) {
    var self = this,
        html = new gp.StringBuilder();

    html.addFormat( '<tr data-uid="{{0}}"', uid );

    if ( /create|update/.test( $mode ) ) {
        html.add( ' class="' ).add( $mode ).add( '-mode"' );
    }

    html.add( ">" )
        .add( $injector.exec( 'tableRowCells' ) )
        .add( '</tr>' );
    return html.toString();
};

gp.templates.tableRow.$inject = ['$injector', '$mode'];

gp.templates.tableRowCell = function ( $column, $injector, $mode ) {
    var self = this,
        mode = $mode || 'read',
        html = new gp.StringBuilder(),
        isEditMode = /create|update/.test( mode );

    html.addFormat( '<td class="body-cell {{0}}{{1}}">',
        [( $column.commands ? 'commands ' : '' ), ( isEditMode ? $column.editclass : $column.bodyclass )]
    );

    if ( isEditMode && !$column.readonly ) {
        html.add( $injector.exec( 'editCellContent' ) );
    }
    else {
        html.add( $injector.exec( 'bodyCellContent' ) );
    }

    html.add( '</td>' );

    return html.toString();
};

gp.templates.tableRowCell.$inject = ['$column', '$injector', '$mode'];

gp.templates.tableRowCells = function ( $columns, $injector ) {
    var self = this,
        html = new gp.StringBuilder();
    $columns.forEach( function ( col ) {
        // set the current column for bodyCellContent / editCellContent template
        $injector.setResource( '$column', col );
        html.add( $injector.exec( 'tableRowCell' ) );
    } );
    return html.toString();
};

gp.templates.tableRowCells.$inject = ['$columns', '$injector'];

gp.templates.tableRows = function ( $data, $map, $injector ) {
    var self = this,
        html = new gp.StringBuilder(),
        uid;
    if ( $data == null ) return '';
    $data.forEach( function ( dataItem ) {
        // set the current data item on the injector
        $injector.setResource( '$dataItem', dataItem );
        // assign a uid to the dataItem, pass it to the tableRow template
        uid = $map.assign( dataItem );
        html.add( $injector.exec( 'tableRow', uid ) );
    } );
    return html.toString();
};

gp.templates.tableRows.$inject = ['$data', '$map', '$injector'];

gp.templates.toolbar = function ( $config, $injector ) {
    var html = new gp.StringBuilder();

    if ( $config.search ) {
        html.add( '<div class="input-group gp-searchbox">' )
            .add( '<input type="text" name="search" class="form-control" placeholder="Search...">' )
            .add( '<span class="input-group-btn">' )
            .add( $injector.exec( 'button', {
                btnClass: 'btn-default',
                value: 'search',
                glyphicon: 'glyphicon-search'
            } ) )
            .add( '</span>' )
            .add( '</div>' );
    }
    if ( $config.create ) {
        html.add( $injector.exec( 'button',
            {
                btnClass: 'btn-default',
                value: 'AddRow',
                glyphicon: 'glyphicon-plus',
                text: 'Add'
            } ) );
    }

    return html.toString();
};

gp.templates.toolbar.$inject = ['$config', '$injector'];
/***************\
   utilities
\***************/
( function ( gp ) {

    // used by escapeHTML
    var chars = [/&/g, /</g, />/g, /"/g, /'/g, /`/g];
    var escaped = ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&#96;'];

    // used by createUID
    // pilfered from https://github.com/Benvie/harmony-collections
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

    $.extend( gp, {

        applyFunc: function ( func, context, args, error ) {
            if ( typeof func !== 'function' ) return;
            // anytime there's the possibility of executing 
            // user-supplied code, wrap it with a try-catch block
            // so it doesn't affect my component
            try {
                if ( args == undefined ) {
                    return func.call( context );
                }
                else {
                    args = Array.isArray( args ) ? args : [args];
                    return func.apply( context, args );
                }
            }
            catch ( e ) {
                error = error || gp.error;
                gp.applyFunc( error, context, e );
            }
        },

        coalesce: function ( array ) {
            if ( gp.isNullOrEmpty( array ) ) return array;

            for ( var i = 0; i < array.length; i++ ) {
                if ( gp.hasValue( array[i] ) ) {
                    return array[i];
                }
            }

            return array[array.length - 1];
        },

        createUID: function () {
            // id's can't begin with a number
            var key = 'gp' + slice( numberToString( Math.random(), 36 ), 2 );
            return key in uids ? createUID() : uids[key] = key;
        },

        disable: function ( elem, seconds ) {
            $( elem ).attr( 'disabled', 'disabled' ).addClass( 'disabled busy' );
            if ( typeof seconds == 'number' && seconds > 0 ) {
                setTimeout( function () {
                    gp.enable( elem );
                }, seconds * 1000 );
            }
        },

        enable: function ( elem ) {
            $( elem ).removeAttr( 'disabled' ).removeClass( 'disabled busy' );
        },

        escapeHTML: function ( obj ) {
            if ( typeof obj !== 'string' ) {
                return obj;
            }
            chars.forEach( function ( char, i ) {
                obj = obj.replace( char, escaped[i] );
            } );
            return obj;
        },

        format: function ( val, format ) {
            var type = gp.getType( val );

            try {
                if ( /^(date|datestring)$/.test( type ) ) {
                    if ( !window.moment ) return val;
                    format = format || 'M/D/YYYY h:mm a';
                    return moment( val ).format( format );
                }
                if ( type === 'timestamp' ) {
                    if ( !window.moment ) return val;
                    format = format || 'M/D/YYYY h:mm a';
                    val = parseInt( val.match( gp.rexp.timestamp )[1] );
                    return moment( val ).format( format );
                }
                if ( type === 'number' ) {
                    if ( !window.numeral ) return val;
                    // numeral's defaultFormat option doesn't work as of 3/25/2016
                    format = format || '0,0';
                    return numeral( val ).format( format );
                }
            }
            catch ( e ) {
                gp.error( e );
            }
            return val;
        },

        getAttributes: function ( node ) {
            var config = {}, name, attr, attrs = $( node )[0].attributes;
            for ( var i = attrs.length - 1; i >= 0; i-- ) {
                attr = attrs[i];
                name = attr.name.toLowerCase().replace( '-', '' );
                // convert "true", "false" and empty to boolean
                config[name] = gp.rexp.trueFalse.test( attr.value ) || attr.value === '' ?
                    ( attr.value === "true" || attr.value === '' ) : attr.value;
            }
            return config;
        },

        getColumnByField: function ( columns, field ) {
            var col = columns.filter( function ( c ) { return c.field === field || c.sort === field } );
            return col.length ? col[0] : null;
        },

        getCommand: function ( columns, name ) {
            // find by value
            var allCmds = [];
            columns.forEach( function ( col ) {
                if ( Array.isArray( col.commands ) ) {
                    allCmds = allCmds.concat( col.commands );
                }
            } );

            var cmd = allCmds.filter( function ( cmd ) {
                return cmd.value === name;
            } );

            if ( cmd.length > 0 ) return cmd[0];
        },

        getDefaultValue: function ( type ) {
            switch ( type ) {
                case 'number':
                    return 0;
                case 'boolean':
                    return false;
                case 'date':
                default:
                    return null;
            }
        },

        getFormattedValue: function ( row, col, escapeHTML ) {
            var type = ( col.Type || '' ).toLowerCase();
            // if type equals function, col.field is the function
            var val = ( type === 'function' ? col.field( row ) : row[col.field] );

            if ( /^(date|datestring|timestamp)$/.test( type ) ) {
                return gp.format( val, col.format );
            }
            if ( /^(number|function)$/.test( type ) && col.format ) {
                return gp.format( val, col.format );
            }
            // if there's no type and there's a format and val is numeric then parse and format
            if ( type === '' && col.format && /^(?:\d*\.)?\d+$/.test( val ) ) {
                return gp.format( parseFloat( val ), col.format );
            }
            if ( type === 'string' && escapeHTML ) {
                return gp.escapeHTML( val );
            }
            return val;
        },

        getMatchCI: function ( array, str ) {
            // find str in array, ignoring case
            if ( gp.isNullOrEmpty( array ) ) return null;
            if ( !gp.hasValue( str ) ) return null;
            var s = str.toLowerCase();
            for ( var i = 0; i < array.length; i++ ) {
                if ( gp.hasValue( array[i] ) && array[i].toLowerCase() === s ) return array[i];
            }
            return null;
        },

        getObjectAtPath: function ( path, root ) {
            // behold: the proper way to find an object from a string without using eval
            if ( typeof path !== 'string' ) return path;

            // o is our placeholder
            var o = root || window,
                segment;

            path = path.match( gp.rexp.splitPath );

            if ( path[0] === 'window' ) path = path.splice( 1 );

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
        },

        getTableRow: function ( map, dataItem, node ) {
            var uid = map.getUid( dataItem );
            if ( uid == -1 ) return;
            return $( node ).find( 'tr[data-uid="' + uid + '"]' );
        },

        getType: function ( a ) {
            if ( a === null || a === undefined ) {
                return a;
            }

            var t = typeof a;

            if ( t === 'string' ) {
                if ( gp.rexp.iso8601.test( a ) ) {
                    return 'datestring';
                }
                if ( gp.rexp.timestamp.test( a ) ) {
                    return 'timestamp';
                }
                return t;
            }

            if ( t === 'number' || t === 'boolean' || t === 'function' ) return t;

            if ( a instanceof Date ) {
                return 'date';
            }
            if ( Array.isArray( a ) ) {
                return 'array';
            }
            // object
            return t;
        },

        hasValue: function ( val ) {
            return val !== undefined && val !== null;
        },

        'implements': function ( obj1, obj2 ) {
            if ( typeof obj1 !== typeof obj2 ) return false;
            // they're both null or undefined
            if ( !gp.hasValue( obj1 ) ) return true;

            // do a case-insensitive compare
            var toLower = function ( str ) {
                return str.toLowerCase();
            };

            var props1 = Object.getOwnPropertyNames( obj1 ).map( toLower ),
                props2 = Object.getOwnPropertyNames( obj2 ).map( toLower );

            if ( props1.length < props2.length ) {
                for ( var i = 0; i < props1.length; i++ ) {
                    if ( props2.indexOf( props1[i] ) === -1 ) return false;
                }
            }
            else {
                for ( var i = 0; i < props2.length; i++ ) {
                    if ( props1.indexOf( props2[i] ) === -1 ) return false;
                }
            }

            return true;
        },

        isNullOrEmpty: function ( val ) {
            // if a string or array is passed, it'll be tested for both null and zero length
            // if any other data type is passed (no length property), it'll only be tested for null
            return gp.hasValue( val ) === false || ( val.length != undefined && val.length === 0 );
        },

        resolveTypes: function ( config ) {
            var field,
                val,
                hasData = config && config.requestModel && config.requestModel.data && config.requestModel.data.length;

            config.columns.forEach( function ( col ) {
                if ( gp.hasValue( col.Type ) ) return;
                field = gp.hasValue( col.field ) ? col.field : col.sort;
                if ( gp.isNullOrEmpty( field ) ) return;
                if ( typeof field === 'function' ) {
                    // don't execute the function here to find the type
                    // it should only be executed once by getFormattedValue
                    col.Type = 'function';
                    return;
                }
                // give priority to the model, unless it contains a function
                if ( config.model ) {
                    if ( gp.hasValue( config.model[field] ) && gp.getType( config.model[field] ) !== 'function' ) {
                        col.Type = gp.getType( config.model[field] );
                    }
                }
                if ( !gp.hasValue( col.Type ) && hasData ) {
                    // if we haven't found a value after 25 iterations, give up
                    for ( var i = 0; i < config.requestModel.data.length && i < 25 ; i++ ) {
                        val = config.requestModel.data[i][field];
                        // no need to use gp.hasValue here
                        // if val is undefined that means the column doesn't exist
                        if ( val !== null ) {
                            col.Type = gp.getType( val );
                            break;
                        }
                    }
                }
            } );
        },

        resolveResponseModel: function ( response, dataItemPrototype ) {
            if ( !gp.hasValue( response ) ) return null;

            var responseModel = new gp.ResponseModel();

            if ( gp.implements( response, responseModel ) ) {
                // this will overwrite responseModel.original if present in the response
                gp.shallowCopy( response, responseModel, true );
            }
            else if ( response.data && response.data.length ) {
                responseModel.dataItem = response.data[0];
            }
            else if ( response.length ) {
                responseModel.dataItem = response[0];
            }
            else if ( gp.implements( response, dataItemPrototype ) ) {
                responseModel.dataItem = response;
            }
            else {
                throw new Error( "Could not resolve JSON response." );
            }

            return responseModel;
        },

        rexp: {
            splitPath: /[^\[\]\.\s]+|\[\d+\]/g,
            indexer: /\[\d+\]/,
            iso8601: /^[012][0-9]{3}-[01][0-9]-[0123][0-9]/,
            timestamp: /\/Date\((\d+)\)\//,
            quoted: /^['"].+['"]$/,
            trueFalse: /true|false/i,
            json: /^\{.*\}$|^\[.*\]$/,
            copyable: /^(object|date|array|function)$/
        },

        shallowCopy: function ( from, to, caseInsensitive ) {
            to = to || {};
            // IE is more strict about what it will accept
            // as an argument to getOwnPropertyNames
            if ( !gp.rexp.copyable.test( gp.getType( from ) ) ) return to;
            var desc,
                p,
                props = Object.getOwnPropertyNames( from ),
                propsTo = Object.getOwnPropertyNames( to );

            props.forEach( function ( prop ) {

                p = caseInsensitive ? gp.getMatchCI( propsTo, prop ) || prop : prop;

                if ( to.hasOwnProperty( prop ) ) {
                    // check for a read-only property
                    desc = Object.getOwnPropertyDescriptor( to, prop );
                    if ( !desc.writable ) return;
                }
                if ( typeof from[prop] === 'function' ) {
                    to[p] = from[prop]();
                }
                else {
                    to[p] = from[prop];
                }
            } );
            return to;
        },

        supplant: function ( str, o, args ) {
            var self = this, t, types = /^(string|number|boolean|date|datestring|timestamp)$/, r;
            // raw: 3 curly braces
            str = str.replace( /{{{([^{}]*)}}}/g,
                function ( a, b ) {
                    r = gp.getObjectAtPath( b, o );
                    t = gp.getType( r );
                    if ( types.test( t ) ) return r;
                    // models can contain functions
                    if ( t === 'function' ) return gp.applyFunc( r, self, args );
                    // it's not in o, so check for a function
                    r = gp.getObjectAtPath( b );
                    return typeof r === 'function' ? gp.applyFunc( r, self, args ) : '';
                }
            )
            // escape HTML: 2 curly braces
            return str.replace( /{{([^{}]*)}}/g,
                function ( a, b ) {
                    r = gp.getObjectAtPath( b, o );
                    t = gp.getType( r );
                    if ( types.test( t ) ) return gp.escapeHTML( r );
                    // models can contain functions
                    if ( t === 'function' ) return gp.escapeHTML( gp.applyFunc( r, self, args ) );
                    // it's not in o, so check for a function
                    r = gp.getObjectAtPath( b );
                    return typeof r === 'function' ? gp.escapeHTML( gp.applyFunc( r, self, args ) ) : '';
                }
            );
        },

        triggerEvent: function ( elem, name ) {

            var evt = new CustomEvent( name, {
                'view': window,
                'bubbles': true,
                'cancelable': true
            } );

            $( elem )[0].dispatchEvent( evt );

        },

        // logging
        log: ( window.console ? window.console.log.bind( window.console ) : function () { } ),

        error: function ( e ) {
            if ( console && console.error ) {
                console.error( e );
            }
        }

    } );

} )( gridponent );
// check for web component support
if (document.registerElement) {

    gp.Gridponent = Object.create(HTMLElement.prototype);

    gp.Gridponent.createdCallback = function () {
        var init = new gp.Initializer( this );
        $( init.initialize.bind( init ) );
    };

    gp.Gridponent.detachedCallback = function () {
        var tbl = this.querySelector('.table-container');
        if (tbl && tbl.api) tbl.api.dispose();
    };

    document.registerElement('grid-ponent', {
        prototype: gp.Gridponent
    });
}
else {
    // no web component support
    // provide a static function to initialize grid-ponent elements manually
    gp.initialize = function (root) {
        root = $(root || document)[0];
        // jQuery stalls here, so don't use it
        var nodes = root.querySelectorAll( 'grid-ponent' );
        for ( var i = 0; i < nodes.length; i++ ) {
            new gp.Initializer( nodes[i] ).initialize();
        }
    };

    $(function(){
        gp.initialize();
    });
}

})(gridponent);

