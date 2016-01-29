/***************\
     http        
\***************/
gp.Http = function () { };

gp.Http.prototype = {
    serialize: function (obj, props) {
        // creates a query string from a simple object
        var self = this;
        props = props || Object.getOwnPropertyNames(obj);
        var out = [];
        props.forEach( function ( prop ) {
            if ( obj[prop] == null ) {
                out.push( encodeURIComponent( prop ) + '=' );
            }
            else {
                out.push( encodeURIComponent( prop ) + '=' + encodeURIComponent( obj[prop] ) );
            }
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
    post: function ( url, data, callback, error ) {
        // don't post back the data or the types
        var props = Object.getOwnPropertyNames( data ).filter( function ( p ) { return /Data|Types/i.test(p) == false; } );
        var s = this.serialize(data, props);
        var xhr = this.createXhr('POST', url, callback, error);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.send(s);
    }
};
