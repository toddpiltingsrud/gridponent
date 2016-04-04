/***************\
 TableRowEditor
\***************/

gp.TableRowEditor = function ( config ) {

    var self = this;
    this.config = config;
    this.elem = null;
    this.changeMonitor = null;
    this.dataItem = null;
    this.originalDataItem = null;
    this.mode = null;
    this.commandHandler = function ( evt ) {
        // handle save or cancel
        var command = evt.selectedTarget.attributes['value'].value;
        if ( /^(create|edit|save)$/i.test( command ) ) self.save();
        else if ( /^cancel$/i.test( command ) ) self.cancel();
    }
};

gp.TableRowEditor.prototype = {

    addCommandHandler: function() {
        gp.on( this.elem, 'click', 'button[value]', this.commandHandler );
    },

    removeCommandHandler: function () {
        gp.off( this.elem, 'click', 'button[value]', this.commandHandler );
    },

    add: function () {
        var tbody = this.config.node.querySelector( 'div.table-body > table > tbody' ),
            bodyCellContent = gp.helpers['bodyCellContent'],
            editCellContent = gp.helpers['editCellContent'],
            builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-index', rowIndex ).addClass( 'create-mode' ),
            cellContent;

        // add td.body-cell elements to the tr
        this.config.columns.forEach( function ( col ) {
            cellContent = col.readonly ?
                bodyCellContent.call( this.config, col, dataItem ) :
                editCellContent.call( this.config, col, dataItem, 'create' );
            builder.startElem( 'td' ).addClass( 'body-cell' ).addClass( col.BodyCell ).html( cellContent ).endElem();
        } );

        this.dataItem = this.createDataItem();
        this.elem = builder.close();
        this.mode = 'create';

        this.addCommandHandler();

        gp.prependChild( tbody, this.elem );

        this.changeMonitor = new gp.ChangeMonitor( this.elem, '[name]', dataItem ).start();

        return {
            dataItem: dataItem,
            elem: this.elem
        };
    },

    edit: function (dataItem, tr) {

        // replace the cell contents of the table row with edit controls

        var col,
            editCellContent = gp.helpers['editCellContent'],
            cells = tr.querySelectorAll( 'td.body-cell' );

        this.dataItem = dataItem;
        this.originalDataItem = gp.shallowCopy( dataItem );
        this.elem = tr;
        this.mode = 'update';

        this.addCommandHandler();

        // IE9 can't set innerHTML of tr, so iterate through each cell and set its innerHTML
        // besides, that way we can just skip readonly cells
        for ( var i = 0; i < cells.length; i++ ) {
            col = this.config.columns[i];
            if ( !col.readonly ) {
                cells[i].innerHTML = editCellContent.call( this.config, col, dataItem, 'edit' );
            }
        }
        gp.addClass( tr, 'edit-mode' );

        this.changeMonitor = new gp.ChangeMonitor( tr, '[name]', dataItem ).start();

        return {
            dataItem: dataItem,
            elem: this.elem
        };
    },

    save: function (dal, done, fail) {
        // create or update
        var self = this,
            returnedDataItem;

        if ( this.mode == 'create' ) {

            dal.create( this.dataItem, function ( updateModel ) {

                try {
                    // standardize capitalization of incoming data
                    updateModel = gp.shallowCopy( updateModel, null, true );

                    if ( updateModel.errors && updateModel.errors.length ) {
                        self.validate( updateModel );
                    }
                    else {
                        // add the new dataItem to the internal data array
                        returnedDataItem = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem : ( updateModel.data && updateModel.data.length ) ? updateModel.data[0] : self.dataItem;

                        self.config.pageModel.data.push( returnedDataItem );

                        self.restoreUI( self.config, self.dataItem, self.elem );

                        // dispose of the ChangeMonitor
                        if ( self.changeMonitor ) {
                            self.changeMonitor.stop();
                            self.changeMonitor = null;
                        }

                        self.removeCommandHandler();

                    }
                }
                catch ( err ) {
                    var error = fail || gp.error;
                    error( err );
                }

                //self.invokeDelegates( self.config.node.api, gp.events.oncreate, { elem: elem, model: updateModel } );
                //self.invokeDelegates( self.config.node.api, gp.events.onedit, self.config.pageModel );

                gp.applyFunc( done, self.config.node.api, updateModel );
            },
            fail );

        }
        else {

            // call the data layer with just the dataItem
            // the data layer should respond with an updateModel
            dal.update( this.dataItem, function ( updateModel ) {

                try {
                    // standardize capitalization of incoming data
                    updateModel = gp.shallowCopy( updateModel, null, true );

                    if ( updateModel.errors && updateModel.errors.length ) {
                        self.validate( updateModel );
                    }
                    else {
                        // copy the returned dataItem back to the internal data array
                        returnedDataItem = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem :
                            ( updateModel.Data && updateModel.Data.length ) ? updateModel.Data[0] : dataItem;
                        gp.shallowCopy( returnedDataItem, dataItem );

                        if ( elem ) {
                            // refresh the UI
                            self.restoreUI( self.config, dataItem, elem );
                            // dispose of the ChangeMonitor
                            monitor = elem['gp-change-monitor'];
                            if ( monitor ) {
                                monitor.stop();
                                monitor = null;
                            }
                            self.removeCommandHandler();
                        }
                    }
                }
                catch ( err ) {
                    gp.error( err );
                }

                //self.invokeDelegates( self.config.node.api, gp.events.onupdate, { elem: elem, model: updateModel } );
                //self.invokeDelegates( self.config.node.api, gp.events.onedit, { elem: elem, model: updateModel } );

                gp.applyFunc( done, self.config.node, updateModel );
            },
            fail );

        }

    },

    cancel: function () {

        try {
            var tbl = gp.closest( this.elem, 'table', this.config.node ),
                index;

            if ( gp.hasClass( this.elem, 'create-mode' ) ) {
                // remove elem
                tbl.deleteRow( elem.rowIndex );
            }
            else {
                // restore the dataItem to its original state
                gp.shallowCopy( this.originalDataItem, this.dataItem );
                this.restoreUI();
            }

            this.changeMonitor.stop();
            this.changeMonitor = null;
            this.removeCommandHandler();

            //this.invokeDelegates( this.config.node.api, 'cancelEdit', {
            //    dataItem: dataItem,
            //    elem: elem
            //} );
        }
        catch ( ex ) {
            gp.error( ex );
        }

    },

    validate: function (updateModel) {

        if ( typeof this.config.validate === 'function' ) {
            gp.applyFunc( this.config.validate, this, [this.elem, updateModel] );
        }
        else {
            
            var self = this,
                builder = new gp.StringBuilder(), 
                input, 
                msg;

            builder.add( 'Please correct the following errors:\r\n' );

            // remove error class from inputs
            gp.removeClass( self.elem.querySelectorAll( '[name].error' ), 'error' );

            updateModel.errors.forEach( function ( v ) {

                input = self.elem.querySelector( '[name="' + v.Key + '"]' );

                if ( input ) {
                    gp.addClass( input, 'error' );
                }

                builder.add( v.Key + ':\r\n' );

                // extract the error message
                msg = v.Value.Errors.map( function ( e ) { return '    - ' + e.ErrorMessage + '\r\n'; } ).join( '' );

                builder.add( msg );
            } );

            alert( builder.toString() );
        }

    },

    createDataItem: function () {
        var field,
            dataItem = {};

        // set defaults
        this.config.columns.forEach( function ( col ) {
            var field = col.field || col.sort;
            if ( gp.hasValue( field ) ) {
                if ( gp.hasValue( col.Type ) ) {
                    dataItem[field] = gp.getDefaultValue( col.Type );
                }
                else {
                    dataItem[field] = '';
                }
            }
        } );

        // overwrite defaults with a model if specified
        if ( typeof this.config.model == 'object' ) {
            gp.shallowCopy( this.config.model, dataItem );
        }

        return dataItem;
    },

    restoreUI: function () {
        // take the table row out of edit mode
        var col,
            bodyCellContent = gp.helpers['bodyCellContent'],
            cells = this.elem.querySelectorAll( 'td.body-cell' );

        for ( var i = 0 ; i < cells.length; i++ ) {
            col = this.config.columns[i];
            cells[i].innerHTML = bodyCellContent.call( this.config, col, this.dataItem );
        }
        gp.removeClass( this.elem, 'edit-mode' );
        gp.removeClass( this.elem, 'create-mode' );

    }

};


