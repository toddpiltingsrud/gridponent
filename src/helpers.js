/***************\
    helpers
\***************/

gp.helpers = {

    bootstrapModal: function ( config, dataItem, mode ) {

        var model = {
            title: (mode == 'create') ? 'Add' : 'Edit',
            body: '',
            footer: null
        };

        var html = new gp.StringBuilder();

        html.add( '<form class="form-horizontal">' );

        config.columns.forEach( function ( col ) {
            if ( col.commands ) {
                model.footer = gp.helpers.editCellContent( col, dataItem, mode );
                return;
            }
            var canEdit = !col.readonly && ( gp.hasValue( col.field ) || gp.hasValue( col.edittemplate ) );
            if ( !canEdit ) return;
            html.add( '<div class="form-group">' )
                .add( '<label class="col-sm-4 control-label">' );
            // check for a template
            if ( col.headertemplate ) {
                if ( typeof ( col.headertemplate ) === 'function' ) {
                    html.add( gp.applyFunc( col.headertemplate, self, [col] ) );
                }
                else {
                    html.add( gp.processHeaderTemplate.call( this, col.headertemplate, col ) );
                }
            }
            else {
                html.escape( gp.coalesce( [col.header, col.field, ''] ) );
            }
            html.add( '</label>' )
                .add('<div class="col-sm-8">')
                .add( gp.helpers.editCellContent( col, dataItem, mode ) )
                .add( '</div>' )
                .add( '</div>' );
        } );

        html.add( '</form>' );

        model.body = html.toString();

        return gp.templates['bootstrap-modal']( model );
    },

    bodyCellContent: function ( col, dataItem ) {
        var self = this,
            template,
            format,
            val,
            hasDeleteBtn = false,
            dataItem = dataItem || this.Row,
            type = ( col.Type || '' ).toLowerCase(),
            html = new gp.StringBuilder();

        try {
            if ( dataItem == null ) return;
            val = gp.getFormattedValue( dataItem, col, true );
        }
        catch ( err ) {
            gp.error( err );
            console.log( col );
            console.log( dataItem );
        }

        // check for a template
        if ( col.bodytemplate ) {
            if ( typeof ( col.bodytemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.bodytemplate, this, [dataItem, col] ) );
            }
            else {
                html.add( gp.processBodyTemplate.call( this, col.bodytemplate, dataItem, col ) );
            }
        }
        else if ( col.commands && col.commands.length ) {
            html.add( '<div class="btn-group" role="group">' );
            col.commands.forEach( function ( cmd, index ) {
                if ( cmd == 'edit' && gp.hasValue( self.update ) ) {
                    html.add( '<button type="button" class="btn btn-default btn-xs" value="' )
                        .add( cmd )
                        .add( '">' )
                        .add( '<span class="glyphicon glyphicon-edit"></span>' )
                        .add( 'Edit' )
                        .add( '</button>' );
                }
                else if ( cmd == 'destroy' && gp.hasValue( self.destroy ) ) {
                    html.add( '<button type="button" class="btn btn-danger btn-xs" value="destroy">' )
                        .add( '<span class="glyphicon glyphicon-remove"></span>Delete' )
                        .add( '</button>' );
                }
                else {
                    html.add( '<button type="button" class="btn btn-default btn-xs" value="' )
                        .add( cmd )
                        .add( '">' )
                        .add( '<span class="glyphicon glyphicon-cog"></span>' )
                        .add( cmd )
                        .add( '</button>' );
                }
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
                html.add( val );
            }
        }
        return html.toString();
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
            html.add( ' responsive' );
        }
        if ( this.search ) {
            html.add( ' search-' + this.search );
        }
        if ( this.onrowselect ) {
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
                html.add( gp.processBodyTemplate.call( this, col.edittemplate, dataItem, col ) );
            }
        }
        else if ( col.commands ) {
            html.add( '<div class="btn-group" role="group">' )
                .add( '<button type="button" class="btn btn-primary btn-xs" value="' )
                .add( mode == 'create' ? 'create' : 'update' )
                .add( '">' )
                .add( '<span class="glyphicon glyphicon-save"></span>Save' )
                .add( '</button>' )
                .add( '<button type="button" class="btn btn-default btn-xs" data-dismiss="modal" value="cancel">' )
                .add( '<span class="glyphicon glyphicon-remove"></span>Cancel' )
                .add( '</button>' )
                .add( '</div>' );
        }
        else {
            var val = dataItem[col.field];
            // render empty cell if this field doesn't exist in the data
            if ( val === undefined ) return '';
            // render null as empty string
            if ( val === null ) val = '';
            html.add( gp.helpers.input( col.Type, col.field, val ) );
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
                html.add( gp.processFooterTemplate.call( this, col.footertemplate, col, this.pageModel.data ) );
            }
        }
        return html.toString();
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

        return gp.supplant( '<input type="{{type}}" name="{{name}}" value="{{value}}" class="form-control"{{dataType}}{{checked}} />', obj );
    },

    setPagerFlags: function () {
        this.pageModel.IsFirstPage = this.pageModel.page === 1;
        this.pageModel.IsLastPage = this.pageModel.page === this.pageModel.pagecount;
        this.pageModel.HasPages = this.pageModel.pagecount > 1;
        this.pageModel.PreviousPage = this.pageModel.page === 1 ? 1 : this.pageModel.page - 1;
        this.pageModel.NextPage = this.pageModel.page === this.pageModel.pagecount ? this.pageModel.pagecount : this.pageModel.page + 1;
    },

    sortStyle: function () {
        var html = new gp.StringBuilder();
        if ( gp.isNullOrEmpty( this.pageModel.sort ) === false ) {
            html.add( '#' + this.ID + ' thead th.header-cell[data-sort="' + gp.escapeHTML( this.pageModel.sort ) + '"] > label:after' )
                .add( '{ content: ' );
            if ( this.pageModel.desc ) {
                html.add( '"\\e114"; }' );
            }
            else {
                html.add( '"\\e113"; }' );
            }
        }
        return html.toString();
    },

    tableRows: function () {
        var self = this;
        var html = new gp.StringBuilder();
        this.pageModel.data.forEach( function ( dataItem, index ) {
            self.Row = dataItem;
            html.add( '<tr data-index="' )
            .add( index )
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

            html.add( '<th class="header-cell ' + ( col.headerclass || '' ) + '" data-sort="' + sort + '">' );

            // check for a template
            if ( col.headertemplate ) {
                if ( typeof ( col.headertemplate ) === 'function' ) {
                    html.add( gp.applyFunc( col.headertemplate, self, [col] ) );
                }
                else {
                    html.add( gp.processHeaderTemplate.call( this, col.headertemplate, col ) );
                }
            }
            else if ( sort != '' ) {
                html.add( '<label class="table-sort">' )
                    .add( '<input type="radio" name="sort" value="' )
                    .escape( sort )
                    .add( '" />' )
                    .escape( gp.coalesce( [col.header, col.field, sort] ) )
                    .add( '</label>' );
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
    },

    validation: function ( tr, validationErrors ) {
        var builder = new gp.StringBuilder(), input, msg;
        builder.add( 'Please correct the following errors:\r\n' );
        // remove error class from inputs
        gp.removeClass( tr.querySelectorAll( '[name].error' ), 'error' );
        validationErrors.forEach( function ( v ) {
            input = tr.querySelector( '[name="' + v.Key + '"]' );
            if ( input ) {
                gp.addClass( input, 'error' );
            }
            builder.add( v.Key + ':\r\n' );
            // extract the error message
            msg = v.Value.Errors.map( function ( e ) { return '    - ' + e.ErrorMessage + '\r\n'; } ).join( '' );
            builder.add( msg );
        } );
        alert( builder.toString() );
    },
};

