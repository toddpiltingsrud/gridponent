/***************\
server-side pager
\***************/
gp.ServerPager = function (url) {
    this.url = url;
};

gp.ServerPager.prototype = {
    read: function (model, callback, error) {
        var copy = gp.shallowCopy(model);
        // delete anything we don't want to send to the server
        var props = Object.getOwnPropertyNames(copy).forEach(function (prop) {
            if (/^(page|top|sort|desc|search)$/i.test(prop) == false) {
                delete copy[prop];
            }
        });
        var url = gp.supplant(this.url, model, model);
        var h = new gp.Http();
        h.post(url, copy, callback, error);
    }
    //read: function ( requestModel, callback, error ) {
    //    // use the requestModel to transform the url
    //    var url = gp.supplant( this.url, requestModel, requestModel );
    //    var h = new gp.Http();
    //    h.get(url, callback, error);
    //}
};


/***************\
client-side pager
\***************/
gp.ClientPager = function (config) {
    var value, self = this;
    this.Data = config.requestModel.Data;
    this.columns = config.columns.filter(function (c) {
        return c.field !== undefined || c.sort !== undefined;
    });
    if (typeof config.searchfunction === 'function') {
        this.searchFilter = config.searchfunction;
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
            var self = this,
                search,
                skip = this.getSkip( model );

            // don't replace the original array
            model.Data = this.Data.slice(0, this.Data.length);

            // filter first
            if ( !gp.isNullOrEmpty( model.search ) ) {
                // make sure searchTerm is a string and trim it
                search = $.trim( model.search.toString() );
                model.Data = model.Data.filter(function (row) {
                    return self.searchFilter(row, search);
                });
            }

            // set total after filtering, but before paging
            model.total = model.Data.length;

            // then sort
            if (gp.isNullOrEmpty(model.sort) === false) {
                var col = gp.getColumnByField( this.columns, model.sort );
                if (gp.hasValue(col)) {
                    var sortFunction = this.getSortFunction( col, model.desc );
                    model.Data.sort( function ( row1, row2 ) {
                        return sortFunction( row1[model.sort], row2[model.sort] );
                    });
                }
            }

            // then page
            if (model.pageSize !== -1) {
                model.Data = model.Data.slice(skip).slice(0, model.pageSize);
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
        if ( data.page < 1 ) {
            data.page = 1;
        }
        else if ( data.page > data.PageCount ) {
            return data.page = data.PageCount;
        }
        return ( data.page - 1 ) * data.pageSize;
    },
    getSortFunction: function (col, desc) {
        if ( /^(number|date|boolean)$/.test( col.Type ) ) {
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
        if ( gp.hasValue( a ) === false ) {
            if ( gp.hasValue( b ) ) {
                return 1;
            }
            return 0;
        }
        else if ( gp.hasValue( b ) === false ) {
            // we already know a isn't null
            return -1;
        }

        // string sorting is the default if no type was detected
        // so make sure what we're sorting is a string

        if ( a.toString().toLowerCase() > b.toString().toLowerCase() ) {
            return -1;
        }
        if ( a.toString().toLowerCase() < b.toString().toLowerCase() ) {
            return 1;
        }

        return 0;
    },
    stringSortAsc: function (a, b) {
        if (gp.hasValue(a) === false) {
            if (gp.hasValue(b)) {
                return -1;
            }
            return 0;
        }
        else if (gp.hasValue(b) === false) {
            // we already know a isn't null
            return 1;
        }

        // string sorting is the default if no type was detected
        // so make sure what we're sorting is a string

        if ( a.toString().toLowerCase() > b.toString().toLowerCase() ) {
            return 1;
        }
        if ( a.toString().toLowerCase() < b.toString().toLowerCase() ) {
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
            var self = this,
                result = this.config.read( model, callback.bind( this ) );
            // check if the function returned a value instead of using the callback
            if ( gp.hasValue( result ) ) {
                callback( result );
            }
        }
        catch (ex) {
            if (typeof error === 'function') {
                gp.applyFunc( error, this, ex );
            }
            else {
                gp.applyFunc( callback, this, this.config );
            }
            gp.error( ex );
        }
    }
};