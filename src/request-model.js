/***************\
  RequestModel
\***************/
gp.RequestModel = function (data) {
    var self = this;

    this.PageSize = -1; // this is a flag to let the pagers know if paging is enabled
    this.Page = 1;
    this.Sort = '';
    this.Desc = false;
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
            return self.Page - 1;
        }
    });

    Object.defineProperty(self, 'skip', {
        get: function () {
            if (self.PageSize !== -1) {
                if (self.PageCount === 0) return 0;
                if (self.Page < 1) self.Page = 1;
                else if (self.Page > self.PageCount) return self.Page = self.PageCount;
                return self.pageindex * self.PageSize;
            }
            return 0;
        }
    } );

    Object.defineProperty( self, 'PageCount', {
        get: function () {
            if ( self.PageSize > 0 ) {
                return Math.ceil( self.total / self.PageSize );
            }
            if ( self.total === 0 ) return 0;
            return 1;
        }
    } );
};

gp.RequestModel.prototype = {
    PageSize: -1, // this is a flag to let the pagers know if paging is enabled
    Page: 1,
    Sort: '',
    Desc: false,
    search: '',
    Data: [],
    total: 0
};