var gridponent = gridponent || {};
(function(gp) { 
    /***************\
     change monitor
    \***************/
    gp.ChangeMonitor = function (node, selector, model, afterSync) {
        var self = this;
        this.model = model;
        this.beforeSync = null;
        this.afterSync = afterSync;
        this.node = node;
        this.listener = function (evt) {
            self.syncModel.call(self, evt.target, self.model);
        };
        // add change event handler to node
        gp.on(node, 'change', selector, this.listener);
    
        //if (Object.observe) {
        //    Object.observe(model, function (changes) {
        //        self.syncUI.call(self, changes);
        //    });
        //}
    };
    
    gp.ChangeMonitor.prototype = {
        syncModel: function (target, model) {
            // get name and value of target
            var name = target.name;
            var value = target.value;
            var handled = false;
    
            if ((name in model) === false) {
                return;
            }
    
            if (typeof (this.beforeSync) === 'function') {
                handled = this.beforeSync(name, value, this.model);
            }
            if (!handled) {
                type = gp.getType(model[name]);
                switch (type) {
                    case 'number':
                        model[name] = parseFloat(value);
                        break;
                    case 'boolean':
                        model[name] = (value.toLowerCase() == 'true');
                        break;
                    default:
                        model[name] = value;
                }
            }
            if (typeof this.afterSync === 'function') {
                this.afterSync(target, model);
            }
        },
        syncUI: function (changes) {
            var inputs, name, value, self = this;
            gp.info('gp.ChangeMonitor.syncUI: changes:');
            gp.info(changes);
            changes.forEach(function (change) {
                name = change.name;
                value = self.model[change.name];
    
                inputs = self.node.querySelectorAll('[name=' + name + ']');
    
                if (!inputs) return;
    
                if (inputs.length === 1) {
                    // single input (text, date, hidden, etc)
                    // or single checkbox with a value of true
                }
                else if (inputs.length > 1) {
                    //multiple radios, one of which needs to be checked
                    //mulitple checkboxes, one of which has the correct value. If value is an array, check all the boxes for the array.
                }
            });
        },
        stop: function () {
            // clean up
            gp.off(this.node, 'change', this.listener);
        }
    };
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
                gp.log(ex.message);
                gp.log(ex.stack);
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
            config.node.querySelector('.table-pager').innerHTML = html;
            html = gp.helpers['sortStyle'].call(config);
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
    
            this.model.read(this.config.data, function (model) {
                self.config.data = model;
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
                if (ex.message) gp.log(ex.message);
                else gp.log(ex);
                if (ex.stack) gp.log(ex.stack);
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
                gp.log(ex.message);
                if (ex.stack) gp.log(ex.stack);
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
                        model: response.Row
                    });
                });
            }
            catch (ex) {
                gp.log(ex.message);
                gp.log(ex.stack);
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
                gp.log(ex.message);
                gp.log(ex.stack);
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
                gp.log(ex.message);
                gp.log(ex.stack);
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
    /***************\
      CustomEvent
    \***************/
    (function () {
    
        function CustomEvent(event, params) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }
    
        CustomEvent.prototype = window.Event.prototype;
    
        window.CustomEvent = CustomEvent;
    
    })();
    /***************\
       formatter
    \***************/
    
    // This is a wrapper for the Intl global object.
    // It allows the use of common format strings for dates and numbers.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
    (function () {
    
        // IE inserts unicode left-to-right-mark characters into the formatted string, 
        // causing the length property to return invalid results, even though the strings look the same.
        // We could leave them, but it makes the results untestable.
        var ltr = /\u200E/g;
    
        // constructing Intl.DateTimeFormat objects is resource intensive, so cache them by format, locale, and currencyCode
        var dateTimeFormatCache = {};
        var numberFormatCache = {};
    
        gp.defaultLocale = 'en-US';
    
        gp.defaultCurrencyCode = 'USD';
    
        gp.Formatter = function (locale, currencyCode) {
            this.locale = locale || gp.defaultLocale;
            this.currencyCode = currencyCode || gp.defaultCurrencyCode;
            this.supported = (window.Intl !== undefined);
            if (!this.supported) gp.log('Intl internationalization not supported');
        };
    
        gp.Formatter.prototype = {
            format: function (val, format) {
                var key, dtf, nf, type, options;
                if (!this.supported || !gp.hasValue(val)) return val;
    
                type = gp.getType(val);
                key = (format || '') + '|' + this.locale + '|' + this.currencyCode;
    
                if (type === 'date') {
                    if (key in dateTimeFormatCache) {
                        dtf = dateTimeFormatCache[key];
                    }
                    else {
                        options = getDateTimeFormatOptions(format);
    
                        dtf = new Intl.DateTimeFormat(this.locale, options)
    
                        dateTimeFormatCache[key] = dtf;
                    }
                    return dtf.format(val).replace(ltr, '');
                }
                if (type === 'dateString') {
                    var parts = val.match(/\d+/g);
                    var dt = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
    
                    if (key in dateTimeFormatCache) {
                        dtf = dateTimeFormatCache[key];
                    }
                    else {
                        options = getDateTimeFormatOptions(format);
    
                        dtf = new Intl.DateTimeFormat(this.locale, options)
    
                        dateTimeFormatCache[key] = dtf;
                    }
                    return dtf.format(dt).replace(ltr, '');
                }
                if (type === 'number') {
                    if (key in numberFormatCache) {
                        nf = numberFormatCache[key];
                    }
                    else {
                        options = getNumberFormatOptions(format, this.currencyCode);
                        nf = new Intl.NumberFormat(this.locale, options);
                        numberFormatCache[key] = nf;
                    }
                    return nf.format(val).replace(ltr, '');
                }
    
                return val;
            }
        };
    
        var dateTimeTokens = [
            [/yyyy/g, 'year', 'numeric'],
            [/yy/g, 'year', '2-digit'],
            [/MMMM/g, 'month', 'long'],
            [/MMM/g, 'month', 'short'],
            [/MM/g, 'month', '2-digit'],
            [/M/g, 'month', 'numeric'],
            [/dd/g, 'day', '2-digit'],
            [/d/g, 'day', 'numeric'],
            [/HH/g, 'hour', '2-digit', 'hour24'],
            [/H/g, 'hour', 'numeric', 'hour24'],
            [/hh/g, 'hour', '2-digit', 'hour12'],
            [/h/g, 'hour', 'numeric', 'hour12'],
            [/mm/g, 'minute', '2-digit'],
            [/m/g, 'minute', 'numeric'],
            [/ss/g, 'second', '2-digit'],
            [/s/g, 'second', 'numeric'],
            [/www/g, 'weekday', 'long'],
            [/ww/g, 'weekday', 'short'],
            [/w/g, 'weekday', 'narrow'],
            [/eee/g, 'era', 'long'],
            [/ee/g, 'era', 'short'],
            [/e/g, 'era', 'narrow'],
            [/tt/g, 'timeZoneName', 'long'],
            [/t/g, 'timeZoneName', 'short']
        ];
    
        function getDateTimeFormatOptions(format) {
            var options = {};
    
            if (gp.hasValue(format)) {
    
                dateTimeTokens.forEach(function (token) {
                    if (!(token[1] in options) && format.match(token[0])) {
                        options[token[1]] = token[2];
                        if (token.length === 4) {
                            options.hour12 = (token[3] === 'hour12');
                        }
                    }
                });
    
            }
    
            return options;
        }
    
        var numberTokens = [
            [/N/, 'style', 'decimal'],
            [/P/, 'style', 'percent'],
            [/C/, 'style', 'currency']
        ];
    
        function getNumberFormatOptions(format, currencyCode) {
            var options = {};
    
            if (gp.hasValue(format)) {
    
                numberTokens.forEach(function (token) {
                    if (!(token[1] in options) && format.match(token[0])) {
                        options[token[1]] = token[2];
                        if (token[2] === 'currency') {
                            options.currency = currencyCode;
                        }
                    }
                });
                var digits = format.match(/\d+/);
                if (digits) {
                    options.minimumFractionDigits = parseInt(digits);
                    options.maximumFractionDigits = parseInt(digits);
                }
            }
    
            return options;
        }
    
    })();
    /***************\
         globals
    \***************/
    (function (gp) {
    
        gp.getSearch = function () {
            var split, nameValue,
                obj = {},
                search = window.location.search;
            if (search && search.length) {
                split = search.substring(1).split('&');
                split.forEach(function (s) {
                    nameValue = s.split('=');
                    if (nameValue.length == 1) obj[nameValue[0]] = null;
                    else obj[nameValue[0]] = nameValue[1];
                });
            }
            return obj;
        };
    
        // logging
        gp.log = window.console ? window.console.log.bind(window.console) : function () { };
        gp.verbose = gp.info = gp.warn = function () { };
    
        var search = gp.getSearch();
    
        if ('log' in search) {
            if (search.log === 'verbose') {
                gp.verbose = gp.info = gp.warn = gp.log;
            }
            else if (search.log === 'info') {
                gp.info = gp.warn = gp.log;
            }
            else if (search.log === 'warn') {
                gp.warn = gp.log;
            }
        }
    
        gp.getConfig = function (node) {
            gp.verbose('getConfig: node:');
            gp.verbose(node);
            var config = {}, name, attr, attrs = node.attributes;
            config.node = node;
            for (var i = attrs.length - 1; i >= 0; i--) {
                attr = attrs[i];
                name = gp.camelize(attr.name);
                // convert "true", "false" and empty to boolean
                config[name] = attr.value === "true" || attr.value === "false" || attr.value === '' ? (attr.value === "true" || attr.value === '') : attr.value;
            }
            gp.verbose('getConfig: config:');
            gp.verbose(config);
            return config;
        };
    
        gp.padLeft = function (str, length, char) {
            var s = str.toString();
            char = char || ' ';
            while (s.length < length)
                s = char + s;
            return s;
        };
    
        var chars = [/&/g, /</g, />/g, /"/g, /'/g, /`/g];
    
        var escaped = ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&#96;'];
    
        gp.escapeHTML = function (obj) {
            if (typeof obj !== 'string') {
                return obj;
            }
            for (var i = 0; i < chars.length; i++) {
                obj = obj.replace(chars[i], escaped[i]);
            }
            return obj;
        };
    
        gp.camelize = function (str) {
            return str.replace(/(?:^|[-_])(\w)/g, function (_, c) {
                return c ? c.toUpperCase() : '';
            });
        };
    
        gp.shallowCopy = function (from, to) {
            var props = Object.getOwnPropertyNames(from);
            props.forEach(function (prop) {
                to[prop] = from[prop];
            });
        };
    
        var iso8601 = /^[012][0-9]{3}-[01][0-9]-[0123][0-9]/;
    
        gp.getLocalISOString = function (date) {
            if (typeof date === 'string') return date;
            var offset = date.getTimezoneOffset();
            var adjustedDate = new Date(date.valueOf() - (offset * 60000));
            return adjustedDate.toISOString();
        };
    
        gp.getType = function (a) {
            if (a === null || a === undefined) {
                return a;
            }
            if (a instanceof Date) {
                return 'date';
            }
            if (typeof (a) === 'string' && iso8601.test(a)) {
                return 'dateString';
            }
            if (Array.isArray(a)) {
                return 'array';
            }
            // 'number','string','boolean','function','object'
            return typeof (a);
        };
    
        gp.on = function (elem, event, targetSelector, listener) {
            // if elem is a selector, convert it to an element
            if (typeof (elem) === 'string') {
                elem = document.querySelector(elem);
            }
    
            if (!gp.hasValue(elem)) {
                return;
            }
    
            // this allows us to attach an event handler to the document
            // and handle events that match a selector
            var privateListener = function (evt) {
    
                var e = evt.target;
    
                // get all the elements that match targetSelector
                var potentials = elem.querySelectorAll(targetSelector);
    
                // find the first element that matches targetSelector
                // usually this will be the first one
                while (e) {
                    for (var j = 0; j < potentials.length; j++) {
                        if (e == potentials[j]) {
                            // set 'this' to the matching element
                            listener.call(e, evt);
                            return;
                        }
                    }
                    e = e.parentElement;
                }
            };
    
            // handle event
            elem.addEventListener(event, privateListener, false);
    
            // use an array to store listener and privateListener 
            // so we can remove the handler with gp.off
            var propName = 'gp-listeners-' + event;
            var listeners = elem[propName] || (elem[propName] = []);
            listeners.push({
                pub: listener,
                priv: privateListener
            });
        };
    
        gp.off = function (elem, event, listener) {
            // check for a matching listener store on the element
            var listeners = elem['gp-listeners-' + event];
            if (listeners) {
                for (var i = 0; i < listeners.length; i++) {
                    if (listeners[i].pub === listener) {
    
                        // remove the event handler
                        elem.removeEventListener(event, listeners[i].priv);
    
                        // remove it from the listener store
                        listeners.splice(i, 1);
                        return;
                    }
                }
            }
        };
    
        gp.closest = function (elem, selector, parentNode) {
            var e, potentials, j;
            parentNode = parentNode || document;
            // if elem is a selector, convert it to an element
            if (typeof (elem) === 'string') {
                elem = document.querySelector(elem);
            }
            gp.info('closest: elem:');
            gp.info(elem);
    
            if (elem) {
                // start with elem's immediate parent
                e = elem.parentElement;
    
                potentials = parentNode.querySelectorAll(selector);
    
                while (e) {
                    for (j = 0; j < potentials.length; j++) {
                        if (e == potentials[j]) {
                            gp.info('closest: e:');
                            gp.info(e);
                            return e;
                        }
                    }
                    e = e.parentElement;
                }
            }
        };
    
        gp.in = function (elem, selector, parent) {
            parent = parent || document;
            // if elem is a selector, convert it to an element
            if (typeof (elem) === 'string') {
                elem = parent.querySelector(elem);
            }
            // if selector is a string, convert it to a node list
            if (typeof (selector) === 'string') {
                selector = parent.querySelectorAll(selector);
            }
            for (var i = 0; i < selector.length; i++) {
                if (selector[i] === elem) return true;
            }
            return false;
        };
    
        gp.hasValue = function (val) {
            return val !== undefined && val !== null;
        };
    
        gp.isNullOrEmpty = function (val) {
            return gp.hasValue(val) === false || val.length === undefined || val.length === 0;
        };
    
        gp.coalesce = function (array) {
            if (gp.isNullOrEmpty(array)) return array;
    
            for (var i = 0; i < array.length; i++) {
                if (gp.hasValue(array[i])) {
                    return array[i];
                }
            }
    
            return array[array.length - 1];
        };
    
        var quoted = /^['"].+['"]$/;
    
        gp.resolveObjectPath = function (path, root) {
            // split by dots, then square brackets
            try {
                if (typeof path !== 'string') return null;
                gp.verbose('resolveObjectPath:');
                var currentObj = root || window;
                var paths = path.split('.');
    
                for (var i = 0; i < paths.length && gp.hasValue(currentObj); i++) {
                    var name = paths[i];
                    gp.verbose(name)
                    var split = name.split('[');
                    var objName = split[0];
                    gp.verbose('objName: ' + objName);
                    if (objName !== 'window' || i !== 0) {
                        currentObj = currentObj[objName];
                    }
                    gp.verbose('currentObj: ' + currentObj);
                    if (gp.hasValue(currentObj) && split.length > 1) {
    
                        for (var j = 1; j < split.length; j++) {
                            var indexer = split[j].slice(0, -1);
                            // check to see if indexer is a number
                            if (isNaN(parseInt(indexer))) {
                                if (quoted.test(indexer)) {
                                    indexer = indexer.slice(1, -1);
                                }
                                else {
                                    indexer = gp.resolveObjectPath(indexer);
                                }
                                gp.verbose('indexer: ' + indexer);
                                currentObj = currentObj[indexer];
                            }
                            else {
                                gp.verbose('indexer: ' + indexer);
                                currentObj = currentObj[parseInt(indexer)];
                            }
                            gp.verbose('currentObj: ' + currentObj);
                        }
    
                    }
                }
    
                gp.verbose(currentObj);
    
                return currentObj;
            }
            catch (err) {
                gp.log('Could not resolve object path: ' + path);
                gp.log(err);
            }
        };
    
        gp.resolveObject = function (obj, name) {
            var val;
            if (gp.hasValue(obj[name])) {
                val = gp.resolveObjectPath(obj[name]);
                if (gp.hasValue(val)) {
                    obj[name] = val;
                    return true;
                }
            }
            return false;
        };
    
        var FP = Function.prototype;
    
        var callbind = FP.bind
           ? FP.bind.bind(FP.call)
           : (function (call) {
               return function (func) {
                   return function () {
                       return call.apply(func, arguments);
                   };
               };
           }(FP.call));
    
        var uids = {};
        var slice = callbind(''.slice);
        var zero = 0;
        var numberToString = callbind(zero.toString);
    
        gp.createUID = function () {
            // id's can't begin with a number
            var key = 'gp' + slice(numberToString(Math.random(), 36), 2);
            return key in uids ? createUID() : uids[key] = key;
        };
    
        gp.hasPositiveWidth = function(nodes) {
            if (gp.isNullOrEmpty(nodes)) return false;
            for (var i = 0; i < nodes.length; i++) {
                if (nodes[i].offsetWidth > 0) return true;
            }
            return false;
        };
    
        var token = /{{.+?}}/g;
    
        gp.resolveTemplate = function (template) {
            // it's either a selector or a function
            var t = gp.resolveObjectPath(template);
            if (typeof (t) === 'function') {
                return t;
            }
            else {
                t = document.querySelector(template);
                if (t) {
                    return t.innerHTML;
                }
            }
            return null;
        };
    
        gp.formatter = new gp.Formatter();
    
        gp.getFormattedValue = function (row, col, escapeHTML) {
            var type = (col.Type || '').toLowerCase();
            var val = row[col.Field];
    
            if (type === 'date' || type === 'datestring') {
                // apply default formatting to dates
                //return gp.formatDate(val, col.Format || 'M/d/yyyy');
                return gp.formatter.format(val, col.Format);
            }
            if (type === 'number' && col.Format) {
                return gp.formatter.format(val, col.Format);
            }
            if (type === 'string' && escapeHTML) {
                return gp.escapeHTML(val);
            }
            return val;
        };
    
        gp.processRowTemplate = function (template, row, col) {
            gp.info('gp.processTemplate: template: ');
            gp.info(template);
            var fn, val, match, tokens = template.match(/{{.+?}}/g);
            if (tokens) {
                for (var i = 0; i < tokens.length; i++) {
                    match = tokens[i].slice(2, -2);
                    if (match in row) {
                        val = row[match];
                        if (gp.hasValue(val) === false) val = '';
                        template = template.replace(tokens[i], val);
                    }
                    else {
                        fn = gp.resolveObjectPath(match);
                        if (typeof fn === 'function') {
                            template = template.replace(tokens[i], fn.call(this, row, col));
                        }
                    }
                }
            }
            gp.info('gp.processTemplate: template:');
            gp.info(template);
            return template;
        };
    
        gp.processColumnTemplate = function (template, col) {
            var fn, match, tokens = template.match(/{{.+?}}/g);
            if (tokens) {
                for (var i = 0; i < tokens.length; i++) {
                    match = tokens[i].slice(2, -2);
                    fn = gp.resolveObjectPath(match);
                    if (typeof fn === 'function') {
                        template = template.replace(tokens[i], fn.call(this, col));
                    }
                }
            }
            gp.info('gp.processTemplate: template:');
            gp.info(template);
            return template;
        };
    
        gp.trim = function (str) {
            return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
        };
    
        gp.hasClass = function(el, cn)
        {
            return (' ' + el.className + ' ').indexOf(' ' + cn + ' ') !== -1;
        };
    
        gp.addClass = function(el, cn)
        {
            if (!gp.hasClass(el, cn)) {
                el.className = (el.className === '') ? cn : el.className + ' ' + cn;
            }
        };
    
        gp.removeClass = function (el, cn) {
            el.className = gp.trim((' ' + el.className + ' ').replace(' ' + cn + ' ', ' '));
        };
    
        gp.prependChild = function (node, child) {
            if (typeof node === 'string') node = document.querySelector(node);
            if (typeof child === 'string') {
                // using node.tagName to convert child to DOM node helps ensure that what we create is compatible with node
                var div = document.createElement(node.tagName.toLowerCase());
                div.innerHTML = child;
                child = div.firstChild;
            }
            var firstChild = node.firstChild;
            if (!firstChild) {
                node.appendChild(child);
            }
            node.insertBefore(child, firstChild);
            return child;
        };
    
        gp.getRowModel = function (data, tr) {
            var index = parseInt(tr.attributes['data-index'].value);
            return data[index];
        };
    
        gp.raiseCustomEvent = function(node, name, detail) {
            var event = new CustomEvent(name, { bubbles: true, detail: detail, cancelable: true });
            node.dispatchEvent(event);
            gp.info('raiseCustomEvent: name: ' + name); 
            gp.info('raiseCustomEvent: node: ');
            gp.info(node);
        };
    
    })(gridponent);
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
                    gp.verbose('helpers.thead: col.HeaderTemplate:');
                    gp.verbose(col.HeaderTemplate);
                    if (typeof (col.HeaderTemplate) === 'function') {
                        out.push(col.HeaderTemplate.call(self, col));
                    }
                    else {
                        out.push(gp.processColumnTemplate.call(this, col.HeaderTemplate, col));
                    }
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
    
        extend('rowIndex', function () {
            return this.data.Data.indexOf(this.Row);
        });
    
        extend('bodyCell', function (col) {
            var type = (col.Type || '').toLowerCase();
            var out = [];
            out.push('<td class="body-cell ' + type + '"');
            if (col.BodyStyle) {
                out.push(' style="' + col.BodyStyle + '"');
            }
            out.push('>');
            out.push(gp.helpers['bodyCellContent'].call(this, col))
            out.push('</td>');
            return out.join('');
        });
    
        extend('bodyCellContent', function (col) {
            var template, format, val = gp.getFormattedValue(this.Row, col, true);
    
            var type = (col.Type || '').toLowerCase();
            var out = [];
    
            // check for a template
            if (col.Template) {
                if (typeof (col.Template) === 'function') {
                    out.push(col.Template.call(this, this.Row, col));
                }
                else {
                    out.push(gp.processRowTemplate.call(this, col.Template, this.Row, col));
                }
            }
            else if (col.Commands) {
                out.push('<div class="btn-group" role="group">');
                col.Commands.forEach(function (cmd, index) {
                    if (cmd == 'Edit') {
                        out.push('<button type="button" class="btn btn-primary btn-xs" value="');
                        out.push(cmd);
                        out.push('">');
                        out.push('<span class="glyphicon glyphicon-edit"></span>');
                        out.push(cmd);
                        out.push('</button>');
                    }
                    if (cmd == 'Delete') {
                        out.push('<button type="button" class="btn btn-danger btn-xs" value="');
                        out.push(cmd);
                        out.push('">');
                        out.push('<span class="glyphicon glyphicon-remove"></span>');
                        out.push(cmd);
                        out.push('</button>');
                    }
                });
                out.push('</div>');
            }
            else if (gp.hasValue(val)) {
                // show a checkmark for bools
                if (type === 'boolean') {
                    if (val === true) {
                        out.push('<span class="glyphicon glyphicon-ok"></span>');
                    }
                }
                else {
                    out.push(val);
                }
            }
            return out.join('');
        });
    
    
        extend('editCell', function (col) {
            if (col.Readonly) {
                return gp.helpers.bodyCell.call(this, col);
            }
    
            var out = [];
            var type = col.Type;
            if (col.Commands) type = 'commands-cell';
    
            out.push('<td class="body-cell ' + type + '"');
            if (col.BodyStyle) {
                out.push(' style="' + col.BodyStyle + '"');
            }
            out.push('>');
            out.push(gp.helpers['editCellContent'].call(this, col))
            out.push('</td>');
            return out.join('');
        });
    
        extend('editCellContent', function (col) {
            var template, out = [];
    
            // check for a template
            if (col.EditTemplate) {
                if (typeof (col.EditTemplate) === 'function') {
                    out.push(col.EditTemplate.call(this, this.Row, col));
                }
                else {
                    out.push(gp.processRowTemplate.call(this, col.EditTemplate, this.Row, col));
                }
            }
            else if (col.Commands) {
                out.push('<div class="btn-group" role="group">');
                out.push('<button type="button" class="btn btn-primary btn-xs" value="Update">');
                out.push('<span class="glyphicon glyphicon-save"></span>Save');
                out.push('</button>');
                out.push('<button type="button" class="btn btn-default btn-xs" value="Cancel">');
                out.push('<span class="glyphicon glyphicon-remove"></span>Cancel');
                out.push('</button>');
                out.push('</div>');
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
                    case 'dateString':
                        // use the required format for the date input element
                        val = gp.getLocalISOString(val).substring(0, 10);
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
            return out.join('');
        });
    
        extend('footerCell', function (col) {
            var out = [];
            if (col.FooterTemplate) {
                if (typeof (col.FooterTemplate) === 'function') {
                    out.push(col.FooterTemplate.call(this, col));
                }
                else {
                    out.push(gp.processColumnTemplate.call(this, col.FooterTemplate, col));
                }
            }
            return out.join('');
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
                out.push('#' + this.ID + ' thead th.header-cell.' + this.data.OrderBy + '> label:after');
                out.push('{ content: ');
                if (this.data.Desc) {
                    out.push('"\\e114"; }');
                }
                else {
                    out.push('"\\e113"; }');
                }
            }
            return out.join('');
        });
    
        extend('columnWidthStyle', function () {
            var self = this,
                out = [],
                index = 0,
                bodyCols = document.querySelectorAll('#' + this.ID + ' .table-body > table > tbody > tr:first-child > td');
    
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
                    if (isNaN(col.Width) == false) out.push('px');
                }
                else if (bodyCols.length && (self.FixedHeaders || self.FixedFooters)) {
                    // sync header and footer to body
                    width = bodyCols[index].offsetWidth;
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
            if (this.Responsive) {
                out.push(' responsive');
            }
            if (this.Search) {
                out.push(' search-' + this.Search);
            }
            if (this.Onrowselect) {
                out.push(' selectable');
            }
            return out.join('');
        });
    
    })();
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
            new gp.Controller(self.config);
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
            var options = 'Onrowselect SearchFilter DataSource Read Create Update Destroy'.split(' ');
            options.forEach(function (option) {
                gp.resolveObject(config, option);
            });
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
            var props = 'HeaderTemplate Template EditTemplate FooterTemplate'.split(' ');
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
        }
    };
    /***************\
       mock-http
    \***************/
    (function (gp) {
        gp.Http = function () { };
    
        // http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
        var routes = {
            read: /Read/,
            update: /Update/,
            create: /Create/,
            destroy: /Destroy/
        };
    
        gp.Http.prototype = {
            serialize: function (obj, props) {
                // creates a query string from a simple object
                var self = this;
                props = props || Object.getOwnPropertyNames(obj);
                var out = [];
                props.forEach(function (prop) {
                    out.push(encodeURIComponent(prop) + '=' + encodeURIComponent(obj[prop]));
                });
                return out.join('&');
            },
            deserialize: function (queryString) {
                var nameValue, split = queryString.split('&');
                var obj = {};
                split.forEach(function (s) {
                    nameValue = s.split('=');
                    var val = nameValue[1];
                    if (val.length === 0) {
                        obj[nameValue[0]] = null;
                    }
                    else if (val === 'true' || val === 'false') {
                        obj[nameValue[0]] = (val === 'true');
                    }
                    else if (parseFloat(val).toString() === val) {
                        obj[nameValue[0]] = parseFloat(val);
                    }
                    else {
                        obj[nameValue[0]] = val;
                    }
                });
                return obj;
            },
            get: function (url, callback, error) {
                if (routes.read.test(url)) {
                    var index = url.substring(url.indexOf('?'));
                    if (index !== -1) {
                        var queryString = url.substring(index + 1);
                        var model = this.deserialize(queryString);
                        this.post(url.substring(0, index), model, callback, error);
                    }
                    else {
                        this.post(url, null, callback, error);
                    }
                }
                else if (routes.create.test(url)) {
                    var result = { "ProductID": 0, "Name": "", "ProductNumber": "", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": "", "SafetyStockLevel": 0, "ReorderPoint": 0, "StandardCost": 0, "ListPrice": 0, "Size": "", "SizeUnitMeasureCode": "", "WeightUnitMeasureCode": "", "Weight": 0, "DaysToManufacture": 0, "ProductLine": "", "Class": "", "Style": "", "ProductSubcategoryID": 0, "ProductModelID": 0, "SellStartDate": "2007-07-01T00:00:00", "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "00000000-0000-0000-0000-000000000000", "ModifiedDate": "2008-03-11T10:01:36.827", "Markup": null };
                    callback(result);
                }
                else {
                    throw 'Not found: ' + url;
                }
            },
            post: function (url, model, callback, error) {
                mdoel = model || {};
                if (routes.read.test(url)) {
                    getData(model, callback);
                }
                else if (routes.update.test(url)) {
                    callback({
                        Data: model,
                        ValidationErrors:[]
                    });
                }
                else if (routes.destroy.test(url)) {
                    var index = data.products.indexOf(model);
                    callback(true);
                }
                else {
                    throw '404 Not found: ' + url;
                }
            }
        };
    
        var getData = function (model, callback) {
            var count, d = data.products;
            if (!gp.isNullOrEmpty(model.Search)) {
                var props = Object.getOwnPropertyNames(d[0]);
                var search = model.Search.toLowerCase();
                d = d.filter(function (row) {
                    for (var i = 0; i < props.length; i++) {
                        if (row[props[i]] && row[props[i]].toString().toLowerCase().indexOf(search) !== -1) {
                            return true;
                        }
                    }
                    return false;
                });
            }
            if (!gp.isNullOrEmpty(model.OrderBy)) {
                if (model.Desc) {
                    d.sort(function (row1, row2) {
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
                        if (a === null) {
                            if (b != null) {
                                return 1;
                            }
                        }
                        else if (b === null) {
                            // we already know a isn't null
                            return -1;
                        }
                        if (a > b) {
                            return -1;
                        }
                        if (a < b) {
                            return 1;
                        }
    
                        return 0;
                    });
                }
                else {
                    d.sort(function (row1, row2) {
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
                        if (a === null) {
                            if (b != null) {
                                return -1;
                            }
                        }
                        else if (b === null) {
                            // we already know a isn't null
                            return 1;
                        }
                        if (a > b) {
                            return 1;
                        }
                        if (a < b) {
                            return -1;
                        }
    
                        return 0;
                    });
                }
            }
            count = d.length;
            if (model.Top !== -1) {
                model.Data = d.slice(model.Skip).slice(0, model.Top);
            }
            else {
                model.Data = d;
            }
            model.ValidationErrors = [];
            setTimeout(function () {
                callback(model);
            });
    
        };
    
    })(gridponent);
    /***************\
         model
    \***************/
    gp.Model = function (config) {
        this.config = config;
        if (config.Read === 'string') {
            this.pager = new gp.ServerPager(config);
        }
        else if (typeof config.Read !== 'function') {
            // even if paging isn't enabled, we can still use a ClientPager for searching and sorting
            this.pager = new gp.ClientPager(config);
            // set pager.data even if config.DataSource is undefined
            this.pager.data = config.DataSource;
        }
    };
    
    gp.Model.prototype = {
    
        read: function (requestModel, callback) {
            if (this.pager) {
                this.pager.read(requestModel, function (response) {
                    // response should be a RequestModel object with data
                    callback(response);
                });
            }
            else if (typeof this.config.Read === 'function') {
                this.config.Read(requestModel, callback);
            }
            else if (typeof this.config.Read === 'string') {
                var http = new gp.Http();
                http.post(this.config.Read, requestModel, callback);
            }
            else {
                callback();
            }
        },
    
        create: function (callback) {
            var self = this;
            if (typeof this.config.Create === 'function') {
                this.config.Create(function (row) {
                    if (self.config.data.Data && self.config.data.Data.push) {
                        self.config.data.Data.push(row);
                    }
                    callback(row);
                });
            }
            else {
                var http = new gp.Http();
                http.get(this.config.Create, function (row) {
                    if (self.config.data.Data && self.config.data.Data.push) {
                        self.config.data.Data.push(row);
                    }
                    callback(row);
                });
            }
        },
    
        update: function (row, callback) {
            if (typeof this.config.Update === 'function') {
                this.config.Update(row, callback);
            }
            else {
                var http = new gp.Http();
                http.post(this.config.Update, row, callback);
            }
        },
    
        destroy: function (row, callback) {
            if (typeof this.config.Destroy === 'function') {
                this.config.Destroy(row, callback);
            }
            else {
                var http = new gp.Http();
                http.post(this.config.Destroy, row, callback);
            }
        }
    
    };
    /***************\
       ObjectProxy
    \***************/
    gp.ObjectProxy = function (obj, onPropertyChanged) {
        var self = this;
        var dict = {};
    
        // create mirror properties
        var props = Object.getOwnPropertyNames(obj);
    
        props.forEach(function (prop) {
            Object.defineProperty(self, prop, {
                get: function () {
                    return dict[prop];
                },
                set: function (value) {
                    if (dict[prop] != value) {
                        var oldValue = dict[prop];
                        dict[prop] = value;
                        if (typeof onPropertyChanged === 'function') {
                            onPropertyChanged(self, prop, oldValue, value);
                        }
                    }
                }
            });
            dict[prop] = obj[prop];
        });
    };
    
    /***************\
    server-side pager
    \***************/
    gp.ServerPager = function (config) {
        this.config = config;
        this.url = config.Read;
    };
    
    gp.ServerPager.prototype = {
        read: function (model, callback, error) {
            var h = new gp.Http();
            h.post(this.url, model, callback, error);
        }
    };
    
    
    /***************\
    client-side pager
    \***************/
    gp.ClientPager = function (config) {
        var value, self = this;
        this.data = config.data.Data;
        this.columns = config.Columns.filter(function (c) {
            return c.Field !== undefined;
        });
        if (typeof config.SearchFilter === 'function') {
            this.searchFilter = config.SearchFilter;
        }
        else {
            this.searchFilter = function (row, search) {
                var s = search.toLowerCase();
                for (var i = 0; i < self.columns.length; i++) {
                    value = gp.getFormattedValue(row, self.columns[i], false);
                    if (gp.hasValue(value) && value.toString().toLowerCase().indexOf(s) !== -1) {
                        return true;
                    }
                }
                return false;
            };
        }
    };
    
    gp.ClientPager.prototype = {
        getSkip: function (model) {
            var data = model;
            if (data.PageCount == 0) {
                return 0;
            }
            if (data.Page < 1) {
                data.Page = 1;
            }
            else if (data.Page > data.PageCount) {
                return data.Page = data.PageCount;
            }
            return (data.Page - 1) * data.Top;
        },
    
        read: function (model, callback, error) {
            try {
                var self = this;
                var skip = this.getSkip(model);
    
                model.Data = this.data;
    
                var count;
                if (!gp.isNullOrEmpty(model.Search)) {
                    model.Data = model.Data.filter(function (row) {
                        return self.searchFilter(row, model.Search);
                    });
                }
                model.TotalRows = model.Data.length;
                if (gp.isNullOrEmpty(model.OrderBy) === false) {
                    var col = this.getColumnByField(this.columns, model.OrderBy);
                    if (col !== undefined) {
                        var sortFunction = this.getSortFunction(col, model.Desc);
                        model.Data.sort(function (row1, row2) {
                            return sortFunction(row1[col.Field], row2[col.Field]);
                        });
                    }
                }
                gp.info('ClientPager: total rows: ' + model.TotalRows);
                if (model.Top !== -1) {
                    model.Data = model.Data.slice(skip).slice(0, model.Top);
                }
            }
            catch (ex) {
                gp.log(ex.message);
                gp.log(ex.stack);
            }
            callback(model);
        },
        getColumnByField: function (columns, field) {
            var col = columns.filter(function (c) { return c.Field === field });
            return col.length ? col[0] : null;
        },
        getSortFunction: function (col, desc) {
            if (col.Type === 'number' || col.Type === 'date' || col.Type == 'boolean') {
                if (desc) {
                    return this.diffSortDesc;
                }
                return this.diffSortAsc;
            }
            else {
                if (desc) {
                    return this.stringSortDesc;
                }
                return this.stringSortAsc;
            }
        },
        diffSortDesc: function(a, b) {
            return b - a;
        },
        diffSortAsc: function(a, b) {
            return a - b;
        },
        stringSortDesc: function (a, b) {
            if (a === null) {
                if (b != null) {
                    return 1;
                }
            }
            else if (b === null) {
                // we already know a isn't null
                return -1;
            }
            if (a > b) {
                return -1;
            }
            if (a < b) {
                return 1;
            }
    
            return 0;
        },
        stringSortAsc: function (a, b) {
            if (a === null) {
                if (b != null) {
                    return -1;
                }
            }
            else if (b === null) {
                // we already know a isn't null
                return 1;
            }
            if (a > b) {
                return 1;
            }
            if (a < b) {
                return -1;
            }
    
            return 0;
        }
    };
    /***************\
         polar
    \***************/
    (function () {
    
        var testers = [];
    
        var timeout = null;
    
        var poll = function () {
    
            testers.forEach(function (testor) {
                testor.test();
            });
    
            if (testers.length) {
                timeout = setTimeout(poll, 250);
            }
            else {
                timeout = null;
            }
        };
    
        gp.polar = function (fn, val, callback) {
    
            testers.push(new gp.testor(fn, val, callback));
    
            if (timeout === null) {
                poll();
            }
    
            this.stop = function () {
                if (timeout != null) {
                    clearTimeout(timeout);
                }
                if (testers.length) {
                    testers.splice(0, testers.length);
                }
            };
    
        };
    
        gp.testor = function (test, val, callback) {
            var result, index;
    
            try {
                this.test = function () {
                    result = test();
                    if (result == val) {
                        callback(result);
                        index = testers.indexOf(this);
                        if (index !== -1) {
                            testers.splice(index, 1);
                        }
                    }
                };
            }
            catch (ex) {
                index = testers.indexOf(this);
                if (index !== -1) {
                    testers.splice(index, 1);
                }
                gp.log(ex);
            }
        };
    
    })();
    // pilfered from JQuery
    /*!
     * jQuery JavaScript Library v2.1.4
     * http://jquery.com/
     *
     * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
     * Released under the MIT license
     * http://jquery.org/license
     *
     * Date: 2015-04-28T16:01Z
     */
    gp.ready = function (fn) {
    
        var isReady = false;
    
        var completed = function (event) {
            // readyState === "complete" is good enough for us to call the dom ready in oldIE
            if (document.addEventListener || event.type === "load" || document.readyState === "complete") {
                isReady = true;
                detach();
                fn();
            }
        };
    
        var detach = function () {
            if (document.addEventListener) {
                document.removeEventListener("DOMContentLoaded", completed, false);
                window.removeEventListener("load", completed, false);
    
            } else {
                document.detachEvent("onreadystatechange", completed);
                window.detachEvent("onload", completed);
            }
        };
    
        if (document.readyState === "complete") {
            // Handle it asynchronously to allow scripts the opportunity to delay ready
            setTimeout(fn);
    
            // Standards-based browsers support DOMContentLoaded
        } else if (document.addEventListener) {
            // Use the handy event callback
            document.addEventListener("DOMContentLoaded", completed, false);
    
            // A fallback to window.onload, that will always work
            window.addEventListener("load", completed, false);
    
            // If IE event model is used
        } else {
            // Ensure firing before onload, maybe late but safe also for iframes
            document.attachEvent("onreadystatechange", completed);
    
            // A fallback to window.onload, that will always work
            window.attachEvent("onload", completed);
    
            // If IE and not a frame
            // continually check to see if the document is ready
            var top = false;
    
            try {
                top = window.frameElement == null && document.documentElement;
            } catch (e) { }
    
            if (top && top.doScroll) {
                (function doScrollCheck() {
                    if (!isReady) {
    
                        try {
                            // Use the trick by Diego Perini
                            // http://javascript.nwbox.com/IEContentLoaded/
                            top.doScroll("left");
                        } catch (e) {
                            return setTimeout(doScrollCheck, 50);
                        }
    
                        // detach all dom ready events
                        detach();
    
                        fn();
                    }
                })();
            }
        }
    };
    /***************\
      RequestModel
    \***************/
    gp.RequestModel = function (data) {
        var self = this;
        // properites are capitalized here because that's the convention for server-side classes (C#)
        // we want the serialized version of the corresponding server-side class to look exactly like this prototype
        this.Top = -1; // this is used as a flag to let the pagers know if paging is enabled
        this.Page = 1;
        this.OrderBy = '';
        this.Desc = false;
        this.Search = '';
        this.Data = data;
        this.TotalRows = 0;
    
        Object.defineProperty(self, 'PageIndex', {
            get: function () {
                return self.Page - 1;
            }
        });
    
        Object.defineProperty(self, 'PageCount', {
            get: function () {
                if (self.Top !== -1) {
                    return Math.ceil(self.TotalRows / self.Top);
                }
                return 0;
            }
        });
    
        Object.defineProperty(self, 'Skip', {
            get: function () {
                if (self.Top !== -1) {
                    if (self.PageCount === 0) return 0;
                    if (self.Page < 1) self.Page = 1;
                    else if (self.Page > self.PageCount) return self.Page = self.PageCount;
                    return self.PageIndex * self.Top;
                }
                return 0;
            }
        });
    };
    /***************\
     main component
    \***************/
    //gp.Table = function (node) {
    
    //    var i = new gp.Initializer(node);
    
    //    this.config = i.config;
    //    //this.initialize(node);
    //};
    
    if (document.registerElement) {
    
        gp.Table = Object.create(HTMLElement.prototype);
    
        //gp.Table.constructor = gp.Table;
    
        gp.Table.createdCallback = function () {
            gp.info(this);
            new gp.Initializer(this);
        };
    
        document.registerElement('grid-ponent', {
            prototype: gp.Table
        });
    }
    else {
        gp.Table = Object.create(Object.prototype);
    
        //gp.Table.constructor = gp.Table;
    
        gp.ready(function () {
            var node, nodes = document.querySelectorAll('grid-ponent');
            for (var i = 0; i < nodes.length; i++) {
                node = nodes[i];
                new gp.Initializer(node);
            }
        });
    }
    
    gp.Table.api = {
        filter: function (obj) {
            // obj is either a search term or a function 
        },
        sort: function (obj) {
            // obj is either a function or a sort expression
        },
        getPage: function(index) {
    
        },
        create: function (row) {
    
        },
        read: function (page) {
            // page is an object specifying sort, search, page, etc.
            // if not supplied, read acts like a refresh function
        },
        update: function (index, row) {
    
        },
        destroy: function(index) {
    
        }
    };
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
                out.push('    <td class="body-cell" ');
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
    gp.templates['gridponent-new-row'] = function(model, arg) {
        var out = [];
        out.push('<tr data-index="');
        out.push(gp.helpers['rowIndex'].call(model));
        out.push('" class="create-mode">');
                model.Columns.forEach(function(col, index) {
                        out.push(gp.helpers['editCell'].call(model, col));
                    });
            out.push('</tr>');
        return out.join('');
    };
    gp.templates['gridponent-pager'] = function(model, arg) {
        var out = [];
        out.push(gp.helpers['setPagerFlags'].call(model));
                if (model.data.HasPages) {
                out.push('<div class="btn-group">');
        out.push('        <label class="ms-page-index btn btn-default ');
        if (model.data.IsFirstPage) {
        out.push(' disabled ');
        }
        out.push('" title="First page">');
        out.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>');
                        if (model.data.IsFirstPage == false) {
            out.push('<input type="radio" name="Page" value="1" />');
                        }
            out.push('</label>');
            out.push('        <label class="ms-page-index btn btn-default ');
        if (model.data.IsFirstPage) {
        out.push(' disabled ');
        }
        out.push('" title="Previous page">');
        out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
                        if (model.data.IsFirstPage == false) {
            out.push('                <input type="radio" name="Page" value="');
        out.push(model.data.PreviousPage);
        out.push('" />');
                        }
            out.push('</label>');
        out.push('</div>');
        out.push('    <input type="number" name="Page" value="');
        out.push(model.data.Page);
        out.push('" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" /> of ');
        out.push(model.data.PageCount);
            out.push('<div class="btn-group">');
        out.push('        <label class="ms-page-index btn btn-default ');
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
            out.push('        <label class="ms-page-index btn btn-default ');
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
                if (model.Search || model.ToolbarTemplate || model.Create) {
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
                                if (model.Create) {
            out.push('<button class="btn btn-default" type="button" value="Create">');
        out.push('<span class="glyphicon glyphicon-plus"></span>Add');
        out.push('</button>');
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
})(gridponent);

