/***************\
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

        var defaultWidth = (100.0 / this.Columns.length).toString() + '%';

        out.push('<colgroup>');

        this.Columns.forEach(function (col) {
            out.push('<col');
            if (col.Width || self.FixedHeaders) {
                out.push(' style="width:' + (col.Width || defaultWidth) + '"');
            }
            out.push('></col>');
        });

        out.push('</colgroup>');

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
        this.data.PreviousPage = this.data.Page - 1;
        this.data.NextPage = this.data.Page + 1;
    });

    extend('sortStyle', function () {
        var out = [];
        console.log(this);
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

})();