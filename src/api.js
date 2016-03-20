/***************\
      API
\***************/

gp.events = {
    beforeInit: 'beforeInit',
    afterInit: 'afterInit',
    beforeRead: 'beforeRead',
    beforeAdd: 'beforeAdd',
    beforeCreate: 'beforeCreate',
    beforeUpdate: 'beforeUpdate',
    beforeDelete: 'beforeDelete',
    beforeEditMode: 'beforeEditMode',
    afterRead: 'afterRead',
    afterAdd: 'afterAdd',
    afterCreate: 'afterCreate',
    afterUpdate: 'afterUpdate',
    afterDelete: 'afterDelete',
    afterEditMode: 'afterEditMode',
    beforeDispose: 'beforeDispose',
    httpError: 'httpError',
    rowSelected: 'rowSelected'
};

gp.api = function ( controller ) {
    this.controller = controller;
};

gp.api.prototype = {

    ready: function(callback) {
        this.controller.ready( callback );
    },

    refresh: function ( callback ) {
        this.controller.read( null, callback );
    },

    getData: function ( index ) {
        if ( typeof index == 'number' ) return this.controller.config.pageModel.Data[index];
        return this.controller.config.pageModel.Data;
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

    create: function ( row, callback ) {
        var tr = this.controller.addRow( row ).tableRow;
        this.controller.createRow(row, tr, callback);
    },

    // This would have to be called after having retrieved the row from the table with getData().
    // The controller will attempt to figure out which tr it is by first calling indexOf(row) on the data.
    // So the original row object reference has to be preserved.
    // this function is mainly for testing
    update: function ( row, callback ) {
        var tr = gp.getTableRow( this.controller.config.pageModel.Data, row, this.controller.config.node );

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