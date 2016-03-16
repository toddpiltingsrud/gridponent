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

    create: function ( row, callback, error) {
        var self = this, url;

        // config.Create can be a function or a URL
        if ( typeof this.config.Create === 'function' ) {
            // call the function, set the API as the context
            gp.applyFunc(this.config.Create, this.config.node.api, [row, callback, error], error);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.Create, row );
            // call the URL
            var http = new gp.Http();
            http.post(
                url,
                row,
                function ( arg ) { gp.applyFunc( callback, self, arg ); },
                function ( arg ) { gp.applyFunc( error, self, arg ); }
            );
        }
    },

    update: function (row, callback, error) {
        var self = this, url;

        // config.Update can be a function or URL
        if ( typeof this.config.Update === 'function' ) {
            gp.applyFunc(this.config.Update, this.config.node.api, [row, callback, error], error);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.Update, row );
            var http = new gp.Http();
            http.post(
                url,
                row,
                function ( arg ) { gp.applyFunc( callback, self, arg ); },
                function ( arg ) { gp.applyFunc( error, self, arg ); }
            );
        }
    },

    'delete': function (row, callback, error) {
        var self = this, url;
        if ( typeof this.config.Delete === 'function' ) {
            gp.applyFunc(this.config.Delete, this.config.node.api, [row, callback, error], error);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.Delete, row );
            var http = new gp.Http();
            http.delete(
                url,
                row,
                function ( arg ) { gp.applyFunc( callback, self, arg ); },
                function ( arg ) { gp.applyFunc( error, self, arg ); }
            );
        }
    }

};