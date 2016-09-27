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

    gp.Http.prototype = {
        get: function ( url, model, callback, error ) {
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
            if (model.desc) {
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
        if (model.top !== -1) {
            model.data = d.slice(model.skip).slice(0, model.top);
        }
        else {
            model.data = d;
        }
        model.errors = [];
        setTimeout(function () {
            callback(model);
        });

    };

})(gridponent);
