/***************\
     globals
\***************/
( function ( gp ) {

    gp.rexp = {
        splitPath: /[^\[\]\.\s]+|\[\d+\]/g,
        indexer: /\[\d+\]/,
        iso8601: /^[012][0-9]{3}-[01][0-9]-[0123][0-9]/,
        quoted: /^['"].+['"]$/,
        trueFalse: /true|false/i,
        braces: /{{.+?}}/g
    };

    // logging
    gp.logging = 'info';
    gp.log = window.console ? window.console.log.bind( window.console ) : function () { };
    gp.error = function ( e ) {
        if ( console && console.error ) {
            console.error( e );
        }
    };
    gp.verbose = /verbose/.test( gp.logging ) ? gp.log : function () { };
    gp.info = /verbose|info/.test( gp.logging ) ? gp.log : function () { };
    gp.warn = /verbose|info|warn/.test( gp.logging ) ? gp.log : function () { };

    gp.getAttributes = function ( node ) {
        gp.verbose( 'getConfig: node:', node );
        var config = {}, name, attr, attrs = node.attributes;
        config.node = node;
        for ( var i = attrs.length - 1; i >= 0; i-- ) {
            attr = attrs[i];
            name = gp.camelize( attr.name );
            // convert "true", "false" and empty to boolean
            config[name] = gp.rexp.trueFalse.test( attr.value ) || attr.value === '' ?
                ( attr.value === "true" || attr.value === '' ) : attr.value;
        }
        gp.verbose( 'getConfig: config:', config );
        return config;
    };

    var chars = [/&/g, /</g, />/g, /"/g, /'/g, /`/g];

    var escaped = ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;', '&#96;'];

    gp.escapeHTML = function ( obj ) {
        if ( typeof obj !== 'string' ) {
            return obj;
        }
        for ( var i = 0; i < chars.length; i++ ) {
            obj = obj.replace( chars[i], escaped[i] );
        }
        return obj;
    };

    gp.camelize = function ( str ) {
        return str.replace( /(?:^|[-_])(\w)/g, function ( _, c ) {
            return c ? c.toUpperCase() : '';
        } );
    };

    gp.shallowCopy = function ( from, to ) {
        to = to || {};
        var props = Object.getOwnPropertyNames( from );
        props.forEach( function ( prop ) {
            to[prop] = from[prop];
        } );
        return to;
    };

    gp.getLocalISOString = function ( date ) {
        if ( typeof date === 'string' ) return date;
        var offset = date.getTimezoneOffset();
        var adjustedDate = new Date( date.valueOf() - ( offset * 60000 ) );
        return adjustedDate.toISOString();
    };

    gp.getType = function ( a ) {
        if ( a === null || a === undefined ) {
            return a;
        }
        if ( a instanceof Date ) {
            return 'date';
        }
        if ( typeof ( a ) === 'string' && gp.rexp.iso8601.test( a ) ) {
            return 'dateString';
        }
        if ( Array.isArray( a ) ) {
            return 'array';
        }
        // 'number','string','boolean','function','object'
        return typeof ( a );
    };

    gp.on = function ( elem, event, targetSelector, listener ) {
        // if elem is a selector, convert it to an element
        if ( typeof ( elem ) === 'string' ) {
            elem = document.querySelector( elem );
        }

        if ( !gp.hasValue( elem ) ) {
            return;
        }

        if ( typeof targetSelector === 'function' ) {
            elem.addEventListener( event, targetSelector, false );
            return;
        }

        // this allows us to attach an event handler to the document
        // and handle events that match a selector
        var privateListener = function ( evt ) {

            var e = evt.target;

            // get all the elements that match targetSelector
            var potentials = elem.querySelectorAll( targetSelector );

            // find the first element that matches targetSelector
            // usually this will be the first one
            while ( e ) {
                for ( var j = 0; j < potentials.length; j++ ) {
                    if ( e == potentials[j] ) {
                        // set 'this' to the matching element
                        listener.call( e, evt );
                        return;
                    }
                }
                e = e.parentElement;
            }
        };

        // handle event
        elem.addEventListener( event, privateListener, false );

        // use an array to store listener and privateListener 
        // so we can remove the handler with gp.off
        var propName = 'gp-listeners-' + event;
        var listeners = elem[propName] || ( elem[propName] = [] );
        listeners.push( {
            pub: listener,
            priv: privateListener
        } );

        return elem;
    };

    gp.off = function ( elem, event, listener ) {
        // check for a matching listener store on the element
        var listeners = elem['gp-listeners-' + event];
        if ( listeners ) {
            for ( var i = 0; i < listeners.length; i++ ) {
                if ( listeners[i].pub === listener ) {

                    // remove the event handler
                    elem.removeEventListener( event, listeners[i].priv );

                    // remove it from the listener store
                    listeners.splice( i, 1 );
                    return;
                }
            }
        }
        else {
            elem.removeEventListener( event, listener );
        }
    };

    gp.closest = function ( elem, selector, parentNode ) {
        var e, potentials, j;
        parentNode = parentNode || document;
        // if elem is a selector, convert it to an element
        if ( typeof ( elem ) === 'string' ) {
            elem = document.querySelector( elem );
        }
        gp.info( 'closest: elem:' );
        gp.info( elem );

        if ( elem ) {
            // start with elem's immediate parent
            e = elem.parentElement;

            potentials = parentNode.querySelectorAll( selector );

            while ( e ) {
                for ( j = 0; j < potentials.length; j++ ) {
                    if ( e == potentials[j] ) {
                        gp.info( 'closest: e:' );
                        gp.info( e );
                        return e;
                    }
                }
                e = e.parentElement;
            }
        }
    };

    gp.in = function ( elem, selector, parent ) {
        parent = parent || document;
        // if elem is a selector, convert it to an element
        if ( typeof ( elem ) === 'string' ) {
            elem = parent.querySelector( elem );
        }
        // if selector is a string, convert it to a node list
        if ( typeof ( selector ) === 'string' ) {
            selector = parent.querySelectorAll( selector );
        }
        for ( var i = 0; i < selector.length; i++ ) {
            if ( selector[i] === elem ) return true;
        }
        return false;
    };

    gp.hasValue = function ( val ) {
        return val !== undefined && val !== null;
    };

    gp.isNullOrEmpty = function ( val ) {
        return gp.hasValue( val ) === false || val.length === undefined || val.length === 0;
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

    gp.getObjectAtPath = function ( path, root ) {
        if ( !path ) return;

        path = Array.isArray( path ) ? path : path.match( gp.rexp.splitPath );

        if ( path[0] === 'window' ) path = path.splice( 1 );

        // o is our placeholder
        var o = root || window,
            segment;

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

    gp.hasPositiveWidth = function ( nodes ) {
        if ( gp.isNullOrEmpty( nodes ) ) return false;
        for ( var i = 0; i < nodes.length; i++ ) {
            if ( nodes[i].offsetWidth > 0 ) return true;
        }
        return false;
    };


    gp.resolveTemplate = function ( template ) {
        // it's either a selector or a function
        var t = gp.getObjectAtPath( template );
        if ( typeof ( t ) === 'function' ) {
            return t;
        }
        else {
            t = document.querySelector( template );
            if ( t ) {
                return t.innerHTML;
            }
        }
        return null;
    };

    gp.formatter = new gp.Formatter();

    gp.getFormattedValue = function ( row, col, escapeHTML ) {
        var type = ( col.Type || '' ).toLowerCase();
        var val = row[col.Field];

        if ( /date|datestring/.test( type ) ) {
            // apply default formatting to dates
            //return gp.formatDate(val, col.Format || 'M/d/yyyy');
            return gp.formatter.format( val, col.Format );
        }
        if ( type === 'number' && col.Format ) {
            return gp.formatter.format( val, col.Format );
        }
        if ( type === 'string' && escapeHTML ) {
            return gp.escapeHTML( val );
        }
        return val;
    };

    gp.processBodyTemplate = function ( template, row, col ) {
        var fn, val, match, braces = template.match( gp.rexp.braces );
        if ( braces ) {
            for ( var i = 0; i < braces.length; i++ ) {
                match = braces[i].slice( 2, -2 );
                if ( match in row ) {
                    val = row[match];
                    if ( gp.hasValue( val ) === false ) val = '';
                    template = template.replace( braces[i], val );
                }
                else {
                    fn = gp.getObjectAtPath( match );
                    if ( typeof fn === 'function' ) {
                        template = template.replace( braces[i], fn.call( this, row, col ) );
                    }
                }
            }
        }
        return template;
    };

    gp.processHeaderTemplate = function ( template, col ) {
        var fn, match, braces = template.match( gp.rexp.braces );
        if ( braces ) {
            for ( var i = 0; i < braces.length; i++ ) {
                match = braces[i].slice( 2, -2 );
                fn = gp.getObjectAtPath( match );
                if ( typeof fn === 'function' ) {
                    template = template.replace( braces[i], fn.call( this, col ) );
                }
            }
        }
        return template;
    };

    gp.trim = function ( str ) {
        return str.trim ? str.trim() : str.replace( /^\s+|\s+$/g, '' );
    };

    gp.hasClass = function ( el, cn ) {
        return ( ' ' + el.className + ' ' ).indexOf( ' ' + cn + ' ' ) !== -1;
    };

    gp.addClass = function ( el, cn ) {
        if ( !gp.hasClass( el, cn ) ) {
            el.className = ( el.className === '' ) ? cn : el.className + ' ' + cn;
        }
    };

    gp.removeClass = function ( el, cn ) {
        el.className = gp.trim(( ' ' + el.className + ' ' ).replace( ' ' + cn + ' ', ' ' ) );
    };

    gp.prependChild = function ( node, child ) {
        if ( typeof node === 'string' ) node = document.querySelector( node );
        if ( !node.firstChild ) {
            node.appendChild( child );
        }
        else {
            node.insertBefore( child, node.firstChild );
        }
        return child;
    };

    gp.getRowModel = function ( data, tr ) {
        var index = parseInt( tr.attributes['data-index'].value );
        return data[index];
    };

    gp.getTableRow = function ( data, row, node ) {
        var index = data.indexOf( row );
        if ( index == -1 ) return;
        return node.querySelector( 'tr[data-index="' + index + '"]' );
    };

    gp.raiseCustomEvent = function ( node, name, detail ) {
        var event = new CustomEvent( name, { bubbles: true, detail: detail, cancelable: true } );
        node.dispatchEvent( event );
        gp.info( 'raiseCustomEvent: name', name );
    };

    gp.events = {
        beforeRead: 'beforeRead',
        beforeCreate: 'beforeCreate',
        beforeUpdate: 'beforeUpdate',
        beforeDelete: 'beforeDelete',
        beforeEditMode: 'beforeEditMode',
        afterRead: 'afterRead',
        afterCreate: 'afterCreate',
        afterUpdate: 'afterUpdate',
        afterDelete: 'afterDelete',
        afterEditMode: 'afterEditMode',
        beforeDispose: 'beforeDispose'
    };

    gp.addBusy = function( evt ) {
        var tblContainer = evt.target.querySelector( 'div.table-container' )
            || gp.closest( evt.target, 'div.table-container' );

        if ( tblContainer ) {
            gp.addClass( tblContainer, 'busy' );
        }
    };

    gp.removeBusy = function ( evt ) {
        var tblContainer = evt.target.querySelector( 'div.table-container' );
        tblContainer = tblContainer || document.querySelector( 'div.table-container.busy' )
            || gp.closest( evt.target, 'div.table-container' );

        if ( tblContainer ) {
            gp.removeClass( tblContainer, 'busy' );
        }
        else {
            gp.warn( 'could not remove busy class' );
        }
    };


    gp.tryCallback = function ( callback, $this, args ) {
        if ( typeof callback !== 'function' ) return;
        // anytime there's the possibility of executing 
        // user-supplied code, wrap it with a try-catch block
        // so it doesn't affect my component
        // keep your sloppy JavaScript OUT of my area
        try {
            if ( args == undefined ) {
                callback.call( $this );
            }
            else {
                args = Array.isArray( args ) ? args : [args];
                callback.apply( $this, args );
            }
        }
        catch ( ex ) {
            gp.error( ex );
        }
    };

} )( gridponent );
