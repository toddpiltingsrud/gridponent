/***************\
 change monitor
\***************/
gp.ChangeMonitor = function (node, selector, model, afterSync) {
    var self = this;
    this.model = model;
    this.beforeSync = null;
    this.afterSync = afterSync;
    this.node = node;
    this.listener = function (evt) {
        self.syncModel.call(self, evt.target, self.model);
    };
    // add change event handler to node
    gp.on(node, 'change', selector, this.listener);
};

gp.ChangeMonitor.prototype = {
    syncModel: function (target, model) {
        // get name and value of target
        var name = target.name;
        var value = target.value;
        var handled = false;

        if ((name in model) === false) {
            return;
        }

        if (typeof (this.beforeSync) === 'function') {
            handled = this.beforeSync(name, value, this.model);
        }
        if (!handled) {
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
        }
        if (typeof this.afterSync === 'function') {
            this.afterSync(target, model);
        }
    },
    syncUI: function (changes) {
        var inputs, name, value, self = this;
        gp.info('gp.ChangeMonitor.syncUI: changes:');
        gp.info(changes);
        changes.forEach(function (change) {
            name = change.name;
            value = self.model[change.name];

            inputs = self.node.querySelectorAll('[name=' + name + ']');

            if (!inputs) return;

            if (inputs.length === 1) {
                // single input (text, date, hidden, etc)
                // or single checkbox with a value of true
            }
            else if (inputs.length > 1) {
                //multiple radios, one of which needs to be checked
                //mulitple checkboxes, one of which has the correct value. If value is an array, check all the boxes for the array.
            }
        });
    },
    stop: function () {
        // clean up
        gp.off(this.node, 'change', this.listener);
    }
};