/***************\
   ModalEditor
\***************/

gp.ModalEditor = function ( config ) {

    var self = this;
    this.config = config;
    this.elem = null;
    this.changeMonitor = null;
    this.dataItem = null;
    this.originalDataItem = null;
    this.mode = null;
    this.commandHandler = function ( evt ) {
        // handle save or cancel
        var command = evt.selectedTarget.attributes['value'].value;
        if ( /^(create|edit)$/i.test( command ) ) self.save();
        else if ( /^cancel$/i.test( command ) ) self.cancel();
    }

};

gp.ModalEditor.prototype = {

    addCommandHandler: gp.TableRowEditor.prototype.addCommandHandler,

    removeCommandHandler: gp.TableRowEditor.prototype.removeCommandHandler,

    add: function () {

        var self = this;
        this.dataItem = this.createDataItem();
        this.mode = 'create';

        // mode: create or update
        var html = gp.helpers.bootstrapModal( this.config, this.dataItem, 'create' );

        // append the modal to the top node so button clicks will be picked up by commandHandlder
        var modal = $( html ).appendTo( this.config.node ).modal( {
            show: true,
            keyboard: true
        } );

        this.elem = modal[0];

        this.addCommandHandler();

        this.changeMonitor = new gp.ChangeMonitor( modal[0], '[name]', dataItem ).start();

        modal.one( 'hidden.bs.modal', function () {
            $( modal ).remove();
            this.changeMonitor.stop();
            this.changeMonitor = null;
        } );

        return {
            dataItem: dataItem,
            elem: this.elem
        };
    },

    edit: function (dataItem, tr) {

        var self = this;
        this.dataItem = dataItem;
        this.originalDataItem = gp.shallowCopy( dataItem );
        this.mode = 'udpate';

        // mode: create or update
        var html = gp.helpers.bootstrapModal( this.config, this.dataItem, 'udpate' );

        // append the modal to the top node so button clicks will be picked up by commandHandlder
        var modal = $( html ).appendTo( this.config.node ).modal( {
            show: true,
            keyboard: true
        } );

        this.elem = modal[0];

        this.addCommandHandler();

        this.changeMonitor = new gp.ChangeMonitor( modal[0], '[name]', dataItem ).start();

        modal.one( 'hidden.bs.modal', function () {
            self.cancel();
        } );

        return {
            dataItem: this.dataItem,
            elem: this.elem
        };

    },

    save: gp.TableRowEditor.prototype.save,

    cancel: function () {
        // restore the dataItem to its original state
        gp.shallowCopy( this.originalDataItem, this.dataItem );
        this.changeMonitor.stop();
        this.changeMonitor = null;
        this.restoreUI();
        this.removeCommandHandler();
    },

    restoreUI: function () {
        var tbody = this.config.node.querySelector( 'div.table-body > table > tbody' ),
            bodyCellContent = gp.helpers['bodyCellContent'],
            tableRow,
            cells,
            col,
            rowIndex,
            builder,
            cellContent;

        $( this.elem ).modal( 'hide' );
        $( this.elem ).remove();

        // if we added a row, add a row to the top of the table
        if ( this.mode == 'create' ) {
            rowIndex = this.config.pageModel.data.indexOf( this.dataItem );
            builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-index', rowIndex );

            // add td.body-cell elements to the tr
            this.config.columns.forEach( function ( col ) {
                cellContent = bodyCellContent.call( this.config, col, this.dataItem );
                builder.startElem( 'td' ).addClass( 'body-cell' ).addClass( col.BodyCell ).html( cellContent ).endElem();
            } );

            tableRow = builder.close();

            gp.prependChild( tbody, tableRow );

        }
        else {
            tableRow = gp.getTableRow( this.config.pageModel.data, this.dataItem, this.config.node );
    
            if ( tableRow ) {
                cells = tableRow.querySelectorAll( 'td.body-cell' );

                for ( var i = 0 ; i < cells.length; i++ ) {
                    col = this.config.columns[i];
                    cells[i].innerHTML = bodyCellContent.call( this.config, col, this.dataItem );
                }
            }
        }

    },

    validate: function (updateModel) {

        if ( typeof this.config.validate === 'function' ) {
            gp.applyFunc( this.config.validate, this, [this.elem, updateModel] );
        }
        else {
            
            var self = this,
                builder = new gp.StringBuilder(), 
                input, 
                msg;

            builder.add( 'Please correct the following errors:\r\n' );

            // remove error class from inputs
            gp.removeClass( self.elem.querySelectorAll( '[name].error' ), 'error' );

            updateModel.errors.forEach( function ( v ) {

                input = self.elem.querySelector( '[name="' + v.Key + '"]' );

                if ( input ) {
                    gp.addClass( input, 'error' );
                }

                builder.add( v.Key + ':\r\n' );

                // extract the error message
                msg = v.Value.Errors.map( function ( e ) { return '    - ' + e.ErrorMessage + '\r\n'; } ).join( '' );

                builder.add( msg );
            } );

            alert( builder.toString() );
        }

    },

    createDataItem: gp.TableRowEditor.prototype.createDataItem

};
