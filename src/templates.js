/***************\
    templates
\***************/
gp.templates = gp.templates || {};

gp.templates.bodyCellContent = function ( $column, $dataItem ) {
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
            html.add( self.exec( 'button', cmd ) );
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

gp.templates.bodyCellContent.$inject = ['$column', '$dataItem'];

gp.templates.bootstrapModal = function ( model ) {
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

gp.templates.bootstrapModalContent = function ( $config, $dataItem, $mode ) {

    var self = this,
        model = {
        title: ( $mode == 'create' ? 'Add' : 'Edit' ),
        body: '',
        footer: null,
        uid: $config.map.getUid( $dataItem )
    };

    var html = new gp.StringBuilder();

    // not using a form element here because the modal is added as a child node of the grid component
    // this will cause problems if the grid is inside another form (e.g. jQuery.validate will behave unexpectedly)
    html.add( '<div class="form-horizontal">' );

    $config.columns.forEach( function ( col ) {
        self.setResource( '$column', col );
        if ( col.commands ) {
            model.footer = self.exec( 'editCellContent' );
            return;
        }
        var canEdit = !col.readonly && ( gp.hasValue( col.field ) || gp.hasValue( col.edittemplate ) );
        if ( !canEdit ) return;

        var formGroupModel = {
            label: null,
            input: self.exec( 'editCellContent' ),
            editclass: col.editclass
        };

        // headers become labels
        // check for a template
        if ( col.headertemplate ) {
            if ( typeof ( col.headertemplate ) === 'function' ) {
                formGroupModel.label = ( gp.applyFunc( col.headertemplate, self, [col] ) );
            }
            else {
                formGroupModel.label = ( gp.supplant.call( this, col.headertemplate, [col] ) );
            }
        }
        else {
            formGroupModel.label = gp.escapeHTML( gp.coalesce( [col.header, col.field, ''] ) );
        }

        html.add( self.exec( 'formGroup', formGroupModel ) );
    } );

    html.add( '</div>' );

    model.body = html.toString();

    return this.exec( 'bootstrapModal', model );
};

gp.templates.bootstrapModalContent.$inject = ['$config', '$dataItem', '$mode'];

gp.templates.container = function ( $config ) {
    var html = new gp.StringBuilder();
    html.add( '<div class="gp table-container' )
        .add( this.exec( 'containerClasses' ) )
        .add( '" id="' )
        .add( $config.ID )
        .add( '">' );
    if ( $config.search || $config.create || $config.toolbartemplate ) {
        html.add( '<div class="table-toolbar">' );
        if ( $config.toolbartemplate ) {
            html.add( this.exec( 'toolbar' ) );
        } else {
            if ( $config.search ) {
                html.add( '<div class="input-group gridponent-searchbox">' )
                    .add( '<input type="text" name="search" class="form-control" placeholder="Search...">' )
                    .add( '<span class="input-group-btn">' )
                    .add( '<button class="btn btn-default" type="button" value="search">' )
                    .add( '<span class="glyphicon glyphicon-search"></span>' )
                    .add( '</button>' )
                    .add( '</span>' )
                    .add( '</div>' );
            }
            if ( $config.create ) {
                html.add( '<button class="btn btn-default" type="button" value="AddRow">' )
                    .add( '<span class="glyphicon glyphicon-plus"></span>Add' )
                    .add( '</button>' );
            }
        }
        html.add( '</div>' );
    }
    if ( $config.fixedheaders ) {
        html.add( '<div class="table-header">' )
            .add( '<table class="table" cellpadding="0" cellspacing="0">' )
            .add( this.exec( 'thead' ) )
            .add( '</table>' )
            .add( '</div>' );
    }
    html.add( '<div class="table-body ' );
    if ( $config.fixedheaders ) {
        html.add( 'table-scroll' );
    }
    html.add( '" style="' )
        .add( $config.style )
        .add( '">' )
        .add( '<table class="table" cellpadding="0" cellspacing="0">' );
    if ( !$config.fixedheaders ) {
        html.add( this.exec( 'thead' ) );
    }
    html.add( '</table>' )
        .add( '</div>' );
    if ( $config.fixedfooters ) {
        html.add( '<div class="table-footer">' )
            .add( this.exec( 'footerTable' ) )
            .add( '</div>' );
    }
    if ( $config.pager ) {
        html.add( '<div class="table-pager"></div>' );
    }
    html.add( '<style type="text/css" class="column-width-style">' )
        .add( this.exec( 'columnWidthStyle' ) )
        .add( '</style>' )
        .add( '<div class="gp-progress-overlay">' )
        .add( '<div class="gp-progress gp-progress-container">' )
        .add( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' )
        .add( '</div>' )
        .add( '</div>' )
        .add( '</div>' );
    return html.toString();
};

gp.templates.container.$inject = ['$config'];

gp.templates.button = function ( model ) {
    var template = '<button type="button" class="btn {{btnClass}}" value="{{value}}"><span class="glyphicon {{glyphicon}}"></span>{{text}}</button>';
    return gp.supplant( template, model );
};

gp.templates.columnWidthStyle = function ( $config, $columns ) {
    var html = new gp.StringBuilder(),
        width,
        index = 0,
        bodyCols = document.querySelectorAll( '#' + $config.ID + ' .table-body > table > tbody > tr:first-child > td' );

    // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
    $columns.forEach( function ( col ) {
        if ( col.width ) {
            // fixed width should include the body
            html.add( '#' + $config.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                .add( '#' + $config.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' )
                .add( ',' )
                .add( '#' + $config.ID + ' > .table-body > table > thead th:nth-child(' + ( index + 1 ) + '),' )
                .add( '#' + $config.ID + ' > .table-body > table > tbody td:nth-child(' + ( index + 1 ) + ')' )
                .add( '{ width:' )
                .add( col.width );
            if ( isNaN( col.width ) == false ) html.add( 'px' );
            html.add( ';}' );
        }
        else if ( bodyCols.length && ( $config.fixedheaders || $config.fixedfooters ) ) {
            // sync header and footer to body
            width = bodyCols[index].offsetWidth;
            html.add( '#' + $config.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                .add( '#' + $config.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' )
                .add( '{ width:' )
                .add( bodyCols[index].offsetWidth )
                .add( 'px;}' );
        }
        index++;
    } );

    return html.toString();
};

gp.templates.columnWidthStyle.$inject = ['$config', '$columns'];

gp.templates.containerClasses = function ( $config ) {
    var html = new gp.StringBuilder();
    if ( $config.fixedheaders ) {
        html.add( ' fixed-headers' );
    }
    if ( $config.fixedfooters ) {
        html.add( ' fixed-footers' );
    }
    if ( $config.pager ) {
        html.add( ' pager-' + $config.pager );
    }
    if ( $config.responsive ) {
        html.add( ' table-responsive' );
    }
    if ( $config.search ) {
        html.add( ' search-' + $config.search );
    }
    if ( $config.rowselected ) {
        html.add( ' selectable' );
    }
    return html.toString();
};

gp.templates.containerClasses.$inject = ['$config'];

gp.templates.editCellContent = function ( $column, $dataItem, $mode, $config ) {
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
        html.add( '<div class="btn-group' )
            .add( $config.editmode == 'inline' ? ' btn-group-xs' : '' )
            .add('">')
            .add( this.exec('button', {
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
        var val = $dataItem[col.field];
        // render undefined/null as empty string
        if ( !gp.hasValue( val ) ) val = '';
        html.add( this.exec( 'input', { type: col.Type, name: col.field, value: "" } ) );
    }
    return html.toString();
};

gp.templates.editCellContent.$inject = ['$column', '$dataItem', '$mode', '$config'];

gp.templates.footerCell = function ( $data, col ) {
    var html = new gp.StringBuilder();
    if ( col.footertemplate ) {
        if ( typeof ( col.footertemplate ) === 'function' ) {
            html.add( gp.applyFunc( col.footertemplate, this, [col, $data] ) );
        }
        else {
            html.add( gp.supplant.call( this, col.footertemplate, col, [col, $data] ) );
        }
    }
    return html.toString();
};

gp.templates.footerCell.$inject = ['$data'];

gp.templates.footerTable = function () {
    var html = new gp.StringBuilder();
    html.add( '<table class="table" cellpadding="0" cellspacing="0">' )
        .add( this.exec( 'tfoot' ) )
        .add( '</table>' );
    return html.toString();
};

gp.templates.formGroup = function ( model ) {
    var template = '<div class="form-group {{editclass}}"><label class="col-sm-4 control-label">{{{label}}}</label><div class="col-sm-6">{{{input}}}</div></div>';
    return gp.supplant( template, model );
};

gp.templates.input = function ( model ) {
    var obj = {
        type: ( model.type == 'boolean' ? 'checkbox' : ( model.type == 'number' ? 'number' : 'text' ) ),
        name: model.name,
        value: ( model.type == 'boolean' ? 'true' : ( model.type == 'date' ? gp.formatter.format( model.value, 'YYYY-MM-DD' ) : gp.escapeHTML( model.value ) ) ),
        checked: ( model.type == 'boolean' && model.value ? ' checked' : '' ),
        // Don't bother with the date input type.
        // Indicate the type using data-type attribute so a custom date picker can be used.
        // This sidesteps the problem of polyfilling browsers that don't support the date input type
        // and provides a more consistent experience across browsers.
        dataType: ( /^date/.test( model.type ) ? ' data-type="date"' : '' )
    };

    return gp.supplant( '<input type="{{type}}" name="{{name}}" value="{{value}}" class="form-control"{{{dataType}}}{{checked}} />', obj );
};

gp.templates.pager = function ( $pageModel ) {
    var pageModel = gp.shallowCopy($pageModel),
        html = new gp.StringBuilder();

    pageModel.IsFirstPage = pageModel.page === 1;
    pageModel.IsLastPage = pageModel.page === pageModel.pagecount;
    pageModel.HasPages = pageModel.pagecount > 1;
    pageModel.PreviousPage = pageModel.page === 1 ? 1 : pageModel.page - 1;
    pageModel.NextPage = pageModel.page === pageModel.pagecount ? pageModel.pagecount : pageModel.page + 1;

    pageModel.firstPageClass = (pageModel.IsFirstPage ? 'disabled' : '');
    pageModel.lastPageClass = (pageModel.IsLastPage ? 'disabled' : '');

    if ( pageModel.HasPages ) {
        html.add( '<div class="btn-group">' )
            .add( '<button class="ms-page-index btn btn-default {{firstPageClass}}" title="First page" value="page" data-page="1">' )
            .add( '<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '<button class="ms-page-index btn btn-default {{firstPageClass}}" title="Previous page" value="page" data-page="{{PreviousPage}}">' )
            .add( '<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '</div>' )
            .add( '<input type="number" name="page" value="{{page}}" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" />' )
            .add( '<span class="page-count"> of {{pagecount}}</span>' )
            .add( '<div class="btn-group">' )
            .add( '<button class="ms-page-index btn btn-default {{lastPageClass}}" title="Next page" value="page" data-page="{{NextPage}}">' )
            .add( '<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '<button class="ms-page-index btn btn-default {{lastPageClass}}" title="Last page" value="page" data-page="{{pagecount}}">' )
            .add( '<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>' )
            .add( '</button>' )
            .add( '</div>' );
    }
    return gp.supplant( html.toString(), pageModel );
};

gp.templates.pager.$inject = ['$pageModel'];

gp.templates.tableBody = function ( $config ) {
    var html = new gp.StringBuilder();
    html.add( '<table class="table" cellpadding="0" cellspacing="0">' );
    if ( !$config.fixedheaders ) {
        html.add( this.exec( 'thead' ) );
    }
    html.add( '<tbody>' )
        .add( this.exec( 'tableRows' ) )
        .add( '</tbody>' );
    if ( $config.footer && !$config.fixedfooters ) {
        html.add( this.exec( 'tfoot' ) );
    }
    html.add( '</table>' );
    return html.toString();
};

gp.templates.tableBody.$inject = ['$config'];

gp.templates.tableRowCells = function ( $columns ) {
    var self = this,
        html = new gp.StringBuilder();
    $columns.forEach( function ( col ) {
        // set the current column for bodyCellContent template
        self.setResource( '$column', col );
        html.add( '<td class="body-cell ' );
        if ( col.commands ) {
            html.add( 'commands ' );
        }
        html.add( col.bodyclass )
            .add( '">' )
            .add( self.exec( 'bodyCellContent' ) )
            .add( '</td>' );
    } );
    return html.toString();
};

gp.templates.tableRowCells.$inject = ['$columns'];

gp.templates.tableRows = function ( $data, $map ) {
    var self = this,
        html = new gp.StringBuilder(),
        uid;
    if ( !$map ) {
        $map = new gp.DataMap();
        this.setResource( '$map', $map );
    }
    if ( $data == null ) return '';
    $data.forEach( function ( dataItem ) {
        uid = $map.assign( dataItem );
        // set the current data item on the injector
        self.setResource( '$dataItem', dataItem );
        html.add( '<tr data-uid="' )
        .add( uid )
        .add( '">' )
        .add( self.exec( 'tableRowCells' ) )
        .add( '</tr>' );
    } );
    return html.toString();
};

gp.templates.tableRows.$inject = ['$data', '$map'];

gp.templates.tfoot = function ( $columns ) {
    var self = this,
        html = new gp.StringBuilder();
    html.add( '<tfoot>' )
        .add( '<tr>' )
    $columns.forEach( function ( col ) {
        html.add( '<td class="footer-cell">' )
            .add( self.exec( 'footerCell', col ) )
            .add( '</td>' );
    } );
    html.add( '</tr>' )
        .add( '</tfoot>' );
    return html.toString();
};

gp.templates.tfoot.$inject = ['$columns'];

gp.templates.thead = function ( $columns, $config ) {
    var self = this,
        html = new gp.StringBuilder(),
        sort, template, classes;
    html.add( '<thead>' );
    html.add( '<tr>' );
    $columns.forEach( function ( col ) {
        sort = '';
        if ( $config.sorting ) {
            // if sort isn't specified, use the field
            sort = gp.escapeHTML( gp.coalesce( [col.sort, col.field] ) );
        }
        else {
            // only provide sorting where it is explicitly specified
            if ( gp.hasValue( col.sort ) ) {
                sort = gp.escapeHTML( col.sort );
            }
        }

        html.add( '<th class="header-cell ' + ( col.headerclass || '' ) + '"' );

        if ( gp.hasValue( sort ) ) {
            html.add( ' data-sort="' + sort + '"' );
        }

        html.add( '>' );

        // check for a template
        if ( col.headertemplate ) {
            if ( typeof ( col.headertemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.headertemplate, self, [col] ) );
            }
            else {
                html.add( gp.supplant.call( this, col.headertemplate, col, [col] ) );
            }
        }
        else if ( !gp.isNullOrEmpty( sort ) ) {
            html.add( '<a href="javascript:void(0);" class="table-sort" value="sort" data-sort="' )
                .escape( sort )
                .add( '">' )
                .escape( gp.coalesce( [col.header, col.field, sort] ) )
                .add( '<span class="glyphicon"></span>' )
                .add( '</a>' );
        }
        else {
            html.escape( gp.coalesce( [col.header, col.field, ''] ) );
        }
        html.add( '</th>' );
    } );
    html.add( '</tr>' )
        .add( '</thead>' );
    return html.toString();
};

gp.templates.thead.$inject = ['$columns', '$config'];

gp.templates.toolbar = function ( $config ) {
    var html = new gp.StringBuilder();
    if ( typeof ( $config.toolbartemplate ) === 'function' ) {
        html.add( gp.applyFunc( $config.toolbartemplate, $config ) );
    }
    else {
        html.add( $config.toolbartemplate );
    }
    return html.toString();
};

gp.templates.toolbar.$inject = ['$config'];