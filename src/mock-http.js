/***************\
   mock-http
\***************/
(function (gp) {
    gp.Http = function () { };

    // http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
    var routes = {
        read: /read/i,
        update: /update/i,
        create: /create/i,
        destroy: /Delete/i
    };

    var deserializeUrl = function (url) {
        var result = {},
            query;

        if (!gp.hasValue(url)) {
            return null;
        }

        query = url.split('?');

        if (query.length < 2) {
            return null;
        }

        query[1].split('&').forEach(function (part) {
            if (!part) return;
            part = part.split("+").join(" "); // replace every + with space, regexp-free version
            var eq = part.indexOf("=");
            var key = eq > -1 ? part.substr(0, eq) : part;
            var val = eq > -1 ? decodeURIComponent(part.substr(eq + 1)) : "";
            var from = key.indexOf("[");
            if (from == -1) result[decodeURIComponent(key)] = val;
            else {
                var to = key.indexOf("]", from);
                var index = decodeURIComponent(key.substring(from + 1, to));
                key = decodeURIComponent(key.substring(0, from));
                if (!result[key]) result[key] = [];
                if (!index) result[key].push(val);
                else result[key][index] = val;
            }
        });

        return result;
    };

    gp.Http.prototype = {
        get: function (url, callback, error) {
            var model = deserializeUrl(url);
            this.post( url, model, callback, error );
        },
        post: function (url, model, callback, error) {
            model = model || {};
            if (routes.read.test(url)) {
                getData(model, callback);
            }
            else if ( routes.create.test( url ) ) {
                window.data.products.push( model );
                callback( new gp.ResponseModel( model ) );
            }
            else if ( routes.update.test( url ) ) {
                callback( new gp.ResponseModel(model) );
            }
            else {
                throw '404 Not found: ' + url;
            }
        },
        destroy: function ( url, callback, error ) {
            callback( {
                Success: true,
                Message: ''
            } );
        }
    };

    var getData = function (model, callback) {
        var count, d = window.data.products.slice( 0, window.data.length );

        if (!gp.isNullOrEmpty(model.search)) {
            var props = Object.getOwnPropertyNames(d[0]);
            var search = model.search.toLowerCase();
            d = d.filter(function (row) {
                for (var i = 0; i < props.length; i++) {
                    if (row[props[i]] && row[props[i]].toString().toLowerCase().indexOf(search) !== -1) {
                        return true;
                    }
                }
                return false;
            });
        }
        if (!gp.isNullOrEmpty(model.sort)) {
            if (model.Desc) {
                d.sort(function (row1, row2) {
                    var a = row1[model.sort];
                    var b = row2[model.sort];
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
                    var a = row1[model.sort];
                    var b = row2[model.sort];
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
        if (model.PageSize !== -1) {
            model.Data = d.slice(model.skip).slice(0, model.PageSize);
        }
        else {
            model.Data = d;
        }
        model.errors = [];
        setTimeout(function () {
            callback(model);
        });

    };

})(gridponent);
