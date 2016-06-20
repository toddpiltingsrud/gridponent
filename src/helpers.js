/***************\
    helpers
\***************/

gp.helpers = {

    bootstrapModal: function ( config, dataItem, mode ) {

        var model = {
            title: ( mode == 'create' ? 'Add' : 'Edit' ),
            body: '',
            footer: null,
            uid: config.map.getUid( dataItem )
        };

        var html = new gp.StringBuilder();

        // not using a form element here because the modal is added as a child node of the grid component
        // this will cause problems if the grid is inside another form (e.g. jQuery.validate will behave unexpectedly)
        html.add( '<div class="form-horizontal">' );

        config.columns.forEach( function ( col ) {
            if ( col.commands ) {
                model.footer = gp.helpers.editCellContent.call( config, col, dataItem, mode );
                return;
            }
            var canEdit = !col.readonly && ( gp.hasValue( col.field ) || gp.hasValue( col.edittemplate ) );
            if ( !canEdit ) return;

            var formGroupModel = {
                label: null,
                input: gp.helpers.editCellContent.call( config, col, dataItem, mode ),
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

            html.add( gp.helpers.formGroup( formGroupModel ) );
        } );

        html.add( '</div>' );

        model.body = html.toString();

        return gp.templates['bootstrap-modal']( model );
    },

    bodyCellContent: function ( col, dataItem ) {
        var self = this,
            template,
            format,
            val,
            glyphicon,
            btnClass,
            hasDeleteBtn = false,
            dataItem = dataItem || this.Row,
            type = ( col.Type || '' ).toLowerCase(),
            html = new gp.StringBuilder();

        if ( dataItem == null ) return;

        val = gp.getFormattedValue( dataItem, col, true );

        // check for a template
        if ( col.bodytemplate ) {
            if ( typeof ( col.bodytemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.bodytemplate, this, [dataItem, col] ) );
            }
            else {
                html.add( gp.supplant.call( this, col.bodytemplate, dataItem, [dataItem, col] ) );
            }
        }
        else if ( col.commands && col.commands.length ) {
            html.add( '<div class="btn-group btn-group-xs" role="group">' );
            col.commands.forEach( function ( cmd, index ) {
                html.add( gp.helpers.button( cmd ) );
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
    },

    button: function ( model, arg ) {
        var template = '<button type="button" class="btn {{btnClass}}" value="{{value}}"><span class="glyphicon {{glyphicon}}"></span>{{text}}</button>';
        return gp.supplant( template, model );
    },

    columnWidthStyle: function () {
        var self = this,
            html = new gp.StringBuilder(),
            index = 0,
            bodyCols = document.querySelectorAll( '#' + this.ID + ' .table-body > table > tbody > tr:first-child > td' );

        // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
        this.columns.forEach( function ( col ) {
            if ( col.width ) {
                // fixed width should include the body
                html.add( '#' + self.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + self.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' )
                    .add( ',' )
                    .add( '#' + self.ID + ' > .table-body > table > thead th:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + self.ID + ' > .table-body > table > tbody td:nth-child(' + ( index + 1 ) + ')' )
                    .add( '{ width:' )
                    .add( col.width );
                if ( isNaN( col.width ) == false ) html.add( 'px' );
                html.add( ';}' );
            }
            else if ( bodyCols.length && ( self.fixedheaders || self.fixedfooters ) ) {
                // sync header and footer to body
                width = bodyCols[index].offsetWidth;
                html.add( '#' + self.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + self.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' )
                    .add( '{ width:' )
                    .add( bodyCols[index].offsetWidth )
                    .add( 'px;}' );
            }
            index++;
        } );

        return html.toString();
    },

    containerClasses: function () {
        var html = new gp.StringBuilder();
        if ( this.fixedheaders ) {
            html.add( ' fixed-headers' );
        }
        if ( this.fixedfooters ) {
            html.add( ' fixed-footers' );
        }
        if ( this.pager ) {
            html.add( ' pager-' + this.pager );
        }
        if ( this.responsive ) {
            html.add( ' table-responsive' );
        }
        if ( this.search ) {
            html.add( ' search-' + this.search );
        }
        if ( this.rowselected ) {
            html.add( ' selectable' );
        }
        return html.toString();
    },

    editCellContent: function ( col, dataItem, mode ) {
        var template, html = new gp.StringBuilder();

        // check for a template
        if ( col.edittemplate ) {
            if ( typeof ( col.edittemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.edittemplate, this, [dataItem, col] ) );
            }
            else {
                html.add( gp.supplant.call( this, col.edittemplate, dataItem, [dataItem, col] ) );
            }
        }
        else if ( col.commands ) {
            html.add( '<div class="btn-group' )
                .add( this.editmode == 'inline' ? ' btn-group-xs' : '' )
                .add('">')
                .add( gp.helpers.button( {
                    btnClass: 'btn-primary',
                    value: ( mode == 'create' ? 'create' : 'update' ),
                    glyphicon: 'glyphicon-save',
                    text: 'Save'
                } ) )
                .add( '<button type="button" class="btn btn-default" data-dismiss="modal" value="cancel">' )
                .add( '<span class="glyphicon glyphicon-remove"></span>Cancel' )
                .add( '</button>' )
                .add( '</div>' );
        }
        else {
            var val = dataItem[col.field];
            // render undefined/null as empty string
            if ( !gp.hasValue( val ) ) val = '';
            html.add( gp.helpers.input( col.Type, col.field, "" ) );
        }
        return html.toString();
    },

    footerCell: function ( col ) {
        var html = new gp.StringBuilder();
        if ( col.footertemplate ) {
            if ( typeof ( col.footertemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.footertemplate, this, [col, this.pageModel.data] ) );
            }
            else {
                html.add( gp.supplant.call( this, col.footertemplate, col, [col, this.pageModel.data] ) );
            }
        }
        return html.toString();
    },

    formGroup: function ( model, arg ) {
        var template = '<div class="form-group {{editclass}}"><label class="col-sm-4 control-label">{{{label}}}</label><div class="col-sm-6">{{{input}}}</div></div>';
        return gp.supplant( template, model );
    },

    input: function ( type, name, value ) {
        var obj = {
            type: ( type == 'boolean' ? 'checkbox' : ( type == 'number' ? 'number' : 'text' ) ),
            name: name,
            value: ( type == 'boolean' ? 'true' : ( type == 'date' ? gp.formatter.format( value, 'YYYY-MM-DD' ) : gp.escapeHTML( value ) ) ),
            checked: ( type == 'boolean' && value ? ' checked' : '' ),
            // Don't bother with the date input type.
            // Indicate the type using data-type attribute so a custom date picker can be used.
            // This sidesteps the problem of polyfilling browsers that don't support the date input type
            // and provides a more consistent experience across browsers.
            dataType: ( /^date/.test( type ) ? ' data-type="date"' : '' )
        };

        return gp.supplant( '<input type="{{type}}" name="{{name}}" value="{{value}}" class="form-control"{{{dataType}}}{{checked}} />', obj );
    },

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
    },

    tableRows: function () {
        var self = this,
            html = new gp.StringBuilder(),
            map = this.map,
            uid;
        if ( !map ) {
            map = this.map = new gp.DataMap();
        }
        this.pageModel.data.forEach( function ( dataItem, index ) {
            uid = map.assign( dataItem );
            self.Row = dataItem;
            html.add( '<tr data-uid="' )
            .add( uid )
            .add( '">' )
            .add( gp.templates['gridponent-cells']( self ) )
            .add( '</tr>' );
        } );
        return html.toString();
    },

    thead: function () {
        var self = this;
        var html = new gp.StringBuilder();
        var sort, template, classes;
        html.add( '<thead>' );
        html.add( '<tr>' );
        this.columns.forEach( function ( col ) {
            sort = '';
            if ( self.sorting ) {
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
            else if ( !gp.isNullOrEmpty(sort) ) {
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
    },

    toolbartemplate: function () {
        var html = new gp.StringBuilder();
        if ( typeof ( this.toolbartemplate ) === 'function' ) {
            html.add( gp.applyFunc( this.toolbartemplate, this ) );
        }
        else {
            html.add( this.toolbartemplate );
        }
        return html.toString();
    }

};

