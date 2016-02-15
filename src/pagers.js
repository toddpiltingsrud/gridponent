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
    }
};


/***************\
client-side pager
\***************/
gp.ClientPager = function (config) {
    var value, self = this;
    this.data = config.pageModel.Data;
    this.columns = config.Columns.filter(function (c) {
        return c.Field !== undefined || c.Sort !== undefined;
    });
    if (typeof config.SearchFunction === 'function') {
        this.searchFilter = config.SearchFunction;
    }
    else {
        this.searchFilter = function (row, search) {
            var s = search.toLowerCase();
            for (var i = 0; i < self.columns.length; i++) {
                value = gp.getFormattedValue( row, self.columns[i], false );
                if (gp.hasValue(value) && value.toString().toLowerCase().indexOf(s) !== -1) {
                    return true;
                }
            }
            return false;
        };
    }
};

gp.ClientPager.prototype = {
    read: function (model, callback, error) {
        try {
            var self = this;
            var skip = this.getSkip( model );

            model.Data = this.data;

            var count;
            // filter first
            if (!gp.isNullOrEmpty(model.Search)) {
                model.Data = model.Data.filter(function (row) {
                    return self.searchFilter(row, model.Search);
                });
            }

            // set TotalRows after filtering, but before paging
            model.TotalRows = model.Data.length;

            // then sort
            if (gp.isNullOrEmpty(model.OrderBy) === false) {
                var col = this.getColumnByField( this.columns, model.OrderBy );
                if (gp.hasValue(col)) {
                    var sortFunction = this.getSortFunction( col, model.Desc );
                    var fieldName = col.Field || col.Sort;
                    model.Data.sort( function ( row1, row2 ) {
                        return sortFunction( row1[fieldName], row2[fieldName] );
                    });
                }
            }

            // then page
            if (model.Top !== -1) {
                model.Data = model.Data.slice(skip).slice(0, model.Top);
            }
        }
        catch (ex) {
            gp.error( ex );
        }
        callback(model);
    },
    getSkip: function ( model ) {
        var data = model;
        if ( data.PageCount == 0 ) {
            return 0;
        }
        if ( data.Page < 1 ) {
            data.Page = 1;
        }
        else if ( data.Page > data.PageCount ) {
            return data.Page = data.PageCount;
        }
        return ( data.Page - 1 ) * data.Top;
    },
    getColumnByField: function ( columns, field ) {
        var col = columns.filter(function (c) { return c.Field === field || c.Sort === field });
        return col.length ? col[0] : null;
    },
    getSortFunction: function (col, desc) {
        if ( /number|date|boolean/.test( col.Type ) ) {
            if ( desc ) {
                return this.diffSortDesc;
            }
            return this.diffSortAsc;
        }
        else {
            if ( desc ) {
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
            return 0;
        }
        else if (b === null) {
            // we already know a isn't null
            return -1;
        }
        if (a.toLowerCase() > b.toLowerCase()) {
            return -1;
        }
        if (a.toLowerCase() < b.toLowerCase()) {
            return 1;
        }

        return 0;
    },
    stringSortAsc: function (a, b) {
        if (a === null) {
            if (b != null) {
                return -1;
            }
            return 0;
        }
        else if (b === null) {
            // we already know a isn't null
            return 1;
        }
        if (a.toLowerCase() > b.toLowerCase()) {
            return 1;
        }
        if (a.toLowerCase() < b.toLowerCase()) {
            return -1;
        }

        return 0;
    }
};

/***************\
  FunctionPager
\***************/

gp.FunctionPager = function ( config ) {
    this.config = config;
};

gp.FunctionPager.prototype = {
    read: function ( model, callback, error ) {
        try {
            var result = this.config.Read( model, callback );

            if ( result != undefined ) callback( result );
        }
        catch (ex) {
            if (typeof error === 'function') {
                gp.tryCallback( error, this, ex );
            }
            else {
                gp.tryCallback( callback, this, this.config );
            }
            gp.error( ex );
        }
    }
};