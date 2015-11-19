var gridponent = gridponent || {};
(function(gp) { 
    /***************\
     change monitor
    \***************/
    gp.ChangeMonitor = function (elem, selector, model, afterSync) {
        var self = this;
        this.model = model;
        this.beforeSync = null;
        this.afterSync = afterSync;
        this.elem = elem;
        this.listener = function (evt) {
            self.syncModel(evt.target, self.model);
            self.afterSync(evt, model);
        };
        // add change event handler to elem
        gp.on(elem, 'change', selector, this.listener);
    };
    
    gp.ChangeMonitor.prototype = {
        syncModel: function (target, model) {
            // get name and value of target
            var name = target.name;
            var value = target.value;
            if (typeof (this.beforeSync) === 'function') {
                if (this.beforeSync(name, value, this.model)) {
                    // sync was handled by the beforeSync callback
                    return;
                }
            }
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
        },
        stop: function () {
            // clean up
            gp.off(this.elem, 'change', this.listener);
        }
    };
    /***************\
     component base 
    \***************/
    gp.ComponentBase = Object.create(HTMLElement.prototype);
    
    gp.ComponentBase.initialize = function () {
        this.config = gp.getConfig(this);
        return this;
    };
    
    gp.ComponentBase.createdCallback = function () {
        this.initialize();
    };
    /***************\
     main component
    \***************/
    
    gp.Table = Object.create(gp.ComponentBase);
    
    gp.Table.initialize = function () {
        var self = this;
        gp.ComponentBase.initialize.call(this);
        this.config.Columns = [];
        this.config.data = {};
        this.config.ID = gp.createUID();
        for (var i = 0; i < this.children.length; i++) {
            var col = this.children[i];
            var colConfig = gp.getConfig(col);
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
    
    gp.Table.beginMonitor = function () {
        var self = this;
        // monitor changes to search, sort, and paging
        var monitor = new gp.ChangeMonitor(this, '.table-toolbar [name=Search], thead input, .table-pager input', this.config.data, function (evt) {
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
    
    gp.Table.render = function (model) {
        try {
            this.innerHTML = gp.templates['gridponent'](model);
        }
        catch (ex) {
            console.log(ex.message);
            console.log(ex.stack);
        }
    };
    
    gp.Table.measureTables = function (element) {
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
    
    gp.Table.syncColumnWidths = function (element) {
        // for fixed headers, adjust the padding on the header to match the width of the main table
        var colgroup = element.querySelector('.table-header colgroup');
        if (colgroup) {
            var bodyCols = element.querySelectorAll('.table-body > table > tbody > tr:first-child > td');
            var width;
            var out = []
            for (var i = 0; i < bodyCols.length; i++) {
                width = bodyCols[i].offsetWidth;
                out.push('<col style="width:' + width + 'px;"></col>');
            }
            colgroup.innerHTML = out.join('');
        }
    };
    
    gp.Table.refresh = function (config) {
        var rowsTemplate = gp.helpers['tableRows'];
        var pagerTemplate = gp.templates['gridponent-pager'];
        var html = rowsTemplate.call(config);
        this.querySelector('.table-body > table > tbody').innerHTML = html;
        html = pagerTemplate(config);
        this.querySelector('.table-pager').innerHTML = html;
        html = gp.helpers['sortStyle'].call(config);
        this.querySelector('style').innerHTML = html;
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
    
    gp.Table.addCommandHandlers = function () {
        var self = this;
        // listen for command button clicks
        gp.on(this, 'click', 'button[value]', function (evt) {
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
            var monitor;
            h.post(url, row, function (response) {
                // put the cells back
                var template = gp.templates['gridponent-cells'];
                var html = template(self.config);
                tr.innerHTML = html;
                // dispose of the ChangeMonitor
                monitor = tr['gp-change-monitor'];
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
    
    document.registerElement('grid-ponent', {
        prototype: gp.Table
    });
    /***************\
         globals
    \***************/
    (function () {
    
        gp.padLeft = function (str, length, char) {
            var s = str.toString();
            char = char || ' ';
            while (s.length < length)
                s = char + s;
            return s;
        };
    
        var iso8601 = /^[012][0-9]{3}-[01][0-9]-[0123][0-9]T/;
    
        var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
        var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
        gp.formatDate = function (date, format) {
            var dt = date;
    
            if (typeof dt === 'string') {
                // check for iso 8601
                if (iso8601.test(dt)) {
                    dt = new Date(dt);
                }
                else {
                    // check for MS Date(1234567890-12345)
                    var msDate = (/-?\d+/).exec(dt);
                    if (msDate != null) {
                        var d1 = new Date(parseInt(msDate[0])).toUTCString().replace("UTC", "");
                        dt = new Date(d1);
                    }
                }
            }
    
            switch (format) {
                case 'd':
                    format = 'M/d/yyyy';
                    break;
                case 'D':
                    format = 'dddd, MMMM d, yyyy';
                    break;
                case 't':
                    format = 'h:mm tt';
                    break;
                case 'T':
                    format = 'h:mm:ss tt';
                    break;
            }
    
            var y = dt.getFullYear();
            var m = dt.getMonth() + 1;
            var d = dt.getDate();
            var h = dt.getHours();
            var n = dt.getMinutes();
            var s = dt.getSeconds();
            var f = dt.getMilliseconds();
            var w = dt.getDay();
    
            format = format
                .replace('yyyy', y)
                .replace('yy', y.toString().slice(-2))
                .replace('ss', gp.padLeft(s, 2, '0'))
                .replace('s', s)
                .replace('f', f)
                .replace('mm', gp.padLeft(n, 2, '0'))
                .replace('m', n)
                .replace('HH', gp.padLeft(h, 2, '0'))
                .replace('H', h)
                .replace('hh', gp.padLeft((h > 12 ? h - 12 : h), 2, '0'))
                .replace('h', (h > 12 ? h - 12 : h))
                //replace conflicting tokens with alternate tokens
                .replace('tt', (h > 11 ? '>>' : '<<'))
                .replace('t', (h > 11 ? '##' : '$$'))
                .replace('MMMM', '!!')
                .replace('MMM', '@@')
                .replace('MM', gp.padLeft(m, 2, '0'))
                .replace('M', m)
                .replace('dddd', '^^')
                .replace('ddd', '&&')
                .replace('dd', gp.padLeft(d, 2, '0'))
                .replace('d', d)
                //replace alternate tokens
                .replace('>>', 'PM')
                .replace('<<', 'AM')
                .replace('##', 'P')
                .replace('$$', 'A')
                .replace('!!', monthNames[m - 1])
                .replace('@@', monthNames[m - 1].substring(0, 3))
                .replace('^^', dayNames[w])
                .replace('&&', dayNames[w].substring(0, 3));
    
            return format;
        };
    
        var chars = [/&/g, /</g, />/g, /"/g, /'/g, /`/g];
    
        var scaped = ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&#96;'];
    
        gp.escapeHTML = function (obj) {
            if (typeof obj !== 'string') {
                return obj;
            }
            for (var i = 0; i < chars.length; i++) {
                obj = obj.replace(chars[i], scaped[i]);
            }
            return obj;
        };
    
        gp.camelize = function (str) {
            return str.replace(/(?:^|[-_])(\w)/g, function (_, c) {
                return c ? c.toUpperCase() : '';
            });
        };
    
        gp.getConfig = function (elem) {
            var config = {}, name, attr, attrs = elem.attributes;
            for (var i = attrs.length - 1; i >= 0; i--) {
                attr = attrs[i];
                name = gp.camelize(attr.name);
                // convert "true" and "false" to boolean
                config[name] = attr.value === "true" || attr.value === "false" ? attr.value === "true" : attr.value;
            }
            return config;
        };
    
        gp.getType = function (a) {
            if (a === null) {
                return null;
            }
            if (a instanceof Date) {
                return 'date';
            }
            if (Array.isArray(a)) {
                return 'array';
            }
            if (typeof (a) === 'string') {
                if (iso8601.test(a)) {
                    return 'date';
                }
            }
            // 'number','string','boolean','function','object','undefined'
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
    
        gp.closest = function (elem, selector) {
            // if elem is a selector, convert it to an element
            if (typeof (elem) === 'string') {
                elem = document.querySelector(elem);
            }
    
            if (elem) {
                // start with elem's immediate parent
                var e = elem.parentElement;
    
                var potentials = document.querySelectorAll(selector);
    
                while (e) {
                    for (var j = 0; j < potentials.length; j++) {
                        if (e == potentials[j]) {
                            return e;
                        }
                    }
                    e = e.parentElement;
                }
            }
        };
    
        gp.hasValue = function (val) {
            return val !== undefined && val !== null;
        };
    
        gp.isNullOrEmpty = function (val) {
            return gp.hasValue(val) === false || (val.length && val.length === 0);
        };
    
        gp.copyObj = function (obj) {
            var newObj;
    
            var type = gp.getType(obj);
    
            switch (type) {
                case 'object':
                    newObj = {};
                    var props = Object.getOwnPropertyNames(obj);
                    props.forEach(function (prop) {
                        newObj[prop] = obj[prop];
                    });
                    break;
                case 'array':
                    newObj = [];
                    obj.forEach(function (elem, index) {
                        newObj[index] = elem;
                    });
                    break;
                default:
                    newObj = obj;
                    break;
            };
    
            return newObj;
        };
    
        gp.resolveObjectPath = function (path) {
            // split by dots, then square brackets
            // we're assuming there won't be dots between square brackets
            try {
                var currentObj = window;
                var paths = path.split('.');
    
                for (var i = 0; i < paths.length && currentObj; i++) {
                    var name = paths[i];
                    var split = name.split('[');
                    var objName = split[0];
                    currentObj = currentObj[objName];
                    if (currentObj && split.length > 1) {
                        var indexer = split[1].substring(0, split[1].indexOf(']') - 1);
                        currentObj = currentObj[indexer];
                    }
                }
    
                return currentObj;
            }
            catch (err) {
                console.log('Could not resolve object path: ' + path);
                console.log(err);
            }
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
            var key = slice(numberToString(Math.random(), 36), 2);
            return key in uids ? createUID() : uids[key] = key;
        };
    
    })();
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
    /***************\
       mock-http
    \***************/
    gp.Http = function () { };
    
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
            var queryString = url.substring(url.indedOf('?') + 1);
            var model = this.deserialize(queryString);
            var count, qry = gryst.from(gp.products);
            if (gp.isNullOrEmpty(model.Search) === false) {
                var props = Object.getOwnPropertyNames(gp.products[0]);
                var search = model.Search.toLowerCase();
                qry = qry.where(function (row) {
                    for (var i = 0; i < props.length; i++) {
                        if (row[props[i]] && row[props[i]].toString().toLowerCase().indexOf(search) !== -1) {
                            return true;
                        }
                    }
                    return false;
                });
            }
            if (gp.isNullOrEmpty(model.OrderBy) === false) {
                if (model.Desc) {
                    qry = qry.orderByDescending(model.OrderBy);
                }
                else {
                    qry = qry.orderBy(model.OrderBy);
                }
            }
            count = qry.run().length;
            qry = qry.skip(skip).take(model.Top);
    
            model.Data = qry.run();
            setTimeout(function () {
                callback(model);
            });
        },
        post: function (url, data, callback, error) {
            setTimeout(function () {
                callback(data);
            });
        }
    };
    /***************\
    server-side pager
    \***************/
    gp.ServerPager = function (config) {
        this.config = config;
        this.baseUrl = config.Read;
    };
    
    gp.ServerPager.prototype = {
        get: function (model, callback, error) {
            var self = this;
            var h = new gp.Http();
            // extract only the properties needed for paging
            var url = this.baseUrl + '?' + h.serialize(model.data, ['Page', 'Top', 'OrderBy', 'Desc', 'Search', 'Skip']);
            var cb = function (response) {
                callback(response);
            };
            h.get(url, cb, error);
        },
        copyProps: function (from, to) {
            var props = Object.getOwnPropertyNames(from);
            props.forEach(function (prop) {
                to[prop] = from[prop];
            });
        }
    };
    
    
    /***************\
    client-side pager
    \***************/
    gp.ClientPager = function (config) {
        this.data = config.data.Data;
        this.columns = config.Columns;
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
        get: function (model, callback, error) {
            try {
                var skip = this.getSkip(model);
                gryst.logging = true;
                var count, qry = gryst.from(this.data);
                console.log('data length: ' + this.data.length);
                if (gp.isNullOrEmpty(model.Search) === false) {
                    var props = gryst.from(this.columns).where(function (c) { return c !== undefined; }).select('Field').run();
                    var search = model.Search.toLowerCase();
                    qry = qry.where(function (row) {
                        for (var i = 0; i < props.length; i++) {
                            if (row[props[i]] && row[props[i]].toString().toLowerCase().indexOf(search) !== -1) {
                                return true;
                            }
                        }
                        return false;
                    });
                }
                if (gp.isNullOrEmpty(model.OrderBy) === false) {
                    if (model.Desc) {
                        qry = qry.orderByDescending(model.OrderBy);
                    }
                    else {
                        qry = qry.orderBy(model.OrderBy);
                    }
                }
                model.TotalRows = qry.run().length;
                console.log('total rows: ' + model.TotalRows);
                qry = qry.skip(skip).take(model.Top);
    
                model.Data = qry.run();
    
            }
            catch (ex) {
                console.log(ex);
                console.log(ex.message);
                console.log(ex.stack);
            }
            callback(model);
        },
    };
    /***************\
      paging model  
    \***************/
    gp.PagingModel = function (data) {
        var self = this;
        this.Top = 25;
        this.PageIndex = 0;
        this.Types = {};
        this.Page = 1;
        this.OrderBy = '';
        this.Desc = false;
        this.Search = '';
        this.TotalRows = data.length;
        this.Data = data;
    
        Object.defineProperty(self, 'PageCount', {
            get: function () {
                return Math.ceil(self.TotalRows / self.Top);
            }
        });
    
        Object.defineProperty(self, 'Skip', {
            get: function () {
                if (self.PageCount === 0) return 0;
                if (self.Page < 1) self.Page = 1;
                else if (self.Page > self.PageCount) return self.Page = self.PageCount;
                return self.PageIndex * self.Top;
            }
        });
    };
    gp.templates = gp.templates || {};
    gp.templates['gridponent-body'] = function(model, arg) {
        var out = [];
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                if (model.FixedHeaders) {
                        out.push(gp.helpers['colgroup'].call(model));
                    } else {
                        out.push(gp.helpers['thead'].call(model));
                    }
            out.push('<tbody>');
                    out.push(gp.helpers['tableRows'].call(model));
            out.push('</tbody>');
                if (model.Footer) {
            out.push('<tfoot>');
        out.push('<tr>');
                            model.Columns.forEach(function(col, index) {
            out.push('<td class="footer-cell">');
                                    out.push(gp.helpers['footerCell'].call(model, col));
            out.push('</td>');
                            });
            out.push('</tr>');
        out.push('</tfoot>');
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
        out.push('<td class="commands-cell" colspan="2">');
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
            out.push('<td class="commands-cell">');
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
                        out.push(gp.helpers['editCell'].call(model, col));
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
        out.push('<input type="radio" name="Page" value="1" />');
        out.push('</label>');
            out.push('    <label class="ms-page-index btn btn-default ');
        if (model.data.IsFirstPage) {
        out.push(' disabled ');
        }
        out.push('" title="Previous page">');
        out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
        out.push('        <input type="radio" name="Page" value="');
        out.push(model.data.PreviousPage);
        out.push('" />');
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
        out.push('        <input type="radio" name="Page" value="');
        out.push(model.data.NextPage);
        out.push('" />');
        out.push('</label>');
            out.push('    <label class="ms-page-index btn btn-default ');
        if (model.data.IsLastPage) {
        out.push(' disabled ');
        }
        out.push('" title="Last page">');
        out.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>');
        out.push('        <input type="radio" name="Page" value="');
        out.push(model.data.PageCount);
        out.push('" />');
        out.push('</label>');
        }
                return out.join('');
    };
    gp.templates['gridponent'] = function(model, arg) {
        var out = [];
        out.push('<div class="table-container');
        if (model.Responsive) {
        out.push(' table-responsive');
        }
            if (model.FixedHeaders) {
        out.push(' fixed-headers');
        }
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
                        out.push(gp.helpers['colgroup'].call(model));
                            out.push(gp.helpers['thead'].call(model));
            out.push('</table>');
        out.push('</div>');
                }
            out.push('    <div class="table-body ');
        if (model.FixedHeaders) {
        out.push('table-scroll');
        }
        out.push('" style="');
        out.push(model.Style);
        out.push('">');
                    out.push(gp.templates['gridponent-body'](model));
            out.push('</div>');
                if (model.Paging) {
            out.push('<div class="table-pager">');
                        out.push(gp.templates['gridponent-pager'](model));
            out.push('</div>');
                }
            out.push('<style type="text/css">');
                    out.push(gp.helpers['sortStyle'].call(model));
            out.push('</style>');
        out.push('</div>');
        return out.join('');
    };
})(gridponent);