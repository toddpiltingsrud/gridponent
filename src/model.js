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
            this.dal = new gp.ServerPager( config.Read );
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

    read: function ( requestModel, callback, error ) {
        var self = this;
        gp.info( 'Model.read: requestModel:', requestModel );

        gp.info( 'Model.dal:', this.dal );

        this.dal.read(
            requestModel,
            function ( arg ) { gp.applyFunc( callback, self, arg ); },
            function ( arg ) { gp.applyFunc( error, self, arg ); }
        );
    },

    create: function (callback, error) {
        var self = this,
            args,
            row;

        // Create config option can be a function or a URL
        if ( typeof this.config.Create === 'function' ) {
            // call the function, set the API as the context
            gp.applyFunc(this.config.Create, this.config.node.api, [callback, error], error);
        }
        else {
            // call the URL
            var http = new gp.Http();
            http.get(
                this.config.Create,
                function ( row ) { gp.applyFunc( callback, self, row ); },
                function ( arg ) { gp.applyFunc( error, self, row ); }
            );
        }
    },

    update: function (row, callback, error) {
        var self = this;
        // config.Update can be a function or URL
        gp.raiseCustomEvent( this.config.node, gp.events.beforeUpdate );
        if ( typeof this.config.Update === 'function' ) {
            gp.applyFunc(this.config.Update, this.config.node.api, [row, callback, error], error);
        }
        else {
            var http = new gp.Http();
            http.post(
                this.config.Update,
                row,
                function ( arg ) { gp.applyFunc( callback, self, arg ); },
                function ( arg ) { gp.applyFunc( error, self, arg ); }
            );
        }
    },

    'delete': function (row, callback, error) {
        var self = this;
        if ( typeof this.config.Delete === 'function' ) {
            gp.applyFunc(this.config.Delete, this.config.node.api, [row, callback, error], error);
        }
        else {
            var http = new gp.Http();
            http.delete(
                this.config.Delete,
                row,
                function ( arg ) { gp.applyFunc( callback, self, arg ); },
                function ( arg ) { gp.applyFunc( error, self, arg ); }
            );
        }
    }

};