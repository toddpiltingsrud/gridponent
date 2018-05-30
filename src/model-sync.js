/***************\
   ModelSync
\***************/

gp.ModelSync = {

    rexp: {
        rTrue: /^true$/i,
        rFalse: /^false$/i,
    },

    serialize: function ( form ) {
        var inputs = $( form ).find( ':input[name]' ),
            arr,
            obj = {};

        inputs.each( function () {
            // add properties for each named element in the form
            // so unsuccessful form elements are still explicitly represented
            obj[this.name] = null;
        } );

        arr = $( inputs ).serializeArray();

        arr.forEach( function ( item ) {
            // if there are multiple elements with this name assume an array
            if ( obj[item.name] !== null && !Array.isArray( obj[item.name] ) ) {
                obj[item.name] = [obj[item.name]];
            }
            if ( Array.isArray( obj[item.name] ) ) {
                obj[item.name].push( item.value );
            }
            else {
                obj[item.name] = item.value;
            }
        } );

        return obj;
    },

    bindElements: function ( model, context ) {
        var self = this,
            value;

        Object.getOwnPropertyNames( model ).forEach( function ( prop ) {
            value = model[prop];
            if ( Array.isArray( value ) ) {
                value.forEach( function ( val ) {
                    self.bindElement( prop, val, context );
                } );
            }
            else {
                self.bindElement( prop, value, context );
            }
        } );
    },

    bindElement: function ( prop, value, context ) {
        var self = this,
            clean,
            elem;

        value = gp.hasValue( value ) ? value.toString() : '';

        // is there a checkbox or radio with this name and value?
        // don't select the value because it might throw a syntax error
        elem = $(context).find( '[type=checkbox][name="' + prop + '"],[type=radio][name="' + prop + '"]' );

        if ( elem.length > 0) {

            clean = gp.escapeHTML( value );

            for ( var i = 0; i < elem.length; i++ ) {
                if ( elem[i].value == value || elem[i].value == clean ) {
                    elem[i].checked = true;
                    return;
                }
            }

            return;
        }

        // check for boolean, case-insensitive
        if ( /^(true|false)$/i.test( value ) ) {
            elem = $(context).find('[type=checkbox][name="' + prop + '"][value=true],[type=checkbox][name="' + prop + '"][value=false]')
                .add('[type=radio][name="' + prop + '"][value=true],[type=radio][name="' + prop + '"][value=false]');

            if ( elem.length > 0 ) {
                elem.each( function ( e ) {
                    this.checked = (
                        ( self.rexp.rTrue.test( value ) && self.rexp.rTrue.test( e.value ) )
                        ||
                        ( self.rexp.rFalse.test( value ) && self.rexp.rFalse.test( e.value ) )
                    );
                } );

                return;
            }
        }

        elem = $( context ).find( '[name="' + prop + '"]' );
        if ( elem.length > 0 ) {

            // inputs with a value property
            if ( elem[0].value !== undefined ) {
                elem.val( value );
            }
                // inputs without a value property (e.g. textarea)
            else if ( elem[0].innerHTML !== undefined ) {
                elem.html( value == null ? '' : gp.escapeHTML( value ) );
            }

        }

    },

    castValues: function ( model, columns ) {
        var col;

        Object.getOwnPropertyNames( model ).forEach( function ( prop ) {
            col = gp.getColumnByField( columns, prop );

            if ( col && col.Type ) {
                model[prop] = this.cast( model[prop], col.Type );
            }
        }.bind(this) );
    },

    castModel: function ( model, targetPrototype ) {
        var type,
            val,
            self = this,
            props = Object.getOwnPropertyNames( model );

        props.forEach( function ( prop ) {
            if ( targetPrototype.hasOwnProperty( prop ) ) {
                type = gp.getType( targetPrototype[prop] );
                if ( type ) {
                    val = model[prop];
                    model[prop] = self.cast( val, type );
                }
            }
        } );
    },

    cast: function ( val, dataType ) {
        switch ( dataType ) {
            case 'number':
                if ( $.isNumeric( val ) ) return parseFloat( val );
                break;
            case 'boolean':
                return val != null && val.toLowerCase() == 'true';
                break;
            case null:
            case undefined:
                if ( /true|false/i.test( val ) ) {
                    // assume boolean
                    return val != null && val.toLowerCase() == 'true';
                }
                return val === '' ? null : val;
                break;
            default:
                return val === '' ? null : val;
                break;
        }
    }
};
