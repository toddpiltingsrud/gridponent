/***************\
    Injector
\***************/

gp.Injector = function ( resources, root, context, overrides ) {
    this.resources = resources;
    resources.$injector = this;
    resources.$window = window;
    this.root = root || window;
    this.context = context || this;
    this.overrides = overrides || {};
};

gp.Injector.prototype = {
    setResource: function(name, value) {
        this.resources[name] = value;
        return this;
    },
    base: function ( funcOrName, model ) {
        return this.exec( funcOrName, model, true );
    },
    exec: function ( funcOrName, model, base ) {
        var args, html;
        if ( typeof funcOrName == 'string' ) {
            if ( base ) {
                // call the base function
                funcOrName = this.root[funcOrName];
            }
            else {
                // check for override
                funcOrName = this.overrides[funcOrName] || this.root[funcOrName];
            }
        }
        if ( typeof funcOrName == 'function' ) {
            args = this.inject( funcOrName );
            if ( gp.hasValue( model ) ) {
                args.push( model );
            }
            // supply this injector as the context
            return funcOrName.apply( this.context, args );
        }
        else {
            // assume this is a string template
            // execute once against the resources, then against window to allow for functions
            return gp.supplant.call( this.context, funcOrName, this.resources, this.resources );
        }
        return this;
    },
    inject: function ( func ) {
        var self = this,
            params,
            args = [];

        if ( func.$inject ) {
            params = func.$inject;
        }
        else {
            params = this.getParamNames( func );
        }

        params.forEach( function ( param ) {
            if ( self.resources.hasOwnProperty( param ) ) {
                args.push( self.resources[param] );
            }
                // injectable params should start with $
            else if ( param[0] === '$' ) {
                throw "Unrecognized dependency: " + param;
            }
        } );

        return args;
    },
    // http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
    getParamNames: function ( func ) {
        var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
        var ARGUMENT_NAMES = /([^\s,]+)/g;
        var fnStr = func.toString().replace( STRIP_COMMENTS, '' );
        var result = fnStr.slice( fnStr.indexOf( '(' ) + 1, fnStr.indexOf( ')' ) ).match( ARGUMENT_NAMES );
        if ( result === null )
            result = [];
        return result;
    }

};
