/***************\
   template
\***************/

gp.Template = function ( template ) {
    this.template = template;
    this.dict = {};
    this.compile( template );
};

gp.Template.prototype = {
    rRaw: /{{{([^{}]*)}}}/g,
    rEscape: /{{([^{}]*)}}/g,
    rTypes: /^(string|number|boolean)$/,
    compile: function () {
        var m;
        while ( ( m = this.rRaw.exec( this.template ) ) !== null ) {
            this.resolveToken( m[1] );
        }
        while ( ( m = this.rEscape.exec( this.template ) ) !== null ) {
            this.resolveToken( m[1] );
        }
    },
    resolveToken: function ( token, raw ) {
        var obj = gp.getObjectAtPath( token );
        if ( typeof obj === 'function' ) {
            this.dict[token] = obj;
        }
    },
    render: function ( o, args ) {
        var self = this, str;
        // raw: 3 curly braces
        str = this.template.replace( this.rRaw,
            function ( a, b ) {
                return self.replace( b, o, args );
            } );
        // escape HTML: 2 curly braces
        return str.replace( this.rEscape,
            function ( a, b ) {
                return gp.escapeHTML( self.replace( b, o, args ) );
            }
        );
    },
    replace: function ( b, o, args ) {
        var r = o[b];
        if ( this.rTypes.test( typeof r ) ) return r;
        // models can contain functions
        if ( typeof r === 'function' ) return gp.applyFunc( r, self, o );
        // it's not in o, so check for a function
        r = this.dict[b];
        return typeof r === 'function' ? gp.applyFunc( r, self, o ) : '';
    }

};
