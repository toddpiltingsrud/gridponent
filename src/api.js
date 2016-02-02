/***************\
      API
\***************/

gp.api = function ( controller ) {
    this.controller = controller;
};

gp.api.prototype = {

    search: function ( searchTerm ) {
        this.controller.search( searchTerm );
    },

    sort: function ( name, desc ) {
        this.controller.sort( name, desc );
    },

    page: function ( pageNbr ) {
        this.controller.page( pageNbr );
    },

    read: function ( arg ) { },

    create: function (callback) {
        this.controller.createRow(callback);
    },

    update: function ( arg ) { },

    destroy: function ( arg ) { },

    cancel: function ( arg ) { },

    dispose: function () {
        this.controller.dispose();
    }

};