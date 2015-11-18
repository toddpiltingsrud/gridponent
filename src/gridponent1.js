var tp = tp || {};
var tp = tp || {};

/***************\
 change monitor
\***************/
tp.ChangeMonitor = function (elem, selector, model, afterSync) {
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
    tp.on(elem, 'change', selector, this.listener);
};

tp.ChangeMonitor.prototype = {
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
        type = tp.getType(model[name]);
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
        tp.off(this.elem, 'change', this.listener);
    }
};

/***************\
 component base 
\***************/
tp.ComponentBase = Object.create(HTMLElement.prototype);

tp.ComponentBase.initialize = function () {
    this.config = tp.getConfig(this);
    return this;
};


tp.ComponentBase.createdCallback = function () {
    this.initialize();
};

/***************\
     globals
\***************/
(function () {

    tp.padLeft = function (str, length, char) {
        var s = str.toString();
        char = char || ' ';
        while (s.length < length)
            s = char + s;
        return s;
    };

    var iso8601 = /^[012][0-9]{3}-[01][0-9]-[0123][0-9]T/;

    var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    tp.formatDate = function (date, format) {
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
            .replace('ss', tp.padLeft(s, 2, '0'))
            .replace('s', s)
            .replace('f', f)
            .replace('mm', tp.padLeft(n, 2, '0'))
            .replace('m', n)
            .replace('HH', tp.padLeft(h, 2, '0'))
            .replace('H', h)
            .replace('hh', tp.padLeft((h > 12 ? h - 12 : h), 2, '0'))
            .replace('h', (h > 12 ? h - 12 : h))
            //replace conflicting tokens with alternate tokens
            .replace('tt', (h > 11 ? '>>' : '<<'))
            .replace('t', (h > 11 ? '##' : '$$'))
            .replace('MMMM', '!!')
            .replace('MMM', '@@')
            .replace('MM', tp.padLeft(m, 2, '0'))
            .replace('M', m)
            .replace('dddd', '^^')
            .replace('ddd', '&&')
            .replace('dd', tp.padLeft(d, 2, '0'))
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

    tp.escapeHTML = function (obj) {
        if (typeof obj !== 'string') {
            return obj;
        }
        for (var i = 0; i < chars.length; i++) {
            obj = obj.replace(chars[i], scaped[i]);
        }
        return obj;
    };

    tp.camelize = function (str) {
        return str.replace(/(?:^|[-_])(\w)/g, function (_, c) {
            return c ? c.toUpperCase() : '';
        });
    };

    tp.getConfig = function (elem) {
        var config = {}, name, attr, attrs = elem.attributes;
        for (var i = attrs.length - 1; i >= 0; i--) {
            attr = attrs[i];
            name = tp.camelize(attr.name);
            // convert "true" and "false" to boolean
            config[name] = attr.value === "true" || attr.value === "false" ? attr.value === "true" : attr.value;
        }
        return config;
    };

    tp.getType = function (a) {
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

    tp.on = function (elem, event, targetSelector, listener) {
        // if elem is a selector, convert it to an element
        if (typeof (elem) === 'string') {
            elem = document.querySelector(elem);
        }

        if (!tp.hasValue(elem)) {
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
        // so we can remove the handler with tp.off
        var propName = 'tp-listeners-' + event;
        var listeners = elem[propName] || (elem[propName] = []);
        listeners.push({
            pub: listener,
            priv: privateListener
        });
    };

    tp.off = function (elem, event, listener) {
        // check for a matching listener store on the element
        var listeners = elem['tp-listeners-' + event];
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

    tp.closest = function (elem, selector) {
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

    tp.hasValue = function (val) {
        return val !== undefined && val !== null;
    };

    tp.isNullOrEmpty = function (val) {
        return tp.hasValue(val) === false || (val.length && val.length === 0);
    };

    tp.copyObj = function (obj) {
        var newObj;

        var type = tp.getType(obj);

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

    tp.resolveObjectPath = function (path) {
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

    tp.createUID = function () {
        var key = slice(numberToString(Math.random(), 36), 2);
        return key in uids ? createUID() : uids[key] = key;
    };

})();

/***************\
  table helpers
\***************/

(function () {

    tp.helpers = {};

    var extend = function (name, func) {
        tp.helpers[name] = func;
    };

    extend('toolbarTemplate', function () {
        var out = [];

        if (this.ToolbarTemplate) {
            // it's either a selector or a function name
            template = tp.resolveObjectPath(this.ToolbarTemplate);
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
            var sort = tp.escapeHTML(col.Sort || col.Field);
            var type = (col.Type || '').toLowerCase();
            out.push('<th class="' + type + ' ' + sort + '">');
            if (tp.hasValue(col.Commands) === false && sort) {
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
        var template = tp.templates[name];
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
            out.push(tp.templates['gridponent-cells'](self));
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
            template = tp.resolveObjectPath(col.Template);
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
        else if (tp.hasValue(val)) {
            // show a checkmark for bools
            if (type === 'boolean') {
                if (val === true) {
                    out.push('<span class="glyphicon glyphicon-ok"></span>');
                }
            }
            else if (type === 'date') {
                // apply formatting to dates
                format = col.Format || 'M/d/yyyy';
                out.push(tp.formatDate(val, format));
            }
            else {
                out.push(tp.escapeHTML(val));
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
            template = tp.resolveObjectPath(col.EditTemplate);
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
                val = tp.formatDate(val, 'yyyy-MM-dd');
            }
            out.push('<input class="form-control" name="' + col.Field + '" type="');
            switch (col.Type) {
                case 'date':
                    out.push('date" value="' + tp.escapeHTML(val) + '" />');
                    break;
                case 'number':
                    out.push('number" value="' + tp.escapeHTML(val) + '" />');
                    break;
                case 'boolean':
                    out.push('checkbox" value="true"');
                    if (val) {
                        out.push(' checked="checked"');
                    }
                    out.push(' />');
                    break;
                default:
                    out.push('text" value="' + tp.escapeHTML(val) + '" />');
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
        if (tp.isNullOrEmpty(this.data.OrderBy) === false) {
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
    gridponent
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
        this.innerHTML = tp.templates['gridponent'](model);
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
    var pagerTemplate = tp.templates['gridponent-pager'];
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
        var template = tp.templates['gridponent-edit-cells'];
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
            var template = tp.templates['gridponent-cells'];
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
        var template = tp.templates['gridponent-cells'];
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

document.registerElement('grid-ponent', {
    prototype: tp.Table
});

var tp = tp || {};
var tp = tp || {};

/***************\
 change monitor
\***************/
tp.ChangeMonitor = function (elem, selector, model, afterSync) {
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
    tp.on(elem, 'change', selector, this.listener);
};

tp.ChangeMonitor.prototype = {
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
        type = tp.getType(model[name]);
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
        tp.off(this.elem, 'change', this.listener);
    }
};

/***************\
 component base 
\***************/
tp.ComponentBase = Object.create(HTMLElement.prototype);

tp.ComponentBase.initialize = function () {
    this.config = tp.getConfig(this);
    return this;
};


tp.ComponentBase.createdCallback = function () {
    this.initialize();
};

/***************\
     globals
\***************/
(function () {

    tp.padLeft = function (str, length, char) {
        var s = str.toString();
        char = char || ' ';
        while (s.length < length)
            s = char + s;
        return s;
    };

    var iso8601 = /^[012][0-9]{3}-[01][0-9]-[0123][0-9]T/;

    var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    tp.formatDate = function (date, format) {
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
            .replace('ss', tp.padLeft(s, 2, '0'))
            .replace('s', s)
            .replace('f', f)
            .replace('mm', tp.padLeft(n, 2, '0'))
            .replace('m', n)
            .replace('HH', tp.padLeft(h, 2, '0'))
            .replace('H', h)
            .replace('hh', tp.padLeft((h > 12 ? h - 12 : h), 2, '0'))
            .replace('h', (h > 12 ? h - 12 : h))
            //replace conflicting tokens with alternate tokens
            .replace('tt', (h > 11 ? '>>' : '<<'))
            .replace('t', (h > 11 ? '##' : '$$'))
            .replace('MMMM', '!!')
            .replace('MMM', '@@')
            .replace('MM', tp.padLeft(m, 2, '0'))
            .replace('M', m)
            .replace('dddd', '^^')
            .replace('ddd', '&&')
            .replace('dd', tp.padLeft(d, 2, '0'))
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

    tp.escapeHTML = function (obj) {
        if (typeof obj !== 'string') {
            return obj;
        }
        for (var i = 0; i < chars.length; i++) {
            obj = obj.replace(chars[i], scaped[i]);
        }
        return obj;
    };

    tp.camelize = function (str) {
        return str.replace(/(?:^|[-_])(\w)/g, function (_, c) {
            return c ? c.toUpperCase() : '';
        });
    };

    tp.getConfig = function (elem) {
        var config = {}, name, attr, attrs = elem.attributes;
        for (var i = attrs.length - 1; i >= 0; i--) {
            attr = attrs[i];
            name = tp.camelize(attr.name);
            // convert "true" and "false" to boolean
            config[name] = attr.value === "true" || attr.value === "false" ? attr.value === "true" : attr.value;
        }
        return config;
    };

    tp.getType = function (a) {
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

    tp.on = function (elem, event, targetSelector, listener) {
        // if elem is a selector, convert it to an element
        if (typeof (elem) === 'string') {
            elem = document.querySelector(elem);
        }

        if (!tp.hasValue(elem)) {
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
        // so we can remove the handler with tp.off
        var propName = 'tp-listeners-' + event;
        var listeners = elem[propName] || (elem[propName] = []);
        listeners.push({
            pub: listener,
            priv: privateListener
        });
    };

    tp.off = function (elem, event, listener) {
        // check for a matching listener store on the element
        var listeners = elem['tp-listeners-' + event];
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

    tp.closest = function (elem, selector) {
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

    tp.hasValue = function (val) {
        return val !== undefined && val !== null;
    };

    tp.isNullOrEmpty = function (val) {
        return tp.hasValue(val) === false || (val.length && val.length === 0);
    };

    tp.copyObj = function (obj) {
        var newObj;

        var type = tp.getType(obj);

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

    tp.resolveObjectPath = function (path) {
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

    tp.createUID = function () {
        var key = slice(numberToString(Math.random(), 36), 2);
        return key in uids ? createUID() : uids[key] = key;
    };

})();

/***************\
  table helpers
\***************/

(function () {

    tp.helpers = {};

    var extend = function (name, func) {
        tp.helpers[name] = func;
    };

    extend('toolbarTemplate', function () {
        var out = [];

        if (this.ToolbarTemplate) {
            // it's either a selector or a function name
            template = tp.resolveObjectPath(this.ToolbarTemplate);
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
            var sort = tp.escapeHTML(col.Sort || col.Field);
            var type = (col.Type || '').toLowerCase();
            out.push('<th class="' + type + ' ' + sort + '">');
            if (tp.hasValue(col.Commands) === false && sort) {
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
        var template = tp.templates[name];
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
            out.push(tp.templates['gridponent-cells'](self));
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
            template = tp.resolveObjectPath(col.Template);
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
        else if (tp.hasValue(val)) {
            // show a checkmark for bools
            if (type === 'boolean') {
                if (val === true) {
                    out.push('<span class="glyphicon glyphicon-ok"></span>');
                }
            }
            else if (type === 'date') {
                // apply formatting to dates
                format = col.Format || 'M/d/yyyy';
                out.push(tp.formatDate(val, format));
            }
            else {
                out.push(tp.escapeHTML(val));
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
            template = tp.resolveObjectPath(col.EditTemplate);
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
                val = tp.formatDate(val, 'yyyy-MM-dd');
            }
            out.push('<input class="form-control" name="' + col.Field + '" type="');
            switch (col.Type) {
                case 'date':
                    out.push('date" value="' + tp.escapeHTML(val) + '" />');
                    break;
                case 'number':
                    out.push('number" value="' + tp.escapeHTML(val) + '" />');
                    break;
                case 'boolean':
                    out.push('checkbox" value="true"');
                    if (val) {
                        out.push(' checked="checked"');
                    }
                    out.push(' />');
                    break;
                default:
                    out.push('text" value="' + tp.escapeHTML(val) + '" />');
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
        if (tp.isNullOrEmpty(this.data.OrderBy) === false) {
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
    gridponent
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
        this.innerHTML = tp.templates['gridponent'](model);
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
    var pagerTemplate = tp.templates['gridponent-pager'];
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
        var template = tp.templates['gridponent-edit-cells'];
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
            var template = tp.templates['gridponent-cells'];
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
        var template = tp.templates['gridponent-cells'];
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

document.registerElement('gridponent', {
    prototype: tp.Table
});

var tp = tp || {};

/***************\
     http        
\***************/
tp.Http = function () { };

tp.Http.prototype = {
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
    createXhr: function (type, url, callback, error) {
        var xhr = new XMLHttpRequest();
        xhr.open(type.toUpperCase(), url, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onload = function () {
            callback(JSON.parse(xhr.responseText), xhr);
        }
        xhr.onerror = error;
        return xhr;
    },
    get: function (url, callback, error) {
        var xhr = this.createXhr('GET', url, callback, error);
        xhr.send();
    },
    post: function (url, data, callback, error) {
        var s = this.serialize(data);
        var xhr = this.createXhr('POST', url, callback, error);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send(s);
    }
};

/***************\
server-side pager
\***************/
tp.ServerPager = function (config) {
    this.config = config;
    this.baseUrl = config.Read;
};

tp.ServerPager.prototype = {
    get: function (model, callback, error) {
        var self = this;
        var h = new tp.Http();
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
tp.ClientPager = function (config) {
    this.data = config.data.Data;
    this.columns = config.Columns;
};

tp.ClientPager.prototype = {
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
            if (tp.isNullOrEmpty(model.Search) === false) {
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
            if (tp.isNullOrEmpty(model.OrderBy) === false) {
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
tp.PagingModel = function (data) {
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

'use strict';

var tp = tp || {};
tp.templates = tp.templates || {};
tp.templates['gridponent-body'] = function (model, arg) {
    var out = [];
    out.push('<table class="table');
    if (model.Responsive) {
        out.push(' responsive');
    }
    out.push('" cellpadding="0" cellspacing="0">');
    if (model.FixedHeaders) {
        out.push(tp.helpers['colgroup'].call(model));
    } else {
        out.push(tp.helpers['thead'].call(model));
    }
    out.push('<tbody>');
    out.push(tp.templates['gridponent-rows'](model));
    out.push('</tbody>');
    if (model.Footer) {
        out.push('<tfoot>');
        out.push('<tr>');
        model.Columns.forEach(function (col, index) {
            out.push('<td class="footer-cell">');
            out.push(tp.helpers['footerCell'].call(model, col));
            out.push('</td>');
        });
        out.push('</tr>');
        out.push('</tfoot>');
    }
    out.push('</table>');
    return out.join('');
};
tp.templates['gridponent-cells'] = function (model, arg) {
    var out = [];
    model.Columns.forEach(function (col, index) {
        if (col.Commands) {
            out.push(tp.templates['gridponent-commands'](model, col));
        } else {
            if (model.Responsive) {
                out.push('<td class="clearfix"></td>');
                out.push(tp.helpers['headerCell'].call(model, col));
            }
            out.push(tp.helpers['bodyCell'].call(model, col));
        }
    });
    return out.join('');
};
tp.templates['gridponent-commands'] = function (model, arg) {
    var out = [];
    out.push('<td class="commands-cell" colspan="2">');
    out.push('<div class="btn-group" role="group">');
    arg.Commands.forEach(function (cmd, index) {
        if (cmd == 'Edit') {
            out.push('                <button type="button" class="btn btn-primary btn-xs" value="');
            out.push('{{cmd}}');
            out.push('">');
            out.push('                    <span class="glyphicon glyphicon-edit"></span>');
            out.push('{{cmd}}');
            out.push('</button>');
        }
        if (cmd == 'Delete') {
            out.push('                <button type="button" class="btn btn-danger btn-xs" value="');
            out.push('{{cmd}}');
            out.push('">');
            out.push('                    <span class="glyphicon glyphicon-remove"></span>');
            out.push('{{cmd}}');
            out.push('</button>');
        }
    });
    out.push('</div>');
    out.push('</td>');
    return out.join('');
};
tp.templates['gridponent-edit-cells'] = function (model, arg) {
    var out = [];
    model.Columns.forEach(function (col, index) {
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
            if (model.Responsive) {
                out.push('<td class="clearfix"></td>');
                out.push(tp.helpers['headerCell'].call(model, col));
            }
            out.push(tp.helpers['editCell'].call(model, col));
        }
    });
    return out.join('');
};
tp.templates['gridponent-pager'] = function (model, arg) {
    var out = [];
    out.push(tp.helpers['setPagerFlags'].call(model));
    if (model.HasPages) {
        out.push('    <label class="ms-page-index btn btn-default ');
        if (model.IsFirstPage) {
            out.push(' disabled ');
        }
        out.push('" title="First page">');
        out.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>');
        out.push('<input type="radio" name="Page" value="1" />');
        out.push('</label>');
        out.push('    <label class="ms-page-index btn btn-default ');
        if (model.IsFirstPage) {
            out.push(' disabled ');
        }
        out.push('" title="Previous page">');
        out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
        out.push('        <input type="radio" name="Page" value="');
        out.push('{{model.PreviousPage}}');
        out.push('" />');
        out.push('</label>');
        out.push('    <input type="number" name="Page" value="');
        out.push('{{model.Page}}');
        out.push('" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" /> of ');
        out.push('{{PageCount}}');
        out.push('    <label class="ms-page-index btn btn-default ');
        if (model.IsLastPage) {
            out.push(' disabled ');
        }
        out.push('" title="Next page">');
        out.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>');
        out.push('        <input type="radio" name="Page" value="');
        out.push('{{model.NextPage}}');
        out.push('" />');
        out.push('</label>');
        out.push('    <label class="ms-page-index btn btn-default ');
        if (model.IsLastPage) {
            out.push(' disabled ');
        }
        out.push('" title="Last page">');
        out.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>');
        out.push('        <input type="radio" name="Page" value="');
        out.push('{{model.PageCount}}');
        out.push('" />');
        out.push('</label>');
    }
    return out.join('');
};
tp.templates['gridponent-rows'] = function (model, arg) {
    var out = [];
    model.data.Data.forEach(function (row, index) {
        out.push('    <tr data-index="');
        out.push(index);
        out.push('">');
        out.push(tp.templates['gridponent-cells'](model, row));
        out.push('</tr>');
    });
    return out.join('');
};
tp.templates['gridponent'] = function (model, arg) {
    var out = [];
    out.push('<div class="table-container" id="');
    out.push('{{uid}}');
    out.push('">');
    if (model.Toolbar) {
        out.push('<div class="table-toolbar">');
        if (model.ToolbarTemplate) {
            out.push(tp.templates['toolbarTemplate'](model));
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
        out.push('<div class="table-header" style="padding-right:17px">');
        out.push('        <table class="table ');
        if (model.Responsive) {
            out.push(' responsive ');
        }
        out.push('" cellpadding="0" cellspacing="0" style="margin-bottom:0">');
        out.push(tp.helpers['colgroup'].call(model));
        out.push(tp.helpers['thead'].call(model));
        out.push('</table>');
        out.push('</div>');
    }
    out.push('    <div class="table-body ');
    if (model.FixedHeaders) {
        out.push('table-scroll');
    }
    out.push('" style="');
    out.push('{{model.Style}}');
    out.push('">');
    out.push(tp.templates['gridponent-body'](model));
    out.push('</div>');
    if (model.Paging) {
        out.push('<div class="table-pager">');
        out.push(tp.helpers['tablePager'].call(model));
        out.push('</div>');
    }
    out.push('</div>');
    return out.join('');
};


"use strict";var tp=tp||{};tp.templates=tp.templates||{};tp.templates["gridponent-body"]=function(n){var t=[];return t.push('<table class="table'),n.Responsive&&t.push(" responsive"),t.push('" cellpadding="0" cellspacing="0">'),n.FixedHeaders?t.push(tp.helpers.colgroup.call(n)):t.push(tp.helpers.thead.call(n)),t.push("<tbody>"),t.push(tp.templates["gridponent-rows"](n)),t.push("<\/tbody>"),n.Footer&&(t.push("<tfoot>"),t.push("<tr>"),n.Columns.forEach(function(i){t.push('<td class="footer-cell">');t.push(tp.helpers.footerCell.call(n,i));t.push("<\/td>")}),t.push("<\/tr>"),t.push("<\/tfoot>")),t.push("<\/table>"),t.join("")};tp.templates["gridponent-cells"]=function(n){var t=[];return n.Columns.forEach(function(i){i.Commands?t.push(tp.templates["gridponent-commands"](n,i)):(n.Responsive&&(t.push('<td class="clearfix"><\/td>'),t.push(tp.helpers.headerCell.call(n,i))),t.push(tp.helpers.bodyCell.call(n,i)))}),t.join("")};tp.templates["gridponent-commands"]=function(n,t){var i=[];return i.push('<td class="commands-cell" colspan="2">'),i.push('<div class="btn-group" role="group">'),t.Commands.forEach(function(n){n=="Edit"&&(i.push('                <button type="button" class="btn btn-primary btn-xs" value="'),i.push("{{cmd}}"),i.push('">'),i.push('                    <span class="glyphicon glyphicon-edit"><\/span>'),i.push("{{cmd}}"),i.push("<\/button>"));n=="Delete"&&(i.push('                <button type="button" class="btn btn-danger btn-xs" value="'),i.push("{{cmd}}"),i.push('">'),i.push('                    <span class="glyphicon glyphicon-remove"><\/span>'),i.push("{{cmd}}"),i.push("<\/button>"))}),i.push("<\/div>"),i.push("<\/td>"),i.join("")};tp.templates["gridponent-edit-cells"]=function(n){var t=[];return n.Columns.forEach(function(i){i.Commands?(t.push('<td class="commands-cell">'),t.push('<div class="btn-group" role="group">'),t.push('<button type="button" class="btn btn-primary btn-xs" value="Update">'),t.push('<span class="glyphicon glyphicon-save"><\/span>Save'),t.push("<\/button>"),t.push('<button type="button" class="btn btn-default btn-xs" value="Cancel">'),t.push('<span class="glyphicon glyphicon-remove"><\/span>Cancel'),t.push("<\/button>"),t.push("<\/div>"),t.push("<\/td>")):(n.Responsive&&(t.push('<td class="clearfix"><\/td>'),t.push(tp.helpers.headerCell.call(n,i))),t.push(tp.helpers.editCell.call(n,i)))}),t.join("")};tp.templates["gridponent-pager"]=function(n){var t=[];return t.push(tp.helpers.setPagerFlags.call(n)),n.HasPages&&(t.push('    <label class="ms-page-index btn btn-default '),n.IsFirstPage&&t.push(" disabled "),t.push('" title="First page">'),t.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"><\/span>'),t.push('<input type="radio" name="Page" value="1" />'),t.push("<\/label>"),t.push('    <label class="ms-page-index btn btn-default '),n.IsFirstPage&&t.push(" disabled "),t.push('" title="Previous page">'),t.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"><\/span>'),t.push('        <input type="radio" name="Page" value="'),t.push("{{model.PreviousPage}}"),t.push('" />'),t.push("<\/label>"),t.push('    <input type="number" name="Page" value="'),t.push("{{model.Page}}"),t.push('" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" /> of '),t.push("{{PageCount}}"),t.push('    <label class="ms-page-index btn btn-default '),n.IsLastPage&&t.push(" disabled "),t.push('" title="Next page">'),t.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"><\/span>'),t.push('        <input type="radio" name="Page" value="'),t.push("{{model.NextPage}}"),t.push('" />'),t.push("<\/label>"),t.push('    <label class="ms-page-index btn btn-default '),n.IsLastPage&&t.push(" disabled "),t.push('" title="Last page">'),t.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"><\/span>'),t.push('        <input type="radio" name="Page" value="'),t.push("{{model.PageCount}}"),t.push('" />'),t.push("<\/label>")),t.join("")};tp.templates["gridponent-rows"]=function(n){var t=[];return n.data.Data.forEach(function(i,r){t.push('    <tr data-index="');t.push(r);t.push('">');t.push(tp.templates["gridponent-cells"](n,i));t.push("<\/tr>")}),t.join("")};tp.templates["gridponent"]=function(n){var t=[];return t.push('<div class="table-container" id="'),t.push("{{uid}}"),t.push('">'),n.Toolbar&&(t.push('<div class="table-toolbar">'),n.ToolbarTemplate?t.push(tp.templates.toolbarTemplate(n)):n.Search&&(t.push('<div class="input-group gridponent-searchbox">'),t.push('<input type="text" name="Search" class="form-control" placeholder="Search...">'),t.push('<span class="input-group-btn">'),t.push('<button class="btn btn-default" type="button">'),t.push('<span class="glyphicon glyphicon-search"><\/span>'),t.push("<\/button>"),t.push("<\/span>"),t.push("<\/div>")),t.push("<\/div>")),n.FixedHeaders&&(t.push('<div class="table-header" style="padding-right:17px">'),t.push('        <table class="table '),n.Responsive&&t.push(" responsive "),t.push('" cellpadding="0" cellspacing="0" style="margin-bottom:0">'),t.push(tp.helpers.colgroup.call(n)),t.push(tp.helpers.thead.call(n)),t.push("<\/table>"),t.push("<\/div>")),t.push('    <div class="table-body '),n.FixedHeaders&&t.push("table-scroll"),t.push('" style="'),t.push("{{model.Style}}"),t.push('">'),t.push(tp.templates["gridponent-body"](n)),t.push("<\/div>"),n.Paging&&(t.push('<div class="table-pager">'),t.push(tp.helpers.tablePager.call(n)),t.push("<\/div>")),t.push("<\/div>"),t.join("")};

/***************\
     http        
\***************/
tp.Http = function () { };

tp.Http.prototype = {
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
    createXhr: function (type, url, callback, error) {
        var xhr = new XMLHttpRequest();
        xhr.open(type.toUpperCase(), url, true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xhr.onload = function () {
            callback(JSON.parse(xhr.responseText), xhr);
        }
        xhr.onerror = error;
        return xhr;
    },
    get: function (url, callback, error) {
        var xhr = this.createXhr('GET', url, callback, error);
        xhr.send();
    },
    post: function (url, data, callback, error) {
        var s = this.serialize(data);
        var xhr = this.createXhr('POST', url, callback, error);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send(s);
    }
};

/***************\
server-side pager
\***************/
tp.ServerPager = function (config) {
    this.config = config;
    this.baseUrl = config.Read;
};

tp.ServerPager.prototype = {
    get: function (model, callback, error) {
        var self = this;
        var h = new tp.Http();
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
tp.ClientPager = function (config) {
    this.data = config.data.Data;
    this.columns = config.Columns;
};

tp.ClientPager.prototype = {
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
            if (tp.isNullOrEmpty(model.Search) === false) {
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
            if (tp.isNullOrEmpty(model.OrderBy) === false) {
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
tp.PagingModel = function (data) {
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

'use strict';

var tp = tp || {};
tp.templates = tp.templates || {};
tp.templates['gridponent-body'] = function (model, arg) {
    var out = [];
    out.push('<table class="table');
    if (model.Responsive) {
        out.push(' responsive');
    }
    out.push('" cellpadding="0" cellspacing="0">');
    if (model.FixedHeaders) {
        out.push(tp.helpers['colgroup'].call(model));
    } else {
        out.push(tp.helpers['thead'].call(model));
    }
    out.push('<tbody>');
    out.push(tp.templates['gridponent-rows'](model));
    out.push('</tbody>');
    if (model.Footer) {
        out.push('<tfoot>');
        out.push('<tr>');
        model.Columns.forEach(function (col, index) {
            out.push('<td class="footer-cell">');
            out.push(tp.helpers['footerCell'].call(model, col));
            out.push('</td>');
        });
        out.push('</tr>');
        out.push('</tfoot>');
    }
    out.push('</table>');
    return out.join('');
};
tp.templates['gridponent-cells'] = function (model, arg) {
    var out = [];
    model.Columns.forEach(function (col, index) {
        if (col.Commands) {
            out.push(tp.templates['gridponent-commands'](model, col));
        } else {
            if (model.Responsive) {
                out.push('<td class="clearfix"></td>');
                out.push(tp.helpers['headerCell'].call(model, col));
            }
            out.push(tp.helpers['bodyCell'].call(model, col));
        }
    });
    return out.join('');
};
tp.templates['gridponent-commands'] = function (model, arg) {
    var out = [];
    out.push('<td class="commands-cell" colspan="2">');
    out.push('<div class="btn-group" role="group">');
    arg.Commands.forEach(function (cmd, index) {
        if (cmd == 'Edit') {
            out.push('                <button type="button" class="btn btn-primary btn-xs" value="');
            out.push('{{cmd}}');
            out.push('">');
            out.push('                    <span class="glyphicon glyphicon-edit"></span>');
            out.push('{{cmd}}');
            out.push('</button>');
        }
        if (cmd == 'Delete') {
            out.push('                <button type="button" class="btn btn-danger btn-xs" value="');
            out.push('{{cmd}}');
            out.push('">');
            out.push('                    <span class="glyphicon glyphicon-remove"></span>');
            out.push('{{cmd}}');
            out.push('</button>');
        }
    });
    out.push('</div>');
    out.push('</td>');
    return out.join('');
};
tp.templates['gridponent-edit-cells'] = function (model, arg) {
    var out = [];
    model.Columns.forEach(function (col, index) {
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
            if (model.Responsive) {
                out.push('<td class="clearfix"></td>');
                out.push(tp.helpers['headerCell'].call(model, col));
            }
            out.push(tp.helpers['editCell'].call(model, col));
        }
    });
    return out.join('');
};
tp.templates['gridponent-pager'] = function (model, arg) {
    var out = [];
    out.push(tp.helpers['setPagerFlags'].call(model));
    if (model.HasPages) {
        out.push('    <label class="ms-page-index btn btn-default ');
        if (model.IsFirstPage) {
            out.push(' disabled ');
        }
        out.push('" title="First page">');
        out.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>');
        out.push('<input type="radio" name="Page" value="1" />');
        out.push('</label>');
        out.push('    <label class="ms-page-index btn btn-default ');
        if (model.IsFirstPage) {
            out.push(' disabled ');
        }
        out.push('" title="Previous page">');
        out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
        out.push('        <input type="radio" name="Page" value="');
        out.push('{{model.PreviousPage}}');
        out.push('" />');
        out.push('</label>');
        out.push('    <input type="number" name="Page" value="');
        out.push('{{model.Page}}');
        out.push('" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" /> of ');
        out.push('{{PageCount}}');
        out.push('    <label class="ms-page-index btn btn-default ');
        if (model.IsLastPage) {
            out.push(' disabled ');
        }
        out.push('" title="Next page">');
        out.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>');
        out.push('        <input type="radio" name="Page" value="');
        out.push('{{model.NextPage}}');
        out.push('" />');
        out.push('</label>');
        out.push('    <label class="ms-page-index btn btn-default ');
        if (model.IsLastPage) {
            out.push(' disabled ');
        }
        out.push('" title="Last page">');
        out.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>');
        out.push('        <input type="radio" name="Page" value="');
        out.push('{{model.PageCount}}');
        out.push('" />');
        out.push('</label>');
    }
    return out.join('');
};
tp.templates['gridponent-rows'] = function (model, arg) {
    var out = [];
    model.data.Data.forEach(function (row, index) {
        out.push('    <tr data-index="');
        out.push(index);
        out.push('">');
        out.push(tp.templates['gridponent-cells'](model, row));
        out.push('</tr>');
    });
    return out.join('');
};
tp.templates['gridponent'] = function (model, arg) {
    var out = [];
    out.push('<div class="table-container" id="');
    out.push('{{uid}}');
    out.push('">');
    if (model.Toolbar) {
        out.push('<div class="table-toolbar">');
        if (model.ToolbarTemplate) {
            out.push(tp.templates['toolbarTemplate'](model));
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
        out.push('<div class="table-header" style="padding-right:17px">');
        out.push('        <table class="table ');
        if (model.Responsive) {
            out.push(' responsive ');
        }
        out.push('" cellpadding="0" cellspacing="0" style="margin-bottom:0">');
        out.push(tp.helpers['colgroup'].call(model));
        out.push(tp.helpers['thead'].call(model));
        out.push('</table>');
        out.push('</div>');
    }
    out.push('    <div class="table-body ');
    if (model.FixedHeaders) {
        out.push('table-scroll');
    }
    out.push('" style="');
    out.push('{{model.Style}}');
    out.push('">');
    out.push(tp.templates['gridponent-body'](model));
    out.push('</div>');
    if (model.Paging) {
        out.push('<div class="table-pager">');
        out.push(tp.helpers['tablePager'].call(model));
        out.push('</div>');
    }
    out.push('</div>');
    return out.join('');
};


"use strict";var tp=tp||{};tp.templates=tp.templates||{};tp.templates["gridponent-body"]=function(n){var t=[];return t.push('<table class="table'),n.Responsive&&t.push(" responsive"),t.push('" cellpadding="0" cellspacing="0">'),n.FixedHeaders?t.push(tp.helpers.colgroup.call(n)):t.push(tp.helpers.thead.call(n)),t.push("<tbody>"),t.push(tp.templates["gridponent-rows"](n)),t.push("<\/tbody>"),n.Footer&&(t.push("<tfoot>"),t.push("<tr>"),n.Columns.forEach(function(i){t.push('<td class="footer-cell">');t.push(tp.helpers.footerCell.call(n,i));t.push("<\/td>")}),t.push("<\/tr>"),t.push("<\/tfoot>")),t.push("<\/table>"),t.join("")};tp.templates["gridponent-cells"]=function(n){var t=[];return n.Columns.forEach(function(i){i.Commands?t.push(tp.templates["gridponent-commands"](n,i)):(n.Responsive&&(t.push('<td class="clearfix"><\/td>'),t.push(tp.helpers.headerCell.call(n,i))),t.push(tp.helpers.bodyCell.call(n,i)))}),t.join("")};tp.templates["gridponent-commands"]=function(n,t){var i=[];return i.push('<td class="commands-cell" colspan="2">'),i.push('<div class="btn-group" role="group">'),t.Commands.forEach(function(n){n=="Edit"&&(i.push('                <button type="button" class="btn btn-primary btn-xs" value="'),i.push("{{cmd}}"),i.push('">'),i.push('                    <span class="glyphicon glyphicon-edit"><\/span>'),i.push("{{cmd}}"),i.push("<\/button>"));n=="Delete"&&(i.push('                <button type="button" class="btn btn-danger btn-xs" value="'),i.push("{{cmd}}"),i.push('">'),i.push('                    <span class="glyphicon glyphicon-remove"><\/span>'),i.push("{{cmd}}"),i.push("<\/button>"))}),i.push("<\/div>"),i.push("<\/td>"),i.join("")};tp.templates["gridponent-edit-cells"]=function(n){var t=[];return n.Columns.forEach(function(i){i.Commands?(t.push('<td class="commands-cell">'),t.push('<div class="btn-group" role="group">'),t.push('<button type="button" class="btn btn-primary btn-xs" value="Update">'),t.push('<span class="glyphicon glyphicon-save"><\/span>Save'),t.push("<\/button>"),t.push('<button type="button" class="btn btn-default btn-xs" value="Cancel">'),t.push('<span class="glyphicon glyphicon-remove"><\/span>Cancel'),t.push("<\/button>"),t.push("<\/div>"),t.push("<\/td>")):(n.Responsive&&(t.push('<td class="clearfix"><\/td>'),t.push(tp.helpers.headerCell.call(n,i))),t.push(tp.helpers.editCell.call(n,i)))}),t.join("")};tp.templates["gridponent-pager"]=function(n){var t=[];return t.push(tp.helpers.setPagerFlags.call(n)),n.HasPages&&(t.push('    <label class="ms-page-index btn btn-default '),n.IsFirstPage&&t.push(" disabled "),t.push('" title="First page">'),t.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"><\/span>'),t.push('<input type="radio" name="Page" value="1" />'),t.push("<\/label>"),t.push('    <label class="ms-page-index btn btn-default '),n.IsFirstPage&&t.push(" disabled "),t.push('" title="Previous page">'),t.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"><\/span>'),t.push('        <input type="radio" name="Page" value="'),t.push("{{model.PreviousPage}}"),t.push('" />'),t.push("<\/label>"),t.push('    <input type="number" name="Page" value="'),t.push("{{model.Page}}"),t.push('" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" /> of '),t.push("{{PageCount}}"),t.push('    <label class="ms-page-index btn btn-default '),n.IsLastPage&&t.push(" disabled "),t.push('" title="Next page">'),t.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"><\/span>'),t.push('        <input type="radio" name="Page" value="'),t.push("{{model.NextPage}}"),t.push('" />'),t.push("<\/label>"),t.push('    <label class="ms-page-index btn btn-default '),n.IsLastPage&&t.push(" disabled "),t.push('" title="Last page">'),t.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"><\/span>'),t.push('        <input type="radio" name="Page" value="'),t.push("{{model.PageCount}}"),t.push('" />'),t.push("<\/label>")),t.join("")};tp.templates["gridponent-rows"]=function(n){var t=[];return n.data.Data.forEach(function(i,r){t.push('    <tr data-index="');t.push(r);t.push('">');t.push(tp.templates["gridponent-cells"](n,i));t.push("<\/tr>")}),t.join("")};tp.templates["gridponent"]=function(n){var t=[];return t.push('<div class="table-container" id="'),t.push("{{uid}}"),t.push('">'),n.Toolbar&&(t.push('<div class="table-toolbar">'),n.ToolbarTemplate?t.push(tp.templates.toolbarTemplate(n)):n.Search&&(t.push('<div class="input-group gridponent-searchbox">'),t.push('<input type="text" name="Search" class="form-control" placeholder="Search...">'),t.push('<span class="input-group-btn">'),t.push('<button class="btn btn-default" type="button">'),t.push('<span class="glyphicon glyphicon-search"><\/span>'),t.push("<\/button>"),t.push("<\/span>"),t.push("<\/div>")),t.push("<\/div>")),n.FixedHeaders&&(t.push('<div class="table-header" style="padding-right:17px">'),t.push('        <table class="table '),n.Responsive&&t.push(" responsive "),t.push('" cellpadding="0" cellspacing="0" style="margin-bottom:0">'),t.push(tp.helpers.colgroup.call(n)),t.push(tp.helpers.thead.call(n)),t.push("<\/table>"),t.push("<\/div>")),t.push('    <div class="table-body '),n.FixedHeaders&&t.push("table-scroll"),t.push('" style="'),t.push("{{model.Style}}"),t.push('">'),t.push(tp.templates["gridponent-body"](n)),t.push("<\/div>"),n.Paging&&(t.push('<div class="table-pager">'),t.push(tp.helpers.tablePager.call(n)),t.push("<\/div>")),t.push("<\/div>"),t.join("")};
