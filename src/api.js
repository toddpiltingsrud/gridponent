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
    this.$n = $( this.config.node );
};

gp.api.prototype = {

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

    read: function ( requestModel, callback ) {
        this.controller.read( requestModel, callback );
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
    }

};

Object.getOwnPropertyNames( gp.events ).forEach( function ( evt ) {

    gp.api.prototype[evt] = function (callback) {
        this.controller.addDelegate( gp.events[evt], callback );;
        return this;
    };

} );

gp.api.prototype.ready = function ( callback ) {
    this.controller.ready( callback );
    return this;
};
