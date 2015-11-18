﻿/***************\
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
