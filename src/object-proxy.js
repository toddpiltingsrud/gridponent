/***************\
   ObjectProxy
\***************/
gp.ObjectProxy = function (obj, onPropertyChanged, syncChanges) {
    var self = this;
    var dict = {};

    // create mirror properties
    var props = Object.getOwnPropertyNames( obj );

    props.forEach(function (prop) {
        Object.defineProperty(self, prop, {
            get: function () {
                return dict[prop];
            },
            set: function (value) {
                if (dict[prop] != value) {
                    var oldValue = dict[prop];
                    dict[prop] = value;
                    if ( syncChanges ) {
                        // write changes back to the original object
                        obj[prop] = value;
                    }
                    if ( typeof onPropertyChanged === 'function' ) {
                        onPropertyChanged(self, prop, oldValue, value);
                    }
                }
            }
        });
        dict[prop] = obj[prop];
    });
};