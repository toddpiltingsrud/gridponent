/***************\
     globals
\***************/
(function (gp) {

    // logging
    gp.logging = 'info';
    gp.log = window.console ? window.console.log.bind(window.console) : function () { };
    gp.error = function ( e ) {
        if ( console && console.error ) {
            console.error( e );
        }
    };
    gp.verbose = function ( arg, p ) {
        if ( /verbose/.test( gp.logging ) ) gp.log( arg, p );
    }
    gp.info = function ( arg, p ) {
        if ( /info|verbose/.test( gp.logging ) ) gp.log( arg, p );
    }
    gp.warn = function ( arg, p ) {
        if ( /warn|info|verbose/.test( gp.logging ) ) gp.log( arg, p );
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
        catch (ex) {
            gp.error( ex );
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
