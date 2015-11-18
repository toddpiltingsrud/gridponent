﻿/***************\
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
