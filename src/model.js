/***************\
     model
\***************/
gp.Model = function (config) {
    this.config = config;
    if (config.Read === 'string') {
        this.pager = new gp.ServerPager(config);
    }
    else if (typeof config.Read !== 'function') {
        // even if paging isn't enabled, we can still use a ClientPager for searching and sorting
        this.pager = new gp.ClientPager(config);
        // set pager.data even if config.DataSource is undefined
        this.pager.data = config.DataSource;
    }
};

gp.Model.prototype = {

    read: function (requestModel, callback) {
        if (this.pager) {
            this.pager.read(requestModel, function (response) {
                // response should be a RequestModel object with data
                callback(response);
            });
        }
        else if (typeof this.config.Read === 'function') {
            this.config.Read(requestModel, callback);
        }
        else if (typeof this.config.Read === 'string') {
            var http = new gp.Http();
            http.post(this.config.Read, requestModel, callback);
        }
        else {
            callback();
        }
    },

    create: function (callback) {
        if (typeof this.config.Create === 'function') {
            this.config.Create(callback);
        }
        else {
            var http = new gp.Http();
            http.get(this.config.Create, callback);
        }
    },

    update: function (row, callback) {
        if (typeof this.config.Update === 'function') {
            this.config.Update(row, callback);
        }
        else {
            var http = new gp.Http();
            http.post(this.config.Update, row, callback);
        }
    },

    destroy: function (row, callback) {
        if (typeof this.config.Destroy === 'function') {
            this.config.Destroy(row, callback);
        }
        else {
            var http = new gp.Http();
            http.post(this.config.Destroy, row, callback);
        }
    }

};