/***************\
      API
\***************/

gp.api = function ( controller ) {
    this.controller = controller;
};

gp.api.prototype = {

    getData: function ( index ) {
        if ( typeof index == 'number' ) return this.controller.config.data.Data[index];
        return this.controller.config.data.Data;
    },

    search: function ( searchTerm ) {
        this.controller.search( searchTerm );
    },

    sort: function ( name, desc ) {
        this.controller.sort( name, desc );
    },

    page: function ( pageNbr, callback ) {
        this.controller.page( pageNbr, callback );
    },

    read: function ( arg ) { },

    create: function (callback) {
        this.controller.createRow(callback);
    },

    // This would have to be called after having retrieved the row from the table with getData().
    // The controller will attempt to figure out which tr it is by first calling indexOf(row) on the data.
    // this function is mainly for testing
    update: function ( row, callback ) {
        this.controller.updateRow( row, null, callback );
    },

    destroy: function ( arg ) { },

    cancel: function ( arg ) { },

    dispose: function () {
        this.controller.dispose();
    }

};