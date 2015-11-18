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

    tp.hasValue = function (val) {
        return typeof val !== 'undefined' && val !== null;
    };

    var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    tp.formatDate = function (date, format) {
        var dt = date;

        if (typeof dt === 'string') {
            // check for iso 8601
            var iso8601 = /^[012][0-9]{3}-[01][0-9]-[0123][0-9]T/;
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
            .replace('yy', y.toString().right(2))
            .replace('ss', s.toString().padLeft(2, '0'))
            .replace('s', s)
            .replace('f', f)
            .replace('mm', n.toString().padLeft(2, '0'))
            .replace('m', n)
            .replace('HH', h.toString().padLeft(2, '0'))
            .replace('H', h)
            .replace('hh', (h > 12 ? h - 12 : h).toString().padLeft(2, '0'))
            .replace('h', (h > 12 ? h - 12 : h))
            //replace conflicting tokens with alternate tokens
            .replace('tt', (h > 11 ? '>>' : '<<'))
            .replace('t', (h > 11 ? '##' : '$$'))
            .replace('MMMM', '!!')
            .replace('MMM', '@@')
            .replace('MM', m.toString().padLeft(2, '0'))
            .replace('M', m)
            .replace('dddd', '^^')
            .replace('ddd', '&&')
            .replace('dd', d.toString().padLeft(2, '0'))
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
        for (var i = 0; i < tp.chars.length; i++) {
            obj = obj.replace(tp.chars[i], tp.scaped[i]);
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
            var iso8601 = /^[012][0-9]{3}-[01][0-9]-[0123][0-9]T/;
            if (iso8601.test(a)) {
                return 'date';
            }
        }
        // 'number','string','boolean','function','object','undefined'
        return typeof (a);
    };

    tp.convertType = function (dotNetType) {
        switch (dotNetType) {
            case 'Byte': case 'SByte': case 'Int32': case 'UInt32':
            case 'Int16': case 'UInt16': case 'Int64': case 'UInt64':
            case 'Single': case 'Double': case 'Decimal':
                return 'Number';
            case 'DateTime':
                return 'Date';
            case 'Boolean':
                return 'Boolean';
            default:
                return 'String';
        }
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

})();

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
        var skip = this.getSkip(model);
        //gryst.logging = true;
        var count, qry = gryst.from(this.data);
        if (tp.isNullOrEmpty(model.Search) === false) {
            var props = gryst.from(model.Columns).where(function (c) { return c !== undefined; }).select('Field').run();
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
        count = qry.run().length;
        qry = qry.skip(skip).take(model.Top);

        model.Data = qry.run();
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

    tp.hasValue = function (val) {
        return typeof val !== 'undefined' && val !== null;
    };

    var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    tp.formatDate = function (date, format) {
        var dt = date;

        if (typeof dt === 'string') {
            // check for iso 8601
            var iso8601 = /^[012][0-9]{3}-[01][0-9]-[0123][0-9]T/;
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
            .replace('yy', y.toString().right(2))
            .replace('ss', s.toString().padLeft(2, '0'))
            .replace('s', s)
            .replace('f', f)
            .replace('mm', n.toString().padLeft(2, '0'))
            .replace('m', n)
            .replace('HH', h.toString().padLeft(2, '0'))
            .replace('H', h)
            .replace('hh', (h > 12 ? h - 12 : h).toString().padLeft(2, '0'))
            .replace('h', (h > 12 ? h - 12 : h))
            //replace conflicting tokens with alternate tokens
            .replace('tt', (h > 11 ? '>>' : '<<'))
            .replace('t', (h > 11 ? '##' : '$$'))
            .replace('MMMM', '!!')
            .replace('MMM', '@@')
            .replace('MM', m.toString().padLeft(2, '0'))
            .replace('M', m)
            .replace('dddd', '^^')
            .replace('ddd', '&&')
            .replace('dd', d.toString().padLeft(2, '0'))
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
        for (var i = 0; i < tp.chars.length; i++) {
            obj = obj.replace(tp.chars[i], tp.scaped[i]);
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
            var iso8601 = /^[012][0-9]{3}-[01][0-9]-[0123][0-9]T/;
            if (iso8601.test(a)) {
                return 'date';
            }
        }
        // 'number','string','boolean','function','object','undefined'
        return typeof (a);
    };

    tp.convertType = function (dotNetType) {
        switch (dotNetType) {
            case 'Byte': case 'SByte': case 'Int32': case 'UInt32':
            case 'Int16': case 'UInt16': case 'Int64': case 'UInt64':
            case 'Single': case 'Double': case 'Decimal':
                return 'Number';
            case 'DateTime':
                return 'Date';
            case 'Boolean':
                return 'Boolean';
            default:
                return 'String';
        }
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

})();

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
        var skip = this.getSkip(model);
        //gryst.logging = true;
        var count, qry = gryst.from(this.data);
        if (tp.isNullOrEmpty(model.Search) === false) {
            var props = gryst.from(model.Columns).where(function (c) { return c !== undefined; }).select('Field').run();
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
        count = qry.run().length;
        qry = qry.skip(skip).take(model.Top);

        model.Data = qry.run();
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

        return new Handlebars.SafeString(out.join(''));
    });

    extend('colgroup', function () {
        var out = [];

        var defaultWidth = (100.0 / this.Columns.length).toString() + '%';

        out.push('<colgroup>');

        this.Columns.forEach(function (col) {
            out.push('<col style="width:' + (col.Width || defaultWidth) + '" />');
        });

        out.push('</colgroup>');

        return new Handlebars.SafeString(out.join(''));
    });

    extend('thead', function () {
        var self = this;
        var out = [];
        out.push('<thead>');
        out.push('<tr>');
        this.Columns.forEach(function (col) {
            var type = (col.Type || '').toLowerCase();
            out.push('<td class="' + type + '">');
            if (hasValue(col.Commands) === false && (col.Sort || self.Sorting)) {
                out.push('<label class="table-sort">');
                out.push('<input type="radio" value="' + (col.Sort || col.Field) + '" name="OrderBy" />');
                out.push(col.Header || col.Field);
                out.push('</label>');
            }
            else {
                out.push(col.Header || col.Field);
            }
            out.push('</th>');
        });
        out.push('</tr>');
        out.push('</thead>');
        return new Handlebars.SafeString(out.join(''));
    });

    extend('template', function (name, arg) {
        var template = Handlebars.templates[name];
        if (template) {
            this.arg = arg;
            var html = template(this);
            return new Handlebars.SafeString(html);
        }
    });

    extend('headerCell', function () {
        var out = [];
        var type = (this.Type || '').toLowerCase();
        out.push('<th class="' + type + '">');
        out.push(this.Header || this.Field);
        out.push('</th>');
        return new Handlebars.SafeString(out.join(''));
    });

    extend('bodyCell', function (row) {
        var template, format, val = row[this.Field];
        var type = (this.Type || '').toLowerCase();
        var out = [];
        out.push('<td class="body-cell ' + type + '">');

        // check for a template
        if (this.Template) {
            // it's either a selector or a function name
            template = tp.resolveObjectPath(this.Template);
            if (typeof (template) === 'function') {
                out.push(template(this, row));
            }
            else {
                template = document.querySelector(this.Template);
                if (template) {
                    out.push(template.innerHTML);
                }
            }
        }
        else if (hasValue(val)) {
            // show a checkmark for bools
            if (type === 'boolean') {
                if (val === true) {
                    out.push('<span class="glyphicon glyphicon-ok"></span>');
                }
            }
            else if (type === 'date') {
                // apply formatting to dates
                format = this.Format || 'M/d/yyyy';
                out.push(formatDate(val, format));
            }
            else {
                out.push(val);
            }
        }
        out.push('</td>');
        return new Handlebars.SafeString(out.join(''));
    });

    extend('editCell', function (row, options, fn) {
        var template, out = [];
        var val = row[this.Field] || '';

        out.push('<td class="body-cell">');

        // check for a template
        if (this.EditTemplate) {
            // it's either a selector or a function name
            template = tp.resolveObjectPath(this.EditTemplate);
            if (typeof (template) === 'function') {
                out.push(template(this, row));
            }
            else {
                template = document.querySelector(this.EditTemplate);
                if (template) {
                    out.push(template.innerHTML);
                }
            }
        }
        else {
            if (tp.getType(val) === 'date') {
                // use the required format for the date input element
                val = formatDate(val, 'yyyy-MM-dd');
            }
            out.push('<input class="form-control" name="' + this.Field + '" value="' +  tp.escapeHTML(val) + '" type="');
            switch (this.Type) {
                case 'Date':
                    out.push('date');
                    break;
                case 'Number':
                    out.push('number');
                    break;
                default:
                    out.push('text');
                    break;
            };
            out.push('" />');
        }
        out.push('</td>');
        return new Handlebars.SafeString(out.join(''));
    });

    extend('footerCell', function (options) {
        console.log('footerCell: this:');
        console.log(this);
        console.log('footerCell: options:');
        console.log(options);
        if (typeof (this.FooterTemplate) === 'function') {
            var out = [];
            var data = options.data.root.data.Data;
            out.push(this.FooterTemplate(data, this));
            return new Handlebars.SafeString(out.join(''));
        }
    });

    extend('tablePager', function () {
        var data = this.data;
        var template = Handlebars.templates['tp-table-pager'];
        var html = template(data);
        return new Handlebars.SafeString(html);
    });

    extend('setPagerFlags', function () {
        this.IsFirstPage = this.Page === 1;
        this.IsLastPage = this.Page === this.PageCount;
        this.HasPages = this.PageCount > 1;
        this.PreviousPage = this.Page - 1;
        this.NextPage = this.Page + 1;
    });

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

    var createUID = function () {
        var key = slice(numberToString(Math.random(), 36), 2);
        return key in uids ? createUID() : uids[key] = key;
    };

    extend('uid', function () {
        var uid = createUID();
        return new Handlebars.SafeString(uid);
    });

})();
/***************\
    tp-table
\***************/

