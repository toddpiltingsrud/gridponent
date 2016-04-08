/***************\
   Gridponent
\***************/

var gridponent = gridponent || function ( elem, options ) {
    // check for a selector
    if ( typeof elem == 'string' ) {
        elem = document.querySelector( elem );
    }
    if (elem instanceof HTMLElement) {
        var tblContainer = elem.querySelector('.table-container');
        // has this already been initialized?
        if ( tblContainer && tblContainer.api ) return tblContainer.api;

        if ( options ) {
            var init = new gridponent.Initializer( elem );
            var config = init.initializeOptions( options );
            return config.node.api;
        }
    }
};

(function(gp) { 
