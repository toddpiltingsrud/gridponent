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
            var count, data = gp.products;
            if (gp.isNullOrEmpty(model.Search) === false) {
                var props = Object.getOwnPropertyNames(data[0]);
                var search = model.Search.toLowerCase();
                data = data.filter(function (row) {
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
                    data.sort(function (row1, row2) {
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
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
                    data.sort(function (row1, row2) {
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
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
            count = data.length;
            model.Data = model.Data.slice(skip).slice(0, model.Top);
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
