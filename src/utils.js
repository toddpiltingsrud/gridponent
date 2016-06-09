/***************\
   utilities
\***************/
( function ( gp ) {

    var matches = null;

    var possibles = ['matches', 'matchesSelector', 'mozMatchesSelector', 'webkitMatchesSelector', 'msMatchesSelector', 'oMatchesSelector'];

    for ( var i = 0; i < possibles.length && matches == null; i++ ) {
        if ( Element.prototype[possibles[i]] ) matches = possibles[i];
    }

    gp.applyFunc = function ( callback, context, args, error ) {
        if ( typeof callback !== 'function' ) return;
        // anytime there's the possibility of executing 
        // user-supplied code, wrap it with a try-catch block
        // so it doesn't affect my component
        try {
            if ( args == undefined ) {
                return callback.call( context );
            }
            else {
                args = Array.isArray( args ) ? args : [args];
                return callback.apply( context, args );
            }
        }
        catch ( e ) {
            error = error || gp.error;
            gp.applyFunc( error, context, e );
        }
    };

    gp.camelize = function ( str ) {
        if ( gp.isNullOrEmpty( str ) ) return str;
        return str
            .replace( /[A-Z]([A-Z]+)/g, function ( _, c ) {
                return _ ? _.substr( 0, 1 ) + c.toLowerCase() : '';
            } )
            .replace( /[-_](\w)/g, function ( _, c ) {
                return c ? c.toUpperCase() : '';
            } )
            .replace( /^([A-Z])/, function ( _, c ) {
                return c ? c.toLowerCase() : '';
            } );
    };

    gp.coalesce = function ( array ) {
        if ( gp.isNullOrEmpty( array ) ) return array;

        for ( var i = 0; i < array.length; i++ ) {
            if ( gp.hasValue( array[i] ) ) {
                return array[i];
            }
        }

        return array[array.length - 1];
    };

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

    gp.createUID = function () {
        // id's can't begin with a number
        var key = 'gp' + slice( numberToString( Math.random(), 36 ), 2 );
        return key in uids ? createUID() : uids[key] = key;
    };

    gp.disable = function ( elem, seconds ) {
        $( elem ).attr( 'disabled', 'disabled' ).addClass( 'disabled busy' );
        if ( typeof seconds == 'number' && seconds > 0 ) {
            setTimeout( function () {
                gp.enable( elem );
            }, seconds * 1000 );
        }
    };

    gp.enable = function ( elem ) {
        $( elem ).removeAttr( 'disabled' ).removeClass( 'disabled busy' );
    };

    var chars = [/&/g, /</g, />/g, /"/g, /'/g, /`/g];
    var escaped = ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&#96;'];

    gp.escapeHTML = function ( obj ) {
        if ( typeof obj !== 'string' ) {
            return obj;
        }
        chars.forEach( function ( char, i ) {
            obj = obj.replace( char, escaped[i] );
        } );
        return obj;
    };

    gp.formatter = new gp.Formatter();

    gp.getAttributes = function ( node ) {
        var config = {}, name, attr, attrs = $(node)[0].attributes;
        for ( var i = attrs.length - 1; i >= 0; i-- ) {
            attr = attrs[i];
            name = attr.name.toLowerCase().replace('-', '');
            // convert "true", "false" and empty to boolean
            config[name] = gp.rexp.trueFalse.test( attr.value ) || attr.value === '' ?
                ( attr.value === "true" || attr.value === '' ) : attr.value;
        }
        return config;
    };

    gp.getColumnByField = function ( columns, field ) {
        var col = columns.filter( function ( c ) { return c.field === field || c.sort === field } );
        return col.length ? col[0] : null;
    };

    gp.getCommand = function ( columns, name ) {
        // find by value
        var allCmds = [];
        columns.forEach( function ( col ) {
            if ( Array.isArray(col.commands)){
                allCmds = allCmds.concat(col.commands);
            }
        } );

        var cmd = allCmds.filter(function(cmd){
            return cmd.value === name;
        });

        if (cmd.length > 0) return cmd[0];
    };

    gp.getDefaultValue = function ( type ) {
        switch ( type ) {
            case 'number':
                return 0;
            case 'boolean':
                return false;
            case 'date':
            default:
                return null;
        }
    };

    gp.getFormattedValue = function ( row, col, escapeHTML ) {
        var type = ( col.Type || '' ).toLowerCase();
        var val = row[col.field];

        if ( /^(date|datestring|timestamp)$/.test( type ) ) {
            return gp.formatter.format( val, col.format );
        }
        if ( type === 'number' && col.format ) {
            return gp.formatter.format( val, col.format );
        }
        if ( type === '' && col.format && /^(?:\d*\.)?\d+$/.test( val ) ) {
            return gp.formatter.format( parseFloat( val ), col.format );
        }
        if ( type === 'string' && escapeHTML ) {
            return gp.escapeHTML( val );
        }
        return val;
    };

    gp.getObjectAtPath = function ( path, root ) {
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
    };

    gp.getTableRow = function ( map, dataItem, node ) {
        var uid = map.getUid( dataItem );
        if ( uid == -1 ) return;
        return $( node ).find( 'tr[data-uid="' + uid + '"]' );
    };

    gp.getType = function ( a ) {
        if ( a === null || a === undefined ) {
            return a;
        }
        if ( a instanceof Date ) {
            return 'date';
        }
        if ( typeof ( a ) === 'string' ) {
            if ( gp.rexp.iso8601.test( a ) ) {
                return 'datestring';
            }
            if ( gp.rexp.timestamp.test( a ) ) {
                return 'timestamp';
            }
        }
        if ( Array.isArray( a ) ) {
            return 'array';
        }
        // number string boolean function object
        return typeof ( a );
    };

    gp.hasPositiveWidth = function ( nodes ) {
        if ( gp.isNullOrEmpty( nodes ) ) return false;
        for ( var i = 0; i < nodes.length; i++ ) {
            if ( nodes[i].offsetWidth > 0 ) return true;
        }
        return false;
    };

    gp.hasValue = function ( val ) {
        return val !== undefined && val !== null;
    };

    gp.isNullOrEmpty = function ( val ) {
        // if a string or array is passed, it'll be tested for both null and zero length
        // if any other data type is passed (no length property), it'll only be tested for null
        return gp.hasValue( val ) === false || ( val.length != undefined && val.length === 0 );
    };

    gp.resolveTypes = function ( config ) {
        var field,
            hasData = config && config.pageModel && config.pageModel.data && config.pageModel.data.length;

        config.columns.forEach( function ( col ) {
            if ( gp.hasValue( col.Type ) ) return;
            field = gp.hasValue( col.field ) ? col.field : col.sort;
            if ( gp.isNullOrEmpty( field ) ) return;
            if ( config.model ) {
                // look for a type by field first, then by sort
                if ( gp.hasValue( config.model[field] ) ) {
                    col.Type = gp.getType( config.model[field] );
                }
            }
            if ( !gp.hasValue( col.Type ) && hasData ) {
                // if we haven't found a value after 25 iterations, give up
                for ( var i = 0; i < config.pageModel.data.length && i < 25 ; i++ ) {
                    if ( config.pageModel.data[i][field] !== null ) {
                        col.Type = gp.getType( config.pageModel.data[i][field] );
                        break;
                    }
                }
            }
        } );
    };


    gp.rexp = {
        splitPath: /[^\[\]\.\s]+|\[\d+\]/g,
        indexer: /\[\d+\]/,
        iso8601: /^[012][0-9]{3}-[01][0-9]-[0123][0-9]/,
        timestamp: /\/Date\((\d+)\)\//,
        quoted: /^['"].+['"]$/,
        trueFalse: /true|false/i,
        json: /^\{.*\}$|^\[.*\]$/,
        copyable: /^(object|date|array|function)$/
    };

    gp.shallowCopy = function ( from, to, camelize ) {
        to = to || {};
        // IE is more strict about what it will accept
        // as an argument to getOwnPropertyNames
        if ( !gp.rexp.copyable.test( gp.getType( from ) ) ) return to;
        var p, props = Object.getOwnPropertyNames( from );
        props.forEach( function ( prop ) {
            p = camelize ? gp.camelize( prop ) : prop;
            to[p] = from[prop];
        } );
        return to;
    };

    gp.supplant = function ( str, o, args ) {
        var self = this, types = /^(string|number|boolean)$/, r;
        // raw: 3 curly braces
        str = str.replace( /{{{([^{}]*)}}}/g,
            function ( a, b ) {
                r = o[b];
                if ( types.test( typeof r ) ) return r;
                // models can contain functions
                if ( typeof r === 'function' ) return gp.applyFunc( r, self, args );
                // it's not in o, so check for a function
                r = gp.getObjectAtPath( b );
                return typeof r === 'function' ? gp.applyFunc( r, self, args ) : '';
            }
        )
        // escape HTML: 2 curly braces
        return str.replace( /{{([^{}]*)}}/g,
            function ( a, b ) {
                r = o[b];
                if ( types.test( typeof r ) ) return gp.escapeHTML( r );
                // models can contain functions
                if ( typeof r === 'function' ) return gp.escapeHTML( gp.applyFunc( r, self, args ) );
                // it's not in o, so check for a function
                r = gp.getObjectAtPath( b );
                return typeof r === 'function' ? gp.escapeHTML( gp.applyFunc( r, self, args ) ) : '';
            }
        );
    };

    // logging
    gp.log = ( window.console ? window.console.log.bind( window.console ) : function () { } );
    gp.error = function ( e ) {
        if ( console && console.error ) {
            console.error( e );
        }
    };

} )( gridponent );
