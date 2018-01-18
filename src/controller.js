/***************\
   controller
\***************/
gp.Controller = function ( config, model, requestModel, injector ) {
    this.config = config;
    this.model = model;
    this.$n = $( config.node );
    this.requestModel = requestModel;
    this.injector = injector;
    this.pollInterval = null;
    if ( config.pager ) {
        this.requestModel.pageSize = 25;
    }
    // calling bind returns a new function
    // so to be able to remove the handlers later, 
    // we need to call bind once and store the result
    this.handlers = {
        readHandler: this.read.bind( this ),
        commandHandler: this.commandHandler.bind( this ),
        rowSelectHandler: this.rowSelectHandler.bind( this ),
        httpErrorHandler: this.httpErrorHandler.bind( this ),
        toolbarChangeHandler: this.toolbarChangeHandler.bind( this ),
        toolbarEnterKeyHandler: this.toolbarEnterKeyHandler.bind( this ),
        resizeHandler: this.resizeHandler.bind( this )
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
        this.addResizeHandler();
        if ( this.config.preload ) {
            this.read( this.config.requestModel, function () {
                self.handlePolling( self.config );
                self.done = true;
                self.invokeDelegates( gp.events.ready, self.config.node.api );
            } );
        }
        else {
            this.handlePolling( this.config );
            this.done = true;
            this.invokeDelegates( gp.events.ready, this.config.node.api );
        }
    },

    addResizeHandler: function() {
        // sync column widths
        if ( this.config.fixedheaders || this.config.fixedfooters ) {
            window.addEventListener( 'resize', this.handlers.resizeHandler )
        }
    },

    removeResizeHandler: function() {
        if ( this.config.fixedheaders || this.config.fixedfooters ) {
            window.removeEventListener( 'resize', this.handlers.resizeHandler )
        }
    },

    resizeHandler: function () {
        // sync column widths
        var html = this.injector.exec( 'columnWidthStyle' );
        this.$n.find( 'style.column-width-style' ).html( html );
    },

    addBusyDelegates: function () {
        this.addDelegate( gp.events.beforeRead, this.addBusy );
        this.addDelegate( gp.events.onRead, this.removeBusy );
        this.addDelegate( gp.events.beforeEdit, this.addBusy );
        this.addDelegate( gp.events.onEdit, this.refreshFooter );
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
        gp.triggerEvent( this.$n, 'gp-' + event );
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
            model = this.config.requestModel,
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
            $btn = $( evt.currentTarget ),
            rowOrModal = $btn.closest( 'tr[data-uid],div.modal', this.config.node ),
            dataItem = rowOrModal.length ? this.config.map.get( rowOrModal[0] ) : null,
            value = $btn.attr('value'),
            cmd = gp.getCommand( this.config.columns, value ),
            model = this.config.requestModel;

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
                cmd = gp.getObjectAtPath( value );
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
        // disable row selection for rows in update or create mode
        this.$n.on( 'click', 'div.table-body > table > tbody > tr:not(.update-mode,.create-mode) > td.body-cell', this.handlers.rowSelectHandler );
    },

    removeRowSelectHandler: function () {
        this.$n.off( 'click', this.handlers.rowSelectHandler );
    },

    rowSelectHandler: function ( evt ) {
        var config = this.config,
            tr = $( evt.target ).closest( 'tr', config.node ),
            selected = this.$n.find( 'div.table-body > table > tbody > tr.selected' ),
            type = typeof config.rowselected,
            dataItem,
            proceed;

        // if this is a button or an element inside a button, return
        if ( $(evt.target).closest( 'a,:input,:button,:submit', config.node ).length > 0 ) {
            return;
        }

        // simple test to see if config.rowselected is a template
        if ( type === 'string' && config.rowselected.indexOf( '{{' ) !== -1 ) type = 'urlTemplate';

        selected.removeClass( 'selected' );

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
        this.config.requestModel.search = searchTerm;
        this.$n.find( 'div.table-toolbar input[name=search]' ).val( searchTerm );
        this.read( null, callback );
    },

    sort: function ( field, desc, callback ) {
        this.config.requestModel.sort = field;
        this.config.requestModel.desc = ( desc == true );
        this.read( null, callback );
    },

    read: function ( requestModel, callback ) {
        var self = this, proceed = true;
        if ( requestModel ) {
            gp.shallowCopy( requestModel, this.config.requestModel );
        }
        proceed = this.invokeDelegates( gp.events.beforeRead, this.config.requestModel );
        if ( proceed === false ) return;
        this.model.read( this.config.requestModel, function ( model ) {
            try {
                gp.shallowCopy( model, self.config.requestModel );
                self.injector.setResource( '$data', self.config.requestModel.Data );
                self.injector.setResource( '$requestModel', self.config.requestModel );
                self.config.map.clear();
                gp.resolveTypes( self.config );
                self.refresh( self.config );
                self.invokeDelegates( gp.events.onRead, self.config.requestModel );
                gp.applyFunc( callback, self.config.node, self.config.requestModel );
            } catch ( e ) {
                self.removeBusy();
                self.httpErrorHandler( e );
            }
        }, this.handlers.httpErrorHandler );
    },

    handlePolling: function ( config ) {
        // for polling to work, we must have a target and a numeric polling interval greater than 0
        if ( !$.isNumeric( config.poll ) || config.poll <= 0 ) return;

        var self = this;

        this.pollInterval = setInterval( function () {
            // does this grid still exist?
            var exists = config.node.ownerDocument.body.contains( config.node );
            if ( !exists ) {
                clearInterval( self.pollInterval );
                self.pollInterval = null;
            }
            else {
                self.read( config.requestModel );
            }
        }, config.poll * 1000 );
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

    updateRow: function ( dataItem, callback ) {

        try {
            var self = this,
                editor = this.getEditor(),
                tr;

            // if there is no update configuration setting, we're done here
            if ( !gp.hasValue( this.config.update ) ) {
                gp.applyFunc( callback, self.config.node );
                return;
            }

            editor.edit( dataItem );

            editor.save( function (model) {

                tr = gp.getTableRow( self.config.map, dataItem, self.$n[0] );
                if ( tr ) {
                    self.refresh();
                }

                if ( typeof callback === 'function' ) {
                    gp.applyFunc( callback, self, model );
                }

            }, this.httpErrorHandler.bind( this ) );
        }
        catch ( e ) {
            this.removeBusy();
            this.httpErrorHandler( e );
        }
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
                        var index = self.config.requestModel.Data.indexOf( dataItem );
                        if ( index != -1 ) {
                            self.config.requestModel.Data.splice( index, 1 );
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
                    elem: tr,
                    response: response
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
                pager = this.$n.find( 'div.table-pager' ),
                sortStyle = this.$n.find( 'style.sort-style' );

            this.config.map.clear();

            body.html( this.injector.exec( 'tableBody' ) );
            // if we're not using fixed footers this will have no effect
            footer.html( this.injector.exec( 'footerTable' ) );
            pager.html( this.injector.exec( 'pagerBar' ) );
            sortStyle.html(this.injector.exec('sortStyle'));

            if (gp.hasValue(this.config.nodatatext)) {
                this.$n.removeClass('nodata');
                if (!this.injector.resources.$data || this.injector.resources.$data.length == 0) {
                    this.$n.addClass('nodata');
                }
            }
        }
        catch ( e ) {
            gp.error( e );
        }
    },

    refreshFooter: function ( model ) {
        // this is called onEdit
        // refresh the footer after creating or updating a row
        // model.type is the type of operation that was performed
        if ( /^(create|update)$/.test( model.type ) ) {
            try {
                var footer = this.$n.find( 'tfoot' );
                if ( footer.length ) {
                    var footerRow = $( this.controller.injector.exec( 'footer' ) ).find( 'tr' );
                    footer.html( footerRow );
                }
            }
            catch ( e ) {
                gp.error( e );
            }
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
        this.removeResizeHandler();
        if ( this.pollInterval ) {
            clearInterval( this.pollInterval );
        }
    }

};