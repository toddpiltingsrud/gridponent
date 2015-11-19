/***************\
  paging model  
\***************/
gp.PagingModel = function (data) {
    var self = this;
    this.Top = 25;
    this.PageIndex = 0;
    this.Types = {};
    this.Page = 1;
    this.OrderBy = '';
    this.Desc = false;
    this.Search = '';
    this.TotalRows = data.length;
    this.Data = data;

    Object.defineProperty(self, 'PageCount', {
        get: function () {
            return Math.ceil(self.TotalRows / self.Top);
        }
    });

    Object.defineProperty(self, 'Skip', {
        get: function () {
            if (self.PageCount === 0) return 0;
            if (self.Page < 1) self.Page = 1;
            else if (self.Page > self.PageCount) return self.Page = self.PageCount;
            return self.PageIndex * self.Top;
        }
    });
};
