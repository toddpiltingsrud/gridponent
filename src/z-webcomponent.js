// check for web component support
if (document.registerElement) {

    gp.Gridponent = Object.create(HTMLElement.prototype);

    gp.Gridponent.createdCallback = function () {
        var init = new gp.Initializer( this );
        gp.ready( init.initialize.bind( init ) );
    };

    gp.Gridponent.detachedCallback = function () {
        var tbl = this.querySelector('.table-container');
        if (tbl && tbl.api) tbl.api.dispose();
    };

    document.registerElement('grid-ponent', {
        prototype: gp.Gridponent
    });
}
else {
    // no web component support
    // provide a static function to initialize grid-ponent elements manually
    gp.initialize = function (root) {
        root = root || document;
        // jQuery stalls here, so don't use it
        var node, nodes = root.querySelectorAll( 'grid-ponent' );
        for ( var i = 0; i < nodes.length; i++ ) {
            new gp.Initializer( nodes[i] ).initialize();
        }
    };

    $(function(){
        gp.initialize();
    });
}

})(gridponent);
