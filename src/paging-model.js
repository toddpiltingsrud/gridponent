/***************\
  PagingModel
\***************/
gp.PagingModel = function (data) {
    var self = this;
    // properites are capitalized here because that's the convention for server-side classes (C#)
    // we want the serialized version of the corresponding server-side class to look exactly like this prototype

    this.top = -1; // this is a flag to let the pagers know if paging is enabled
    this.page = 1;
    this.sort = '';
    this.desc = false;
    this.search = '';
    this.data = data || [];
    this.totalrows = ( data != undefined && data.length ) ? data.length : 0;
    this.pagecount = 0;

    Object.defineProperty(self, 'pageindex', {
        get: function () {
            return self.page - 1;
        }
    });

    Object.defineProperty(self, 'skip', {
        get: function () {
            if (self.top !== -1) {
                if (self.pagecount === 0) return 0;
                if (self.page < 1) self.page = 1;
                else if (self.page > self.pagecount) return self.page = self.pagecount;
                return self.pageindex * self.top;
            }
            return 0;
        }
    });
};

gp.PagingModel.prototype = {
    top: -1, // this is a flag to let the pagers know if paging is enabled
    page: 1,
    sort: '',
    desc: false,
    search: '',
    data: [],
    totalrows: 0,
    pagecount: 0
};