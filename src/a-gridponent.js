/***************\
   Gridponent
\***************/

var gridponent = gridponent || function ( elem, options ) {
    // check for a selector
    if ( typeof elem == 'string' ) {
        elem = document.querySelector( elem );
    }
    if (elem instanceof HTMLElement) {
        // has this already been initialized?
        if ( elem.api ) return elem.api;

        if ( options ) {
            var init = new gridponent.Initializer( elem );
            init.initializeOptions( options );
            return elem.api;
        }
    }
};

(function(gp) { 
