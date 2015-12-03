gp.templates = gp.templates || {};
gp.templates['gridponent-body'] = function(model, arg) {
    var out = [];
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
            if (!model.FixedHeaders) {
                    out.push(gp.helpers['thead'].call(model));
                }
        out.push('<tbody>');
                out.push(gp.helpers['tableRows'].call(model));
        out.push('</tbody>');
            if (model.Footer && !model.FixedFooters) {
                    out.push(gp.templates['gridponent-tfoot'](model));
                }
        out.push('</table>');
    return out.join('');
};
gp.templates['gridponent-cells'] = function(model, arg) {
    var out = [];
    model.Columns.forEach(function(col, index) {
                    if (col.Commands) {
                    out.push(gp.templates['gridponent-commands'](model, col));
                } else {
                    out.push(gp.helpers['bodyCell'].call(model, col));
                }
        });
            return out.join('');
};
gp.templates['gridponent-commands'] = function(model, arg) {
    var out = [];
    out.push('<td class="body-cell commands-cell">');
    out.push('<div class="btn-group" role="group">');
                arg.Commands.forEach(function(cmd, index) {
                        if (cmd == 'Edit') {
        out.push('                <button type="button" class="btn btn-primary btn-xs" value="');
    out.push(cmd);
    out.push('">');
    out.push('                    <span class="glyphicon glyphicon-edit"></span>');
    out.push(cmd);
        out.push('</button>');
                    }
                        if (cmd == 'Delete') {
        out.push('                <button type="button" class="btn btn-danger btn-xs" value="');
    out.push(cmd);
    out.push('">');
    out.push('                    <span class="glyphicon glyphicon-remove"></span>');
    out.push(cmd);
        out.push('</button>');
                    }
                    });
        out.push('</div>');
    out.push('</td>');
    return out.join('');
};
gp.templates['gridponent-edit-cells'] = function(model, arg) {
    var out = [];
    model.Columns.forEach(function(col, index) {
                    if (col.Commands) {
        out.push('<td class="body-cell commands-cell">');
    out.push('<div class="btn-group" role="group">');
    out.push('<button type="button" class="btn btn-primary btn-xs" value="Update">');
    out.push('<span class="glyphicon glyphicon-save"></span>Save');
    out.push('</button>');
    out.push('<button type="button" class="btn btn-default btn-xs" value="Cancel">');
    out.push('<span class="glyphicon glyphicon-remove"></span>Cancel');
    out.push('</button>');
    out.push('</div>');
    out.push('</td>');
            } else {
                    if (col.Readonly) {
                        out.push(gp.helpers['bodyCell'].call(model, col));
                    } else {
                        out.push(gp.helpers['editCell'].call(model, col));
                    }
                }
        });
            return out.join('');
};
gp.templates['gridponent-pager'] = function(model, arg) {
    var out = [];
    out.push(gp.helpers['setPagerFlags'].call(model));
            if (model.data.HasPages) {
            out.push('    <label class="ms-page-index btn btn-default ');
    if (model.data.IsFirstPage) {
    out.push(' disabled ');
    }
    out.push('" title="First page">');
    out.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>');
                if (model.data.IsFirstPage == false) {
        out.push('<input type="radio" name="Page" value="1" />');
                }
        out.push('</label>');
        out.push('    <label class="ms-page-index btn btn-default ');
    if (model.data.IsFirstPage) {
    out.push(' disabled ');
    }
    out.push('" title="Previous page">');
    out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
                if (model.data.IsFirstPage == false) {
        out.push('            <input type="radio" name="Page" value="');
    out.push(model.data.PreviousPage);
    out.push('" />');
                }
        out.push('</label>');
        out.push('    <input type="number" name="Page" value="');
    out.push(model.data.Page);
    out.push('" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" /> of ');
    out.push(model.data.PageCount);
            out.push('    <label class="ms-page-index btn btn-default ');
    if (model.data.IsLastPage) {
    out.push(' disabled ');
    }
    out.push('" title="Next page">');
    out.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>');
                if (model.data.IsLastPage == false) {
        out.push('            <input type="radio" name="Page" value="');
    out.push(model.data.NextPage);
    out.push('" />');
                }
        out.push('</label>');
        out.push('    <label class="ms-page-index btn btn-default ');
    if (model.data.IsLastPage) {
    out.push(' disabled ');
    }
    out.push('" title="Last page">');
    out.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>');
                if (model.data.IsLastPage == false) {
        out.push('            <input type="radio" name="Page" value="');
    out.push(model.data.PageCount);
    out.push('" />');
                }
        out.push('</label>');
    }
            return out.join('');
};
gp.templates['gridponent-tfoot'] = function(model, arg) {
    var out = [];
    out.push('<tfoot>');
    out.push('<tr>');
                model.Columns.forEach(function(col, index) {
        out.push('<td class="footer-cell">');
                    out.push(gp.helpers['footerCell'].call(model, col));
        out.push('</td>');
                });
        out.push('</tr>');
    out.push('</tfoot>');
    return out.join('');
};
gp.templates['gridponent'] = function(model, arg) {
    var out = [];
    out.push('<div class="table-container');
    out.push(gp.helpers['containerClasses'].call(model));
    out.push('" id="');
    out.push(model.ID);
    out.push('">');
            if (model.Search || model.ToolbarTemplate) {
        out.push('<div class="table-toolbar">');
                    if (model.ToolbarTemplate) {
                            out.push(gp.templates['toolbarTemplate'](model));
                        } else {
                            if (model.Search) {
        out.push('<div class="input-group gridponent-searchbox">');
    out.push('<input type="text" name="Search" class="form-control" placeholder="Search...">');
    out.push('<span class="input-group-btn">');
    out.push('<button class="btn btn-default" type="button">');
    out.push('<span class="glyphicon glyphicon-search"></span>');
    out.push('</button>');
    out.push('</span>');
    out.push('</div>');
                        }
                        }
        out.push('</div>');
            }
                if (model.FixedHeaders) {
        out.push('<div class="table-header">');
    out.push('<table class="table" cellpadding="0" cellspacing="0" style="margin-bottom:0">');
                        out.push(gp.helpers['thead'].call(model));
        out.push('</table>');
    out.push('</div>');
            }
        out.push('        <div class="table-body ');
    if (model.FixedHeaders) {
    out.push('table-scroll');
    }
    out.push('" style="');
    out.push(model.Style);
    out.push('">');
                    out.push(gp.templates['gridponent-body'](model));
        out.push('</div>');
            if (model.FixedFooters) {
        out.push('<div class="table-footer">');
    out.push('<table class="table" cellpadding="0" cellspacing="0" style="margin-top:0">');
                        out.push(gp.templates['gridponent-tfoot'](model));
        out.push('</table>');
    out.push('</div>');
            }
                if (model.Paging) {
        out.push('<div class="table-pager">');
                    out.push(gp.templates['gridponent-pager'](model));
        out.push('</div>');
            }
        out.push('<style type="text/css" class="sort-style">');
                out.push(gp.helpers['sortStyle'].call(model));
        out.push('</style>');
    out.push('<style type="text/css" class="column-width-style">');
                out.push(gp.helpers['columnWidthStyle'].call(model));
        out.push('</style>');
    out.push('</div>');
    return out.join('');
};
