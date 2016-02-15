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
        this.monitor = new gp.ChangeMonitor( node, '.table-toolbar [name=Search], thead input, .table-pager input', this.config.pageModel, function ( evt ) {
            //var name = evt.target.name;
            //switch ( name ) {
            //    case 'Search':
            //        self.search(self.config.pageModel.Search);
            //        break;
            //    case 'OrderBy':
            //        self.sort( self.config.pageModel.OrderBy, self.config.pageModel.Desc );
            //        break;
            //    case 'Page':
            //        self.page( self.config.pageModel.Page );
            //        break;
            //    default:
            //        self.read();
            //        break;
            //}

            self.read();
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
            row = tr ? gp.getRowModel(self.config.pageModel.Data, tr) : null;
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
                    self.deleteRow( row );
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
                    model = gp.getRowModel( config.pageModel.Data, this );

                    // ensure row selection doesn't interfere with button clicks in the row
                    // by making sure the evt target is a cell
                    if ( gp.in( evt.target, rowSelector + ' > td.body-cell', config.node ) ) {
                        if ( type === 'function' ) {
                            config.Onrowselect.call( this, model );
                        }
                        else {

                            // it's a urlTemplate
                            window.location = gp.processBodyTemplate( config.Onrowselect, model );
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
        this.config.pageModel.Search = searchTerm;
        var searchBox = this.config.node.querySelector( 'div.table-toolbar input[name=Search' );
        searchBox.value = searchTerm;
        this.read();
    },

    sort: function(field, desc) {
        this.config.pageModel.OrderBy = field;
        this.config.pageModel.Desc = ( desc == true );
        this.read();
    },

    read: function ( requestModel, callback ) {
        var self = this;
        if ( requestModel ) {
            gp.shallowCopy( requestModel, this.config.pageModel );
        }
        gp.raiseCustomEvent( this.config.node, gp.events.beforeRead, { model: this.config.pageModel } );
        gp.info( 'read.pageModel:', this.config.pageModel );
        this.model.read( this.config.pageModel, function ( model ) {
            gp.shallowCopy( model, self.config.pageModel );
            self.refresh( self.config );
            gp.raiseCustomEvent( this.config.node, gp.events.afterRead, { model: this.config.pageModel } );
            gp.tryCallback( callback, self.config.node, self.config.pageModel );
        } );
    },

    createRow: function (callback) {
        try {
            var self = this;

            if ( !gp.hasValue( this.config.Create ) ) {
                gp.tryCallback( callback, self.config.node );
                return;
            }

            gp.raiseCustomEvent( self.config.node, gp.events.beforeCreate );

            this.model.create(function (row) {
                // create a row in create mode
                self.config.Row = row;

                gp.info( 'createRow.Columns:', self.config.Columns );

                var tbody = self.config.node.querySelector( 'div.table-body > table > tbody' );
                var rowIndex = self.config.pageModel.Data.indexOf( row );
                gp.info( 'createRow.rowIndex:', rowIndex );
                var editCellContent = gp.helpers['editCellContent'];
                var builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-index', rowIndex ).addClass('create-mode');

                // put the row in edit mode
                // IE9 can't set innerHTML of tr, so iterate through each cell
                // besides, that way we can just skip readonly cells
                self.config.Columns.forEach( function ( col ) {
                    var html = col.ReadOnly ? '' : editCellContent.call( self.config, col );
                    builder.startElem( 'td' ).addClass( 'body-cell' ).html(html).endElem();
                } );

                var tr = builder.close();

                gp.info( 'createRow.tr:', tr );

                gp.prependChild( tbody, tr );

                tr['gp-change-monitor'] = new gp.ChangeMonitor(tr, '[name]', row, function () { });

                gp.info( 'createRow.tr:', tr );

                gp.raiseCustomEvent( self.config.node, gp.events.afterCreate, {
                    row: row,
                    tr: tr
                } );

                gp.tryCallback( callback, self.config.node, row );
            } );
        }
        catch (ex) {
            gp.error( ex );

            gp.tryCallback( callback, self.config.node );
        }
    },

    editRow: function (row, tr) {
        try {
            gp.raiseCustomEvent(tr, 'beforeEdit', {
                model: row
            });

            this.config.Row = new gp.ObjectProxy(row);

            gp.info('editRow.tr:', tr);

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
        // save the row and return it to read mode

        try {
            var monitor,
                self = this,
                updateModel = new gp.UpdateModel( row ),
                tr = tr || gp.getTableRow(this.config.pageModel.Data, row, this.config.node);

            // if there is no Update configuration setting, we're done here
            if ( !gp.hasValue( this.config.Update ) ) {
                gp.tryCallback( callback, self.config.node );
                return;
            }

            gp.raiseCustomEvent(tr, 'beforeUpdate', {
                model: updateModel
            });

            gp.info( 'updateRow.row:', row );

            this.model.update( updateModel, function ( updateModel ) {

                gp.info( 'updateRow.updateModel:', updateModel );

                if ( updateModel.ValidationErrors && updateModel.ValidationErrors.length ) {
                    if ( typeof self.config.Validate === 'function' ) {
                        self.config.Validate.call( this, tr, updateModel );
                    }
                    else {
                        gp.helpers['validation'].call( this, tr, updateModel.ValidationErrors );
                    }
                }
                else {
                    // copy the returned row back to the internal data array
                    gp.shallowCopy( updateModel.Row, row );
                    // refresh the UI
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

                gp.raiseCustomEvent( tr, gp.events.afterUpdate, {
                    model: updateModel
                } );

                gp.tryCallback( callback, self.config.node, updateModel );
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
                var index = this.config.pageModel.Data.indexOf(row);
                this.config.pageModel.Data.splice(index, 1);
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

    deleteRow: function (row, callback, skipConfirm) {
        try {
            if ( !gp.hasValue( this.config.Destroy ) ) {
                gp.tryCallback( callback, this.config.node );
                return;
            }

            var self = this,
                url = this.config.Destroy,
                confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' );

            if ( !confirmed ) {
                gp.tryCallback( callback, this.config.node );
                return;
            }

            gp.raiseCustomEvent(this.config.node, gp.events.beforeDestroy, {
                row: row
            } );

            this.model.destroy( row, function ( response ) {
                // remove the row from the model
                var index = self.config.pageModel.Data.indexOf( row );
                if ( index != -1 ) {
                    self.config.pageModel.Data.splice( index, 1 );
                    self.refresh( self.config );
                }
                gp.raiseCustomEvent( self.config.node, gp.events.afterDestroy, {
                    row: row
                } );
                gp.tryCallback( callback, self.config.node, response );
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


    dispose: function () {
        gp.raiseCustomEvent( this.config.node, gp.events.beforeDispose );
        this.removeReadEvents();
        this.monitor.stop();
    }
};