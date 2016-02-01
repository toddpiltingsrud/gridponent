/***************\
      API
\***************/

gp.api = function ( controller ) {
    this.controller = controller;
};

gp.api.prototype = {

    search: function ( searchTerm ) {
        this.controller.config.data.Search = searchTerm;
        gp.info( 'search: config:', this.controller.config );
        this.controller.update();
    },

    sort: function ( name, desc ) {
        this.controller.config.data.OrderBy = name;
        this.controller.config.data.Desc = (desc == true);
        this.controller.update();
    },

    read: function ( arg ) { },

    create: function ( arg ) { },

    update: function ( arg ) { },

    destroy: function ( arg ) { },

    cancel: function ( arg ) { }

};