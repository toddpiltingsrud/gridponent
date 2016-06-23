/***************\
   template
\***************/

gp.Template = function ( template ) {
    this.template = template;
    this.dict = {};
    this.props = null;
    this.compile( template );
};

gp.Template.prototype = {
    rRaw: /({{{([^{}]*)}}})/g,
    rEsc: /({{([^{}]*)}})(?:$|[^}])/g,
    r3Braces: /^{{{/,
    rTypes: /^(string|number|boolean)$/,
    compile: function () {
        if ( typeof this.template === 'string' ) {
            var m;
            while ( ( m = this.rRaw.exec( this.template ) ) !== null ) {
                this.resolveToken( m[1], m[2] );
            }
            while ( ( m = this.rEsc.exec( this.template ) ) !== null ) {
                this.resolveToken( m[1], m[2] );
            }
            this.props = Object.getOwnPropertyNames( this.dict );
        }
    },
    resolveToken: function ( token, expression ) {
        var obj = gp.getObjectAtPath( expression );
        if ( typeof obj === 'function' ) {
            this.dict[token] = obj;
        }
        else {
            this.dict[token] = expression;
        }
    },
    render: function ( model, arg ) {
        var self = this,
            str = this.template,
            expression,
            val;

        if ( typeof this.template === 'function' ) {
            return gp.applyFunc( this.template, self, [model, arg] );
        }

        this.props.forEach( function ( prop ) {
            expression = self.dict[prop];
            if ( typeof expression === 'function' ) {
                val = gp.applyFunc( expression, self, [model, arg] );
            }
            else {
                val = model[expression];
                // models can contain functions
                if ( typeof val === 'function' ) {
                    val = gp.applyFunc( val, self, [model, arg] );
                }
            }
            if ( self.r3Braces.test( prop ) === false ) {
                val = gp.escapeHTML( val );
            }
            str = self.replaceAll( str, prop, val );
        } );

        return str;
    },
    replaceAll: function ( template, s1, s2 ) {
        s2 = gp.hasValue( s2 ) ? s2 : '';
        return template.split( s1 ).join( s2 );
    }

};
