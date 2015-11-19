/***************\
server-side pager
\***************/
gp.ServerPager = function (config) {
    this.config = config;
    this.baseUrl = config.Read;
};

gp.ServerPager.prototype = {
    get: function (model, callback, error) {
        var self = this;
        var h = new gp.Http();
        // extract only the properties needed for paging
        var url = this.baseUrl + '?' + h.serialize(model.data, ['Page', 'Top', 'OrderBy', 'Desc', 'Search', 'Skip']);
        var cb = function (response) {
            callback(response);
        };
        h.get(url, cb, error);
    },
    copyProps: function (from, to) {
        var props = Object.getOwnPropertyNames(from);
        props.forEach(function (prop) {
            to[prop] = from[prop];
        });
    }
};


/***************\
client-side pager
\***************/
gp.ClientPager = function (config) {
    this.data = config.data.Data;
    this.columns = config.Columns;
};

gp.ClientPager.prototype = {
    getSkip: function (model) {
        var data = model;
        if (data.PageCount == 0) {
            return 0;
        }
        if (data.Page < 1) {
            data.Page = 1;
        }
        else if (data.Page > data.PageCount) {
            return data.Page = data.PageCount;
        }
        return (data.Page - 1) * data.Top;
    },
    get: function (model, callback, error) {
        try {
            var skip = this.getSkip(model);
            gryst.logging = true;
            var count, qry = gryst.from(this.data);
            console.log('data length: ' + this.data.length);
            if (gp.isNullOrEmpty(model.Search) === false) {
                var props = gryst.from(this.columns).where(function (c) { return c !== undefined; }).select('Field').run();
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
            model.TotalRows = qry.run().length;
            console.log('total rows: ' + model.TotalRows);
            qry = qry.skip(skip).take(model.Top);

            model.Data = qry.run();

        }
        catch (ex) {
            console.log(ex);
            console.log(ex.message);
            console.log(ex.stack);
        }
        callback(model);
    },
};