tp.Table = Object.create(tp.ComponentBase);

tp.Table.initialize = function () {
    var self = this;
    tp.ComponentBase.initialize.call(this);
    this.config.Columns = [];
    this.config.data = {};
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
    this.resolveToolbar(this.config);
    this.beginMonitor();
    this.addCommandHandlers();
};

tp.Table.resolveToolbar = function (config) {
    config.Toolbar = config.Toolbar || config.Search || config.ToolbarTemplate;
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
        for (var i = 0; i < config.data.length; i++) {
            if (config.data[i][col.Field] !== null) {
                col.Type = typeof config.data[i][col.Field];
                break;
            }
        }
    });
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
    // monitor the
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
    var template = tp.templates['tp-table'];
    this.innerHTML = template(model);
};

tp.Table.refresh = function (config) {
    var rowsTemplate = tp.templates['tp-table-rows'];
    var pagerTemplate = tp.templates['tp-table-pager'];
    var html = rowsTemplate(config);
    this.querySelector('.table-body > table > tbody').innerHTML = html;
    html = pagerTemplate(config.data);
    this.querySelector('.table-pager').innerHTML = html;
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
        var row = self.config.arg = self.config.data.Data[index];
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
    var template = tp.templates['tp-table-edit-cells'];
    var html = template(this.config);
    tr.innerHTML = html;
    tr['tp-change-monitor'] = new tp.ChangeMonitor(tr, '[name]', row, function () { });
};

