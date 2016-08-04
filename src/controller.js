/***************\
   controller
\***************/
gp.Controller = function ( config, model, requestModel, injector ) {
    this.config = config;
    this.model = model;
    this.$n = $( config.node );
    this.requestModel = requestModel;
    this.injector = injector;
    if ( config.pager ) {
        this.requestModel.top = 25;
    }
    this.handlers = {
        readHandler: this.read.bind( this ),
        commandHandler: this.commandHandler.bind( this ),
        rowSelectHandler: this.rowSelectHandler.bind( this ),
        httpErrorHandler: this.httpErrorHandler.bind( this ),
        toolbarChangeHandler: this.toolbarChangeHandler.bind( this ),
        toolbarEnterKeyHandler: this.toolbarEnterKeyHandler.bind( this )
    };
    this.done = false;
    this.eventDelegates = {};
    this.addBusyDelegates();
};

gp.Controller.prototype = {

    init: function () {
        var self = this;
        this.addCommandHandlers( this.config.node );
        this.addRowSelectHandler( this.config );
        this.addRefreshEventHandler( this.config );
        this.addToolbarChangeHandler();
        this.done = true;
        this.invokeDelegates( gp.events.ready, this.config.node.api );
    },

    addBusyDelegates: function () {
        this.addDelegate( gp.events.beforeRead, this.addBusy );
        this.addDelegate( gp.events.onRead, this.removeBusy );
        this.addDelegate( gp.events.beforeEdit, this.addBusy );
        this.addDelegate( gp.events.onEdit, this.removeBusy );
        this.addDelegate( gp.events.httpError, this.removeBusy );
    },

    addBusy: function () {
        // this function executes with the api as its context
        this.$n.addClass( 'busy' );
    },

    removeBusy: function () {
        // this function executes with the api as its context
        this.$n.removeClass( 'busy' );
    },

    ready: function ( callback ) {
        if ( this.done ) {
            gp.applyFunc( callback, this.config.node.api, this.config.node.api );
        }
        else {
            this.addDelegate( gp.events.ready, callback );
        }
    },

    addDelegate: function ( event, delegate ) {
        this.eventDelegates[event] = this.eventDelegates[event] || [];
        this.eventDelegates[event].push( delegate );
    },

    invokeDelegates: function ( event, args ) {
        var self = this,
            proceed = true,
            delegates = this.eventDelegates[event];
        if ( Array.isArray( delegates ) ) {
            delegates.forEach( function ( delegate ) {
                if ( proceed === false ) return;
                proceed = gp.applyFunc( delegate, self.config.node.api, args );
            } );
        }
        return proceed;
    },

    addToolbarChangeHandler: function () {
        // monitor changes to search, sort, and paging
        var selector = '.table-toolbar [name], thead input, .table-pager input';
        this.$n.on( 'change', selector, this.handlers.toolbarChangeHandler );
        this.$n.on( 'keydown', selector, this.handlers.toolbarEnterKeyHandler );
    },

    removeToolbarChangeHandler: function () {
        this.$n.off( 'change', this.handlers.toolbarChangeHandler );
        this.$n.off( 'keydown', this.handlers.toolbarEnterKeyHandler );
    },

    toolbarEnterKeyHandler: function ( evt ) {
        // tracks the search and paging textboxes
        if ( evt.keyCode == 13 ) {
            // trigger change event
            evt.target.blur();
            return;
        }
    },

    toolbarChangeHandler: function ( evt ) {
        // tracks the search and paging textboxes
        var name = evt.target.name,
            model = this.config.pageModel,
            type = gp.getType( model[name] ),
            val = gp.ModelSync.cast( evt.target.value, type );

        model[name] = val;

        this.read();
    },

    addCommandHandlers: function ( node ) {
        // listen for command button clicks at the grid level
        $( node ).on( 'click', 'button[value],a[value]', this.handlers.commandHandler );
    },

    removeCommandHandlers: function ( node ) {
        $( node ).off( 'click', this.handlers.commandHandler );
    },

    commandHandler: function ( evt ) {
        // this function handles all the button clicks for the entire grid
        var lower,
            $btn = $( evt.target ),
            rowOrModal = $btn.closest( 'tr[data-uid],div.modal', this.config.node ),
            dataItem = rowOrModal.length ? this.config.map.get( rowOrModal[0] ) : null,
            value = $btn.attr('value'),
            cmd = gp.getCommand( this.config.columns, value ),
            model = this.config.pageModel;

        // check for a user-defined command
        if ( cmd && typeof cmd.func === 'function' ) {
            cmd.func.call( this.config.node.api, dataItem );
            return;
        };

        lower = ( value || '' ).toLowerCase();

        switch ( lower ) {
            case 'addrow':
                this.addRow();
                break;
            case 'edit':
                // the button is inside either a table row or a modal
                this.editRow( dataItem, rowOrModal );
                break;
            case 'delete':
            case 'destroy':
                this.deleteRow( dataItem, rowOrModal );
                break;
            case 'page':
                var page = $btn.attr( 'data-page' );
                model.page = parseInt( page );
                this.read();
                break;
            case 'search':
                model.search = this.$n.find( '.table-toolbar input[name=search]' ).val();
                this.read();
                break;
            case 'sort':
                var sort = $btn.attr( 'data-sort' );
                if ( model.sort === sort ) {
                    model.desc = !model.desc;
                }
                else {
                    model.sort = sort;
                    model.desc = false;
                }
                this.read();
                break;
            default:
                // check for a function
                // this is needed in case there's a custom command in the toolbar
                cmd = gp.getObjectAtPath( $btn.val() );
                if ( typeof cmd == 'function' ) {
                    cmd.call( this.config.node.api, dataItem );
                }
                break;
        }
    },

    getEditor: function ( mode ) {
        var self = this, editor;

        if ( mode == undefined ) {
            editor = new gp.Editor( this.config, this.model, this.injector );
        }
        else if ( mode == 'modal' ) {
            editor = new gp.ModalEditor( this.config, this.model, this.injector );
        }
        else {
            editor = new gp.TableRowEditor( this.config, this.model, this.injector );
        }

        editor.beforeEdit = function ( model ) {
            self.invokeDelegates( gp.events.beforeEdit, model );
        };

        editor.afterEdit = function ( model ) {
            self.invokeDelegates( gp.events.onEdit, model );
        };

        editor.editReady = function ( model ) {
            self.invokeDelegates( gp.events.editReady, model );
        };

        return editor;
    },

    addRowSelectHandler: function ( config ) {
        // always add click handler so we can call api.rowSelected after grid is initialized
        this.$n.on( 'click', 'div.table-body > table > tbody > tr > td.body-cell', this.handlers.rowSelectHandler );
    },

    removeRowSelectHandler: function () {
        this.$n.off( 'click', this.handlers.rowSelectHandler );
    },

    rowSelectHandler: function ( evt ) {
        var config = this.config,
            tr = $( evt.target ).closest( 'tr', config.node ),
            trs = this.$n.find( 'div.table-body > table > tbody > tr.selected' ),
            type = typeof config.rowselected,
            dataItem,
            proceed;

        if ( type === 'string' && config.rowselected.indexOf( '{{' ) !== -1 ) type = 'urlTemplate';

        trs.removeClass( 'selected' );

        // add selected class
        $( tr ).addClass( 'selected' );
        // get the dataItem for this tr
        dataItem = config.map.get( tr );

        proceed = this.invokeDelegates( gp.events.rowSelected, dataItem );

        if ( proceed === false ) return;

        if ( type === 'urlTemplate' ) {
            window.location = gp.supplant.call( this.config.node.api, config.rowselected, dataItem );
        }
    },

    addRefreshEventHandler: function ( config ) {
        if ( config.refreshevent ) {
            $( document ).on( config.refreshevent, this.handlers.readHandler );
        }
    },

    removeRefreshEventHandler: function ( config ) {
        if ( config.refreshevent ) {
            $( document ).off( config.refreshevent, this.handlers.readHandler );
        }
    },

    search: function ( searchTerm, callback ) {
        this.config.pageModel.search = searchTerm;
        this.$n.find( 'div.table-toolbar input[name=search]' ).val( searchTerm );
        this.read( null, callback );
    },

    sort: function ( field, desc, callback ) {
        this.config.pageModel.sort = field;
        this.config.pageModel.desc = ( desc == true );
        this.read( null, callback );
    },

    read: function ( requestModel, callback ) {
        var self = this, proceed = true;
        if ( requestModel ) {
            gp.shallowCopy( requestModel, this.config.pageModel );
        }
        proceed = this.invokeDelegates( gp.events.beforeRead, this.config.node.api );
        if ( proceed === false ) return;
        this.model.read( this.config.pageModel, function ( model ) {
            try {
                // standardize capitalization of incoming data
                gp.shallowCopy( model, self.config.pageModel, true );
                self.injector.setResource( '$data', self.config.pageModel.data );
                self.config.map.clear();
                gp.resolveTypes( self.config );
                self.refresh( self.config );
                self.invokeDelegates( gp.events.onRead, self.config.node.api );
                gp.applyFunc( callback, self.config.node, self.config.pageModel );
            } catch ( e ) {
                self.removeBusy();
                self.httpErrorHandler( e );
            }
        }, this.handlers.httpErrorHandler );
    },

    addRow: function ( dataItem ) {

        var editor = this.getEditor( this.config.editmode );

        var model = editor.add(dataItem);

        return editor;
    },

    editRow: function ( dataItem, elem ) {

        var editor = this.getEditor( this.config.editmode );

        var model = editor.edit( dataItem, elem );

        return editor;
    },

    // we don't require a tr parameter because it may not be in the grid
    deleteRow: function ( dataItem, callback, skipConfirm ) {
        try {
            if ( !gp.hasValue( this.config.destroy ) ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            var self = this,
                confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' ),
                message,
                tr = gp.getTableRow( this.config.map, dataItem, this.$n[0] );

            if ( !confirmed ) {
                gp.applyFunc( callback, this.config.node );
                return;
            }

            this.invokeDelegates( gp.events.beforeEdit, {
                type: 'destroy',
                dataItem: dataItem,
                elem: tr
            } );

            this.model.destroy( dataItem, function ( response ) {

                try {
                    if ( !response || !response.errors ) {
                        // if it didn't error out, we'll assume it succeeded
                        // remove the dataItem from the model
                        var index = self.config.pageModel.data.indexOf( dataItem );
                        if ( index != -1 ) {
                            self.config.pageModel.data.splice( index, 1 );
                        }
                        self.refresh( self.config );
                    }
                }
                catch ( err ) {
                    gp.error( err );
                }

                self.invokeDelegates( gp.events.onEdit, {
                    type: 'destroy',
                    dataItem: dataItem,
                    elem: tr
                } );

                gp.applyFunc( callback, self.config.node.api, response );
            },
            self.handlers.httpErrorHandler );
        }
        catch ( e ) {
            this.removeBusy();
            this.httpErrorHandler( e );
        }
    },

    refresh: function () {
        try {
            // inject table rows, footer, pager and header style.
            var body = this.$n.find( 'div.table-body' ),
                footer = this.$n.find( 'div.table-footer' ),
                pager = this.$n.find( 'div.table-pager' );

            this.config.map.clear();

            body.html( this.injector.exec( 'tableBody' ) );
            footer.html( this.injector.exec( 'footerTable' ) );
            pager.html( this.injector.exec( 'pager' ) );

            gp.helpers.sortStyle( this.config );
        }
        catch ( e ) {
            gp.error( e );
        }
    },

    httpErrorHandler: function ( e ) {
        this.invokeDelegates( gp.events.httpError, e );
        alert( 'An error occurred while carrying out your request.' );
        gp.error( e );
    },

    dispose: function () {
        this.removeRefreshEventHandler( this.config );
        this.removeRowSelectHandler();
        this.removeCommandHandlers( this.config.node );
        this.removeToolbarChangeHandler();
    }

};