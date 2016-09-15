/***************\
  StringBuilder
\***************/

gp.StringBuilder = function () {
    this.out = [];
};

gp.StringBuilder.prototype = {

    add: function ( str ) {
        this.out.push( str );
        return this;
    },

    addFormat: function ( str, args ) {
        if ( !Array.isArray( args ) ) args = [args];
        this.out.push( gp.supplant(str, args) );
        return this;
    },

    escape: function(str) {
        this.out.push( gp.escapeHTML( str ) );
        return this;
    },

    toString: function ( ) {
        return this.out.join('');
    }

};