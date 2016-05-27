/***************\
   Gridponent
\***************/

var gridponent = gridponent || function ( elem, options ) {
    'use strict';

    // check for a selector
    if ( typeof elem == 'string' ) {
        elem = document.querySelector( elem );
    }
    if ( elem instanceof HTMLElement ) {
        var tblContainer = elem.querySelector( '.table-container' );
        // has this already been initialized?
        if ( tblContainer && tblContainer.api ) return tblContainer.api;

        if ( options ) {
            var init = new gridponent.Initializer( elem );
            var config = init.initializeOptions( options );
            return config.node.api;
        }
    }

    var obj = {
        api: null,
        callback: function () { },
        ready: function ( callback ) {
            if ( obj.api ) {
                obj.api.ready(callback);
            }
            else obj.callback = callback;
        }
    };

    gridponent.ready( function () {
        // check for a selector
        if ( typeof elem == 'string' ) {
            elem = document.querySelector( elem );
        }
        if ( elem instanceof HTMLElement ) {
            var tblContainer = elem.querySelector( '.table-container' );
            // has this already been initialized?
            if ( tblContainer && tblContainer.api ) {
                if (obj.callback) {
                    tblContainer.api.ready(obj.callback);
                }
                else {
                    obj.api = tblContainer.api;
                }
            }

            if ( options ) {
                var init = new gridponent.Initializer( elem );
                var config = init.initializeOptions( options );
                if (obj.callback) {
                    config.node.api.ready(obj.callback);
                }
                else {
                    obj.api = config.node.api;
                }
            }
        }
    } );

    return obj;

};

(function(gp) { 
    'use strict';
