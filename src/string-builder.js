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

    escape: function(str) {
        this.out.push( gp.escapeHTML( str ) );
        return this;
    },

    toString: function ( ) {
        return this.out.join('');
    }

};