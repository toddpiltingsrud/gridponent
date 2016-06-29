/***************\
    templates
\***************/
gp.templates = gp.templates || {};
gp.templates['bootstrap-modal'] = function ( model ) {
    model.footer = model.footer ||
        '<div class="btn-group"><button type="button" class="btn btn-default" value="cancel"><span class="glyphicon glyphicon-remove"></span>Close</button><button type="button" class="btn btn-primary" value="save"><span class="glyphicon glyphicon-save"></span>Save changes</button></div>';

    var html = new gp.StringBuilder();
    html.add( '<div class="modal fade" tabindex="-1" role="dialog" data-uid="{{uid}}">' )
        .add( '<div class="modal-dialog" role="document">' )
        .add( '<div class="modal-content">' )
        .add( '<div class="modal-header">' )
        .add( '<button type="button" class="close" aria-label="Close" value="cancel"><span aria-hidden="true">&times;</span></button>' )
        .add( '<h4 class="modal-title">{{title}}</h4>' )
        .add( '</div>' )
        .add( '<div class="modal-body">{{{body}}}</div>' )
        .add( '<div class="modal-footer">{{{footer}}}</div>' )
        .add( '</div>' )
        .add( '<div class="gp-progress-overlay">' )
        .add( '<div class="gp-progress gp-progress-container">' )
        .add( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' )
        .add( '</div>' )
        .add( '</div>' )
        .add( '</div>' )
        .add( '</div>' );

    return gp.supplant( html.toString(), model );
};
gp.templates['gridponent-body'] = function ( $config ) {
    var html = new gp.StringBuilder();
    html.add( '<table class="table" cellpadding="0" cellspacing="0">' );
    if ( !$config.fixedheaders ) {
        html.add( gp.helpers['thead'].call( $config ) );
    }
    html.add( '<tbody>' )
        .add( gp.helpers['tableRows'].call( $config ) )
        .add( '</tbody>' );
    if ( $config.footer && !$config.fixedfooters ) {
        html.add( gp.templates['gridponent-tfoot']( $config ) );
    }
    html.add( '</table>' );
    return html.toString();
};

gp.templates['gridponent-body'].$inject = ['$config'];

gp.templates['gridponent-cells'] = function ( model ) {
    var html = new gp.StringBuilder();
    model.columns.forEach( function ( col, index ) {
        html.add( '    <td class="body-cell ' );
        if ( col.commands ) {
            html.add( 'commands ' );
        }
        html.add( col.bodyclass )
            .add( '">' )
            .add( gp.helpers['bodyCellContent'].call( model, col ) )
            .add( '</td>' );
    } );
    return html.toString();
};

gp.templates['gridponent-cells'].$inject = ['$columns'];


gp.templates['gridponent-pager'] = function ( model ) {
    var pageModel = gp.shallowCopy(model.pageModel),
        html = new gp.StringBuilder();

    pageModel.IsFirstPage = pageModel.page === 1;
    pageModel.IsLastPage = pageModel.page === pageModel.pagecount;
    pageModel.HasPages = pageModel.pagecount > 1;
    pageModel.PreviousPage = pageModel.page === 1 ? 1 : pageModel.page - 1;
    pageModel.NextPage = pageModel.page === pageModel.pagecount ? pageModel.pagecount : pageModel.page + 1;

    pageModel.firstPageClass = (pageModel.pageModel.IsFirstPage ? 'disabled' : '');
    pageModel.lastPageClass = (pageModel.pageModel.IsLastPage ? 'disabled' : '');

    if ( pageModel.HasPages ) {
        html.add( '<div class="btn-group">' )
            .add( '    <button class="ms-page-index btn btn-default {{firstPageClass}}" title="First page" value="page" data-page="1">' )
            .add( '<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '    <button class="ms-page-index btn btn-default {{firstPageClass}}" title="Previous page" value="page" data-page="{{PreviousPage}}">' )
            .add( '<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '</div>' )
            .add( '<input type="number" name="page" value="{{page}}" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" />' )
            .add( '<span class="page-count"> of {{pagecount}}</span>' )
            .add( '<div class="btn-group">' )
            .add( '    <button class="ms-page-index btn btn-default {{lastPageClass}}" title="Next page" value="page" data-page="{{NextPage}}">' )
            .add( '<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '    <button class="ms-page-index btn btn-default {{lastPageClass}}" title="Last page" value="page" data-page="{{pagecount}}">' )
            .add( '<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '</div>' );
    }
    return gp.supplant( html.toString(), pageModel );
};

gp.templates['gridponent-pager'].$inject = ['$pageModel'];

gp.templates['gridponent-table-footer'] = function ( model ) {
    var html = new StringBuilder();
    html.add( '<table class="table" cellpadding="0" cellspacing="0">' )
        .add( gp.templates['gridponent-tfoot']( model ) )
        .add( '</table>' );
    return html.toString();
};

gp.templates['gridponent-tfoot'] = function ( model ) {
    var html = new StringBuilder();
    html.add( '<tfoot>' )
        .add( '<tr>' )
    model.columns.forEach( function ( col, index ) {
        html.add( '<td class="footer-cell">' )
            .add( gp.helpers['footerCell'].call( model, col ) )
            .add( '</td>' );
    } );
    html.add( '</tr>' )
        .add( '</tfoot>' );
    return html.toString();
};

gp.templates['gridponent-tfoot'].$inject = ['$columns'];

gp.templates['gridponent'] = function ( model ) {
    var html = new StringBuilder();
    html.add( '<div class="gp table-container' )
        .add( gp.helpers['containerClasses'].call( model ) )
        .add( '" id="' )
        .add( model.ID )
        .add( '">' );
    if ( model.search || model.create || model.toolbartemplate ) {
        html.add( '<div class="table-toolbar">' );
        if ( model.toolbartemplate ) {
            html.add( gp.helpers['toolbartemplate'].call( model ) );
        } else {
            if ( model.search ) {
                html.add( '<div class="input-group gridponent-searchbox">' )
                    .add( '<input type="text" name="search" class="form-control" placeholder="Search...">' )
                    .add( '<span class="input-group-btn">' )
                    .add( '<button class="btn btn-default" type="button" value="search">' )
                    .add( '<span class="glyphicon glyphicon-search"></span>' )
                    .add( '</button>' )
                    .add( '</span>' )
                    .add( '</div>' );
            }
            if ( model.create ) {
                html.add( '<button class="btn btn-default" type="button" value="AddRow">' )
                    .add( '<span class="glyphicon glyphicon-plus"></span>Add' )
                    .add( '</button>' );
            }
        }
        html.add( '</div>' );
    }
    if ( model.fixedheaders ) {
        html.add( '<div class="table-header">' )
            .add( '<table class="table" cellpadding="0" cellspacing="0">' )
            .add( gp.helpers['thead'].call( model ) )
            .add( '</table>' )
            .add( '</div>' );
    }
    html.add( '    <div class="table-body ' );
    if ( model.fixedheaders ) {
        html.add( 'table-scroll' );
    }
    html.add( '" style="' )
        .add( model.style )
        .add( '">' )
        .add( '<table class="table" cellpadding="0" cellspacing="0">' );
    if ( !model.fixedheaders ) {
        html.add( gp.helpers['thead'].call( model ) );
    }
    html.add( '</table>' )
        .add( '</div>' );
    if ( model.fixedfooters ) {
        html.add( '<div class="table-footer">' )
            .add( gp.templates['gridponent-table-footer']( model ) )
            .add( '</div>' );
    }
    if ( model.pager ) {
        html.add( '<div class="table-pager"></div>' );
    }
    html.add( '<style type="text/css" class="column-width-style">' )
        .add( gp.helpers['columnWidthStyle'].call( model ) )
        .add( '</style>' )
        .add( '<div class="gp-progress-overlay">' )
        .add( '<div class="gp-progress gp-progress-container">' )
        .add( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' )
        .add( '</div>' )
        .add( '</div>' )
        .add( '</div>' );
    return html.toString();
};

gp.templates['gridponent'].$inject = ['$config'];
