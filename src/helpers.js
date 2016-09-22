/***************\
    helpers
\***************/

gp.helpers = {

    sortStyle: function ( config ) {
        // remove glyphicons from sort buttons
        var spans = $( config.node )
            .find( 'a.table-sort > span.glyphicon-chevron-up,a.table-sort > span.glyphicon-chevron-down' )
            .removeClass( 'glyphicon-chevron-up glyphicon-chevron-down' );
        if ( !gp.isNullOrEmpty( config.requestModel.sort ) ) {
            $( config.node )
                .find( 'a.table-sort[data-sort="' + config.requestModel.sort + '"] > span' )
                .addClass(( config.requestModel.desc ? 'glyphicon-chevron-down' : 'glyphicon-chevron-up' ) );
        }
    }

};

