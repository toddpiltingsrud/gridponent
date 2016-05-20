/***************\
   ModelSync
\***************/

gp.ModelSync = {

    rexp: {
        rCRLF: /\r?\n/g,
        rsubmitterTypes: /^(?:submit|button|image|reset|file)$/i,
        rsubmittable: /^(?:input|select|textarea|keygen)/i,
        rcheckableType: /^(?:checkbox|radio)$/i,
        rTrue: /^true$/i,
        rFalse: /^false$/i,
    },

    isDisabled: function ( elem ) {
        return elem.disabled == true;
    },

    isNumeric: function ( obj ) {
        return !Array.isArray( obj ) && ( obj - parseFloat( obj ) + 1 ) >= 0;
    },

    /*
        jQuery's serializeArray function fails under the following scenario:
        There are two inputs with the same name.
        One of them is a checkbox with a value of true, the other is a hidden with a value of false.

        What should happen:
        If the checkbox is checked, both are submitted and only the first one (checkbox) is used by the server resulting in a value of true.
        If the checkbox is unchecked, only the hidden is submitted resulting in a value of false.
        ASP.NET uses this technique to submit an explicit true or false instead of true or nothing.

        What actually happens:
        jQuery's serializeArray function always submits true regardless of checked state.
    */

    serialize: function ( form ) {
        var inputs = form.querySelectorAll( '[name]' ),
            arr = gp.toArray( inputs ),
            filter = {},
            obj = {};

        arr.forEach( function ( elem ) {
            // add properties for each named element in the form
            // so unsuccessful form elements are still explicitly represented
            obj[elem.name] = null;
        } );

        arr.filter( function ( elem ) {
            var type = elem.type;

            return !this.isDisabled( elem )
                && this.rexp.rsubmittable.test( elem.nodeName )
                && !this.rexp.rsubmitterTypes.test( type )
                && ( elem.checked || !this.rexp.rcheckableType.test( type ) );
        }.bind( this ) )
            .filter( function ( elem ) {
                // if there are multiple elements with the same name, take the first one
                if ( elem.name in filter ) return false;
                return filter[elem.name] = true;
            } )
            .forEach( function ( elem ) {
                var val = elem.value;
                obj[elem.name] =
                    ( val == null ?
                    null :
                    val.replace( this.rexp.rCRLF, "\r\n" ) );
            }.bind( this )
        );

        return obj;
    },

    bindElements: function ( model, context ) {
        var value,
            clean,
            elem;

        Object.getOwnPropertyNames( model ).forEach( function ( prop ) {

            value = gp.hasValue( model[prop] ) ? model[prop].toString() : '';

            // is there a checkbox or radio with this name and value?
            // don't select the value because it might throw a syntax error
            elem = context.querySelectorAll( '[type=checkbox][name="' + prop + '"],[type=radio][name="' + prop + '"]' );

            if ( elem != null  ) {

                clean = gp.escapeHTML( value );

                for ( var i = 0; i < elem.length; i++ ) {
                    if ( elem[i].value == value || elem[i].value == clean ) {
                        elem[i].checked = true;
                        return;
                    }
                }
            }

            // check for boolean
            if ( /^(true|false)$/i.test( value ) )
            {
                elem = context.querySelectorAll( '[type=checkbox][name="' + prop + '"][value=true],[type=checkbox][name="' + prop + '"][value=false]' );

                if ( elem != null ) {
                    gp.each( elem, function ( e ) {
                        e.checked = (
                            ( this.rexp.rTrue.test( value ) && this.rexp.rTrue.test( e.value ) )
                            ||
                            ( this.rexp.rFalse.test( value ) && this.rexp.rFalse.test( e.value ) )
                        );
                    }.bind( this ) );

                    return;
                }
            }

            elem = context.querySelector( '[name="' + prop + '"]' );
            if ( elem != null ) {

                // inputs with a value property
                if ( elem.value !== undefined ) {
                    elem.value = value;
                }
                // inputs without a value property (e.g. textarea)
                else if ( elem.innerHTML !== undefined ) {
                    elem.innerHTML = ( value == null ? '' : gp.escapeHTML( value ) );
                }

            }

        }.bind( this ) );
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

    cast: function ( val, dataType ) {
        switch ( dataType ) {
            case 'number':
                if ( this.isNumeric( val ) ) return parseFloat( val );
                break;
            case 'boolean':
                return val != null && val.toLowerCase() == 'true';
                break;
            case 'null':
            case 'undefined':
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
