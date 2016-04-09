/***************\
 change monitor
\***************/
gp.ChangeMonitor = function (node, selector, model, afterSync) {
    var self = this;
    this.model = model;
    this.beforeSync = null;
    this.node = node;
    this.selector = selector;
    this.listener = function (evt) {
        self.syncModel.call(self, evt.target, self.model);
    };
    this.afterSync = afterSync;
};

gp.ChangeMonitor.prototype = {
    start: function () {
        var self = this;
        // add change event handler to node
        gp.on( this.node, 'change', this.selector, this.listener );
        gp.on( this.node, 'keydown', this.selector, this.handleEnterKey );
        return this;
    },
    handleEnterKey: function ( evt ) {
        // trigger change event
        if ( evt.keyCode == 13 ) {
            evt.target.blur();
        }
    },
    stop: function () {
        // clean up
        gp.off( this.node, 'change', this.listener );
        gp.off( this.node, 'keydown', this.handleEnterKey );
        return this;
    },
    syncModel: function (target, model) {
        // get name and value of target
        var name = target.name,
            val = target.value,
            handled = false,
            type;

        if ( !name in model ) model[name] = null;

        try {
            if ( name in model ) {
                if ( typeof ( this.beforeSync ) === 'function' ) {
                    handled = this.beforeSync( name, val, this.model );
                }
                if ( !handled ) {
                    type = gp.getType( model[name] );
                    switch ( type ) {
                        case 'number':
                            model[name] = parseFloat( val );
                            break;
                        case 'boolean':
                            if ( target.type == 'checkbox' ) {
                                if ( val.toLowerCase() == 'true' ) val = target.checked;
                                else if ( val.toLowerCase() == 'false' ) val = !target.checked;
                                else val = target.checked ? val : null;
                                model[name] = val;
                            }
                            else {
                                model[name] = ( val.toLowerCase() == 'true' );
                            }
                            break;
                        default:
                            model[name] = val;
                    }
                }
            }

            // always fire this because the toolbar may contain inputs from a template
            // which are not represented in the page model (e.g. a custom filter)
            if ( typeof this.afterSync === 'function' ) {
                this.afterSync( target, model );
            }

        } catch ( e ) {
            gp.error( e );
        }
    }
};
