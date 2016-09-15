/***************\
    helpers
\***************/

gp.helpers = {

    sortStyle: function ( config ) {
        // remove glyphicons from sort buttons
        var spans = $( config.node )
            .find( 'a.table-sort > span.glyphicon-chevron-up,a.table-sort > span.glyphicon-chevron-down' )
            .removeClass( 'glyphicon-chevron-up glyphicon-chevron-down' );
        if ( !gp.isNullOrEmpty( config.pageModel.sort ) ) {
            $( config.node )
                .find( 'a.table-sort[data-sort="' + config.pageModel.sort + '"] > span' )
                .addClass(( config.pageModel.desc ? 'glyphicon-chevron-down' : 'glyphicon-chevron-up' ) );
        }
    }

};

