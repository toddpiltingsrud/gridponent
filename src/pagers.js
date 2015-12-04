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
    var value, self = this;
    this.data = config.data.Data;
    this.columns = config.Columns.filter(function (c) {
        return c.Field !== undefined;
    });
    this.searchFilter = config.SearchFilter || function (row, search) {
        var s = search.toLowerCase();
        for (var i = 0; i < self.columns.length; i++) {
            value = gp.getFormattedValue(row, self.columns[i], false);
            if (gp.hasValue(value) && value.toString().toLowerCase().indexOf(s) !== -1) {
                return true;
            }
        }
        return false;
    };
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
            var self = this;
            var skip = this.getSkip(model);
            var count, qry = gryst.from(this.data);
            gp.info('ClientPager: data length: ' + this.data.length);
            if (gp.isNullOrEmpty(model.Search) === false) {
                qry = qry.where(function (row) {
                    return self.searchFilter(row, model.Search);
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
            gp.info('ClientPager: total rows: ' + model.TotalRows);
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
