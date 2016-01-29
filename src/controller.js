/***************\
   controller
\***************/
gp.Controller = function (config) {
    var self = this;
    this.config = config;
    this.model = new gp.Model(config);
    this.requestModel = new gp.RequestModel();
    if (config.Paging) {
        this.requestModel.Top = 25;
    }
    this.model.read(this.requestModel, function (data) {
        self.config.data = data;
        self.resolveTypes(config);
        self.render(config);
        self.beginMonitor(config.node);
        self.addCommandHandlers(config.node);
        self.handleRowSelect(config);
    });
};

gp.Controller.prototype = {

    resolveTypes: function (config) {
        config.Columns.forEach(function (col) {
            for (var i = 0; i < config.data.Data.length; i++) {
                if (config.data.Data[i][col.Field] !== null) {
                    col.Type = gp.getType(config.data.Data[i][col.Field]);
                    break;
                }
            }
        });
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

    render: function (config) {
        var self = this;
        try {
            var node = config.node;

            node.innerHTML = gp.templates['gridponent'](config);

            // sync column widths
            if (config.FixedHeaders || config.FixedFooters) {
                var nodes = node.querySelectorAll('.table-body > table > tbody > tr:first-child > td');

                if (gp.hasPositiveWidth(nodes)) {
                    // call syncColumnWidths twice because the first call causes things to shift around a bit
                    self.syncColumnWidths.call(config)
                    self.syncColumnWidths.call(config)
                }
                else {
                    new gp.polar(function () {
                        return gp.hasPositiveWidth(nodes);
                    }, function () {
                        self.syncColumnWidths.call(config)
                        self.syncColumnWidths.call(config)
                    });
                }

                window.addEventListener('resize', function () {
                    self.syncColumnWidths.call(config);
                });
            }
        }
        catch (ex) {
            gp.error( ex );
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
        var rowsTemplate = gp.templates['gridponent-body'];
        var pagerTemplate = gp.templates['gridponent-pager'];
        var html = rowsTemplate(config);
        config.node.querySelector('.table-body').innerHTML = html;
        html = pagerTemplate(config);
        var pager = config.node.querySelector( '.table-pager' );
        if ( pager ) pager.innerHTML = html;
        html = gp.helpers['sortStyle'].call( config );
        config.node.querySelector('style.sort-style').innerHTML = html;
    },

    restoreCells: function (config, row, tr) {
        var col,
            i = 0;
        helper = gp.helpers['bodyCellContent'],
        cells = tr.querySelectorAll('td.body-cell');
        for (; i < cells.length; i++) {
            col = config.Columns[i];
            cells[i].innerHTML = helper.call(this.config, col);
        }
        gp.removeClass(tr, 'edit-mode');
    },

    update: function () {
        var self = this;
        gp.info( 'update: data:', this.config.data );

        this.model.read( this.config.data, function ( model ) {
            gp.shallowCopy( model, self.config.data );
            self.refresh(self.config);
        });
    },

    addCommandHandlers: function (node) {
        var command, tr, row, self = this;
        // listen for command button clicks
        gp.on(node, 'click', 'button[value]', function (evt) {
            // 'this' is the element that was clicked
            gp.info('addCommandHandlers:this:');
            gp.info(this);
            command = this.attributes['value'].value.toLowerCase();
            tr = gp.closest(this, 'tr[data-index]', node);
            row = tr ? gp.getRowModel(self.config.data.Data, tr) : null;
            switch (command) {
                case 'create':
                    self.createRow.call(self);
                    break;
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
                    gp.log('Unrecognized command: ' + command);
                    break;
            }
        });
    },

    createRow: function () {
        try {
            var self = this;
            gp.raiseCustomEvent(this.config.node, 'beforeCreate');

            this.model.create(function (row) {
                // create a row in create mode
                self.config.Row = row;
                var tbody = self.config.node.querySelector('div.table-body > table > tbody');
                var tr = gp.templates['gridponent-new-row'](self.config);
                gp.prependChild(tbody, tr);
                tr['gp-change-monitor'] = new gp.ChangeMonitor(tr, '[name]', row, function () { });
                gp.raiseCustomEvent(tr, 'afterCreate', {
                    model: row
                });
            });
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    editRow: function (row, tr) {
        try {
            gp.raiseCustomEvent(tr, 'beforeEdit', {
                model: row
            });
            gp.info('editRow:tr:');
            gp.info(tr);

            this.config.Row = new gp.ObjectProxy(row);

            // put the row in edit mode
            // IE9 can't set innerHTML of tr, so iterate through each cell
            // besides, that way we can just skip readonly cells
            var editCellContent = gp.helpers['editCellContent'];
            var col, cells = tr.querySelectorAll('td.body-cell');
            for (var i = 0; i < cells.length; i++) {
                col = this.config.Columns[i];
                if (!col.Readonly) {
                    cells[i].innerHTML = editCellContent.call(this.config, col);
                }
            }
            gp.addClass(tr, 'edit-mode');
            tr['gp-change-monitor'] = new gp.ChangeMonitor(tr, '[name]', this.config.Row, function () { });
            gp.raiseCustomEvent(tr, 'afterEdit', {
                model: this.config.Row
            });
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    updateRow: function (row, tr) {
        try {
            // save the row and return it to read mode
            var self = this;
            var h = new gp.Http();
            var url = this.config.Update;
            var monitor;
            var rowProxy = this.config.Row;
            gp.raiseCustomEvent(tr, 'beforeUpdate', {
                model: row
            });
            gp.info('updateRow: row:');
            gp.info(row);
            h.post(url, rowProxy, function (response) {
                gp.info('updateRow: response:');
                gp.info(response);
                if (response.ValidationErrors && response.ValidationErrors.length) {
                    // TODO: handle validation errors

                }
                else {
                    gp.shallowCopy(response.Data, row);
                    self.restoreCells(self.config, row, tr);
                    // dispose of the ChangeMonitor
                    monitor = tr['gp-change-monitor'];
                    if (monitor) {
                        monitor.stop();
                        monitor = null;
                    }
                    // dispose of the ObjectProxy
                    delete self.config.Row;
                }
                gp.raiseCustomEvent(tr, 'afterUpdate', {
                    model: response.Data
                });
            });
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    cancelEdit: function (row, tr) {
        try {
            if (gp.hasClass(tr, 'create-mode')) {
                // remove row and tr
                tr.remove();
                var index = this.config.data.Data.indexOf(row);
                this.config.data.Data.splice(index, 1);
            }
            else {
                // replace the ObjectProxy with the original row
                this.config.Row = row;
                this.restoreCells(this.config, row, tr);
            }

            gp.raiseCustomEvent(tr, 'cancelEdit', {
                model: row
            });
        }
        catch (ex) {
            gp.error( ex );
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
            gp.error( ex );
        }
    },

    handleRowSelect: function (config) {
        var trs, i = 0, model, type, url, rowSelector = 'div.table-body > table > tbody > tr';
        if (gp.hasValue(config.Onrowselect)) {
            type = typeof config.Onrowselect;
            if (type === 'string' && config.Onrowselect.indexOf('{{') !== -1) type = 'urlTemplate';
            // it's got to be either a function or a URL template
            if (type === 'function' || type === 'urlTemplate') {
                // add click handler
                gp.on(config.node, 'click', rowSelector + ':not(.edit-mode)', function (evt) {
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
                    // by making sure the evt target is a cell
                    if (gp.in(evt.target, rowSelector + ' > td.body-cell', config.node)) {
                        if (type === 'function') {
                            config.Onrowselect.call(this, model);
                        }
                        else {
                            // it's a urlTemplate
                            window.location = gp.processRowTemplate(config.Onrowselect, model);
                        }
                    }
                });
            }
        }
    }

};