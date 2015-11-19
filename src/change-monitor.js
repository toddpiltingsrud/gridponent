/***************\
 change monitor
\***************/
gp.ChangeMonitor = function (elem, selector, model, afterSync) {
    var self = this;
    this.model = model;
    this.beforeSync = null;
    this.afterSync = afterSync;
    this.elem = elem;
    this.listener = function (evt) {
        self.syncModel(evt.target, self.model);
        self.afterSync(evt, model);
    };
    // add change event handler to elem
    gp.on(elem, 'change', selector, this.listener);
};

gp.ChangeMonitor.prototype = {
    syncModel: function (target, model) {
        // get name and value of target
        var name = target.name;
        var value = target.value;
        if (typeof (this.beforeSync) === 'function') {
            if (this.beforeSync(name, value, this.model)) {
                // sync was handled by the beforeSync callback
                return;
            }
        }
        type = gp.getType(model[name]);
        switch (type) {
            case 'number':
                model[name] = parseFloat(value);
                break;
            case 'boolean':
                model[name] = (value.toLowerCase() == 'true');
                break;
            default:
                model[name] = value;
        }
    },
    stop: function () {
        // clean up
        gp.off(this.elem, 'change', this.listener);
    }
};
