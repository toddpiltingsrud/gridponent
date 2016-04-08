/***************\
      API
\***************/

gp.events = {

    rowSelected: 'rowselected',
    beforeinit: 'beforeinit',
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
};

gp.api.prototype = {

    beforeEdit: function ( callback ) {
        this.controller.addDelegate( gp.events.beforeEdit, callback );;
        return this;
    },

    beforeInit: function ( callback ) {
        this.controller.addDelegate( gp.events.beforeInit, callback );;
        return this;
    },

    beforeRead: function ( callback ) {
        this.controller.addDelegate( gp.events.beforeRead, callback );;
        return this;
    },

    create: function ( dataItem, callback ) {
        var model = this.controller.addRow( dataItem );
        if ( model != null ) this.controller.createRow( dataItem, model.elem, callback );
        else callback( null );
    },
    
    destroy: function ( dataItem, callback ) {
        this.controller.deleteRow( dataItem, callback, true );
    },

    dispose: function () {
        this.controller.dispose();
    },

    editReady: function ( callback ) {
        this.controller.addDelegate( gp.events.editReady, callback );;
        return this;
    },

    find: function ( selector ) {
        return this.controller.config.node.querySelector( selector );
    },

    findAll: function ( selector ) {
        return this.controller.config.node.querySelectorAll( selector );
    },

    getData: function ( index ) {
        if ( typeof index == 'number' ) return this.controller.config.pageModel.data[index];
        return this.controller.config.pageModel.data;
    },

    getTableRow: function( dataItem ) {
        return gp.getTableRow(
            this.controller.config.map,
            dataItem,
            this.controller.config.node
        );
    },

    httpError: function ( callback ) {
        this.controller.addDelegate( gp.events.httpError, callback );;
        return this;
    },

    onEdit: function ( callback ) {
        this.controller.addDelegate( gp.events.onEdit, callback );;
        return this;
    },

    onRead: function ( callback ) {
        this.controller.addDelegate( gp.events.onRead, callback );;
        return this;
    },

    read: function ( requestModel, callback ) {
        this.controller.read( requestModel, callback );
    },

    ready: function ( callback ) {
        this.controller.ready( callback );
        return this;
    },

    refresh: function ( callback ) {
        this.controller.read( null, callback );
    },

    saveChanges: function ( dataItem, done ) {
        this.controller.updateRow( dataItem, done );
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

    update: function ( dataItem, done ) {
        this.controller.updateRow( dataItem, done );
    },

};