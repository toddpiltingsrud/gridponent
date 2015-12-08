/***************\
   ObjectProxy
\***************/
gp.ObjectProxy = function (obj, onPropertyChanged) {
    var self = this;
    this.model = obj;
    this.handlers = [];
    if (typeof onPropertyChanged === 'function') {
        this.handlers.push(onPropertyChanged);
    }

    this.callHandlers = function (prop, oldValue, newValue) {
        self.handlers.forEach(function (handler) {
            handler(self, prop, oldValue, newValue);
        });
    };

    // create mirror properties
    var props = Object.getOwnPropertyNames(obj);

    props.forEach(function (prop) {
        Object.defineProperty(self, prop, {
            get: function () {
                return obj[prop];
            },
            set: function (value) {
                var previousValue;
                if (obj[prop] != value) {
                    previousValue = obj[prop];
                    obj[prop] = value;
                    self.callHandlers(prop, previousValue, value);
                }
            }
        });
    });
};

