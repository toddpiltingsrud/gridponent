/***************\
  RequestModel
\***************/
gp.RequestModel = function (data) {
    var self = this;
    // properites are capitalized here because that's the convention for server-side classes (C#)
    // we want the serialized version of the corresponding server-side class to look exactly like this prototype
    this.Top = -1; // this is used as a flag to let the pagers know if paging is enabled
    this.Page = 1;
    this.OrderBy = '';
    this.Desc = false;
    this.Search = '';
    this.Data = data;
    this.TotalRows = 0;

    Object.defineProperty(self, 'PageIndex', {
        get: function () {
            return self.Page - 1;
        }
    });

    Object.defineProperty(self, 'PageCount', {
        get: function () {
            if (self.Top !== -1) {
                return Math.ceil(self.TotalRows / self.Top);
            }
            return 0;
        }
    });

    Object.defineProperty(self, 'Skip', {
        get: function () {
            if (self.Top !== -1) {
                if (self.PageCount === 0) return 0;
                if (self.Page < 1) self.Page = 1;
                else if (self.Page > self.PageCount) return self.Page = self.PageCount;
                return self.PageIndex * self.Top;
            }
            return 0;
        }
    });
};
