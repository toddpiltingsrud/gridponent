/***************\
   utilities
\***************/
( function ( gp ) {

    // used by escapeHTML
    var chars = [/&/g, /</g, />/g, /"/g, /'/g, /`/g];
    var escaped = ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&#96;'];

    // used by createUID
    // pilfered from https://github.com/Benvie/harmony-collections
    var FP = Function.prototype;
    var callbind = FP.bind
       ? FP.bind.bind( FP.call )
       : ( function ( call ) {
           return function ( func ) {
               return function () {
                   return call.apply( func, arguments );
               };
           };
       }( FP.call ) );
    var uids = {};
    var slice = callbind( ''.slice );
    var zero = 0;
    var numberToString = callbind( zero.toString );

    $.extend( gp, {

        applyFunc: function ( func, context, args, error ) {
            if ( typeof func !== 'function' ) return;
            // anytime there's the possibility of executing 
            // user-supplied code, wrap it with a try-catch block
            // so it doesn't affect my component
            try {
                if ( args == undefined ) {
                    return func.call( context );
                }
                else {
                    args = Array.isArray( args ) ? args : [args];
                    return func.apply( context, args );
                }
            }
            catch ( e ) {
                error = error || gp.error;
                gp.applyFunc( error, context, e );
            }
        },

        coalesce: function ( array ) {
            if ( gp.isNullOrEmpty( array ) ) return array;

            for ( var i = 0; i < array.length; i++ ) {
                if ( gp.hasValue( array[i] ) ) {
                    return array[i];
                }
            }

            return array[array.length - 1];
        },

        createUID: function () {
            // id's can't begin with a number
            var key = 'gp' + slice( numberToString( Math.random(), 36 ), 2 );
            return key in uids ? createUID() : uids[key] = key;
        },

        disable: function ( elem, seconds ) {
            $( elem ).attr( 'disabled', 'disabled' ).addClass( 'disabled busy' );
            if ( typeof seconds == 'number' && seconds > 0 ) {
                setTimeout( function () {
                    gp.enable( elem );
                }, seconds * 1000 );
            }
        },

        enable: function ( elem ) {
            $( elem ).removeAttr( 'disabled' ).removeClass( 'disabled busy' );
        },

        escapeHTML: function ( obj ) {
            if ( typeof obj !== 'string' ) {
                return obj;
            }
            chars.forEach( function ( char, i ) {
                obj = obj.replace( char, escaped[i] );
            } );
            return obj;
        },

        format: function ( val, format ) {
            var type = gp.getType( val );

            try {
                if ( /^(date|datestring)$/.test( type ) ) {
                    if ( !window.moment ) return val;
                    format = format || 'M/D/YYYY h:mm a';
                    return moment( val ).format( format );
                }
                if ( type === 'timestamp' ) {
                    if ( !window.moment ) return val;
                    format = format || 'M/D/YYYY h:mm a';
                    val = parseInt( val.match( gp.rexp.timestamp )[1] );
                    return moment( val ).format( format );
                }
                if ( type === 'number' ) {
                    if ( !window.numeral ) return val;
                    // numeral's defaultFormat option doesn't work as of 3/25/2016
                    format = format || '0,0';
                    return numeral( val ).format( format );
                }
            }
            catch ( e ) {
                gp.error( e );
            }
            return val;
        },

        getAttributes: function ( node ) {
            var config = {}, name, attr, attrs = $( node )[0].attributes;
            for ( var i = attrs.length - 1; i >= 0; i-- ) {
                attr = attrs[i];
                name = attr.name.toLowerCase().replace( '-', '' );
                // convert "true", "false" and empty to boolean
                config[name] = gp.rexp.trueFalse.test( attr.value ) || attr.value === '' ?
                    ( attr.value === "true" || attr.value === '' ) : attr.value;
            }
            return config;
        },

        getColumnByField: function ( columns, field ) {
            var col = columns.filter( function ( c ) { return c.field === field || c.sort === field } );
            return col.length ? col[0] : null;
        },

        getCommand: function ( columns, name ) {
            // find by value
            var allCmds = [];
            columns.forEach( function ( col ) {
                if ( Array.isArray( col.commands ) ) {
                    allCmds = allCmds.concat( col.commands );
                }
            } );

            var cmd = allCmds.filter( function ( cmd ) {
                return cmd.value === name;
            } );

            if ( cmd.length > 0 ) return cmd[0];
        },

        getDefaultValue: function ( type ) {
            switch ( type ) {
                case 'number':
                    return 0;
                case 'boolean':
                    return false;
                case 'date':
                default:
                    return null;
            }
        },

        getFormattedValue: function ( row, col, escapeHTML ) {
            var type = ( col.Type || '' ).toLowerCase();
            // if type equals function, col.field is the function
            var val = ( type === 'function' ? col.field( row ) : row[col.field] );

            if ( /^(date|datestring|timestamp)$/.test( type ) ) {
                return gp.format( val, col.format );
            }
            if ( /^(number|function)$/.test( type ) && col.format ) {
                return gp.format( val, col.format );
            }
            // if there's no type and there's a format and val is numeric then parse and format
            if ( type === '' && col.format && /^(?:\d*\.)?\d+$/.test( val ) ) {
                return gp.format( parseFloat( val ), col.format );
            }
            if ( type === 'string' && escapeHTML ) {
                return gp.escapeHTML( val );
            }
            return val;
        },

        getMatchCI: function ( array, str ) {
            // find str in array, ignoring case
            if ( gp.isNullOrEmpty( array ) ) return null;
            if ( !gp.hasValue( str ) ) return null;
            var s = str.toLowerCase();
            for ( var i = 0; i < array.length; i++ ) {
                if ( gp.hasValue( array[i] ) && array[i].toLowerCase() === s ) return array[i];
            }
            return null;
        },

        getObjectAtPath: function ( path, root ) {
            // behold: the proper way to find an object from a string without using eval
            if ( typeof path !== 'string' ) return path;

            // o is our placeholder
            var o = root || window,
                segment;

            path = path.match( gp.rexp.splitPath );

            if ( path[0] === 'window' ) path = path.splice( 1 );

            for ( var i = 0; i < path.length; i++ ) {
                // is this segment an array index?
                segment = path[i];
                if ( gp.rexp.indexer.test( segment ) ) {
                    // convert to int
                    segment = parseInt( /\d+/.exec( segment ) );
                }
                else if ( gp.rexp.quoted.test( segment ) ) {
                    segment = segment.slice( 1, -1 );
                }

                o = o[segment];

                if ( o === undefined ) return;
            }

            return o;
        },

        getTableRow: function ( map, dataItem, node ) {
            var uid = map.getUid( dataItem );
            if ( uid == -1 ) return;
            return $( node ).find( 'tr[data-uid="' + uid + '"]' );
        },

        getType: function ( a ) {
            if ( a === null || a === undefined ) {
                return a;
            }

            var t = typeof a;

            if ( t === 'string' ) {
                if ( gp.rexp.iso8601.test( a ) ) {
                    return 'datestring';
                }
                if ( gp.rexp.timestamp.test( a ) ) {
                    return 'timestamp';
                }
                return t;
            }

            if ( t === 'number' || t === 'boolean' || t === 'function' ) return t;

            if ( a instanceof Date ) {
                return 'date';
            }
            if ( Array.isArray( a ) ) {
                return 'array';
            }
            // object
            return t;
        },

        hasValue: function ( val ) {
            return val !== undefined && val !== null;
        },

        'implements': function ( obj1, obj2 ) {
            if ( typeof obj1 !== typeof obj2 ) return false;
            // they're both null or undefined
            if ( !gp.hasValue( obj1 ) ) return true;

            // do a case-insensitive compare
            var toLower = function ( str ) {
                return str.toLowerCase();
            };

            var props1 = Object.getOwnPropertyNames( obj1 ).map( toLower ),
                props2 = Object.getOwnPropertyNames( obj2 ).map( toLower );

            if ( props1.length < props2.length ) {
                for ( var i = 0; i < props1.length; i++ ) {
                    if ( props2.indexOf( props1[i] ) === -1 ) return false;
                }
            }
            else {
                for ( var i = 0; i < props2.length; i++ ) {
                    if ( props1.indexOf( props2[i] ) === -1 ) return false;
                }
            }

            return true;
        },

        isNullOrEmpty: function ( val ) {
            // if a string or array is passed, it'll be tested for both null and zero length
            // if any other data type is passed (no length property), it'll only be tested for null
            return gp.hasValue( val ) === false || ( val.length != undefined && val.length === 0 );
        },

        resolveTypes: function ( config ) {
            var field,
                val,
                hasData = config && config.requestModel && config.requestModel.data && config.requestModel.data.length;

            config.columns.forEach( function ( col ) {
                if ( gp.hasValue( col.Type ) ) return;
                field = gp.hasValue( col.field ) ? col.field : col.sort;
                if ( gp.isNullOrEmpty( field ) ) return;
                if ( typeof field === 'function' ) {
                    // don't execute the function here to find the type
                    // it should only be executed once by getFormattedValue
                    col.Type = 'function';
                    return;
                }
                // give priority to the model, unless it contains a function
                if ( config.model ) {
                    if ( gp.hasValue( config.model[field] ) && gp.getType( config.model[field] ) !== 'function' ) {
                        col.Type = gp.getType( config.model[field] );
                    }
                }
                if ( !gp.hasValue( col.Type ) && hasData ) {
                    // if we haven't found a value after 25 iterations, give up
                    for ( var i = 0; i < config.requestModel.data.length && i < 25 ; i++ ) {
                        val = config.requestModel.data[i][field];
                        // no need to use gp.hasValue here
                        // if val is undefined that means the column doesn't exist
                        if ( val !== null ) {
                            col.Type = gp.getType( val );
                            break;
                        }
                    }
                }
            } );
        },

        resolveResponseModel: function ( response, dataItemPrototype ) {
            if ( !gp.hasValue( response ) ) return null;

            var responseModel = new gp.ResponseModel();

            if ( gp.implements( response, responseModel ) ) {
                // this will overwrite responseModel.original if present in the response
                gp.shallowCopy( response, responseModel, true );
            }
            else if ( response.data && response.data.length ) {
                responseModel.dataItem = response.data[0];
            }
            else if ( response.length ) {
                responseModel.dataItem = response[0];
            }
            else if ( gp.implements( response, dataItemPrototype ) ) {
                responseModel.dataItem = response;
            }
            else {
                throw new Error( "Could not resolve JSON response." );
            }

            return responseModel;
        },

        rexp: {
            splitPath: /[^\[\]\.\s]+|\[\d+\]/g,
            indexer: /\[\d+\]/,
            iso8601: /^[012][0-9]{3}-[01][0-9]-[0123][0-9]/,
            timestamp: /\/Date\((\d+)\)\//,
            quoted: /^['"].+['"]$/,
            trueFalse: /true|false/i,
            json: /^\{.*\}$|^\[.*\]$/,
            copyable: /^(object|date|array|function)$/
        },

        shallowCopy: function ( from, to, caseInsensitive ) {
            to = to || {};
            // IE is more strict about what it will accept
            // as an argument to getOwnPropertyNames
            if ( !gp.rexp.copyable.test( gp.getType( from ) ) ) return to;
            var desc,
                p,
                props = Object.getOwnPropertyNames( from ),
                propsTo = Object.getOwnPropertyNames( to );

            props.forEach( function ( prop ) {

                p = caseInsensitive ? gp.getMatchCI( propsTo, prop ) || prop : prop;

                if ( to.hasOwnProperty( prop ) ) {
                    // check for a read-only property
                    desc = Object.getOwnPropertyDescriptor( to, prop );
                    if ( !desc.writable ) return;
                }
                if ( typeof from[prop] === 'function' ) {
                    to[p] = from[prop]();
                }
                else {
                    to[p] = from[prop];
                }
            } );
            return to;
        },

        supplant: function ( str, o, args ) {
            var self = this, t, types = /^(string|number|boolean|date|datestring|timestamp)$/, r;
            // raw: 3 curly braces
            str = str.replace( /{{{([^{}]*)}}}/g,
                function ( a, b ) {
                    r = gp.getObjectAtPath( b, o );
                    t = gp.getType( r );
                    if ( types.test( t ) ) return r;
                    // models can contain functions
                    if ( t === 'function' ) return gp.applyFunc( r, self, args );
                    // it's not in o, so check for a function
                    r = gp.getObjectAtPath( b );
                    return typeof r === 'function' ? gp.applyFunc( r, self, args ) : '';
                }
            )
            // escape HTML: 2 curly braces
            return str.replace( /{{([^{}]*)}}/g,
                function ( a, b ) {
                    r = gp.getObjectAtPath( b, o );
                    t = gp.getType( r );
                    if ( types.test( t ) ) return gp.escapeHTML( r );
                    // models can contain functions
                    if ( t === 'function' ) return gp.escapeHTML( gp.applyFunc( r, self, args ) );
                    // it's not in o, so check for a function
                    r = gp.getObjectAtPath( b );
                    return typeof r === 'function' ? gp.escapeHTML( gp.applyFunc( r, self, args ) ) : '';
                }
            );
        },

        triggerEvent: function ( elem, name ) {

            var evt = new CustomEvent( name, {
                'view': window,
                'bubbles': true,
                'cancelable': true
            } );

            $( elem )[0].dispatchEvent( evt );

        },

        // logging
        log: ( window.console ? window.console.log.bind( window.console ) : function () { } ),

        error: function ( e ) {
            if ( console && console.error ) {
                console.error( e );
            }
        }

    } );

} )( gridponent );
