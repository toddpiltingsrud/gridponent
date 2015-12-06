/***************\
 main component
\***************/
gp.Initializer = function (node) {
    this.initialize(node);
};

gp.Initializer.prototype = {

    initialize: function (node) {
        var self = this;
        this.config = this.getConfig(node);
        node.config = this.config;
        gp.info(this.config);

        if (this.config.Oncreated) {
            this.config.data = this.config.Oncreated();
            this.resolveTypes(this.config);
        }
        this.pager = this.getPager(this.config);
        this.resolveOnRowSelect(this.config);
        this.resolveFirstPage(this.config, this.pager, function (firstPage) {
            self.render(node);
        });
        this.beginMonitor(node);
        this.addCommandHandlers(node);
        if (this.config.FixedHeaders || this.config.FixedFooters) {
            var tries = 3;
            var nodes = document.querySelectorAll('#' + this.config.ID + ' .table-body > table > tbody > tr:first-child > td');

            var fn = function () {
                if (gp.hasPositiveWidth(nodes)) {
                    self.syncColumnWidths.call(self.config);
                }
                else if (--tries > 0) {
                    gp.warn('gp.Initializer.initialize: tries: ' + tries);
                    setTimeout(fn);
                }
            }

            fn();

            window.addEventListener('resize', function () {
                self.syncColumnWidths.call(self.config);
            });
        }
    },

    getConfig: function (node) {
        var self = this;
        var config = gp.getConfig(node);
        config.Columns = [];
        config.data = {};
        config.ID = gp.createUID();
        for (var i = 0; i < node.children.length; i++) {
            var col = node.children[i];
            var colConfig = gp.getConfig(col);
            config.Columns.push(colConfig);
            this.resolveCommands(colConfig);
            this.resolveTemplates(colConfig);
        }
        config.Footer = this.resolveFooter(config);
        gp.resolveObject(config, 'Oncreated');
        gp.resolveObject(config, 'SearchFilter');
        gp.info(config);
        return config;
    },

    resolveFooter: function (config) {
        for (var i = 0; i < config.Columns.length; i++) {
            if (config.Columns[i].FooterTemplate) return true;
        }
        return false;
    },

    resolveTemplates: function (column) {
        var props = ['HeaderTemplate', 'Template', 'EditTemplate', 'FooterTemplate'];
        props.forEach(function (prop) {
            column[prop] = gp.resolveTemplate(column[prop]);
        });
    },

    resolveCommands: function (col) {
        if (col.Commands) {
            col.Commands = col.Commands.split(',');
        }
    },

    resolveTypes: function (config) {
        config.Columns.forEach(function (col) {
            for (var i = 0; i < config.data.Data.length; i++) {
                if (config.data.Data[i][col.Field] !== null) {
                    col.Type = gp.getType(config.data.Data[i][col.Field]);
                    break;
                }
            }
        });
        gp.log(config.Columns);
    },

    getPager: function (config) {
        if (config.Paging) {
            if (gp.hasValue(config.Read)) {
                return new gp.ServerPager(config);
            }
            else {
                return new gp.ClientPager(config);
            }
        }
    },

    resolveFirstPage: function (config, pager, callback) {
        if (pager === undefined) {
            callback(config.data);
        }
        else {
            pager.get(config.data, callback);
        }
    },

    resolveOnRowSelect: function (config) {
        var trs, i = 0, model, type, url, rowSelector = 'div.table-body > table > tbody > tr';
        if (gp.hasValue(config.Onrowselect)) {
            gp.resolveObject(config, 'Onrowselect');
            type = typeof config.Onrowselect;
            if (type === 'string' && config.Onrowselect.indexOf('{{') !== -1) type = 'urlTemplate';
            // it's got to be either a function or a URL template
            if (type === 'function' || type === 'urlTemplate') {
                // add click handler
                gp.on(config.node, 'click', rowSelector, function (evt) {
                    // remove previously selected class
                    trs = config.node.querySelectorAll(rowSelector + '.selected');
                    for (i = 0; i < trs.length; i++) {
                        gp.removeClass(trs[i], 'selected');
                    }
                    // add selected class
                    gp.addClass(this, 'selected');
                    // get the model for this row
                    model = gp.getRowModel(config.data.Data, this);

                    // ensure row selection doesn't interfere with button clicks in the row
                    // by making sure the evt target was a cell
                    if (gp.in(evt.target, rowSelector + ' > td.body-cell', config.node)) {
                        if (type === 'function') {
                            config.Onrowselect.call(this, model);
                        }
                        else {
                            // it's a urlTemplate
                            url = gp.processRowTemplate(config.Onrowselect, model);
                            window.location = url;
                        }
                    }
                });
            }
        }
    },

    beginMonitor: function (node) {
        var self = this;
        // monitor changes to search, sort, and paging
        var monitor = new gp.ChangeMonitor(node, '.table-toolbar [name=Search], thead input, .table-pager input', this.config.data, function (evt) {
            self.update();
            // reset the radio inputs
            var radios = node.querySelectorAll('thead input[type=radio], .table-pager input[type=radio]');
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
                // let the monitor know that syncing has been handled
                return true;
            }
            return false;
        };
    },

    render: function (node) {
        try {
            node.innerHTML = gp.templates['gridponent'](this.config);
        }
        catch (ex) {
            console.log(ex.message);
            console.log(ex.stack);
        }
    },

    measureTables: function (node) {
        // for fixed headers, adjust the padding on the header to match the width of the main table
        var header = node.querySelector('.table-header');
        var footer = node.querySelector('.table-footer');
        if (header || footer) {
            var bodyWidth = node.querySelector('.table-body > table').offsetWidth;
            var headerWidth = (header || footer).querySelector('table').offsetWidth;
            var diff = (headerWidth - bodyWidth);
            if (diff !== 0) {
                var paddingRight = diff;
                gp.log('diff:' + diff + ', paddingRight:' + paddingRight);
                if (header) {
                    header.style.paddingRight = paddingRight.toString() + 'px';
                }
                if (footer) {
                    footer.style.paddingRight = paddingRight.toString() + 'px';
                }
            }
        }
    },

    syncColumnWidths: function () {
        var html = gp.helpers.columnWidthStyle.call(this);
        this.node.querySelector('style.column-width-style').innerHTML = html;
    },

    refresh: function (config) {
        var rowsTemplate = gp.helpers['tableRows'];
        var pagerTemplate = gp.templates['gridponent-pager'];
        var html = rowsTemplate.call(config);
        config.node.querySelector('.table-body > table > tbody').innerHTML = html;
        html = pagerTemplate(config);
        config.node.querySelector('.table-pager').innerHTML = html;
        html = gp.helpers['sortStyle'].call(config);
        config.node.querySelector('style.sort-style').innerHTML = html;
    },

    update: function () {
        var self = this;
        if (this.pager) {
            this.pager.get(this.config.data, function (model) {
                self.config.data = model;
                self.refresh(self.config);
            });
        }
    },

    addCommandHandlers: function (node) {
        var self = this;
        // listen for command button clicks
        gp.on(node, 'click', 'button[value]', function (evt) {
            // 'this' is the element that was clicked
            gp.info('addCommandHandlers:this:');
            gp.info(this);
            var command = this.attributes['value'].value.toLowerCase();
            var tr = gp.closest(this, 'tr[data-index]', node);
            var row = self.config.Row = gp.getRowModel(self.config.data.Data, tr);
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
    },

    editRow: function (row, tr) {
        try {
            gp.raiseCustomEvent(tr, 'beforeEdit', {
                model: row
            });
            gp.info('editRow:tr:');
            gp.info(tr);
            // put the row in edit mode
            var template = gp.templates['gridponent-edit-cells'];
            tr.innerHTML = template(this.config);
            tr['gp-change-monitor'] = new gp.ChangeMonitor(tr, '[name]', row, function () { });
            gp.raiseCustomEvent(tr, 'afterEdit', {
                model: row
            });
        }
        catch (ex) {
            console.log(ex.message);
            console.log(ex.stack);
        }
    },

    updateRow: function (row, tr) {
        try {
            // save the row and return it to read mode
            var self = this;
            var h = new gp.Http();
            var url = this.config.Update;
            var monitor;
            gp.raiseCustomEvent(tr, 'beforeUpdate', {
                model: row
            });
            gp.info('updateRow: row:');
            gp.info(row);
            h.post(url, row, function (response) {
                gp.info('updateRow: response:');
                gp.info(response);
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
                gp.raiseCustomEvent(tr, 'afterUpdate', {
                    model: response.Row
                });
            });
        }
        catch (ex) {
            console.log(ex.message);
            console.log(ex.stack);
        }
    },

    cancelEdit: function (row, tr) {
        try {
            var template = gp.templates['gridponent-cells'];
            var html = template(this.config);
            tr.innerHTML = html;
            gp.raiseCustomEvent(tr, 'cancelEdit', {
                model: row
            });
        }
        catch (ex) {
            console.log(ex.message);
            console.log(ex.stack);
        }
    },

    deleteRow: function (row, tr) {
        try {
            var confirmed = confirm('Are you sure you want to delete this item?');
            if (!confirmed) return;
            var self = this;
            var h = new gp.Http();
            var url = this.config.Destroy;
            gp.raiseCustomEvent(tr, 'beforeDelete', {
                model: row
            });
            h.post(url, row, function (response) {
                // remove the row from the model
                var index = self.config.data.Data.indexOf(row);
                if (index != -1) {
                    self.config.data.Data.splice(index, 1);
                    self.refresh(self.config);
                }
                gp.raiseCustomEvent(tr, 'afterDelete', {
                    model: row
                });
            });
        }
        catch (ex) {
            console.log(ex.message);
            console.log(ex.stack);
        }
    }

};