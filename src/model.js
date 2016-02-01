/***************\
     model
\***************/
gp.Model = function ( config ) {
    this.config = config;
    this.dal = null;
    var type = gp.getType(config.Read);
    if ( type == 'string' ) {
        this.dal = new gp.ServerPager(config);
    }
};

gp.Model.prototype = {

    read: function (requestModel, callback) {
        var type = gp.getType( this.config.Read );
        switch ( type ) {
            case 'string':
                var http = new gp.Http();
                http.post( this.config.Read, requestModel, callback );
                break;
            case 'function':
                this.config.Read( requestModel, callback );
                break;
            case 'object':
                // Read is a RequestModel
                callback( this.config.Read );
            case 'array':
                this.config.data.Data = this.config.Read;
                var dal = new gp.ClientPager( this.config );
                dal.read( requestModel, callback );
                break;
            default:
                callback();
        }
    },

    create: function (callback) {
        var self = this;
        if (typeof this.config.Create === 'function') {
            this.config.Create(function (row) {
                if (self.config.data.Data && self.config.data.Data.push) {
                    self.config.data.Data.push(row);
                }
                callback(row);
            });
        }
        else {
            var http = new gp.Http();
            http.get(this.config.Create, function (row) {
                if (self.config.data.Data && self.config.data.Data.push) {
                    self.config.data.Data.push(row);
                }
                callback(row);
            });
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