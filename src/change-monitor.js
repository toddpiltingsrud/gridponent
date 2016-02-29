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
        gp.on( this.node, 'keydown', this.selector, function ( evt ) {
            if ( evt.keyCode == 13 ) {
                evt.target.blur();
                //self.listener( evt );
            }
        } );
        return this;
    },
    stop: function () {
        // clean up
        gp.off( this.node, 'change', this.listener );
        return this;
    },
    syncModel: function (target, model) {
        // get name and value of target
        var name = target.name,
            value = target.value,
            handled = false,
            type;

        try {
            if ( name in model ) {
                if ( typeof ( this.beforeSync ) === 'function' ) {
                    handled = this.beforeSync( name, value, this.model );
                }
                if ( !handled ) {
                    type = gp.getType( model[name] );
                    switch ( type ) {
                        case 'number':
                            model[name] = parseFloat( value );
                            break;
                        case 'boolean':
                            model[name] = ( value.toLowerCase() == 'true' );
                            break;
                        default:
                            model[name] = value;
                    }
                }
            }
            if ( typeof this.afterSync === 'function' ) {
                this.afterSync( target, model );
            }

        } catch ( e ) {
            gp.error( e );
        }
    }
};
