/***************\
    datamap
\***************/
gp.DataMap = function () {

    this.uid = 0;
    this.map = {};

};

gp.DataMap.prototype = {

    assign: function ( dataItem, elem ) {
        var i = ++this.uid;

        this.map[i] = dataItem;

        if ( elem && elem.setAttribute ) {
            elem.setAttribute( 'data-uid', i.toString() );
        }

        return i;
    },

    get: function ( uidOrElem ) {

        var uid = this.resolveUid(uidOrElem);

        return this.map[uid];
    },

    getUid: function ( dataItem ) {
        var uid, 
            uids = Object.getOwnPropertyNames(this.map);

        for (var i = 0; i < uids.length; i++) {
            uid = uids[i];
            if (this.map[uid] === dataItem) return uid;
        }

        return -1;
    },

    resolveUid: function ( uidOrElem ) {
        var uid = -1;

        if ( $.isNumeric( uidOrElem ) ) {
            uid = parseInt( uidOrElem );
        }
        else if ( $( uidOrElem ).is( '[data-uid]' ) ) {
            uid = parseInt( $( uidOrElem ).attr( 'data-uid' ) );
        }

        if ( isNaN( uid ) ) return -1;

        return uid;
    },

    remove: function ( uidOrElem ) {
        var uid = this.resolveUid( uidOrElem );

        if ( uid in this.map ) {
            delete this.map[uid];
        }
    },

    clear: function () {
        this.uid = 0;
        this.map = {};
    }

};