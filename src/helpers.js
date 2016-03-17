/***************\
  table helpers
\***************/

gp.helpers = {

    toolbarTemplate: function () {
        var html = new gp.StringBuilder();
        if ( typeof ( this.ToolbarTemplate ) === 'function' ) {
            html.add( gp.applyFunc( this.ToolbarTemplate, this ) );
        }
        else {
            html.add( this.ToolbarTemplate );
        }
        return html.toString();
    },

    thead: function () {
        var self = this;
        var html = new gp.StringBuilder();
        var sort, template, classes;
        html.add( '<thead>' );
        html.add( '<tr>' );
        this.Columns.forEach( function ( col ) {
            sort = '';
            if ( self.Sorting ) {
                // if sort isn't specified, use the field
                sort = gp.escapeHTML( gp.coalesce( [col.Sort, col.Field] ) );
            }
            else {
                // only provide sorting where it is explicitly specified
                if ( gp.hasValue( col.Sort ) ) {
                    sort = gp.escapeHTML( col.Sort );
                }
            }

            classes = gp.trim(['header-cell', (col.Type || ''), (col.HeaderClass || '')].join(' '));

            html.add( '<th class="' + classes + '" data-sort="' + sort + '">' );

            // check for a template
            if ( col.HeaderTemplate ) {
                gp.verbose( 'helpers.thead: col.HeaderTemplate:' );
                gp.verbose( col.HeaderTemplate );
                if ( typeof ( col.HeaderTemplate ) === 'function' ) {
                    html.add( gp.applyFunc( col.HeaderTemplate, self, [col] ) );
                }
                else {
                    html.add( gp.processHeaderTemplate.call( this, col.HeaderTemplate, col ) );
                }
            }
            else if ( sort != '' ) {
                html.add( '<label class="table-sort">' )
                .add( '<input type="radio" name="OrderBy" value="' + sort + '" />' )
                .add( gp.coalesce( [col.Header, col.Field, sort] ) )
                .add( '</label>' );
            }
            else {
                html.add( gp.coalesce( [col.Header, col.Field, '&nbsp;'] ) );
            }
            html.add( '</th>' );
        } );
        html.add( '</tr>' )
            .add( '</thead>' );
        return html.toString();
    },

    tableRows: function () {
        var self = this;
        var html = new gp.StringBuilder();
        this.pageModel.Data.forEach( function ( row, index ) {
            self.Row = row;
            html.add( '<tr data-index="' )
            .add( index )
            .add( '">' )
            .add( gp.templates['gridponent-cells']( self ) )
            .add( '</tr>' );
        } );
        return html.toString();
    },

    bodyCellContent: function ( col, row ) {
        var self = this,
            template,
            format,
            hasDeleteBtn = false,
            row = row || this.Row,
            val = gp.getFormattedValue( row, col, true ),
            type = ( col.Type || '' ).toLowerCase(),
            html = new gp.StringBuilder();

        // check for a template
        if ( col.BodyTemplate ) {
            if ( typeof ( col.BodyTemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.BodyTemplate, this, [row, col] ) );
            }
            else {
                html.add( gp.processBodyTemplate.call( this, col.BodyTemplate, row, col ) );
            }
        }
        else if ( col.Commands && col.Commands.length ) {
            html.add( '<div class="btn-group" role="group">' );
            col.Commands.forEach( function ( cmd, index ) {
                if ( cmd == 'Edit' && gp.hasValue( self.Update ) ) {
                    html.add( '<button type="button" class="btn btn-default btn-xs" value="' )
                        .add( cmd )
                        .add( '">' )
                        .add( '<span class="glyphicon glyphicon-edit"></span>' )
                        .add( cmd )
                        .add( '</button>' );
                }
                else if ( cmd == 'Delete' && gp.hasValue( self.Delete ) ) {
                    html.add( '<button type="button" class="btn btn-danger btn-xs" value="Delete">' )
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

    editCellContent: function ( col, row, mode ) {
        var template, html = new gp.StringBuilder();

        // check for a template
        if ( col.EditTemplate ) {
            if ( typeof ( col.EditTemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.EditTemplate, this, [row, col] ) );
            }
            else {
                html.add( gp.processBodyTemplate.call( this, col.EditTemplate, row, col ) );
            }
        }
        else if ( col.Commands ) {
            html.add( '<div class="btn-group" role="group">' )
                .add( '<button type="button" class="btn btn-primary btn-xs" value="' )
                .add( mode == 'create' ? 'Create' : 'Update' )
                .add( '">' )
                .add( '<span class="glyphicon glyphicon-save"></span>Save' )
                .add( '</button>' )
                .add( '<button type="button" class="btn btn-default btn-xs" value="Cancel">' )
                .add( '<span class="glyphicon glyphicon-remove"></span>Cancel' )
                .add( '</button>' )
                .add( '</div>' );
        }
        else {
            var val = row[col.Field];
            // render empty cell if this field doesn't exist in the data
            if ( val === undefined ) return '';
            // render null as empty string
            if ( val === null ) val = '';
            html.add( '<input class="form-control" name="' + col.Field + '" type="' );
            switch ( col.Type ) {
                case 'date':
                case 'dateString':
                    // use the required format for the date input element
                    val = gp.getLocalISOString( val ).substring( 0, 10 );
                    html.add( 'date" value="' + gp.escapeHTML( val ) + '" />' );
                    break;
                case 'number':
                    html.add( 'number" value="' + gp.escapeHTML( val ) + '" />' );
                    break;
                case 'boolean':
                    html.add( 'checkbox" value="true"' );
                    if ( val ) {
                        html.add( ' checked="checked"' );
                    }
                    html.add( ' />' );
                    break;
                default:
                    html.add( 'text" value="' + gp.escapeHTML( val ) + '" />' );
                    break;
            }
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

    footerCell: function ( col ) {
        var html = new gp.StringBuilder();
        if ( col.FooterTemplate ) {
            if ( typeof ( col.FooterTemplate ) === 'function' ) {
                html.add( gp.applyFunc( col.FooterTemplate, this, [col, this.pageModel.Data] ) );
            }
            else {
                html.add( gp.processFooterTemplate.call( this, col.FooterTemplate, col, this.pageModel.Data ) );
            }
        }
        return html.toString();
    },

    setPagerFlags: function () {
        this.pageModel.IsFirstPage = this.pageModel.Page === 1;
        this.pageModel.IsLastPage = this.pageModel.Page === this.pageModel.PageCount;
        this.pageModel.HasPages = this.pageModel.PageCount > 1;
        this.pageModel.PreviousPage = this.pageModel.Page === 1 ? 1 : this.pageModel.Page - 1;
        this.pageModel.NextPage = this.pageModel.Page === this.pageModel.PageCount ? this.pageModel.PageCount : this.pageModel.Page + 1;
    },

    sortStyle: function () {
        var html = new gp.StringBuilder();
        if ( gp.isNullOrEmpty( this.pageModel.OrderBy ) === false ) {
            html.add( '#' + this.ID + ' thead th.header-cell[data-sort="' + gp.escapeHTML(this.pageModel.OrderBy) + '"] > label:after' )
                .add( '{ content: ' );
            if ( this.pageModel.Desc ) {
                html.add( '"\\e114"; }' );
            }
            else {
                html.add( '"\\e113"; }' );
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
        this.Columns.forEach( function ( col ) {
            if ( col.Width ) {
                // fixed width should include the body
                html.add( '#' + self.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + self.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' )
                    .add( ',' )
                    .add( '#' + self.ID + ' > .table-body > table > thead th:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + self.ID + ' > .table-body > table > tbody td:nth-child(' + ( index + 1 ) + ')' )
                    .add( '{ width:' )
                    .add( col.Width );
                if ( isNaN( col.Width ) == false ) html.add( 'px' );
                html.add( ';}' );
            }
            else if ( bodyCols.length && ( self.FixedHeaders || self.FixedFooters ) ) {
                // sync header and footer to body
                width = bodyCols[index].offsetWidth;
                html.add( '#' +self.ID + ' .table-header th.header-cell:nth-child(' +( index +1 ) + '),' )
                    .add( '#' +self.ID + ' .table-footer td.footer-cell:nth-child(' +( index +1 ) + ')' )
                    .add( '{ width:' )
                    .add( bodyCols[index].offsetWidth )
                    .add( 'px;}' );
            }
            index++;
        } );

        gp.verbose( 'columnWidthStyle: html:' );
        gp.verbose( html.toString() );

        return html.toString();
    },

    containerClasses: function () {
        var html = new gp.StringBuilder();
        if ( this.FixedHeaders ) {
            html.add( ' fixed-headers' );
        }
        if ( this.FixedFooters ) {
            html.add( ' fixed-footers' );
        }
        if ( this.Pager ) {
            html.add( ' pager-' + this.Pager );
        }
        if ( this.Responsive ) {
            html.add( ' responsive' );
        }
        if ( this.Search ) {
            html.add( ' search-' + this.Search );
        }
        if ( this.Onrowselect ) {
            html.add( ' selectable' );
        }
        return html.toString();
    }

};

