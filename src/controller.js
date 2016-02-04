/***************\
   controller
\***************/
gp.Controller = function (config, model, requestModel) {
    var self = this;
    this.config = config;
    this.model = model;
    this.requestModel = requestModel;
    if (config.Pager) {
        this.requestModel.Top = 25;
    }
    this.attachReadEvents();
    this.monitor = null;
};

gp.Controller.prototype = {

    monitorToolbars: function (node) {
        var self = this;
        // monitor changes to search, sort, and paging
        this.monitor = new gp.ChangeMonitor( node, '.table-toolbar [name=Search], thead input, .table-pager input', this.config.data, function ( evt ) {
            //var name = evt.target.name;
            //switch ( name ) {
            //    case 'Search':
            //        self.search(self.config.data.Search);
            //        break;
            //    case 'OrderBy':
            //        self.sort( self.config.data.OrderBy, self.config.data.Desc );
            //        break;
            //    case 'Page':
            //        self.page( self.config.data.Page );
            //        break;
            //    default:
            //        self.update();
            //        break;
            //}

            self.update();
            // reset the radio inputs
            var radios = node.querySelectorAll( 'thead input[type=radio], .table-pager input[type=radio]' );
            for (var i = 0; i < radios.length; i++) {
                radios[i].checked = false;
            }
        } );
        this.monitor.beforeSync = function ( name, value, model ) {
            gp.info( 'beforeSync called' );
            // the OrderBy property requires special handling
            if (name === 'OrderBy') {
                if (model[name] === value) {
                    model.Desc = !model.Desc;
                }
                else {
                    model[name] = value;
                    model.Desc = false;
                }
                // let the monitor know that syncing has been handled
                return true;
            }
            return false;
        };
        this.monitor.start();
    },

    addCommandHandlers: function (node) {
        var command, tr, row, self = this;
        // listen for command button clicks
        gp.on(node, 'click', 'button[value]', function (evt) {
            // 'this' is the element that was clicked
            gp.info('addCommandHandlers:this:', this);
            command = this.attributes['value'].value;
            tr = gp.closest(this, 'tr[data-index]', node);
            row = tr ? gp.getRowModel(self.config.data.Data, tr) : null;
            switch (command) {
                case 'Create':
                    self.createRow();
                    break;
                case 'Edit':
                    self.editRow(row, tr);
                    break;
                case 'Update':
                    self.updateRow(row, tr);
                    break;
                case 'Cancel':
                    self.cancelEdit(row, tr);
                    break;
                case 'Delete':
                    self.deleteRow( row, tr );
                    break;
                default:
                    // check the api for an extension
                    if ( command in node.api ) {
                        node.api[command]( row, tr );
                    }
                    else {
                        gp.log( 'Unrecognized command: ' + command );
                    }
                    break;
            }
        });
    },

    handleRowSelect: function ( config ) {
        var trs, i = 0, model, type, url, rowSelector = 'div.table-body > table > tbody > tr';
        if ( gp.hasValue( config.Onrowselect ) ) {
            type = typeof config.Onrowselect;
            if ( type === 'string' && config.Onrowselect.indexOf( '{{' ) !== -1 ) type = 'urlTemplate';
            // it's got to be either a function or a URL template
            if ( /function|urlTemplate/.test( type ) ) {
                // add click handler
                gp.on( config.node, 'click', rowSelector + ':not(.edit-mode)', function ( evt ) {
                    // remove previously selected class
                    trs = config.node.querySelectorAll( rowSelector + '.selected' );
                    for ( i = 0; i < trs.length; i++ ) {
                        gp.removeClass( trs[i], 'selected' );
                    }
                    // add selected class
                    gp.addClass( this, 'selected' );
                    // get the model for this row
                    model = gp.getRowModel( config.data.Data, this );

                    // ensure row selection doesn't interfere with button clicks in the row
                    // by making sure the evt target is a cell
                    if ( gp.in( evt.target, rowSelector + ' > td.body-cell', config.node ) ) {
                        if ( type === 'function' ) {
                            config.Onrowselect.call( this, model );
                        }
                        else {

                            // it's a urlTemplate
                            window.location = gp.processRowTemplate( config.Onrowselect, model );
                        }
                    }
                } );
            }
        }
    },

    attachReadEvents: function () {
        gp.on( this.config.node, gp.events.beforeRead, this.addBusy );
        gp.on( this.config.node, gp.events.afterRead, this.removeBusy );
    },

    removeReadEvents: function () {
        gp.off( this.config.node, gp.events.beforeRead, this.addBusy );
        gp.off( this.config.node, gp.events.afterRead, this.removeBusy );
    },

    addBusy: function(evt) {
        var tblContainer = evt.target.querySelector( 'div.table-container' );
        if ( tblContainer ) {
            gp.addClass( tblContainer, 'busy' );
        }
    },

    removeBusy: function ( evt ) {
        var tblContainer = evt.target.querySelector( 'div.table-container' );
        tblContainer = tblContainer || document.querySelector( 'div.table-container.busy' );
        if ( tblContainer ) {
            gp.removeClass( tblContainer, 'busy' );
        }
        else {
            gp.warn( 'could not remove busy class' );
        }
    },

    search: function(searchTerm) {
        this.config.data.Search = searchTerm;
        var searchBox = this.config.node.querySelector( 'div.table-toolbar input[name=Search' );
        searchBox.value = searchTerm;
        this.update();
    },

    sort: function(field, desc) {
        this.config.data.OrderBy = field;
        this.config.data.Desc = ( desc == true );
        this.update();
    },

    page: function(pageNumber, callback) {
        this.config.data.Page = pageNumber;
        this.update(callback);
    },

    createRow: function (callback) {
        try {
            var self = this;

            if ( !gp.hasValue( this.config.Create ) ) {
                callback();
                return;
            }

            this.model.create(function (row) {
                // create a row in create mode
                self.config.Row = row;
                gp.info( 'createRow: Columns:', self.config.Columns );
                var tbody = self.config.node.querySelector( 'div.table-body > table > tbody' );
                var rowIndex = self.config.data.Data.indexOf( row );

                var builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-index', rowIndex ).addClass('create-mode');

                self.config.Columns.forEach( function ( col ) {
                    builder.startElem( 'td' ).addClass( 'body-cell' ).endElem();
                } );

                var tr = builder.close();

                gp.log( 'createRow: tr:', tr );

                gp.prependChild( tbody, tr );

                self.editRow( row, tr );

                tr['gp-change-monitor'] = new gp.ChangeMonitor(tr, '[name]', row, function () { });

                if ( typeof callback === 'function' ) {
                    callback( row );
                }
            });
        }
        catch (ex) {
            gp.error( ex );

            callback();
        }
    },

    editRow: function (row, tr) {
        try {
            gp.raiseCustomEvent(tr, 'beforeEdit', {
                model: row
            });
            gp.info('editRow:tr:');
            gp.info(tr);

            this.config.Row = new gp.ObjectProxy(row);

            // put the row in edit mode
            // IE9 can't set innerHTML of tr, so iterate through each cell
            // besides, that way we can just skip readonly cells
            var editCellContent = gp.helpers['editCellContent'];
            var col, cells = tr.querySelectorAll('td.body-cell');
            for (var i = 0; i < cells.length; i++) {
                col = this.config.Columns[i];
                if (!col.Readonly) {
                    cells[i].innerHTML = editCellContent.call(this.config, col);
                }
            }
            gp.addClass(tr, 'edit-mode');
            tr['gp-change-monitor'] = new gp.ChangeMonitor(tr, '[name]', this.config.Row, function () { });
            gp.raiseCustomEvent(tr, 'afterEdit', {
                model: this.config.Row
            });
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    updateRow: function (row, tr, callback) {
        try {
            // save the row and return it to read mode
            var self = this;
            var monitor;
            var rowProxy = this.config.Row;

            if ( !gp.hasValue( this.config.Update ) ) {
                if ( typeof callback === 'funcntion' ) {
                    callback();
                }
                return;
            }

            gp.raiseCustomEvent(tr, 'beforeUpdate', {
                model: row
            });
            gp.info('updateRow: row:');
            gp.info( row );

            this.model.update( row, function ( response ) {
                gp.info( 'updateRow: response:' );
                gp.info( response );
                if ( response.ValidationErrors && response.ValidationErrors.length ) {
                    // TODO: handle validation errors

                }
                else {
                    gp.shallowCopy( response.Data, row );
                    self.restoreCells( self.config, row, tr );
                    // dispose of the ChangeMonitor
                    monitor = tr['gp-change-monitor'];
                    if ( monitor ) {
                        monitor.stop();
                        monitor = null;
                    }
                    // dispose of the ObjectProxy
                    delete self.config.Row;
                }
                gp.raiseCustomEvent( tr, 'afterUpdate', {
                    model: response.Data
                } );
            } );
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    cancelEdit: function (row, tr) {
        try {
            if (gp.hasClass(tr, 'create-mode')) {
                // remove row and tr
                tr.remove();
                var index = this.config.data.Data.indexOf(row);
                this.config.data.Data.splice(index, 1);
            }
            else {
                // replace the ObjectProxy with the original row
                this.config.Row = row;
                this.restoreCells(this.config, row, tr);
            }

            gp.raiseCustomEvent(tr, 'cancelEdit', {
                model: row
            });
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    deleteRow: function (row, tr, callback) {
        try {
            if ( !gp.hasValue( this.config.Destroy ) ) {
                if ( typeof callback === 'funcntion' ) {
                    callback();
                }
                return;
            }

            var self = this,
                url = this.config.Destroy,
                confirmed = confirm( 'Are you sure you want to delete this item?' );

            if ( !confirmed ) {
                if ( typeof callback === 'funcntion' ) {
                    callback();
                }
                return;
            }

            gp.raiseCustomEvent(tr, 'beforeDelete', {
                model: row
            } );

            this.model.destroy( function ( response ) {
                // remove the row from the model
                var index = self.config.data.Data.indexOf( row );
                if ( index != -1 ) {
                    self.config.data.Data.splice( index, 1 );
                    self.refresh( self.config );
                }
                gp.raiseCustomEvent( tr, 'afterDelete', {
                    model: row
                } );
                if ( typeof callback === 'funcntion' ) {
                    callback();
                }
            } );
        }
        catch (ex) {
            gp.error( ex );
        }
    },

    refresh: function ( config ) {
        var rowsTemplate = gp.templates['gridponent-body'];
        var pagerTemplate = gp.templates['gridponent-pager'];
        var html = rowsTemplate( config );
        config.node.querySelector( '.table-body' ).innerHTML = html;
        html = pagerTemplate( config );
        var pager = config.node.querySelector( '.table-pager' );
        if ( pager ) pager.innerHTML = html;
        html = gp.helpers['sortStyle'].call( config );
        config.node.querySelector( 'style.sort-style' ).innerHTML = html;
    },

    restoreCells: function ( config, row, tr ) {
        var col,
            i = 0;
        helper = gp.helpers['bodyCellContent'],
        cells = tr.querySelectorAll( 'td.body-cell' );
        for ( ; i < cells.length; i++ ) {
            col = config.Columns[i];
            cells[i].innerHTML = helper.call( this.config, col );
        }
        gp.removeClass( tr, 'edit-mode' );
    },

    update: function (callback) {
        var self = this;
        gp.info( 'update: data:', this.config.data );
        this.model.read( this.config.data, function ( model ) {
            gp.shallowCopy( model, self.config.data );
            self.refresh( self.config );
            if ( typeof callback === 'function' ) callback(self.config.data);
        } );
    },

    dispose: function () {
        gp.raiseCustomEvent( this.config.node, gp.events.beforeDispose );
        this.removeReadEvents();
        this.monitor.stop();
    }
};