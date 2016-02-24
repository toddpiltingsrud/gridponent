/***************\
      API
\***************/

gp.api = function ( controller ) {
    this.controller = controller;
};

gp.api.prototype = {

    getData: function ( index ) {
        if ( typeof index == 'number' ) return this.controller.config.pageModel.Data[index];
        return this.controller.config.pageModel.Data;
    },

    addRow: function ( row ) {
        this.controller.config.pageModel.Data.push( row );
    },

    search: function ( searchTerm, callback ) {
        this.controller.search( searchTerm, callback );
    },

    sort: function ( name, desc, callback ) {
        this.controller.sort( name, desc, callback );
    },

    read: function ( requestModel, callback ) {
        requestModel = requestModel || this.controller.config.pageModel;
        this.controller.read( requestModel, callback );
    },

    create: function (callback) {
        this.controller.createRow(callback);
    },

    // This would have to be called after having retrieved the row from the table with getData().
    // The controller will attempt to figure out which tr it is by first calling indexOf(row) on the data.
    // So the original row object reference has to be preserved.
    // this function is mainly for testing
    update: function ( row, callback ) {
        var tr = gp.getTableRow( this.controller.config.pageModel.Data, row, this.controller.config.node );

        tr['gp-update-model'] = new gp.UpdateModel( row );

        this.controller.updateRow( row, tr, callback );
    },

    'delete': function ( row, callback ) {
        this.controller.deleteRow( row, callback, true );
    },

    cancel: function ( arg ) { },

    dispose: function () {
        this.controller.dispose();
    }

};