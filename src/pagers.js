/***************\
server-side pager
\***************/
gp.ServerPager = function (config) {
    this.config = config;
    this.url = config.Read;
};

gp.ServerPager.prototype = {
    read: function (model, callback, error) {
        var h = new gp.Http();
        h.post(this.url, model, callback, error);
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
    if (typeof config.SearchFilter === 'function') {
        this.searchFilter = config.SearchFilter;
    }
    else {
        this.searchFilter = function (row, search) {
            var s = search.toLowerCase();
            for (var i = 0; i < self.columns.length; i++) {
                value = gp.getFormattedValue(row, self.columns[i], false);
                if (gp.hasValue(value) && value.toString().toLowerCase().indexOf(s) !== -1) {
                    return true;
                }
            }
            return false;
        };
    }
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

    read: function (model, callback, error) {
        try {
            var self = this;
            var skip = this.getSkip(model);

            model.Data = this.data;

            var count;
            if (!gp.isNullOrEmpty(model.Search)) {
                model.Data = model.Data.filter(function (row) {
                    return self.searchFilter(row, model.Search);
                });
            }
            model.TotalRows = model.Data.length;
            if (gp.isNullOrEmpty(model.OrderBy) === false) {
                var col = this.getColumnByField(this.columns, model.OrderBy);
                if (col !== undefined) {
                    var sortFunction = this.getSortFunction(col, model.Desc);
                    model.Data.sort(function (row1, row2) {
                        return sortFunction(row1[col.Field], row2[col.Field]);
                    });
                }
            }
            gp.info('ClientPager: total rows: ' + model.TotalRows);
            if (model.Top !== -1) {
                model.Data = model.Data.slice(skip).slice(0, model.Top);
            }
        }
        catch (ex) {
            gp.log(ex.message);
            gp.log(ex.stack);
        }
        callback(model);
    },
    getColumnByField: function (columns, field) {
        var col = columns.filter(function (c) { return c.Field === field });
        return col.length ? col[0] : null;
    },
    getSortFunction: function (col, desc) {
        if (col.Type === 'number' || col.Type === 'date' || col.Type == 'boolean') {
            if (desc) {
                return this.diffSortDesc;
            }
            return this.diffSortAsc;
        }
        else {
            if (desc) {
                return this.stringSortDesc;
            }
            return this.stringSortAsc;
        }
    },
    diffSortDesc: function(a, b) {
        return b - a;
    },
    diffSortAsc: function(a, b) {
        return a - b;
    },
    stringSortDesc: function (a, b) {
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
    },
    stringSortAsc: function (a, b) {
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
    }
};