tp.Table.updateRow = function (row, tr) {
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
};

tp.Table.cancelEdit = function (row, tr) {
    var template = tp.templates['tp-table-cells'];
    var html = template(this.config);
    tr.innerHTML = html;
};

tp.Table.deleteRow = function (row, tr) {
    var self = this;
    var h = new tp.Http();
    var url = this.config.Destroy;
    h.post(url, row, function (response) {
        // remove the row from the model
        var index = self.config.data.Data.indexOf(row);
        if (index != -1) {
            self.config.data.Data.splice(index, 1);
            self.refresh();
        }
    });
};

tp.Table.fixDates = function (data, typeMetadata) {
    var type, props = Object.getOwnPropertyNames(typeMetadata);
    props.forEach(function (prop) {
        type = tp.convertType(typeMetadata[prop]);
        if (type === 'Date') {
            data.forEach(function (row) {
                if (!tp.isNullOrEmpty(row[prop])) {
                    row[prop] = new Date(row[prop]);
                }
            });
        }
    });
};

document.registerElement('tp-table', {
    prototype: tp.Table
});


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

        return new Handlebars.SafeString(out.join(''));
    });

    extend('colgroup', function () {
        var out = [];

        var defaultWidth = (100.0 / this.Columns.length).toString() + '%';

        out.push('<colgroup>');

        this.Columns.forEach(function (col) {
            out.push('<col style="width:' + (col.Width || defaultWidth) + '" />');
        });

        out.push('</colgroup>');

        return new Handlebars.SafeString(out.join(''));
    });

    extend('thead', function () {
        var self = this;
        var out = [];
        out.push('<thead>');
        out.push('<tr>');
        this.Columns.forEach(function (col) {
            var type = (col.Type || '').toLowerCase();
            out.push('<td class="' + type + '">');
            if (hasValue(col.Commands) === false && (col.Sort || self.Sorting)) {
                out.push('<label class="table-sort">');
                out.push('<input type="radio" value="' + (col.Sort || col.Field) + '" name="OrderBy" />');
                out.push(col.Header || col.Field);
                out.push('</label>');
            }
            else {
                out.push(col.Header || col.Field);
            }
            out.push('</th>');
        });
        out.push('</tr>');
        out.push('</thead>');
        return new Handlebars.SafeString(out.join(''));
    });

    extend('template', function (name, arg) {
        var template = Handlebars.templates[name];
        if (template) {
            this.arg = arg;
            var html = template(this);
            return new Handlebars.SafeString(html);
        }
    });

    extend('headerCell', function () {
        var out = [];
        var type = (this.Type || '').toLowerCase();
        out.push('<th class="' + type + '">');
        out.push(this.Header || this.Field);
        out.push('</th>');
        return new Handlebars.SafeString(out.join(''));
    });

    extend('bodyCell', function (row) {
        var template, format, val = row[this.Field];
        var type = (this.Type || '').toLowerCase();
        var out = [];
        out.push('<td class="body-cell ' + type + '">');

        // check for a template
        if (this.Template) {
            // it's either a selector or a function name
            template = tp.resolveObjectPath(this.Template);
            if (typeof (template) === 'function') {
                out.push(template(this, row));
            }
            else {
                template = document.querySelector(this.Template);
                if (template) {
                    out.push(template.innerHTML);
                }
            }
        }
        else if (hasValue(val)) {
            // show a checkmark for bools
            if (type === 'boolean') {
                if (val === true) {
                    out.push('<span class="glyphicon glyphicon-ok"></span>');
                }
            }
            else if (type === 'date') {
                // apply formatting to dates
                format = this.Format || 'M/d/yyyy';
                out.push(formatDate(val, format));
            }
            else {
                out.push(val);
            }
        }
        out.push('</td>');
        return new Handlebars.SafeString(out.join(''));
    });

    extend('editCell', function (row, options, fn) {
        var template, out = [];
        var val = row[this.Field] || '';

        out.push('<td class="body-cell">');

        // check for a template
        if (this.EditTemplate) {
            // it's either a selector or a function name
            template = tp.resolveObjectPath(this.EditTemplate);
            if (typeof (template) === 'function') {
                out.push(template(this, row));
            }
            else {
                template = document.querySelector(this.EditTemplate);
                if (template) {
                    out.push(template.innerHTML);
                }
            }
        }
        else {
            if (tp.getType(val) === 'date') {
                // use the required format for the date input element
                val = formatDate(val, 'yyyy-MM-dd');
            }
            out.push('<input class="form-control" name="' + this.Field + '" value="' +  tp.escapeHTML(val) + '" type="');
            switch (this.Type) {
                case 'Date':
                    out.push('date');
                    break;
                case 'Number':
                    out.push('number');
                    break;
                default:
                    out.push('text');
                    break;
            };
            out.push('" />');
        }
        out.push('</td>');
        return new Handlebars.SafeString(out.join(''));
    });

    extend('footerCell', function (options) {
        console.log('footerCell: this:');
        console.log(this);
        console.log('footerCell: options:');
        console.log(options);
        if (typeof (this.FooterTemplate) === 'function') {
            var out = [];
            var data = options.data.root.data.Data;
            out.push(this.FooterTemplate(data, this));
            return new Handlebars.SafeString(out.join(''));
        }
    });

    extend('tablePager', function () {
        var data = this.data;
        var template = Handlebars.templates['tp-table-pager'];
        var html = template(data);
        return new Handlebars.SafeString(html);
    });

    extend('setPagerFlags', function () {
        this.IsFirstPage = this.Page === 1;
        this.IsLastPage = this.Page === this.PageCount;
        this.HasPages = this.PageCount > 1;
        this.PreviousPage = this.Page - 1;
        this.NextPage = this.Page + 1;
    });

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

    var createUID = function () {
        var key = slice(numberToString(Math.random(), 36), 2);
        return key in uids ? createUID() : uids[key] = key;
    };

    extend('uid', function () {
        var uid = createUID();
        return new Handlebars.SafeString(uid);
    });

})();
/***************\
    tp-table
\***************/

