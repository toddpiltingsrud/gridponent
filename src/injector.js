/***************\
    Injector
\***************/

gp.Injector = function ( resources, root ) {
    this.resources = resources;
    this.root = root || window;
};

gp.Injector.prototype = {
    addResource: function(name, value) {
        this.resources[name] = value;
    },
    exec: function ( funcOrName, model ) {
        var args;
        if ( typeof funcOrName == 'string' ) {
            funcOrName = gp.getObjectAtPath( funcOrName, this.root );
        }
        if ( typeof funcOrName == 'function' ) {
            args = this.inject( func );
            if ( gp.hasValue( model ) ) {
                args.push( model );
            }
            return funcOrName.call( this, args );
        }
        throw "Could not resolve function dependencies: " + funcOrName.toString();
    },
    inject: function ( func ) {
        var self,
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
            else {
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
