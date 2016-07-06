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

    getCommandIndex: function ( value ) {
        for ( var i = 0; i < this.config.commands.length; i++ ) {
            if ( this.config.commands[i].value === value ) {
                return i;
            }
        }
    },

    getData: function ( uidOrTableRow ) {
        if ( uidOrTableRow != undefined ) return this.config.map.get( uidOrTableRow );
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
        return this;
    },

    refresh: function ( callback ) {
        this.controller.read( null, callback );
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
        typeof desc == 'boolean' ? desc : desc === 'false' ? false : !!desc;
        this.controller.sort( name, desc, callback );
        return this;
    },

    toggleBusy: function ( isBusy ) {

        isBusy = ( isBusy === true || isBusy === false ? isBusy : !gp.hasClass( this.config.node, 'busy' ) );

        if ( isBusy ) {
            gp.addClass( this.config.node, 'busy' );
        }
        else {
            gp.removeClass( this.config.node, 'busy' );
        }

        return this;
    }

};

Object.getOwnPropertyNames( gp.events ).forEach( function ( evt ) {

    gp.api.prototype[evt] = function ( callback ) {
        if ( typeof callback === 'function' ) {
            this.controller.addDelegate( gp.events[evt], callback );
        }
        return this;
    };

} );

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
