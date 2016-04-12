/***************\
   NodeBuilder
\***************/

gp.NodeBuilder = function ( parent ) {
    this.node = parent || null;
};

gp.NodeBuilder.prototype = {

    create: function ( tagName ) {
        var n = document.createElement( tagName );

        if ( this.node ) {
            this.node.appendChild( n );
        }

        this.node = n;

        return this;
    },

    addClass: function ( name ) {
        if ( gp.isNullOrEmpty( name ) ) return this;

        var hasClass = ( ' ' + this.node.className + ' ' ).indexOf( ' ' + name + ' ' ) !== -1;

        if ( !hasClass ) {
            this.node.className = ( this.node.className === '' ) ? name : this.node.className + ' ' + name;
        }

        return this;
    },

    html: function ( html ) {
        this.node.innerHTML = gp.hasValue( html ) ? html : '';
        return this;
    },

    endElem: function () {
        if ( this.node.parentElement ) {
            this.node = this.node.parentElement;
        }
        return this;
    },

    attr: function ( name, value ) {
        this.node.setAttribute( name, value );
        return this;
    },

    close: function () {
        while ( this.node.parentElement ) {
            this.node = this.node.parentElement;
        }
        return this.node;
    }

};