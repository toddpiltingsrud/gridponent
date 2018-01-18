/***************\
  RequestModel
\***************/
gp.RequestModel = function (data) {
    var self = this;

    this.pageSize = -1; // this is a flag to let the pagers know if paging is enabled
    this.page = 1;
    this.sort = '';
    this.desc = false;
    this.search = '';

    if ( gp.getType( data ) == 'object' ) {
        gp.shallowCopy( data, this );
    }
    else {
        this.Data = data || [];
    }

    this.total = ( data != undefined && data.length ) ? data.length : 0;

    Object.defineProperty(self, 'pageindex', {
        get: function () {
            return self.page - 1;
        }
    });

    Object.defineProperty(self, 'skip', {
        get: function () {
            if (self.pageSize !== -1) {
                if (self.PageCount === 0) return 0;
                if (self.page < 1) self.page = 1;
                else if (self.page > self.PageCount) return self.page = self.PageCount;
                return self.pageindex * self.pageSize;
            }
            return 0;
        }
    } );

    Object.defineProperty( self, 'PageCount', {
        get: function () {
            if ( self.pageSize > 0 ) {
                return Math.ceil( self.total / self.pageSize );
            }
            if ( self.total === 0 ) return 0;
            return 1;
        }
    } );
};

gp.RequestModel.prototype = {
    pageSize: -1, // this is a flag to let the pagers know if paging is enabled
    page: 1,
    sort: '',
    desc: false,
    search: '',
    Data: [],
    total: 0
};