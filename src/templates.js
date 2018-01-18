/***************\
    templates
\***************/
gp.templates = gp.templates || {};

gp.templates.bodyCellContent = function ( $column, $dataItem, $injector ) {
    var self = this,
        template,
        format,
        val,
        glyphicon,
        btnClass,
        hasDeleteBtn = false,
        type = ( $column.Type || '' ).toLowerCase(),
        html = new gp.StringBuilder();

    if ( $dataItem == null ) return;

    val = gp.getFormattedValue( $dataItem, $column, true );

    // check for a template
    if ( $column.bodytemplate ) {
        if ( typeof ( $column.bodytemplate ) === 'function' ) {
            html.add( gp.applyFunc( $column.bodytemplate, this, [$dataItem, $column] ) );
        }
        else {
            html.add( gp.supplant.call( this, $column.bodytemplate, $dataItem, [$dataItem, $column] ) );
        }
    }
    else if ( $column.commands && $column.commands.length ) {
        html.add( '<div class="btn-group btn-group-xs" role="group">' );
        $column.commands.forEach( function ( cmd, index ) {
            html.add( $injector.exec( 'button', cmd ) );
        } );
        html.add( '</div>' );
    }
    else if ( gp.hasValue( val ) ) {
        // show a checkmark for bools
        if ( type === 'boolean' ) {
            if ( val === true ) {
                html.add( '<span class="glyphicon glyphicon-ok"></span>' );
            }
        }
        else {
            // getFormattedValue has already escaped html
            html.add( val );
        }
    }
    return html.toString();
};

gp.templates.bodyCellContent.$inject = ['$column', '$dataItem', '$injector'];

