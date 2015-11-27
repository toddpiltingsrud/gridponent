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
        var out = [];

        if (this.ToolbarTemplate) {
            // it's either a selector or a function name
            template = gp.resolveObjectPath(this.ToolbarTemplate);
            if (typeof (template) === 'function') {
                out.push(template(this));
            }
            else {
                template = document.querySelector(this.ToolbarTemplate);
                if (template) {
                    out.push(template.innerHTML);
                }
            }
        }

        return out.join('');
    });

    extend('thead', function () {
        var self = this;
        var out = [];
        var sort, type, template;
        out.push('<thead>');
        out.push('<tr>');
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
            out.push('<th class="header-cell ' + type + ' ' + sort + '">');

            gp.verbose('helpers.thead: col:');
            gp.verbose(col);

            // check for a template
            if (col.HeaderTemplate) {
                // it's either a selector or a function name
                template = gp.resolveObjectPath(col.HeaderTemplate);
                if (typeof (template) === 'function') {
                    out.push(template.call(self, col));
                }
                else {
                    template = document.querySelector(col.HeaderTemplate);
                    if (template) {
                        out.push(template.innerHTML);
                    }
                }
                gp.verbose('helpers.thead: template:');
                gp.verbose(template);
            }
            else if (gp.hasValue(sort)) {
                out.push('<label class="table-sort">');
                out.push('<input type="checkbox" name="OrderBy" value="' + sort + '" />');
                out.push(gp.coalesce([col.Header, col.Field, sort]));
                out.push('</label>');
            }
            else {
                out.push(gp.coalesce([col.Header, col.Field, '&nbsp;']));
            }
            out.push('</th>');
        });
        out.push('</tr>');
        out.push('</thead>');
        return out.join('');
    });

    extend('tableRows', function() {
        var self = this;
        var out = [];
        this.data.Data.forEach(function (row, index) {
            self.Row = row;
            out.push('<tr data-index="');
            out.push(index);
            out.push('">');
            out.push(gp.templates['gridponent-cells'](self));
            out.push('</tr>');
        });
        return out.join('');
    });

    extend('bodyCell', function (col) {
        var template, format, val = this.Row[col.Field];

        var type = (col.Type || '').toLowerCase();
        var out = [];
        out.push('<td class="body-cell ' + type + '">');

        gp.verbose('bodyCell: col:');
        gp.verbose(col);

        // check for a template
        if (col.Template) {
            // it's either a selector or a function name
            template = gp.resolveObjectPath(col.Template);
            if (typeof (template) === 'function') {
                out.push(template.call(this, this.Row, col));
            }
            else {
                template = document.querySelector(col.Template);
                if (template) {
                    out.push(template.innerHTML);
                }
            }
        }
        else if (gp.hasValue(val)) {
            // show a checkmark for bools
            if (type === 'boolean') {
                if (val === true) {
                    out.push('<span class="glyphicon glyphicon-ok"></span>');
                }
            }
            else if (type === 'date') {
                // apply formatting to dates
                format = col.Format || 'M/d/yyyy';
                out.push(gp.formatDate(val, format));
            }
            else {
                out.push(gp.escapeHTML(val));
            }
        }
        out.push('</td>');
        return out.join('');
    });

    extend('editCell', function (col) {
        var template, out = [];

        out.push('<td class="body-cell ' + col.Type + '">');

        gp.verbose('helper.editCell: col: ');
        gp.verbose(col);

        // check for a template
        if (col.EditTemplate) {
            // it's either a selector or a function name
            template = gp.resolveObjectPath(col.EditTemplate);
            if (typeof (template) === 'function') {
                out.push(template.call(this, this.Row, col));
            }
            else {
                template = document.querySelector(col.EditTemplate);
                if (template) {
                    out.push(template.innerHTML);
                }
            }
        }
        else {
            var val = this.Row[col.Field];
            // render empty cell if this field doesn't exist in the data
            if (val === undefined) return '<td class="body-cell"></td>';
            // render null as empty string
            if (val === null) val = '';
            out.push('<input class="form-control" name="' + col.Field + '" type="');
            switch (col.Type) {
                case 'date':
                    // use the required format for the date input element
                    val = gp.formatDate(val, 'yyyy-MM-dd');
                    out.push('date" value="' + gp.escapeHTML(val) + '" />');
                    break;
                case 'number':
                    out.push('number" value="' + gp.escapeHTML(val) + '" />');
                    break;
                case 'boolean':
                    out.push('checkbox" value="true"');
                    if (val) {
                        out.push(' checked="checked"');
                    }
                    out.push(' />');
                    break;
                default:
                    out.push('text" value="' + gp.escapeHTML(val) + '" />');
                    break;
            };
        }
        out.push('</td>');
        return out.join('');
    });

    extend('footerCell', function (col) {
        if (typeof (col.FooterTemplate) === 'function') {
            var out = [];
            out.push(col.FooterTemplate.call(this, col));
            return out.join('');
        }
    });

    extend('setPagerFlags', function () {
        this.data.IsFirstPage = this.data.Page === 1;
        this.data.IsLastPage = this.data.Page === this.data.PageCount;
        this.data.HasPages = this.data.PageCount > 1;
        this.data.PreviousPage = this.data.Page === 1 ? 1 : this.data.Page - 1;
        this.data.NextPage = this.data.Page === this.data.PageCount ? this.data.PageCount : this.data.Page + 1;
    });

    extend('sortStyle', function () {
        var out = [];
        if (gp.isNullOrEmpty(this.data.OrderBy) === false) {
            out.push('#' + this.ID + ' > .table-header > table > thead th.' + this.data.OrderBy + '> label:after');
            out.push('{ content: ');
            if (this.data.Desc) {
                out.push('"\\e113"; }');
            }
            else {
                out.push('"\\e114"; }');
            }
        }
        return out.join('');
    });

    extend('columnWidthStyle', function () {
        var self = this;
        var out = [];
        var index = 0;
        var bodyCols = document.querySelectorAll('#' + this.ID + ' .table-body > table > tbody > tr:first-child > td');

        gp.info('columnWidthStyle: bodycols:');
        gp.info(bodyCols);
        gp.info('columnWidthStyle: this:');
        gp.info(this);

        // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
        this.Columns.forEach(function (col) {
            out.push('#' + self.ID + ' .table-header th.header-cell:nth-child(' + (index + 1) + '),');
            out.push('#' + self.ID + ' .table-footer td.footer-cell:nth-child(' + (index + 1) + ')');
            if (col.Width) {
                // fixed width should include the body
                out.push(',');
                out.push('#' + self.ID + ' > .table-body > table > thead th:nth-child(' + (index + 1) + '),');
                out.push('#' + self.ID + ' > .table-body > table > tbody td:nth-child(' + (index + 1) + ')');
                out.push('{ width:');
                out.push(col.Width);
            }
            else if (bodyCols.length && (self.FixedHeaders || self.FixedFooters)) {
                // sync header and footer to body
                out.push('{ width:');
                out.push(bodyCols[index].offsetWidth);
                out.push('px');
            }
            out.push(';}');
            index++;
        });

        gp.verbose('columnWidthStyle: out:');
        gp.verbose(out.join(''));

        return out.join('');
    });

    extend('containerClasses', function () {
        var out = [];
        if (this.FixedHeaders) {
            out.push(' fixed-headers');
        }
        if (this.FixedFooters) {
            out.push(' fixed-footers');
        }
        if (this.Paging) {
            out.push(' pager-' + this.Paging);
        }
        if (this.Search) {
            out.push(' search-' + this.Search);
        }
        return out.join('');
    });

})();