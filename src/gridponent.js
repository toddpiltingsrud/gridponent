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
            self.syncModel(evt.target, self.model);
            self.afterSync(evt, model);
        };
        // add change event handler to node
        gp.on(node, 'change', selector, this.listener);
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
            gp.off(this.node, 'change', this.listener);
        }
    };
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
        var search = gp.getSearch();
    
        gp.error = console.log.bind(console);
        gp.log = gp.verbose = gp.info = gp.warn = function () { };
    
        if ('log' in search) {
            gp.log = console.log.bind(console);
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
    
        var iso8601 = /^[012][0-9]{3}-[01][0-9]-[0123][0-9]/;
    
        var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
        var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
        // I hate dates. Why do they have to be so painful?
        // http://stackoverflow.com/questions/5802461/javascript-which-browsers-support-parsing-of-iso-8601-date-string-with-date-par
        function dateFromISO8601(isoDateString) {
            var parts = isoDateString.match(/\d+/g);
            return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
        }
    
        gp.formatDate = function (date, format) {
            var dt = date;
    
            if (typeof dt === 'string') {
                // check for iso 8601
                if (iso8601.test(dt)) {
                    dt = dateFromISO8601(dt);
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
    
        gp.getType = function (a) {
            if (a === null || a === undefined) {
                return a;
            }
            if (a instanceof Date || (typeof (a) === 'string' && iso8601.test(a))) {
                return 'date';
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
    
        gp.closest = function (elem, selector) {
            // if elem is a selector, convert it to an element
            if (typeof (elem) === 'string') {
                elem = document.querySelector(elem);
            }
            gp.info('closest: elem:');
            gp.info(elem);
    
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
    
        gp.resolveObjectPath = function (path) {
            // split by dots, then square brackets
            try {
                if (typeof path !== 'string') return null;
                gp.verbose('resolveObjectPath:');
                var currentObj = window;
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
                    if (gp.hasValue(currentObj) !== undefined && split.length > 1) {
    
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
    
        gp.processTemplate = function (template, row, col) {
            gp.info('gp.processTemplate: template: ');
            gp.info(template);
            var fn, match, tokens = template.match(/{{.+?}}/g);
            for (var i = 0; i < tokens.length; i++) {
                match = tokens[i].slice(2, -2);
                if (match in row) {
                    template = template.replace(tokens[i], row[match]);
                }
                else {
                    fn = gp.resolveObjectPath(match);
                    if (typeof fn === 'function') {
                        template = template.replace(tokens[i], fn.call(this, row, col));
                    }
                }
            }
            gp.info('gp.processTemplate: template:');
            gp.info(template);
            return template;
        }
    
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
                    // it's either a selector or a function name
                    template = gp.resolveObjectPath(col.HeaderTemplate);
                    if (typeof (template) === 'function') {
                        out.push(template.call(self, col));
                    }
                    else {
                        template = document.querySelector(col.HeaderTemplate);
                        if (template) {
                            out.push(template.innerHTML);
                        }
                    }
                    gp.verbose('helpers.thead: template:');
                    gp.verbose(template);
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
    
        extend('bodyCell', function (col) {
            var template, format, val = this.Row[col.Field];
    
            var type = (col.Type || '').toLowerCase();
            var out = [];
            out.push('<td class="body-cell ' + type + '">');
    
            gp.verbose('bodyCell: col:');
            gp.verbose(col);
    
            // check for a template
            if (col.Template) {
                // it's either a selector or a function name
                template = gp.resolveObjectPath(col.Template);
                if (typeof (template) === 'function') {
                    out.push(template.call(this, this.Row, col));
                }
                else {
                    template = document.querySelector(col.Template);
                    if (template) {
                        gp.verbose('bodyCell: template:');
                        gp.verbose(template);
                        out.push(gp.processTemplate.call(this, template.innerHTML, this.Row, col));
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
    
            out.push('<td class="body-cell ' + col.Type + '">');
    
            gp.verbose('helper.editCell: col: ');
            gp.verbose(col);
    
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
                var val = this.Row[col.Field];
                // render empty cell if this field doesn't exist in the data
                if (val === undefined) return '<td class="body-cell"></td>';
                // render null as empty string
                if (val === null) val = '';
                out.push('<input class="form-control" name="' + col.Field + '" type="');
                switch (col.Type) {
                    case 'date':
                        // use the required format for the date input element
                        val = gp.formatDate(val, 'yyyy-MM-dd');
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
            this.data.PreviousPage = this.data.Page === 1 ? 1 : this.data.Page - 1;
            this.data.NextPage = this.data.Page === this.data.PageCount ? this.data.PageCount : this.data.Page + 1;
        });
    
        extend('sortStyle', function () {
            var out = [];
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
            if (this.Search) {
                out.push(' search-' + this.Search);
            }
            return out.join('');
        });
    
    })();
    /***************\
       mock-http
    \***************/
    (function (gp) {
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
                    callback({
                        Row: data,
                        ValidationErrors: []
                    });
                });
            }
        };
    })(gridponent);
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
                var count, qry = gryst.from(this.data);
                gp.info('ClientPager: data length: ' + this.data.length);
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
                gp.info('ClientPager: total rows: ' + model.TotalRows);
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
    /***************\
     main component
    \***************/
    gp.Table = function (node) {
        this.initialize(node);
    };
    
    if (document.registerElement) {
    
        gp.Table.prototype = Object.create(HTMLElement.prototype);
    
        gp.Table.constructor = gp.Table;
    
        gp.Table.prototype.createdCallback = function () {
            gp.info(this);
            this.initialize(this);
        };
    
        document.registerElement('grid-ponent', {
            prototype: gp.Table.prototype
        });
    }
    else {
        gp.Table.prototype = Object.create(Object.prototype);
    
        gp.Table.constructor = gp.Table;
    
        gp.ready(function () {
            var node, nodes = document.querySelectorAll('grid-ponent');
            for (var i = 0; i < nodes.length; i++) {
                node = nodes[i];
                new gp.Table(node);
            }
        });
    }
    
    gp.Table.prototype.initialize = function (node) {
        // if there's web component support, this and node will be the same object
        node = node || this;
        // if there's no web component support, Table functions as a wrapper around the node
        var self = this;
        this.config = this.getConfig(node);
        gp.info(this.config);
    
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
        if (this.config.FixedHeaders || this.config.FixedFooters) {
            var tries = 3;
            var nodes = document.querySelectorAll('#' + this.config.ID + ' .table-body > table > tbody > tr:first-child > td');
    
            var fn = function () {
                if (gp.hasPositiveWidth(nodes)) {
                    self.syncColumnWidths.call(self.config);
                }
                else if (--tries > 0) {
                    gp.warn('gp.Table.initialize: tries: ' + tries);
                    setTimeout(fn);
                }
            }
    
            fn();
    
            window.addEventListener('resize', function () {
                self.syncColumnWidths.call(self.config);
            });
        }
    };
    
    gp.Table.prototype.getConfig = function (node) {
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
            this.resolveFooterTemplate(colConfig);
        }
        config.Footer = this.resolveFooter(config);
        this.resolveOnCreated(config);
        gp.info(config);
        return config;
    };
    
    gp.Table.prototype.resolveFooter = function (config) {
        for (var i = 0; i < config.Columns.length; i++) {
            if (config.Columns[i].FooterTemplate) return true;
        }
        return false;
    };
    
    gp.Table.prototype.resolveFooterTemplate = function (column) {
        if (column.FooterTemplate) {
            column.FooterTemplate = gp.resolveObjectPath(column.FooterTemplate);
        }
    };
    
    gp.Table.prototype.resolveOnCreated = function (config) {
        if (config.Oncreated) {
            config.Oncreated = gp.resolveObjectPath(config.Oncreated);
        }
    };
    
    gp.Table.prototype.resolveCommands = function (col) {
        if (col.Commands) {
            col.Commands = col.Commands.split(',');
        }
    };
    
    gp.Table.prototype.resolveTypes = function (config) {
        config.Columns.forEach(function (col) {
            for (var i = 0; i < config.data.Data.length; i++) {
                if (config.data.Data[i][col.Field] !== null) {
                    col.Type = gp.getType(config.data.Data[i][col.Field]);
                    break;
                }
            }
        });
        gp.log(config.Columns);
    };
    
    gp.Table.prototype.getPager = function (config) {
        if (config.Paging) {
            if (gp.hasValue(config.Read)) {
                return new gp.ServerPager(config);
            }
            else {
                return new gp.ClientPager(config);
            }
        }
    };
    
    gp.Table.prototype.resolveFirstPage = function (config, pager, callback) {
        if (pager === undefined) {
            callback(config.data);
        }
        else {
            pager.get(config.data, callback);
        }
    };
    
    gp.Table.prototype.beginMonitor = function (node) {
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
                return true;
            }
            return false;
        };
    };
    
    gp.Table.prototype.render = function (node) {
        try {
            node.innerHTML = gp.templates['gridponent'](this.config);
        }
        catch (ex) {
            console.log(ex.message);
            console.log(ex.stack);
        }
    };
    
    gp.Table.prototype.measureTables = function (node) {
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
    };
    
    gp.Table.prototype.syncColumnWidths = function () {
        var html = gp.helpers.columnWidthStyle.call(this);
        this.node.querySelector('style.column-width-style').innerHTML = html;
    };
    
    gp.Table.prototype.refresh = function (config) {
        var rowsTemplate = gp.helpers['tableRows'];
        var pagerTemplate = gp.templates['gridponent-pager'];
        var html = rowsTemplate.call(config);
        config.node.querySelector('.table-body > table > tbody').innerHTML = html;
        html = pagerTemplate(config);
        config.node.querySelector('.table-pager').innerHTML = html;
        html = gp.helpers['sortStyle'].call(config);
        config.node.querySelector('style.sort-style').innerHTML = html;
    };
    
    gp.Table.prototype.update = function () {
        var self = this;
        if (this.pager) {
            this.pager.get(this.config.data, function (model) {
                self.config.data = model;
                self.refresh(self.config);
            });
        }
    };
    
    gp.Table.prototype.addCommandHandlers = function (node) {
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
    
    gp.Table.prototype.editRow = function (row, tr) {
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
    
    gp.Table.prototype.updateRow = function (row, tr) {
        try {
            var self = this;
            var h = new gp.Http();
            var url = this.config.Update;
                gp.log('updateRow: row:');
                gp.log(row);
            var monitor;
            h.post(url, row, function (response) {
                    gp.log('updateRow: response:');
                    gp.log(response);
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
    
    gp.Table.prototype.cancelEdit = function (row, tr) {
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
    
    gp.Table.prototype.deleteRow = function (row, tr) {
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
})(gridponent);