tp.Table = Object.create(tp.ComponentBase);

tp.Table.initialize = function () {
    var self = this;
    tp.ComponentBase.initialize.call(this);
    this.config.Columns = [];
    this.config.data = {};
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
    this.resolveToolbar(this.config);
    this.beginMonitor();
    this.addCommandHandlers();
};

tp.Table.resolveToolbar = function (config) {
    config.Toolbar = config.Toolbar || config.Search || config.ToolbarTemplate;
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
        for (var i = 0; i < config.data.length; i++) {
            if (config.data[i][col.Field] !== null) {
                col.Type = typeof config.data[i][col.Field];
                break;
            }
        }
    });
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
    // monitor the
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
    var template = tp.templates['tp-table'];
    this.innerHTML = template(model);
};

tp.Table.refresh = function (config) {
    var rowsTemplate = tp.templates['tp-table-rows'];
    var pagerTemplate = tp.templates['tp-table-pager'];
    var html = rowsTemplate(config);
    this.querySelector('.table-body > table > tbody').innerHTML = html;
    html = pagerTemplate(config.data);
    this.querySelector('.table-pager').innerHTML = html;
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
        var row = self.config.arg = self.config.data.Data[index];
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
    var template = tp.templates['tp-table-edit-cells'];
    var html = template(this.config);
    tr.innerHTML = html;
    tr['tp-change-monitor'] = new tp.ChangeMonitor(tr, '[name]', row, function () { });
};

tp.Table.updateRow = function (row, tr) {
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
};

tp.Table.cancelEdit = function (row, tr) {
    var template = tp.templates['tp-table-cells'];
    var html = template(this.config);
    tr.innerHTML = html;
};

tp.Table.deleteRow = function (row, tr) {
    var self = this;
    var h = new tp.Http();
    var url = this.config.Destroy;
    h.post(url, row, function (response) {
        // remove the row from the model
        var index = self.config.data.Data.indexOf(row);
        if (index != -1) {
            self.config.data.Data.splice(index, 1);
            self.refresh();
        }
    });
};

tp.Table.fixDates = function (data, typeMetadata) {
    var type, props = Object.getOwnPropertyNames(typeMetadata);
    props.forEach(function (prop) {
        type = tp.convertType(typeMetadata[prop]);
        if (type === 'Date') {
            data.forEach(function (row) {
                if (!tp.isNullOrEmpty(row[prop])) {
                    row[prop] = new Date(row[prop]);
                }
            });
        }
    });
};

document.registerElement('tp-table', {
    prototype: tp.Table
});

