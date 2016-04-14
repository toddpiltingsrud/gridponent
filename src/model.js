/***************\
     model
\***************/
gp.Model = function ( config ) {
    this.config = config;
    this.reader = null;
    var type = gp.getType( config.read );
    switch ( type ) {
        case 'string':
            this.reader = new gp.ServerPager( config.read );
            break;
        case 'function':
            this.reader = new gp.FunctionPager( config );
            break;
        case 'object':
            // read is a PagingModel
            this.config.pageModel = config.read;
            this.reader = new gp.ClientPager( this.config );
            break;
        case 'array':
            this.config.pageModel.data = this.config.read;
            this.reader = new gp.ClientPager( this.config );
            break;
        default:
            throw 'Unsupported read configuration';
    }
};

gp.Model.prototype = {

    read: function ( requestModel, done, fail ) {
        var self = this;

        this.reader.read(
            requestModel,
            // make sure we wrap result in an array when we return it
            // if result is an array of data, then applyFunc will end up only grabbing the first dataItem
            function ( result ) {
                result = self.resolveResult( result );
                gp.applyFunc( done, self, [result] );
            },
            function ( result ) { gp.applyFunc( fail, self, [result] ); }
        );
    },

    create: function ( dataItem, done, fail) {
        var self = this, url;

        // config.create can be a function or a URL
        if ( typeof this.config.create === 'function' ) {
            // call the function, set the API as the context
            gp.applyFunc(this.config.create, this.config.node.api, [dataItem, done, fail], fail);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.create, dataItem );
            // call the URL
            var http = new gp.Http();
            http.post(
                url,
                dataItem,
                function ( arg ) { gp.applyFunc( done, self, arg ); },
                function ( arg ) { gp.applyFunc( fail, self, arg ); }
            );
        }
    },

    update: function (dataItem, done, fail) {
        var self = this, url;

        // config.update can be a function or URL
        if ( typeof this.config.update === 'function' ) {
            gp.applyFunc(this.config.update, this.config.node.api, [dataItem, done, fail], fail);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.update, dataItem );
            var http = new gp.Http();
            http.post(
                url,
                dataItem,
                function ( arg ) { gp.applyFunc( done, self, arg ); },
                function ( arg ) { gp.applyFunc( fail, self, arg ); }
            );
        }
    },

    destroy: function (dataItem, done, fail) {
        var self = this, url;
        if ( typeof this.config.destroy === 'function' ) {
            gp.applyFunc(this.config.destroy, this.config.node.api, [dataItem, done, fail], fail);
        }
        else {
            // the url can be a template
            url = gp.supplant( this.config.destroy, dataItem );
            var http = new gp.Http();
            http.destroy(
                url,
                dataItem,
                function ( arg ) { gp.applyFunc( done, self, arg ); },
                function ( arg ) { gp.applyFunc( fail, self, arg ); }
            );
        }
    },

    resolveResult: function ( result ) {
        if ( gp.hasValue( result ) && Array.isArray( result ) ) {
            //  wrap the array in a PagingModel
            return new gp.PagingModel( result );
        }
        return result;
    }


};