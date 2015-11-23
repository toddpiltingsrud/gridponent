/***************\
 main component
\***************/
if (document.registerElement) {
    gp.Table = Object.create(HTMLElement.prototype);

    gp.Table.createdCallback = function () {
        this.initialize(this);
    };

    document.registerElement('grid-ponent', {
        prototype: gp.Table
    });
}
else {
    var table = function (node) {
        this.initialize(node);
    };

    gp.Table = table.prototype = {};

    gp.ready(function () {
        var node, nodes = document.querySelectorAll('grid-ponent');
        for (var i = 0; i < nodes.length; i++) {
            node = nodes[i];
            new table(node);
        }
    });
}

gp.Table.initialize = function (node) {
    // if there's web component support, this and node will be the same object
    node = node || this;
    // if there's no web component support, Table functions as a wrapper around the node
    var self = this;
    this.config = gp.getConfig(node);
    this.config.Columns = [];
    this.config.data = {};
    this.config.ID = gp.createUID();
    for (var i = 0; i < node.children.length; i++) {
        var col = node.children[i];
        var colConfig = gp.getConfig(col);
        this.config.Columns.push(colConfig);
        this.resolveCommands(colConfig);
        this.resolveFooterTemplate(colConfig);
    }
    this.config.Footer = this.resolveFooter(this.config);
    this.resolveOnCreated();
    if (test && test.log) test.log(this.config);
    if (this.config.Oncreated) {
        this.config.data = this.config.Oncreated();
        this.resolveTypes(this.config);
    }
    this.pager = this.getPager(this.config);
    this.resolveFirstPage(this.config, this.pager, function (firstPage) {
        self.render(node);
    });
    this.beginMonitor(node);
    this.addCommandHandlers(node);
    if (this.config.FixedHeaders) {
        setTimeout(function () {
            self.syncColumnWidths.call(self.config);
        });
        window.addEventListener('resize', function () {
            self.syncColumnWidths.call(self.config);
        });
    }
};

gp.Table.resolveFooter = function (config) {
    for (var i = 0; i < config.Columns.length; i++) {
        if (config.Columns[i].FooterTemplate) return true;
    }
    return false;
};

gp.Table.resolveFooterTemplate = function (column) {
    if (column.FooterTemplate) {
        column.FooterTemplate = gp.resolveObjectPath(column.FooterTemplate);
    }
};

gp.Table.resolveOnCreated = function () {
    if (this.config.Oncreated) {
        this.config.Oncreated = gp.resolveObjectPath(this.config.Oncreated);
    }
};

gp.Table.resolveCommands = function (col) {
    if (col.Commands) {
        col.Commands = col.Commands.split(',');
    }
};

gp.Table.resolveTypes = function (config) {
    config.Columns.forEach(function (col) {
        for (var i = 0; i < config.data.Data.length; i++) {
            if (config.data.Data[i][col.Field] !== null) {
                col.Type = gp.getType(config.data.Data[i][col.Field]);
                break;
            }
        }
    });
    console.log(config.Columns);
};

gp.Table.getPager = function (config) {
    if (config.Paging) {
        if (gp.hasValue(config.Read)) {
            return new gp.ServerPager(config);
        }
        else {
            return new gp.ClientPager(config);
        }
    }
};

gp.Table.resolveFirstPage = function (config, pager, callback) {
    if (pager === undefined) {
        callback(config.data);
    }
    else {
        pager.get(config.data, callback);
    }
};

gp.Table.beginMonitor = function (node) {
    var self = this;
    // monitor changes to search, sort, and paging
    var monitor = new gp.ChangeMonitor(node, '.table-toolbar [name=Search], thead input, .table-pager input', this.config.data, function (evt) {
        self.update();
        // reset the radio inputs
        var radios = self.querySelectorAll('thead input[type=radio], .table-pager input[type=radio]');
        for (var i = 0; i < radios.length; i++) {
            radios[i].checked = false;
        }
    });
    monitor.beforeSync = function (name, value, model) {
        // the OrderBy property requires special handling
        if (name === 'OrderBy') {
            if (model[name] === value) {
                model.Desc = !model.Desc;
            }
            else {
                model[name] = value;
                model.Desc = false;
            }
            return true;
        }
        return false;
    };
};

gp.Table.render = function (node) {
    try {
        node.innerHTML = gp.templates['gridponent'](this.config);
    }
    catch (ex) {
        console.log(ex.message);
        console.log(ex.stack);
    }
};

