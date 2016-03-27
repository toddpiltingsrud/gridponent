﻿/***************\
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
            var nameValue, split = queryString.split( '&' );
            var obj = {};
            if ( !queryString ) return obj;
            split.forEach( function ( s ) {
                nameValue = s.split( '=' );
                var val = nameValue[1];
                if ( !val ) {
                    obj[nameValue[0]] = null;
                }
                else if ( /true|false/i.test( val ) ) {
                    obj[nameValue[0]] = ( /true/i.test( val ) );
                }
                else if ( parseFloat( val ).toString() === val ) {
                    obj[nameValue[0]] = parseFloat( val );
                }
                else {
                    obj[nameValue[0]] = val;
                }
            } );
            return obj;
        },
        get: function (url, callback, error) {
            if (routes.read.test(url)) {
                var index = url.substring(url.indexOf('?'));
                if (index !== -1) {
                    var queryString = url.substring(index + 1);
                    var model = this.deserialize(queryString);
                    this.post(url.substring(0, index), model, callback, error);
                }
                else {
                    this.post(url, null, callback, error);
                }
            }
            else if (routes.create.test(url)) {
                var result = { "ProductID": 0, "Name": "", "ProductNumber": "", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": "", "SafetyStockLevel": 0, "ReorderPoint": 0, "StandardCost": 0, "ListPrice": 0, "Size": "", "SizeUnitMeasureCode": "", "WeightUnitMeasureCode": "", "Weight": 0, "DaysToManufacture": 0, "ProductLine": "", "Class": "", "Style": "", "ProductSubcategoryID": 0, "ProductModelID": 0, "SellStartDate": "2007-07-01T00:00:00", "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "00000000-0000-0000-0000-000000000000", "ModifiedDate": "2008-03-11T10:01:36.827", "Markup": null };
                callback(result);
            }
            else {
                throw 'Not found: ' + url;
            }
        },
        post: function (url, model, callback, error) {
            model = model || {};
            if (routes.read.test(url)) {
                getData(model, callback);
            }
            else if ( routes.create.test( url ) ) {
                data.products.push( model );
                callback( new gp.UpdateModel( model ) );
            }
            else if ( routes.update.test( url ) ) {
                callback( new gp.UpdateModel(model) );
            }
            else {
                throw '404 Not found: ' + url;
            }
        },
        'destroy': function ( url, model, callback, error ) {
            model = model || {};
            var index = data.products.indexOf( model );
            callback( {
                Success: true,
                Message: ''
            } );
        }
    };

    var getData = function (model, callback) {
        var count, d = data.products.slice( 0, this.data.length );

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
        model.ValidationErrors = [];
        setTimeout(function () {
            callback(model);
        });

    };

})(gridponent);
