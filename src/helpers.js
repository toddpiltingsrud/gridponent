﻿/***************\
  table helpers
\***************/

(function () {

    gp.helpers = {};

    var extend = function (name, func) {
        gp.helpers[name] = func;
    };

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

    extend('colgroup', function () {
        var self = this;
        var out = [];

        //var defaultWidth = (100.0 / this.Columns.length).toString() + '%';

        //out.push('<colgroup>');

        //this.Columns.forEach(function (col) {
        //    out.push('<col');
        //    if (col.Width || self.FixedHeaders) {
        //        out.push(' style="width:' + (col.Width || defaultWidth) + '"');
        //    }
        //    out.push('></col>');
        //});

        //out.push('</colgroup>');

        return out.join('');
    });

    extend('thead', function () {
        var self = this;
        var out = [];
        out.push('<thead>');
        out.push('<tr>');
        this.Columns.forEach(function (col) {
            var sort = gp.escapeHTML(col.Sort || col.Field);
            var type = (col.Type || '').toLowerCase();
            out.push('<th class="' + type + ' ' + sort + '">');
            if (gp.hasValue(col.Commands) === false && sort) {
                out.push('<label class="table-sort">')
                out.push('<input type="checkbox" name="OrderBy" value="' + sort + '" />')
                out.push(sort);
                out.push('</label>')
            }
            else {
                out.push(sort || '&nbsp;');
            }
            out.push('</th>');
        });
        out.push('</tr>');
        out.push('</thead>');
        return out.join('');
    });

    extend('template', function (name, arg) {
        var template = gp.templates[name];
        if (template) {
            return template(this, arg);
        }
    });

    extend('tableRows', function() {
        var self = this;
        var out = [];
        this.data.Data.forEach(function (row, index) {
            self.Row = row;
            out.push('    <tr data-index="');
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

        // check for a template
        if (this.Template) {
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
        var val = this.Row[col.Field];
        // render empty cell if this field doesn't exist in the data
        if (val === undefined) return '<td></td>';
        // render null as empty string
        if (val === null) val = '';

        out.push('<td class="body-cell ' + col.Type + '">');

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
            if (col.Type === 'date') {
                // use the required format for the date input element
                val = gp.formatDate(val, 'yyyy-MM-dd');
            }
            out.push('<input class="form-control" name="' + col.Field + '" type="');
            switch (col.Type) {
                case 'date':
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
        var defaultWidth = (100.0 / this.Columns.length).toString() + '%';
        var bodyCols = this.node.querySelectorAll('.table-body > table > tbody > tr:first-child > td');

        if (test && test.log) {
            test.log('columnWidthStyle: bodycols:');
            test.log(bodyCols);
        }

        // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
        this.Columns.forEach(function (col) {
            out.push('#' + self.ID + ' > .table-header > table > thead th:nth-child(' + (index + 1) + '),');
            out.push('#' + self.ID + ' > .table-footer > table > tfoot td:nth-child(' + (index + 1) + ')');
            if (col.Width || bodyCols.length === 0) {
                // fixed width should include the body
                out.push(',');
                out.push('#' + self.ID + ' > .table-body > table > thead th:nth-child(' + (index + 1) + '),');
                out.push('#' + self.ID + ' > .table-body > table > tbody td:nth-child(' + (index + 1) + ')');
                out.push('{ width:');
                out.push(col.Width || defaultWidth);
            }
            else if (bodyCols.length && (self.FixedHeaders || self.FixedFooters)) {
                // sync header and footer to body
                out.push('{ width:');
                out.push(bodyCols[i].offsetWidth);
                out.push('px');
            }
            else if (bodyCols.length === 0) {
                // table doesn't exist yet, render default width
                out.push('{ width:');
                out.push(defaultWidth);
            }
            out.push(';}');
            index++;
        });

        if (test && test.log) {
            test.log('columnWidthStyle: out:');
            test.log(out.join());
        }

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