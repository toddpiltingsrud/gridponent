/***************\
     http        
\***************/
gp.Http = function () { };

gp.Http.prototype = {
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
        var s = JSON.stringify( data );
        var xhr = this.createXhr('POST', url, callback, error);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(s);
    },
    'delete': function ( url, data, callback, error ) {
        var s = JSON.stringify( data );
        var xhr = this.createXhr( 'DELETE', url, callback, error );
        xhr.setRequestHeader( 'Content-Type', 'application/json' );
        xhr.send( s );
    }
};
