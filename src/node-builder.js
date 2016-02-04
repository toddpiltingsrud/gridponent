/***************\
   NodeBuilder
\***************/

gp.NodeBuilder = function ( ) {
    this.node = null;
};

gp.NodeBuilder.prototype = {

    startElem: function ( tagName, value ) {
        var n = document.createElement( tagName );

        if ( value != undefined ) {
            n.innerHTML = value;
        }

        if ( this.node ) {
            this.node.appendChild( n );
        }

        this.node = n;

        return this;
    },

    addClass: function ( name ) {
        var hasClass = ( ' ' + this.node.className + ' ' ).indexOf( ' ' + name + ' ' ) !== -1;

        if ( !hasClass ) {
            this.node.className = ( this.node.className === '' ) ? name : this.node.className + ' ' + name;
        }

        return this;
    },

    endElem: function () {
        if ( this.node.parentElement ) {
            this.node = this.node.parentElement;
        }
        return this;
    },

    attr: function ( name, value ) {
        var attr = document.createAttribute( name );

        if ( value != undefined ) {
            attr.value = value;
        }

        this.node.setAttributeNode( attr );

        return this;
    },

    close: function () {
        while ( this.node.parentElement ) {
            this.node = this.node.parentElement;
        }
        return this.node;
    }

};