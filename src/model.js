/***************\
     model
\***************/
gp.Model = function ( config ) {
    this.config = config;
    this.dal = null;
    var type = gp.getType( config.Read );
    gp.info( 'Model: type:', type );
    switch ( type ) {
        case 'string':
            this.dal = new gp.ServerPager( config );
            break;
        case 'function':
            this.dal = new gp.FunctionPager( config );
            break;
        case 'object':
            // Read is a RequestModel
            this.config.pageModel = config.Read;
            this.dal = new gp.ClientPager( this.config );
            break;
        case 'array':
            this.config.pageModel.Data = this.config.Read;
            this.dal = new gp.ClientPager( this.config );
            break;
        default:
            throw 'Unsupported Read configuration';
    }
};

gp.Model.prototype = {

    read: function ( requestModel, callback ) {
        var self = this;
        gp.info( 'Model.read: requestModel:', requestModel );

        gp.info( 'Model.dal: :', this.dal );

        this.dal.read( requestModel, function (arg) {
            gp.tryCallback( callback, self, arg );
        } );
    },

    create: function (callback) {
        var self = this,
            row;

        // Create config option can be a function or a URL
        if ( typeof this.config.Create === 'function' ) {
            // call the function
            this.config.Create( function ( row ) {
                gp.tryCallback( callback, self, row );
            } );
        }
        else {
            // call the URL
            var http = new gp.Http();
            http.get(this.config.Create, function (row) {
                gp.tryCallback( callback, self, row );
            } );
        }
    },

    update: function (updateModel, callback) {
        var self = this;
        // config.Update can be a function or URL
        gp.raiseCustomEvent( this.config.node, gp.events.beforeUpdate );
        if ( typeof this.config.Update === 'function' ) {
            this.config.Update( updateModel, function ( arg ) {
                gp.tryCallback( callback, self, arg );
            } );
        }
        else {
            var http = new gp.Http();
            http.post( this.config.Update, updateModel, function ( arg ) {
                gp.tryCallback( callback, self, arg );
            } );
        }
    },

    'delete': function (row, callback) {
        var self = this;
        if ( typeof this.config.Delete === 'function' ) {
            this.config.Delete( row, function ( arg ) {
                gp.tryCallback( callback, self, arg );
            } );
        }
        else {
            var http = new gp.Http();
            http.delete( this.config.Delete, row, function ( arg ) {
                gp.tryCallback( callback, self, arg );
            } );
        }
    }

};