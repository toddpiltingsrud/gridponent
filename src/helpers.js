/***************\
  table helpers
\***************/

(function () {

    gp.helpers = {};

    var extend = function (name, func) {
        gp.helpers[name] = func;
    };

    extend('template', function (name, arg) {
        var template = gp.templates[name];
        if (template) {
            return template(this, arg);
        }
    });

    extend('toolbarTemplate', function () {
        var html = new gp.StringBuilder();

        if (this.ToolbarTemplate) {
            // it's either a selector or a function name
            template = gp.getObjectAtPath(this.ToolbarTemplate);
            if (typeof (template) === 'function') {
                html.add(template(this));
            }
            else {
                template = document.querySelector(this.ToolbarTemplate);
                if (template) {
                    html.add(template.innerHTML);
                }
            }
        }

        return html.toString();
    });

    extend('thead', function () {
        var self = this;
        var html = new gp.StringBuilder();
        var sort, type, template;
        html.add('<thead>');
        html.add('<tr>');
        this.Columns.forEach(function (col) {
            if (self.Sorting) {
                // if sort isn't specified, use the field
                sort = gp.escapeHTML(gp.coalesce([col.Sort, col.Field]));
            }
            else {
                // only provide sorting where it is explicitly specified
                if (col.Sort === true && gp.hasValue(col.Field)) {
                    sort = gp.escapeHTML(col.Field);
                }
                else {
                    sort = gp.escapeHTML(col.Sort);
                }
            }
            type = gp.coalesce([col.Type, '']).toLowerCase();
            html.add('<th class="header-cell ' + type + ' ' + sort + '">');

            gp.verbose('helpers.thead: col:');
            gp.verbose(col);

            // check for a template
            if (col.HeaderTemplate) {
                gp.verbose('helpers.thead: col.HeaderTemplate:');
                gp.verbose(col.HeaderTemplate);
                if (typeof (col.HeaderTemplate) === 'function') {
                    html.add(col.HeaderTemplate.call(self, col));
                }
                else {
                    html.add(gp.processColumnTemplate.call(this, col.HeaderTemplate, col));
                }
            }
            else if (gp.hasValue(sort)) {
                html.add('<label class="table-sort">')
                .add('<input type="radio" name="OrderBy" value="' + sort + '" />')
                .add(gp.coalesce([col.Header, col.Field, sort]))
                .add('</label>');
            }
            else {
                html.add(gp.coalesce([col.Header, col.Field, '&nbsp;']));
            }
            html.add('</th>');
        });
        html.add('</tr>')
            .add('</thead>');
        return html.toString();
    });

    extend('tableRows', function() {
        var self = this;
        var html = new gp.StringBuilder();
        this.data.Data.forEach(function (row, index) {
            self.Row = row;
            html.add('<tr data-index="')
            .add(index)
            .add('">')
            .add(gp.templates['gridponent-cells'](self))
            .add('</tr>');
        });
        return html.toString();
    });

    extend('rowIndex', function () {
        return this.data.Data.indexOf(this.Row);
    });

    extend('bodyCell', function (col) {
        var type = ( col.Type || '' ).toLowerCase();
        gp.info( 'bodyCell: type:', type );
        var html = new gp.StringBuilder();
        html.add('<td class="body-cell ' + type + '"');
        if (col.BodyStyle) {
            html.add(' style="' + col.BodyStyle + '"');
        }
        html.add('>')
            .add(gp.helpers['bodyCellContent'].call(this, col))
            .add('</td>');
        return html.toString();
    });

    extend( 'bodyCellContent', function ( col ) {
        var self = this,
            template,
            format,
            hasDeleteBtn = false,
            val = gp.getFormattedValue( this.Row, col, true ),
            type = (col.Type || '').toLowerCase(),
            html = new gp.StringBuilder();

        // check for a template
        if (col.Template) {
            if (typeof (col.Template) === 'function') {
                html.add(col.Template.call(this, this.Row, col));
            }
            else {
                html.add(gp.processRowTemplate.call(this, col.Template, this.Row, col));
            }
        }
        else if (col.Commands && col.Commands.length) {
            html.add('<div class="btn-group" role="group">');
            col.Commands.forEach(function (cmd, index) {
                if (cmd == 'Edit' && gp.hasValue(self.Update )) {
                    html.add('<button type="button" class="btn btn-default btn-xs" value="')
                        .add(cmd)
                        .add('">')
                        .add('<span class="glyphicon glyphicon-edit"></span>')
                        .add(cmd)
                        .add('</button>');
                }
                else if ( cmd == 'Delete' && gp.hasValue( self.Destroy ) ) {
                    // put the delete btn last
                    hasDeleteBtn = true;
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

            // put the delete btn last
            if ( hasDeleteBtn ) {
                html.add( '<button type="button" class="btn btn-danger btn-xs" value="Delete">' )
                    .add( '<span class="glyphicon glyphicon-remove"></span>Delete' )
                    .add( '</button>' );
            }

            html.add('</div>');
        }
        else if (gp.hasValue(val)) {
            // show a checkmark for bools
            if (type === 'boolean') {
                if (val === true) {
                    html.add('<span class="glyphicon glyphicon-ok"></span>');
                }
            }
            else {
                html.add(val);
            }
        }
        return html.toString();
    });


    extend('editCell', function (col) {
        if (col.Readonly) {
            return gp.helpers.bodyCell.call(this, col);
        }

        var html = new gp.StringBuilder();
        var type = col.Type;
        if (col.Commands) type = 'commands-cell';

        html.add('<td class="body-cell ' + type + '"');
        if (col.BodyStyle) {
            html.add(' style="' + col.BodyStyle + '"');
        }
        html.add('>')
        .add(gp.helpers['editCellContent'].call(this, col))
        .add('</td>');
        return html.toString();
    });

    extend('editCellContent', function (col) {
        var template, html = new gp.StringBuilder();

        // check for a template
        if (col.EditTemplate) {
            if (typeof (col.EditTemplate) === 'function') {
                html.add(col.EditTemplate.call(this, this.Row, col));
            }
            else {
                html.add(gp.processRowTemplate.call(this, col.EditTemplate, this.Row, col));
            }
        }
        else if (col.Commands) {
            html.add('<div class="btn-group" role="group">')
                .add('<button type="button" class="btn btn-primary btn-xs" value="Update">')
                .add('<span class="glyphicon glyphicon-save"></span>Save')
                .add('</button>')
                .add('<button type="button" class="btn btn-default btn-xs" value="Cancel">')
                .add('<span class="glyphicon glyphicon-remove"></span>Cancel')
                .add('</button>')
                .add('</div>');
        }
        else {
            var val = this.Row[col.Field];
            // render empty cell if this field doesn't exist in the data
            if (val === undefined) return '';
            // render null as empty string
            if (val === null) val = '';
            html.add('<input class="form-control" name="' + col.Field + '" type="');
            switch (col.Type) {
                case 'date':
                case 'dateString':
                    // use the required format for the date input element
                    val = gp.getLocalISOString(val).substring(0, 10);
                    html.add('date" value="' + gp.escapeHTML(val) + '" />');
                    break;
                case 'number':
                    html.add('number" value="' + gp.escapeHTML(val) + '" />');
                    break;
                case 'boolean':
                    html.add('checkbox" value="true"');
                    if (val) {
                        html.add(' checked="checked"');
                    }
                    html.add(' />');
                    break;
                default:
                    html.add('text" value="' + gp.escapeHTML(val) + '" />');
                    break;
            };
        }
        return html.toString();
    });

    extend('footerCell', function (col) {
        var html = new gp.StringBuilder();
        if (col.FooterTemplate) {
            if (typeof (col.FooterTemplate) === 'function') {
                html.add(col.FooterTemplate.call(this, col));
            }
            else {
                html.add(gp.processColumnTemplate.call(this, col.FooterTemplate, col));
            }
        }
        return html.toString();
    });

    extend('setPagerFlags', function () {
        this.data.IsFirstPage = this.data.Page === 1;
        this.data.IsLastPage = this.data.Page === this.data.PageCount;
        this.data.HasPages = this.data.PageCount > 1;
        this.data.PreviousPage = this.data.Page === 1 ? 1 : this.data.Page - 1;
        this.data.NextPage = this.data.Page === this.data.PageCount ? this.data.PageCount : this.data.Page + 1;
    });

    extend('sortStyle', function () {
        var html = new gp.StringBuilder();
        if (gp.isNullOrEmpty(this.data.OrderBy) === false) {
            html.add('#' + this.ID + ' thead th.header-cell.' + this.data.OrderBy + '> label:after')
                .add('{ content: ');
            if (this.data.Desc) {
                html.add('"\\e114"; }');
            }
            else {
                html.add('"\\e113"; }');
            }
        }
        return html.toString();
    });

    extend('columnWidthStyle', function () {
        var self = this,
            html = new gp.StringBuilder(),
            index = 0,
            bodyCols = document.querySelectorAll('#' + this.ID + ' .table-body > table > tbody > tr:first-child > td');

        // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
        this.Columns.forEach(function (col) {
            html.add('#' + self.ID + ' .table-header th.header-cell:nth-child(' + (index + 1) + '),')
                .add('#' + self.ID + ' .table-footer td.footer-cell:nth-child(' + (index + 1) + ')');
            if (col.Width) {
                // fixed width should include the body
                html.add(',')
                    .add('#' + self.ID + ' > .table-body > table > thead th:nth-child(' + (index + 1) + '),')
                    .add('#' + self.ID + ' > .table-body > table > tbody td:nth-child(' + (index + 1) + ')')
                    .add('{ width:')
                    .add(col.Width);
                if (isNaN(col.Width) == false) html.add('px');
            }
            else if (bodyCols.length && (self.FixedHeaders || self.FixedFooters)) {
                // sync header and footer to body
                width = bodyCols[index].offsetWidth;
                html.add('{ width:')
                    .add(bodyCols[index].offsetWidth)
                    .add('px');
            }
            html.add(';}');
            index++;
        });

        gp.verbose('columnWidthStyle: html:');
        gp.verbose(html.toString());

        return html.toString();
    });

    extend('containerClasses', function () {
        var html = new gp.StringBuilder();
        if (this.FixedHeaders) {
            html.add(' fixed-headers');
        }
        if (this.FixedFooters) {
            html.add(' fixed-footers');
        }
        if (this.Pager) {
            html.add(' pager-' + this.Pager);
        }
        if (this.Responsive) {
            html.add(' responsive');
        }
        if (this.Search) {
            html.add(' search-' + this.Search);
        }
        if (this.Onrowselect) {
            html.add(' selectable');
        }
        return html.toString();
    });

})();