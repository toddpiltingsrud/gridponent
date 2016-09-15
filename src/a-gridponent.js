// gridponent.js
// version : 0.1-beta
// author : Todd Piltingsrud
// license : MIT
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
        // has this already been initialized?
        var tblContainer = elem.querySelector( '.table-container' );
        if ( tblContainer && tblContainer.api ) return tblContainer.api;

        var init = new gridponent.Initializer( elem );
        var config = init.initializeOptions( options );
        return config.node.api;
    }
    else {
        throw new Error("Could not resolve selector: " + elem.toString());
    }

};

(function(gp) { 
    'use strict';
