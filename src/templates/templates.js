/***************\
    templates
\***************/
gp.templates = gp.templates || {};
gp.templates['bootstrap-modal'] = function(model, arg) {
    var out = [];
    out.push('<div class="modal fade" tabindex="-1" role="dialog">');
    out.push('<div class="modal-dialog" role="document">');
    out.push('<div class="modal-content">');
    out.push('<div class="modal-header">');
    out.push('<button type="button" class="close" aria-label="Close" value="cancel"><span aria-hidden="true">&times;</span></button>');
    out.push('                <h4 class="modal-title">');
    out.push(model.title);
    out.push('</h4>');
    out.push('</div>');
    out.push('<div class="modal-body">');
                        out.push(model.body);
        out.push('</div>');
    out.push('<div class="modal-footer">');
                        if (model.footer) {
                                out.push(model.footer);
                            } else {
        out.push('<div class="btn-group">');
    out.push('<button type="button" class="btn btn-default" value="cancel">');
    out.push('<span class="glyphicon glyphicon-remove"></span>Close');
    out.push('</button>');
    out.push('<button type="button" class="btn btn-primary" value="save">');
    out.push('<span class="glyphicon glyphicon-save"></span>Save changes');
    out.push('</button>');
    out.push('</div>');
                        }
        out.push('</div>');
    out.push('</div>');
    out.push('<div class="gp-progress-overlay">');
    out.push('<div class="gp-progress gp-progress-container">');
    out.push('<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>');
    out.push('</div>');
    out.push('</div>');
    out.push('</div>');
    out.push('</div>');
    return out.join('');
};
gp.templates['button'] = function(model, arg) {
    var out = [];
    out.push('<button type="button" class="btn ');
    out.push(model.btnClass);
    out.push(' btn-xs" value="');
    out.push(model.value);
    out.push('">');
    out.push('    <span class="glyphicon ');
    out.push(model.glyphicon);
    out.push('"></span>');
    out.push(model.text);
        out.push('</button>');
    return out.join('');
};
gp.templates['form-group'] = function(model, arg) {
    var out = [];
    out.push('<div class="form-group">');
    out.push('    <label class="col-sm-4 control-label">');
    out.push(model.label);
    out.push('</label>');
    out.push('    <div class="col-sm-8">');
    out.push(model.input);
    out.push('</div>');
    out.push('</div>');
    return out.join('');
};
gp.templates['gridponent-body'] = function(model, arg) {
    var out = [];
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
            if (!model.fixedheaders) {
                    out.push(gp.helpers['thead'].call(model));
                }
        out.push('<tbody>');
                out.push(gp.helpers['tableRows'].call(model));
        out.push('</tbody>');
            if (model.footer && !model.fixedfooters) {
                    out.push(gp.templates['gridponent-tfoot'](model));
                }
        out.push('</table>');
    return out.join('');
};
gp.templates['gridponent-cells'] = function(model, arg) {
    var out = [];
    model.columns.forEach(function(col, index) {
            out.push('    <td class="body-cell ');
    out.push(col.bodyclass);
    out.push('">');
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
        out.push('<input type="radio" name="page" value="1" />');
                    }
        out.push('</label>');
        out.push('        <label class="ms-page-index btn btn-default ');
    if (model.pageModel.IsFirstPage) {
    out.push(' disabled ');
    }
    out.push('" title="Previous page">');
    out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
                    if (model.pageModel.IsFirstPage == false) {
        out.push('                <input type="radio" name="page" value="');
    out.push(model.pageModel.PreviousPage);
    out.push('" />');
                    }
        out.push('</label>');
    out.push('</div>');
    out.push('    <input type="number" name="page" value="');
    out.push(model.pageModel.page);
    out.push('" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" />');
    out.push('<span class="page-count">');
    out.push('        of ');
    out.push(model.pageModel.pagecount);
        out.push('</span>');
    out.push('<div class="btn-group">');
    out.push('        <label class="ms-page-index btn btn-default ');
    if (model.pageModel.IsLastPage) {
    out.push(' disabled ');
    }
    out.push('" title="Next page">');
    out.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>');
                    if (model.pageModel.IsLastPage == false) {
        out.push('            <input type="radio" name="page" value="');
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
        out.push('            <input type="radio" name="page" value="');
    out.push(model.pageModel.pagecount);
    out.push('" />');
                    }
        out.push('</label>');
    out.push('</div>');
    }
            return out.join('');
};
gp.templates['gridponent-table-footer'] = function(model, arg) {
    var out = [];
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
            out.push(gp.templates['gridponent-tfoot'](model));
        out.push('</table>');
    return out.join('');
};
gp.templates['gridponent-tfoot'] = function(model, arg) {
    var out = [];
    out.push('<tfoot>');
    out.push('<tr>');
                model.columns.forEach(function(col, index) {
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
    out.push('<div class="gp table-container');
    out.push(gp.helpers['containerClasses'].call(model));
    out.push('" id="');
    out.push(model.ID);
    out.push('">');
            if (model.search || model.create || model.toolbartemplate) {
        out.push('<div class="table-toolbar">');
                    if (model.toolbartemplate) {
                            out.push(gp.helpers['toolbartemplate'].call(model));
                        } else {
                            if (model.search) {
        out.push('<div class="input-group gridponent-searchbox">');
    out.push('<input type="text" name="search" class="form-control" placeholder="Search...">');
    out.push('<span class="input-group-btn">');
    out.push('<button class="btn btn-default" type="button">');
    out.push('<span class="glyphicon glyphicon-search"></span>');
    out.push('</button>');
    out.push('</span>');
    out.push('</div>');
                        }
                            if (model.create) {
        out.push('<button class="btn btn-default" type="button" value="AddRow">');
    out.push('<span class="glyphicon glyphicon-plus"></span>Add');
    out.push('</button>');
                        }
                        }
        out.push('</div>');
            }
                if (model.fixedheaders) {
        out.push('<div class="table-header">');
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
                        out.push(gp.helpers['thead'].call(model));
        out.push('</table>');
    out.push('</div>');
            }
        out.push('    <div class="table-body ');
    if (model.fixedheaders) {
    out.push('table-scroll');
    }
    out.push('" style="');
    out.push(model.style);
    out.push('">');
    out.push('<table class="table" cellpadding="0" cellspacing="0">');
                    if (!model.fixedheaders) {
                            out.push(gp.helpers['thead'].call(model));
                        }
        out.push('</table>');
    out.push('</div>');
            if (model.fixedfooters) {
        out.push('<div class="table-footer">');
                    out.push(gp.templates['gridponent-table-footer'](model));
        out.push('</div>');
            }
                if (model.pager) {
        out.push('<div class="table-pager"></div>');
            }
        out.push('<style type="text/css" class="sort-style">');
                out.push(gp.helpers['sortStyle'].call(model));
        out.push('</style>');
    out.push('<style type="text/css" class="column-width-style">');
                out.push(gp.helpers['columnWidthStyle'].call(model));
        out.push('</style>');
    out.push('<div class="gp-progress-overlay">');
    out.push('<div class="gp-progress gp-progress-container">');
    out.push('<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>');
    out.push('</div>');
    out.push('</div>');
    out.push('</div>');
    return out.join('');
};
