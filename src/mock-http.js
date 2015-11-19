/***************\
   mock-http
\***************/
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
        var count, qry = gryst.from(gp.products);
        if (gp.isNullOrEmpty(model.Search) === false) {
            var props = Object.getOwnPropertyNames(gp.products[0]);
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
        if (gp.isNullOrEmpty(model.OrderBy) === false) {
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
        setTimeout(function () {
            callback(model);
        });
    },
    post: function (url, data, callback, error) {
        setTimeout(function () {
            callback(data);
        });
    }
};
