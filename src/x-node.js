( function () {

    gp.node = function ( elem ) {
        if ( typeof ( elem ) === 'string' ) {
            elem = document.querySelector( this.elem );
        }
        return new n( elem );
    };

    var proxyListener = function ( elem, event, targetSelector, listener ) {

        this.handler = function ( evt ) {

            var e = evt.target;

            // get all the elements that match targetSelector
            var potentials = elem.querySelectorAll( targetSelector );

            // find the first element that matches targetSelector
            // usually this will be the first one
            while ( e ) {
                for ( var j = 0; j < potentials.length; j++ ) {
                    if ( e == potentials[j] ) {
                        // don't modify the listener's context to preserve the ability to use bind()
                        // set selectedTarget to the matching element instead
                        evt.selectedTarget = e;
                        listener( evt );
                        return;
                    }
                }
                e = e.parentElement;
            }
        };

        this.remove = function () {
            elem.removeEventListener( event, this.handler );
        };

        // handle event
        elem.addEventListener( event, this.handler, false );
    };

    var n = function ( elem ) {
        this.elem = elem;
    };

    n.prototype = {
        addClass: function ( cn ) {
            if ( this.elem && !gp.hasClass( this.elem, cn ) ) {
                this.elem.className = ( this.elem.className === '' ) ? cn : this.elem.className + ' ' + cn;
            }
            return this;
        },

        attr: function ( name, value ) {
            if ( !this.elem ) return this;
            if ( gp.hasValue( value ) ) {
                this.elem.setAttribute( name, value );
                return this;
            }
            return this.elem.attributes[name].value
        },

        closest: function ( selector, parentNode ) {
            var e, potentials, j;

            if ( this.elem ) {
                parentNode = parentNode || document;

                // start with this.elem's immediate parent
                e = this.elem.parentElement;

                potentials = parentNode.querySelectorAll( selector );

                while ( e ) {
                    for ( j = 0; j < potentials.length; j++ ) {
                        if ( e == potentials[j] ) {
                            this.elem = e;
                            return this;
                        }
                    }
                    e = e.parentElement;
                }
            }

            return this;
        },

        create: function ( tagName ) {
            var n = document.createElement( tagName );

            if ( this.elem ) {
                this.elem.appendChild( n );
            }

            this.elem = n;

            return this;
        },

        disable: function ( seconds ) {
            if ( !this.elem ) return this;
            var self = this;
            this.elem.setAttribute( 'disabled', 'disabled' );
            this.addClass( 'disabled' );
            if ( typeof seconds == 'number' && seconds > 0 ) {
                setTimeout( function () {
                    self.enable();
                }, seconds * 1000 );
            }
            return this;
        },

        enable: function () {
            if ( this.elem ) {
                this.elem.removeAttribute( 'disabled' );
                this.removeClass( 'disabled' );
            }
            return this;
        },

        find: function ( selector ) {
            this.elem = this.elem || document;
            var e = this.elem.querySelector( selector );
            if ( e ) this.elem = e;
            return this;
        },

        getAttributes: function () {
            if ( !this.elem ) return null;
            var config = {}, name, attr, attrs = this.elem.attributes;
            for ( var i = attrs.length - 1; i >= 0; i-- ) {
                attr = attrs[i];
                name = attr.name.toLowerCase().replace( '-', '' );
                // convert "true", "false" and empty to boolean
                config[name] = gp.rexp.trueFalse.test( attr.value ) || attr.value === '' ?
                    ( attr.value === "true" || attr.value === '' ) : attr.value;
            }
            return config;
        },

        hasClass: function ( cn ) {
            if ( !this.elem ) return null;
            return ( ' ' + this.elem.className + ' ' ).indexOf( ' ' + cn + ' ' ) !== -1;
        },

        html: function ( html ) {
            if ( this.elem ) {
                if ( !gp.hasValue( html ) ) return this.elem.innerHTML;
                this.elem.innerHTML = html;
            }
            return this;
        },

        off: function ( event, listener ) {
            if ( !this.elem ) return this;
            // check for a matching listener store on the element
            var listeners = this.elem['gp-listeners-' + event];
            if ( listeners ) {
                for ( var i = 0; i < listeners.length; i++ ) {
                    if ( listeners[i].pub === listener ) {

                        // remove the event handler
                        listeners[i].priv.remove();

                        // remove it from the listener store
                        listeners.splice( i, 1 );
                        return this;
                    }
                }
            }
            else {
                this.elem.removeEventListener( event, listener );
            }
            return this;
        },

        // this allows us to attach an event handler to the document
        // and handle events that match a selector
        on: function ( event, targetSelector, listener ) {
            if ( !this.elem ) return this;

            if ( !gp.hasValue( this.elem ) ) {
                return;
            }

            if ( typeof targetSelector === 'function' ) {
                this.elem.addEventListener( event, targetSelector, false );
                return this;
            }

            var proxy = new proxyListener( this.elem, event, targetSelector, listener );

            // use an array to store privateListener 
            // so we can remove the handler with gp.off
            var propName = 'gp-listeners-' + event;
            var listeners = this.elem[propName] || ( this.elem[propName] = [] );
            listeners.push( {
                pub: listener,
                priv: proxy
            } );

            return this;
        },

        parent: function () {
            if ( this.elem && this.elem.parentElement ) {
                this.elem = this.elem.parentElement;
            }
            return this;
        },

        prepend: function ( child ) {
            if ( !this.elem ) return this;
            if ( !this.elem.firstChild ) {
                this.elem.appendChild( child );
            }
            else {
                this.elem.insertBefore( child, this.elem.firstChild );
            }
            this.elem = child;
            return this;
        },

        raiseEvent: function ( name, detail ) {
            if ( !this.elem ) return this;
            var event = new CustomEvent( name, { bubbles: true, detail: detail, cancelable: true } );
            this.elem.dispatchEvent( event );
            return this;
        },

        removeClass: function ( cn ) {
            if ( this.elem ) {
                this.elem.className = gp.trim(( ' ' + this.elem.className + ' ' ).replace( ' ' + cn + ' ', ' ' ) );
            }
            return this;
        },

        root: function () {
            if ( !this.elem ) return this;
            while ( this.elem.parentElement ) {
                this.elem = this.elem.parentElement;
            }
            return this;
        }
    };

} )();
