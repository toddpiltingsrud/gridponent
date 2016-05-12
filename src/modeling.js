/***************\
    modeling
\***************/
gp.Modeler = function () {

};

var rexp = {
	segments: /[^\[\]\.\s]+|\[\d+\]/g,
	indexer: /\[\d+\]/
};

gp.Modeler.prototype = {
	syncChange: function ( parent, target, model, columns ) {
		var name = target.name;
		if ( gp.isNullOrEmpty( name ) ) return;

		// there could be more than one element with this name, find them all
		var elems = parent.querySelectorAll( '[name="' + name + '"]' );

		var o = {
			target: evt.target,
			name: name,
			value: target.value,
			model: model
		};

		this.setModelProperty( parent, o.model, elems );
	},

	getPathSegments: function ( path ) {
		return path.match( rexp.segments );
	},

	resolvePathSegment: function ( segment ) {
	    // is this segment an array index?
	    if ( rexp.indexer.test( segment ) ) {
	        return parseInt( /\d+/.exec( segment ) );
	    }
	    return segment;
	},

	setModelProperty: function ( context, model, elems ) {
		var obj,
            prop,
            type,
            val;

		// get the raw value
		val = this.getValue( elems );

		// grab the object we're setting
		obj = gp.getObjectAtPath( model, segments, Array.isArray( val ) );

		// grab the object property name
		prop = this.resolvePathSegment( segments[segments.length - 1] );

		// attempt to resolve the data type in the model
		// if we can't get a type from the model
		// rely on the server to resolve it
		if ( prop in obj ) {
			type = $.type( obj[prop] );
		}
		else if ( Array.isArray( obj ) && obj.length ) {
			type = $.type( obj[0] );
		}

		// cast the raw value to the appropriate type
		val = this.castValues( val, type );

		if ( Array.isArray( val ) && Array.isArray( obj ) ) {
			// preserve the object reference in case it's referenced elsewhere
			// clear out the array and repopulate it
			obj.splice( 0, obj.length );
			val.forEach( function ( v ) {
				obj.push( v );
			} );
		}
		else {
			obj[prop] = val;
		}
	},
	getValue: function ( elem, parent ) {
		if ( elem.length === 0 ) return null;
		var val,
		    type = elem.type,
            node = elem.nodeName,
		    name = elem.name,
            input;

		if ( type == 'radio' ) {
            input = parent.querySelector( 'input[type=radio][name="' + name + '"][checked]' );
            return input ? input.value : null;
		}
		else {
		    input = parent.querySelectorAll( '[name="' + name + '"]' );
		}

		if ( input && input.length == 1 ) {
		    return input[0].value;
		}

		var ret = [];


		// it's supposed to be an array if they're all the same type and they're not radios
		var isArray = elem.length > 1
            && type !== 'radio'
            && elem.filter( '[type="' + type + '"]' ).length === elem.length;
		if ( type === 'checkbox' ) {
			if ( isArray ) {
				// this will only include checked boxes
				val = elem.serializeArray().map( function ( nv ) { return nv.value; } );
			}
			else {
				// this returns the checkbox value, not whether it's checked
				val = elem.val();
				// check for boolean, otherwise return val if it's checked, null if not checked
				if ( val.toLowerCase() == 'true' ) val = ( elem[0].checked ).toString();
				else if ( val.toLowerCase() == 'false' ) val = ( !elem[0].checked ).toString();
				else val = elem[0].checked ? val : null;
			}
		}
		else if ( type === 'radio' ) {
			val = elem.serializeArray()[0].value;
		}
		else {
			val = ( isArray ) ? elem.serializeArray().map( function ( nv ) { return nv.value; } ) : elem.val();
		}
		if ( !isArray && val === '' ) return null;
		return val;
	},
	castValues: function ( val, type ) {
		var isArray = Array.isArray( val );
		var arr = isArray ? val : [val];
		switch ( type ) {
			case 'number':
				arr = arr.filter( $.isNumeric ).map( parseFloat );
				break;
			case 'boolean':
				arr = arr.map( function ( v ) {
					return v.toLowerCase() == 'true';
				} );
				break;
			case 'null':
			case 'undefined':
				arr = arr.map( function ( v ) {
					if ( /true|false/i.test( v ) ) {
						// assume boolean
						return v.toLowerCase() === 'true';
					}
					return v === '' ? null : v;
				} );
				break;
			default:
				arr = arr.map( function ( v ) {
					return v === '' ? null : v;
				} );
				break;
		}
		return isArray ? arr : arr[0];
	},


	serializeArray: function ( parent ) {
	    var self = this,
            inputs = parent.querySelectorAll( '[name]' ),
	        arr = [],
            rCRLF = /\r?\n/g,
	        rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
            rsubmittable = /^(?:input|select|textarea|keygen)/i,
            rcheckableType = /^(?:checkbox|radio)$/i;

	    for ( var i = 0; i < inputs.length; i++ ) {
	        arr.push( inputs[i] );
	    }

	    // jQuery's version of this fails when there's a checkbox with a value of true
	    // and a hidden with a value of false.
	    // That's how ASP.NET sends false when the box is not checked.
        // In this case jQuery always sends true even if the box is not checked.

	    return arr.filter( function () {
		    var type = this.type;

		    return rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} )
		.map( function ( i, elem ) {
		    var val = self.getValue(elem, parent);

		    return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function ( val ) {
					    return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					} ) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} );
	}

};