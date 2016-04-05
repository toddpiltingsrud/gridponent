﻿/***************\
      API
\***************/

gp.events = {

    rowselected: 'rowselected',
    beforeinit: 'beforeinit',
    beforeread: 'beforeread',
    // turn progress indicator on
    beforeedit: 'beforeedit',
    // turn progress indicator off
    onread: 'onread',
    // turn progress indicator off
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
    this.controller = controller;
};

gp.api.prototype = {

    find: function(selector) {
        return this.controller.config.node.querySelector( selector );
    },

    findAll: function ( selector ) {
        return this.controller.config.node.querySelectorAll( selector );
    },

    getConfig: function() {
        return this.controller.config;
    },

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

    getTableRow: function( dataItem ) {
        return gp.getTableRow(
            this.controller.config.pageModel.data,
            dataItem,
            this.controller.config.node
        );
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

    create: function ( dataItem, callback ) {
        var model = this.controller.addRow( dataItem );
        if ( model != null ) this.controller.createRow( dataItem, model.elem, callback );
        else callback( null );
    },

    // This would have to be called after having retrieved the dataItem from the table with getData().
    // The controller will attempt to figure out which tr it is by first calling indexOf(dataItem) on the data.
    // So the original dataItem object reference has to be preserved.
    // this function is mainly for testing
    update: function ( dataItem, done ) {
        this.controller.updateRow( dataItem, done );
    },

    saveChanges: this.update,

    destroy: function ( dataItem, callback ) {
        this.controller.deleteRow( dataItem, callback, true );
    },

    dispose: function () {
        this.controller.dispose();
    }

};