gp.Table.measureTables = function (node) {
    // for fixed headers, adjust the padding on the header to match the width of the main table
    var header = node.querySelector('.table-header');
    var footer = node.querySelector('.table-footer');
    if (header || footer) {
        var bodyWidth = node.querySelector('.table-body > table').offsetWidth;
        var headerWidth = (header || footer).querySelector('table').offsetWidth;
        var diff = (headerWidth - bodyWidth);
        if (diff !== 0) {
            var paddingRight = diff;
            console.log('diff:' + diff + ', paddingRight:' + paddingRight);
            if (header) {
                header.style.paddingRight = paddingRight.toString() + 'px';
            }
            if (footer) {
                footer.style.paddingRight = paddingRight.toString() + 'px';
            }
        }
    }
};

gp.Table.syncColumnWidths = function () {
    var html = gp.helpers.columnWidthStyle.call(this);
    this.node.querySelector('style.column-width-style').innerHTML = html;
};

gp.Table.refresh = function (config) {
    var rowsTemplate = gp.helpers['tableRows'];
    var pagerTemplate = gp.templates['gridponent-pager'];
    var html = rowsTemplate.call(config);
    this.querySelector('.table-body > table > tbody').innerHTML = html;
    html = pagerTemplate(config);
    this.querySelector('.table-pager').innerHTML = html;
    html = gp.helpers['sortStyle'].call(config);
    this.querySelector('style.sort-style').innerHTML = html;
};

gp.Table.update = function () {
    var self = this;
    if (this.pager) {
        this.pager.get(this.config.data, function (model) {
            self.config.data = model;
            self.refresh(self.config);
        });
    }
};

gp.Table.addCommandHandlers = function (node) {
    var self = this;
    // listen for command button clicks
    gp.on(node, 'click', 'button[value]', function (evt) {
        // 'this' is the element that was clicked
        var command = this.attributes['value'].value.toLowerCase();
        var tr = gp.closest(this, 'tr[data-index]');
        var index = parseInt(tr.attributes['data-index'].value);
        var row = self.config.Row = self.config.data.Data[index];
        switch (command) {
            case 'edit':
                self.editRow(row, tr);
                break;
            case 'delete':
                self.deleteRow(row, tr);
                break;
            case 'update':
                self.updateRow(row, tr);
                break;
            case 'cancel':
                self.cancelEdit(row, tr);
                break;
            default:
                console.log('Unrecognized command: ' + command);
                break;
        }
    });
};

gp.Table.editRow = function (row, tr) {
    try {
        var template = gp.templates['gridponent-edit-cells'];
        var html = template(this.config);
        tr.innerHTML = html;
        tr['gp-change-monitor'] = new gp.ChangeMonitor(tr, '[name]', row, function () { });
    }
    catch (ex) {
        console.log(ex.message);
        console.log(ex.stack);
    }
};

gp.Table.updateRow = function (row, tr) {
    try {
        var self = this;
        var h = new gp.Http();
        var url = this.config.Update;
        if (test && test.log) {
            test.log('updateRow: row:');
            test.log(row);
        }
        var monitor;
        h.post(url, row, function (response) {
            if (test && test.log) {
                test.log('updateRow: response:');
                test.log(response);
            }
            if (response.ValidationErrors && response.ValidationErrors.length) {
                // TODO: handle validation errors
            }
            else {
                // put the cells back
                self.config.Row = response.Row;
                var template = gp.templates['gridponent-cells'];
                var html = template(self.config);
                tr.innerHTML = html;
                // dispose of the ChangeMonitor
                monitor = tr['gp-change-monitor'];
                if (monitor) {
                    monitor.stop();
                    monitor = null;
                }
            }
        });
    }
    catch (ex) {
        console.log(ex.message);
        console.log(ex.stack);
    }
};

gp.Table.cancelEdit = function (row, tr) {
    try {
        var template = gp.templates['gridponent-cells'];
        var html = template(this.config);
        tr.innerHTML = html;
    }
    catch (ex) {
        console.log(ex.message);
        console.log(ex.stack);
    }
};

gp.Table.deleteRow = function (row, tr) {
    try {
        var confirmed = confirm('Are you sure you want to delete this item?');
        if (!confirmed) return;
        var self = this;
        var h = new gp.Http();
        var url = this.config.Destroy;
        h.post(url, row, function (response) {
            // remove the row from the model
            var index = self.config.data.Data.indexOf(row);
            if (index != -1) {
                self.config.data.Data.splice(index, 1);
                self.refresh(self.config);
            }
        });
    }
    catch (ex) {
        console.log(ex.message);
        console.log(ex.stack);
    }
};