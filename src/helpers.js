/***************\
    helpers
\***************/

gp.helpers = {

    setPagerFlags: function () {
        this.pageModel.IsFirstPage = this.pageModel.page === 1;
        this.pageModel.IsLastPage = this.pageModel.page === this.pageModel.pagecount;
        this.pageModel.HasPages = this.pageModel.pagecount > 1;
        this.pageModel.PreviousPage = this.pageModel.page === 1 ? 1 : this.pageModel.page - 1;
        this.pageModel.NextPage = this.pageModel.page === this.pageModel.pagecount ? this.pageModel.pagecount : this.pageModel.page + 1;
    },

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

