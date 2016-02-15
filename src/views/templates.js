/***************\
    templates
\***************/
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
            out.push('    <td class="body-cell ');
    out.push(col.Type);
    out.push('" ');
    if (col.BodyStyle) {
    out.push(' style="');
    out.push(col.BodyStyle);
    out.push('"');
    }
    out.push('>');
                out.push(gp.helpers['bodyCellContent'].call(model, col));
        out.push('</td>');
    });
            return out.join('');
};
gp.templates['gridponent-pager'] = function(model, arg) {
    var out = [];
    out.push(gp.helpers['setPagerFlags'].call(model));
            if (model.pageModel.HasPages) {
            out.push('<div class="btn-group">');
    out.push('        <label class="ms-page-index btn btn-default ');
    if (model.pageModel.IsFirstPage) {
    out.push(' disabled ');
    }
    out.push('" title="First page">');
    out.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>');
                    if (model.pageModel.IsFirstPage == false) {
        out.push('<input type="radio" name="Page" value="1" />');
                    }
        out.push('</label>');
        out.push('        <label class="ms-page-index btn btn-default ');
    if (model.pageModel.IsFirstPage) {
    out.push(' disabled ');
    }
    out.push('" title="Previous page">');
    out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
                    if (model.pageModel.IsFirstPage == false) {
        out.push('                <input type="radio" name="Page" value="');
    out.push(model.pageModel.PreviousPage);
    out.push('" />');
                    }
        out.push('</label>');
    out.push('</div>');
    out.push('    <input type="number" name="Page" value="');
    out.push(model.pageModel.Page);
    out.push('" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" /> of ');
    out.push(model.pageModel.PageCount);
        out.push('<div class="btn-group">');
    out.push('        <label class="ms-page-index btn btn-default ');
    if (model.pageModel.IsLastPage) {
    out.push(' disabled ');
    }
    out.push('" title="Next page">');
    out.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>');
                    if (model.pageModel.IsLastPage == false) {
        out.push('            <input type="radio" name="Page" value="');
    out.push(model.pageModel.NextPage);
    out.push('" />');
                    }
        out.push('</label>');
        out.push('        <label class="ms-page-index btn btn-default ');
    if (model.pageModel.IsLastPage) {
    out.push(' disabled ');
    }
    out.push('" title="Last page">');
    out.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>');
                    if (model.pageModel.IsLastPage == false) {
        out.push('            <input type="radio" name="Page" value="');
    out.push(model.pageModel.PageCount);
    out.push('" />');
                    }
        out.push('</label>');
    out.push('</div>');
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
            if (model.Search || model.Create) {
        out.push('<div class="table-toolbar">');
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
                        if (model.Create) {
        out.push('<button class="btn btn-default" type="button" value="Create">');
    out.push('<span class="glyphicon glyphicon-plus"></span>Add');
    out.push('</button>');
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
                if (model.Pager) {
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
    out.push('<div class="progress-overlay">');
    out.push('<div class="progress progress-container">');
    out.push('<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>');
    out.push('</div>');
    out.push('</div>');
    out.push('</div>');
    return out.join('');
};
