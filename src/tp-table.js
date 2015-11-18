/***************\
    tp-table
\***************/

tp.Table = Object.create(tp.ComponentBase);

tp.Table.initialize = function () {
    var self = this;
    tp.ComponentBase.initialize.call(this);
    this.config.Columns = [];
    this.config.data = {};
    this.config.ID = tp.createUID();
    for (var i = 0; i < this.children.length; i++) {
        var col = this.children[i];
        var colConfig = tp.getConfig(col);
        this.config.Columns.push(colConfig);
        this.resolveCommands(colConfig);
        this.resolveFooterTemplate(colConfig);
    }
    this.config.Footer = this.resolveFooter(this.config);
    this.resolveOnCreated();
    console.log(this.config);
    if (this.config.Oncreated) {
        this.config.data = this.config.Oncreated();
        this.resolveTypes(this.config);
    }
    this.pager = this.getPager(this.config);
    this.resolveFirstPage(this.config, this.pager, function (firstPage) {
        self.render(self.config);
    });
    this.beginMonitor();
    this.addCommandHandlers();
    if (this.config.FixedHeaders) {
        setTimeout(function () {
            //self.measureTables(self);
            self.syncColumnWidths(self);
        });
        window.addEventListener('resize', function () {
            self.syncColumnWidths(self);
        });
    }
};

tp.Table.resolveFooter = function (config) {
    for (var i = 0; i < config.Columns.length; i++) {
        if (config.Columns[i].FooterTemplate) return true;
    }
    return false;
};

tp.Table.resolveFooterTemplate = function (column) {
    if (column.FooterTemplate) {
        column.FooterTemplate = tp.resolveObjectPath(column.FooterTemplate);
    }
};

tp.Table.resolveOnCreated = function () {
    if (this.config.Oncreated) {
        this.config.Oncreated = tp.resolveObjectPath(this.config.Oncreated);
    }
};

tp.Table.resolveCommands = function (col) {
    if (col.Commands) {
        col.Commands = col.Commands.split(',');
    }
};

tp.Table.resolveTypes = function (config) {
    config.Columns.forEach(function (col) {
        for (var i = 0; i < config.data.Data.length; i++) {
            if (config.data.Data[i][col.Field] !== null) {
                col.Type = tp.getType(config.data.Data[i][col.Field]);
                break;
            }
        }
    });
    console.log(config.Columns);
};

tp.Table.getPager = function (config) {
    if (config.Paging) {
        if (tp.hasValue(config.Read)) {
            return new tp.ServerPager(config);
        }
        else {
            return new tp.ClientPager(config);
        }
    }
};

tp.Table.resolveFirstPage = function (config, pager, callback) {
    if (pager === undefined) {
        callback(config.data);
    }
    else {
        pager.get(config.data, callback);
    }
};

tp.Table.beginMonitor = function () {
    var self = this;
    // monitor changes to search, sort, and paging
    var monitor = new tp.ChangeMonitor(this, '.table-toolbar [name=Search], thead input, .table-pager input', this.config.data, function (evt) {
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

tp.Table.render = function (model) {
    try {
        this.innerHTML = tp.templates['tp-table'](model);
    }
    catch (ex) {
        console.log(ex.message);
        console.log(ex.stack);
    }
};

tp.Table.measureTables = function (element) {
    // for fixed headers, adjust the padding on the header to match the width of the main table
    var header = element.querySelector('.table-header');
    var bodyWidth = element.querySelector('.table-body > table').offsetWidth;
    var headerWidth = header.querySelector('table').offsetWidth;
    var diff = (headerWidth - bodyWidth);
    if (diff !== 0) {
        var paddingRight = diff;
        console.log('diff:' + diff + ', paddingRight:' + paddingRight);
        header.style.paddingRight = paddingRight.toString() + 'px';
    }
};

tp.Table.syncColumnWidths = function (element) {
    // for fixed headers, adjust the padding on the header to match the width of the main table
    var bodyCols = element.querySelectorAll('.table-body > table > tbody > tr:first-child > td');
    var width;
    var out = []
    for (var i = 0; i < bodyCols.length; i++) {
        width = bodyCols[i].offsetWidth;
        out.push('<col style="width:' + width + 'px;"></col>');
    }
    element.querySelector('.table-header colgroup').innerHTML = out.join('');
};

tp.Table.refresh = function (config) {
    var rowsTemplate = tp.helpers['tableRows'];
    var pagerTemplate = tp.templates['tp-table-pager'];
    var html = rowsTemplate.call(config);
    this.querySelector('.table-body > table > tbody').innerHTML = html;
    html = pagerTemplate(config);
    this.querySelector('.table-pager').innerHTML = html;
    html = tp.helpers['sortStyle'].call(config);
    this.querySelector('style').innerHTML = html;
};

tp.Table.update = function () {
    var self = this;
    if (this.pager) {
        this.pager.get(this.config.data, function (model) {
            self.config.data = model;
            self.refresh(self.config);
        });
    }
};

tp.Table.addCommandHandlers = function () {
    var self = this;
    // listen for command button clicks
    tp.on(this, 'click', 'button[value]', function (evt) {
        var command = this.attributes['value'].value.toLowerCase();
        var tr = tp.closest(this, 'tr[data-index]');
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

tp.Table.editRow = function (row, tr) {
    try {
        var template = tp.templates['tp-table-edit-cells'];
        var html = template(this.config);
        tr.innerHTML = html;
        tr['tp-change-monitor'] = new tp.ChangeMonitor(tr, '[name]', row, function () { });
    }
    catch (ex) {
        console.log(ex.message);
        console.log(ex.stack);
    }
};

tp.Table.updateRow = function (row, tr) {
    try {
        var self = this;
        var h = new tp.Http();
        var url = this.config.Update;
        var monitor;
        h.post(url, row, function (response) {
            // put the cells back
            var template = tp.templates['tp-table-cells'];
            var html = template(self.config);
            tr.innerHTML = html;
            // dispose of the ChangeMonitor
            monitor = tr['tp-change-monitor'];
            if (monitor) {
                monitor.stop();
                monitor = null;
            }
        });
    }
    catch (ex) {
        console.log(ex.message);
        console.log(ex.stack);
    }
};

tp.Table.cancelEdit = function (row, tr) {
    try {
        var template = tp.templates['tp-table-cells'];
        var html = template(this.config);
        tr.innerHTML = html;
    }
    catch (ex) {
        console.log(ex.message);
        console.log(ex.stack);
    }
};

tp.Table.deleteRow = function (row, tr) {
    try {
        var confirmed = confirm('Are you sure you want to delete this item?');
        if (!confirmed) return;
        var self = this;
        var h = new tp.Http();
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

document.registerElement('tp-table', {
    prototype: tp.Table
});
