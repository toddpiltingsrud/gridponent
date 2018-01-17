﻿/***************\
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
        return this.controller.config.requestModel.Data;
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