gp.templates.bootstrapModal = function ( $config, $dataItem, $injector, $mode ) {
    var title = ( $mode == 'create' ? 'Add' : 'Edit' ),
        uid = $config.map.getUid( $dataItem );

    var html = new gp.StringBuilder();
    html.add( '<div class="modal fade" tabindex="-1" role="dialog" data-uid="' + uid + '">' )
        .add( '<div class="modal-dialog" role="document">' )
        .add( '<div class="modal-content">' )
        .add( '<div class="modal-header">' )
        // the close button for the modal should cancel any edits, so add value="cancel"
        .add( '<button type="button" class="close" aria-label="Close" value="cancel"><span aria-hidden="true">&times;</span></button>' )
        .addFormat( '<h4 class="modal-title">{{0}}</h4>', title )
        .add( '</div>' )
        .add( '<div class="modal-body">' )
        .add( $injector.exec( 'bootstrapModalBody' ) )
        .add( '</div>' )
        .add( '<div class="modal-footer">' )
        .add( $injector.exec( 'bootstrapModalFooter' ) )
        .add( '</div>' )
        .add( '</div>' )
        .add( '<div class="gp-progress-overlay">' )
        .add( '<div class="gp-progress gp-progress-container">' )
        .add( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' )
        .add( '</div>' )
        .add( '</div>' )
        .add( '</div>' )
        .add( '</div>' );

    return html.toString();
};

gp.templates.bootstrapModal.$inject = ['$config', '$dataItem', '$injector', '$mode'];

gp.templates.bootstrapModalBody = function ( $config, $injector ) {

    var self = this,
        body = new gp.StringBuilder();

    // not using a form element here because the modal
    // is added as a child node of the grid component
    // this will cause problems if the grid is inside another form
    // (e.g. jQuery.validate will behave unexpectedly)
    body.add( '<div class="form-horizontal">' );

    $config.columns.forEach( function ( col ) {
        $injector.setResource( '$column', col );
        var canEdit = !col.readonly && ( gp.hasValue( col.field ) || gp.hasValue( col.edittemplate ) );
        if ( !canEdit ) return;

        var formGroupModel = {
            label: null,
            input: $injector.exec( 'editCellContent' ),
            editclass: col.editclass
        };

        // headers become labels
        // check for a template
        if ( col.headertemplate ) {
            if ( typeof ( col.headertemplate ) === 'function' ) {
                formGroupModel.label = ( gp.applyFunc( col.headertemplate, self, [col] ) );
            }
            else {
                formGroupModel.label = ( gp.supplant.call( self, col.headertemplate, [col] ) );
            }
        }
        else {
            formGroupModel.label = gp.escapeHTML( gp.coalesce( [col.header, col.field, ''] ) );
        }

        body.add( $injector.exec( 'formGroup', formGroupModel ) );
    } );

    body.add( '</div>' );

    return body.toString();
};

gp.templates.bootstrapModalBody.$inject = ['$config', '$injector'];

gp.templates.bootstrapModalFooter = function ( $columns, $injector ) {

    // search for a command column
    var cmdColumn = $columns.filter( function ( col ) {
        return col.commands;
    } );

    if ( cmdColumn.length ) {
        // use the editCellContent template to render the buttons
        $injector.setResource( '$column', cmdColumn[0] );
        return $injector.exec( 'editCellContent' );
    }

    // default footer buttons: cancel / save
    return '<div class="btn-group"><button type="button" class="btn btn-default" value="cancel"><span class="glyphicon glyphicon-remove"></span>Close</button><button type="button" class="btn btn-primary" value="save"><span class="glyphicon glyphicon-save"></span>Save changes</button></div>';
};

gp.templates.bootstrapModalFooter.$inject = ['$columns', '$injector'];

gp.templates.button = function ( model ) {
    var template = '<button type="button" class="btn {{btnClass}}" value="{{value}}"><span class="glyphicon {{glyphicon}}"></span>{{text}}</button>';
    return gp.supplant.call( this, template, model );
};

gp.templates.columnWidthStyle = function ( $config, $columns ) {
    // this gets injected into a style element toward the bottom of the component
    var html = new gp.StringBuilder(),
        index = 0,
        bodyCols = document.querySelectorAll( '#' + $config.ID + ' .table-body > table > tbody > tr:first-child > td' ),
        px,
        fixedWidth =
            '#{{0}} .table-header th.header-cell:nth-child({{1}}),' +
            '#{{0}} .table-footer td.footer-cell:nth-child({{1}}),' +
            '#{{0}} > .table-body > table > thead th:nth-child({{1}}),' +
            '#{{0}} > .table-body > table > tbody td:nth-child({{1}})' +
            '{ width:{{2}}{{3}}; }',
        thtd =
            '#{{0}} .table-header th.header-cell:nth-child({{1}}),' +
            '#{{0}} .table-footer td.footer-cell:nth-child({{1}})' +
            '{ width:{{2}}px; }';

    // even though the table might not exist yet, we should still render width styles because there might be fixed widths specified
    $columns.forEach( function ( col ) {
        if ( col.width ) {
            px = ( isNaN( col.width ) == false ) ? 'px' : '';
            html.addFormat( fixedWidth, [$config.ID, index + 1, col.width, px] );
        }
        else if ( bodyCols.length && ( $config.fixedheaders || $config.fixedfooters ) ) {
            // sync header and footer to body
            html.addFormat( thtd, [$config.ID, index + 1, bodyCols[index].offsetWidth] );
        }
        index++;
    } );

    return html.toString();
};

gp.templates.columnWidthStyle.$inject = ['$config', '$columns'];

gp.templates.container = function ( $config, $injector ) {
    // the main layout
    var html = new gp.StringBuilder();
    html.addFormat(
        '<div class="gp table-container {{0}}" id="{{1}}">',
        [$injector.exec( 'containerClasses' ), $config.ID]
    );
    if ( $config.search || $config.create || $config.toolbar ) {
        html.add( '<div class="table-toolbar">' );
        html.add( $injector.exec( 'toolbar' ) );
        html.add( '</div>' );
    }
    if ( $config.fixedheaders ) {
        // render a separate table for fixed headers
        // and sync column widths between this table and the one below
        html.add( '<div class="table-header">' )
            .add( '<table class="table" cellpadding="0" cellspacing="0">' )
            .add( $injector.exec( 'header' ) )
            .add( '</table>' )
            .add( '</div>' );
    }
    html.addFormat( '<div class="table-body{{0}}">', $config.fixedheaders ? ' table-scroll' : '' )
        .add( '<table class="table" cellpadding="0" cellspacing="0"><tbody></tbody></table>' )
        .add( '</div>' );
    if ( $config.fixedfooters ) {
        // render a separate table for fixed footers
        // and sync column widths between this table and the one above
        html.add( '<div class="table-footer"></div>' );
    }
    if ( $config.pager ) {
        html.add( '<div class="table-pager"></div>' );
    }
    html.add( '<style type="text/css" class="column-width-style">' )
        .add( $injector.exec( 'columnWidthStyle' ) )
        .add( '</style>' )
        .add( '<style type="text/css" class="sort-style"></style>' )
        .addFormat('<div class="gp-nodatatext">{{0}}</div>', $config.nodatatext)
        .add( '<div class="gp-progress-overlay">' )
        .add( '<div class="gp-progress gp-progress-container">' )
        .add( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' )
        .add( '</div>' )
        .add( '</div>' )
        .add( '</div>' );
    return html.toString();
};

gp.templates.container.$inject = ['$config', '$injector'];

gp.templates.containerClasses = function ( $config ) {
    var classes = [];
    if ( $config.fixedheaders === true) {
        classes.push( 'fixed-headers' );
    }
    if (typeof $config.fixedheaders === 'string') {
        $config.fixedheaders.split(' ').forEach(function (token) {
            classes.push('fixed-headers-' + token);
        });
    }
    if ( $config.fixedfooters ) {
        classes.push( 'fixed-footers' );
    }
    if ( $config.pager ) {
        classes.push( 'pager-' + $config.pager );
    }
    if ( $config.responsive ) {
        classes.push( 'table-responsive' );
    }
    if ( $config.search ) {
        classes.push( 'search-' + $config.search );
    }
    if ( $config.rowselected ) {
        classes.push( 'selectable' );
    }
    if ( $config.containerclass ) {
        classes.push( $config.containerclass ); 
    }
    return classes.join( ' ' );
};

gp.templates.containerClasses.$inject = ['$config'];

gp.templates.editCellContent = function ( $column, $dataItem, $mode, $config, $injector ) {
    var template,
        col = $column,
        html = new gp.StringBuilder();

    // check for a template
    if ( col.edittemplate ) {
        if ( typeof ( col.edittemplate ) === 'function' ) {
            html.add( gp.applyFunc( col.edittemplate, this, [$dataItem, col] ) );
        }
        else {
            html.add( gp.supplant.call( this, col.edittemplate, $dataItem, [$dataItem, col] ) );
        }
    }
    else if ( col.commands ) {
        // render buttons
        html.add( '<div class="btn-group' )
            .add( $config.editmode == 'inline' ? ' btn-group-xs' : '' )
            .add('">')
            .add( $injector.exec('button', {
                btnClass: 'btn-primary',
                value: ( $mode == 'create' ? 'create' : 'update' ),
                glyphicon: 'glyphicon-save',
                text: 'Save'
            } ) )
            .add( '<button type="button" class="btn btn-default" data-dismiss="modal" value="cancel">' )
            .add( '<span class="glyphicon glyphicon-remove"></span>Cancel' )
            .add( '</button>' )
            .add( '</div>' );
    }
    else {
        // render an input of the appropriate type
        var val = $dataItem[col.field];
        // render undefined/null as empty string
        if ( !gp.hasValue( val ) ) val = '';
        html.add( $injector.exec( 'input', { type: col.Type, name: col.field, value: "", required: ($column.required || false) } ) );
    }
    return html.toString();
};

gp.templates.editCellContent.$inject = ['$column', '$dataItem', '$mode', '$config', '$injector'];

gp.templates.footer = function ( $columns, $injector ) {

    var self = this,
        html = new gp.StringBuilder();
    html.add( '<tfoot>' )
        .add( '<tr>' )
    $columns.forEach( function ( col ) {
        $injector.setResource( '$column', col );
        html.add( $injector.exec( 'footerCell' ) );
    } );
    html.add( '</tr>' )
        .add( '</tfoot>' );
    return html.toString();
};

gp.templates.footer.$inject = ['$columns', '$injector'];

gp.templates.footerCell = function ( $injector, $column ) {
    var html = new gp.StringBuilder();
        html.addFormat( '<td class="footer-cell {{0}}">', $column.footerclass )
            .add( $injector.exec( 'footerCellContent' ) )
            .add( '</td>' );
    return html.toString();
};

gp.templates.footerCell.$inject = ['$injector', '$column'];

gp.templates.footerCellContent = function ( $data, $column ) {
    var html = new gp.StringBuilder();
    // there must be a template for footers
    if ( $column.footertemplate ) {
        if ( typeof ( $column.footertemplate ) === 'function' ) {
            html.add( gp.applyFunc( $column.footertemplate, this, [$column, $data] ) );
        }
        else {
            html.add( gp.supplant.call( this, $column.footertemplate, $column, [$column, $data] ) );
        }
    }
    return html.toString();
};

gp.templates.footerCellContent.$inject = ['$data', '$column'];

gp.templates.footerTable = function ($injector) {
    var html = new gp.StringBuilder();
    html.add( '<table class="table" cellpadding="0" cellspacing="0">' )
        .add( $injector.exec( 'footer' ) )
        .add( '</table>' );
    return html.toString();
};

gp.templates.footerTable.$inject = ['$injector'];

gp.templates.formGroup = function ( model ) {
    var template = '<div class="form-group {{editclass}}"><label class="col-sm-4 control-label">{{{label}}}</label><div class="col-sm-6">{{{input}}}</div></div>';
    return gp.supplant.call( this,  template, model );
};

gp.templates.header = function ( $columns, $config, $injector ) {
    // depending on whether or not fixedheaders has been specified
    // this template is rendered either in a table by itself or inside the main table
    var html = new gp.StringBuilder();
    html.add( '<thead><tr>' );
    $columns.forEach( function ( col ) {
        html.add( $injector.setResource( '$column', col ).exec( 'headerCell' ) );
    } );
    html.add( '</tr></thead>' );
    return html.toString();
};

gp.templates.header.$inject = ['$columns', '$config', '$injector'];

gp.templates.headerCell = function ( $column, $config, $injector ) {
    var self = this,
        html = new gp.StringBuilder(),
        sort = '';

    if ( $config.sorting ) {
        // apply sorting to the entire header
        // if sort isn't specified, use the field
        sort = gp.escapeHTML( gp.coalesce( [$column.sort, $column.field] ) );
    }
    else {
        // only provide sorting where it is explicitly specified
        if ( gp.hasValue( $column.sort ) ) {
            sort = gp.escapeHTML( $column.sort );
        }
    }

    html.add( '<th class="header-cell ' + ( $column.headerclass || '' ) + '"' );

    if ( gp.hasValue( sort ) ) {
        html.addFormat( ' data-sort="{{0}}"', sort );
    }

    html.add( '>' );
    html.add( $injector.exec( 'headerCellContent' ) );
    html.add( '</th>' );

    return html.toString();
};

gp.templates.headerCell.$inject = ['$column', '$config', '$injector'];

gp.templates.headerCellContent = function ( $column, $config ) {

    var self = this,
        html = new gp.StringBuilder(),
        sort = '';

    if ( $config.sorting ) {
        // apply sorting to the entire header
        // if sort isn't specified, use the field
        sort = gp.escapeHTML( gp.coalesce( [$column.sort, $column.field] ) );
    }
    else {
        // only provide sorting where it is explicitly specified
        if ( gp.hasValue( $column.sort ) ) {
            sort = gp.escapeHTML( $column.sort );
        }
    }

    // check for a template
    if ( $column.headertemplate ) {
        if ( typeof ( $column.headertemplate ) === 'function' ) {
            html.add( gp.applyFunc( $column.headertemplate, self, [$column] ) );
        }
        else {
            html.add( gp.supplant.call( self, $column.headertemplate, $column, [$column] ) );
        }
    }
    else if ( !gp.isNullOrEmpty( sort ) ) {
        html.addFormat( '<a href="javascript:void(0);" class="table-sort" value="sort" data-sort="{{0}}">', sort )
            .escape( gp.coalesce( [$column.header, $column.field, sort] ) )
            .add( '<span class="glyphicon"></span>' )
            .add( '</a>' );
    }
    else {
        html.escape( gp.coalesce( [$column.header, $column.field, ''] ) );
    }

    return html.toString();
};

gp.templates.headerCellContent.$inject = ['$column', '$config'];

gp.templates.input = function ( model ) {
    var obj = {
        type: ( model.type == 'boolean' ? 'checkbox' : ( model.type == 'number' ? 'number' : 'text' ) ),
        name: model.name,
        value: ( model.type == 'boolean' ? 'true' : ( model.type == 'date' ? gp.format( model.value, 'YYYY-MM-DD' ) : gp.escapeHTML( model.value ) ) ),
        checked: ( model.type == 'boolean' && model.value ? ' checked' : '' ),
        // Don't bother with the date input type.
        // Indicate the type using data-type attribute so a custom date picker can be used.
        // This sidesteps the problem of polyfilling browsers that don't support the date input type
        // and provides a more consistent experience across browsers.
        dataType: ( /^date/.test( model.type ) ? ' data-type="date"' : '' ),
        required: ( model.required ? ' required' : '' )
    };

    var html = gp.supplant.call( this, '<input type="{{type}}" name="{{name}}" value="{{value}}" class="form-control"{{{dataType}}}{{checked}}{{required}} />', obj );

    if ( model.required ) {
        // add a span after the input for required fields
        // default CSS styles render an exclamation sign for this
        // (glyphicon-exclamation-sign)
        html += '<span class="required"></span>';
    }

    return html;
};

gp.templates.pagerBar = function ( $requestModel ) {
    var requestModel = gp.shallowCopy($requestModel),
        html = new gp.StringBuilder();

    requestModel.IsFirstPage = requestModel.page === 1;
    requestModel.IsLastPage = requestModel.page === requestModel.PageCount;
    requestModel.HasPages = requestModel.PageCount > 1;
    requestModel.PreviousPage = requestModel.page === 1 ? 1 : requestModel.page - 1;
    requestModel.NextPage = requestModel.page === requestModel.PageCount ? requestModel.PageCount : requestModel.page + 1;

    requestModel.firstPageClass = (requestModel.IsFirstPage ? 'disabled' : '');
    requestModel.lastPageClass = (requestModel.IsLastPage ? 'disabled' : '');

    if ( requestModel.HasPages ) {
        html.add( '<div class="btn-group">' )
            .add( '<button class="ms-page-index btn btn-default {{firstPageClass}}" title="First page" value="page" data-page="1">' )
            .add( '<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '<button class="ms-page-index btn btn-default {{firstPageClass}}" title="Previous page" value="page" data-page="{{PreviousPage}}">' )
            .add( '<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '</div>' )
            .add( '<input type="number" name="page" value="{{page}}" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" />' )
            .add( '<span class="page-count"> of {{PageCount}}</span>' )
            .add( '<div class="btn-group">' )
            .add( '<button class="ms-page-index btn btn-default {{lastPageClass}}" title="Next page" value="page" data-page="{{NextPage}}">' )
            .add( '<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '<button class="ms-page-index btn btn-default {{lastPageClass}}" title="Last page" value="page" data-page="{{PageCount}}">' )
            .add( '<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '</div>' );
    }
    return gp.supplant.call( this,  html.toString(), requestModel );
};

gp.templates.pagerBar.$inject = ['$requestModel'];

gp.templates.sortStyle = function ( $config ) {
    var model = {
        id: $config.ID,
        sort: $config.requestModel.sort,
        glyph: $config.requestModel.desc ? '\\e114' : '\\e113' // glyphicon-chevron-down, glyphicon-chevron-up
    };
    var template =
        '#{{id}} a.table-sort[data-sort="{{{sort}}}"] > span.glyphicon { display:inline; } ' +
        '#{{id}} a.table-sort[data-sort="{{{sort}}}"] > span.glyphicon:before { content:"{{{glyph}}}"; }';

    if ( !gp.isNullOrEmpty( model.sort ) ) {
        return gp.supplant( template, model );
    }
    return '';
};

gp.templates.sortStyle.$inject = ['$config'];

gp.templates.tableBody = function ( $config, $injector ) {
    var html = new gp.StringBuilder();
    html.addFormat( '<table class="table {{0}}" cellpadding="0" cellspacing="0">', $config.tableclass );
    if ( !$config.fixedheaders ) {
        html.add( $injector.exec( 'header' ) );
    }
    html.add( '<tbody>' )
        .add( $injector.exec( 'tableRows' ) )
        .add( '</tbody>' );
    if ( $config.hasFooter && !$config.fixedfooters ) {
        html.add( $injector.exec( 'footer' ) );
    }
    html.add( '</table>' );
    return html.toString();
};

gp.templates.tableBody.$inject = ['$config', '$injector'];

gp.templates.tableRow = function ( $injector, $mode, uid ) {
    var self = this,
        html = new gp.StringBuilder();

    html.addFormat( '<tr data-uid="{{0}}"', uid );

    if ( /create|update/.test( $mode ) ) {
        html.add( ' class="' ).add( $mode ).add( '-mode"' );
    }

    html.add( ">" )
        .add( $injector.exec( 'tableRowCells' ) )
        .add( '</tr>' );
    return html.toString();
};

gp.templates.tableRow.$inject = ['$injector', '$mode'];

gp.templates.tableRowCell = function ( $column, $injector, $mode ) {
    var self = this,
        mode = $mode || 'read',
        html = new gp.StringBuilder(),
        isEditMode = /create|update/.test( mode );

    html.addFormat( '<td class="body-cell {{0}}{{1}}">',
        [( $column.commands ? 'commands ' : '' ), ( isEditMode ? $column.editclass : $column.bodyclass )]
    );

    if ( isEditMode && !$column.readonly ) {
        html.add( $injector.exec( 'editCellContent' ) );
    }
    else {
        html.add( $injector.exec( 'bodyCellContent' ) );
    }

    html.add( '</td>' );

    return html.toString();
};

gp.templates.tableRowCell.$inject = ['$column', '$injector', '$mode'];

gp.templates.tableRowCells = function ( $columns, $injector ) {
    var self = this,
        html = new gp.StringBuilder();
    $columns.forEach( function ( col ) {
        // set the current column for bodyCellContent / editCellContent template
        $injector.setResource( '$column', col );
        html.add( $injector.exec( 'tableRowCell' ) );
    } );
    return html.toString();
};

gp.templates.tableRowCells.$inject = ['$columns', '$injector'];

gp.templates.tableRows = function ( $data, $map, $injector ) {
    var self = this,
        html = new gp.StringBuilder(),
        uid;
    if ( $data == null ) return '';
    $data.forEach( function ( dataItem ) {
        // set the current data item on the injector
        $injector.setResource( '$dataItem', dataItem );
        // assign a uid to the dataItem, pass it to the tableRow template
        uid = $map.assign( dataItem );
        html.add( $injector.exec( 'tableRow', uid ) );
    } );
    return html.toString();
};

gp.templates.tableRows.$inject = ['$data', '$map', '$injector'];

gp.templates.toolbar = function ( $config, $injector ) {
    var html = new gp.StringBuilder();

    if ( $config.search ) {
        html.add( '<div class="input-group gp-searchbox">' )
            .add( '<input type="text" name="search" class="form-control" placeholder="Search...">' )
            .add( '<span class="input-group-btn">' )
            .add( $injector.exec( 'button', {
                btnClass: 'btn-default',
                value: 'search',
                glyphicon: 'glyphicon-search'
            } ) )
            .add( '</span>' )
            .add( '</div>' );
    }
    if ( $config.create ) {
        html.add( $injector.exec( 'button',
            {
                btnClass: 'btn-default',
                value: 'AddRow',
                glyphicon: 'glyphicon-plus',
                text: 'Add'
            } ) );
    }

    return html.toString();
};

gp.templates.toolbar.$inject = ['$config', '$injector'];