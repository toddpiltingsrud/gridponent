﻿/***************\
     Editor
\***************/

gp.Editor = function ( config, dal ) {

    this.config = config;
    this.dal = dal;
    this.dataItem = null;
    this.originalDataItem = null;
    this.mode = null;
    this.beforeEdit = null;
    this.afterEdit = null;

};

gp.Editor.prototype = {

    add: function ( dataItem ) {
        this.dataItem = dataItem || this.createDataItem();
        this.mode = 'create';
        return {
            dataItem: this.dataItem
        };
    },

    edit: function ( dataItem ) {
        this.dataItem = dataItem;
        this.originalDataItem = gp.shallowCopy( dataItem );
        this.mode = 'update';
        return {
            dataItem: dataItem,
        };
    },

    save: function ( done, fail ) {
        // create or update
        var self = this,
            returnedDataItem,
            fail = fail || gp.error;

        if ( typeof this.beforeEdit == 'function' ) {
            this.beforeEdit( {
                type: this.mode,
                dataItem: this.dataItem,
                elem: this.elem
            } );
        }

        if ( this.mode == 'create' ) {

            this.dal.create( this.dataItem, function ( updateModel ) {

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

                        // It's important to map the dataItem after it's saved because user could cancel.
                        // Also the returned dataItem will likely have additional information added by the server.
                        uid = self.config.map.assign( returnedDataItem, self.elem );

                        self.restoreUI( self.config, self.dataItem, self.elem );

                        // dispose of the ChangeMonitor
                        if ( self.changeMonitor ) {
                            self.changeMonitor.stop();
                            self.changeMonitor = null;
                        }

                        if (self.removeCommandHandler) self.removeCommandHandler();

                        if ( typeof self.afterEdit == 'function' ) {
                            self.afterEdit( {
                                type: self.mode,
                                dataItem: self.dataItem,
                                elem: self.elem
                            } );
                        }

                    }
                }
                catch ( err ) {
                    var error = fail || gp.error;
                    error( err );
                }

                gp.applyFunc( done, self.config.node.api, updateModel );
            },
            fail );

        }
        else {

            // call the data layer with just the dataItem
            // the data layer should respond with an updateModel
            this.dal.update( this.dataItem, function ( updateModel ) {

                try {
                    // standardize capitalization of incoming data
                    updateModel = gp.shallowCopy( updateModel, null, true );

                    if ( updateModel.errors && updateModel.errors.length ) {
                        self.validate( updateModel );
                    }
                    else {
                        // copy the returned dataItem back to the internal data array
                        // use the existing dataItem if the response is empty
                        returnedDataItem = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem :
                            ( updateModel.data && updateModel.data.length ) ? updateModel.data[0] : self.dataItem;
                        gp.shallowCopy( returnedDataItem, self.dataItem );

                        if ( self.elem ) {
                            // refresh the UI
                            self.restoreUI( self.config, self.dataItem, self.elem );
                            // dispose of the ChangeMonitor
                            if ( self.changeMonitor ) {
                                self.changeMonitor.stop();
                                self.changeMonitor = null;
                            }

                            if ( self.removeCommandHandler ) self.removeCommandHandler();

                            if ( typeof self.afterEdit == 'function' ) {
                                self.afterEdit( {
                                    type: self.mode,
                                    dataItem: self.dataItem,
                                    elem: self.elem
                                } );
                            }
                        }
                    }
                }
                catch ( err ) {
                    fail( err );
                }

                gp.applyFunc( done, self.config.node, updateModel );
            },
            fail );

        }
    },

    restoreUI: function () { },

    validate: function() {},

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
    }

};

/***************\
 TableRowEditor
\***************/

gp.TableRowEditor = function ( config, dal ) {

    var self = this;

    gp.Editor.call( this, config, dal );

    this.elem = null;
    this.changeMonitor = null;
    this.commandHandler = function ( evt ) {
        // handle save or cancel
        var command = evt.selectedTarget.attributes['value'].value;
        if ( /^(create|update|save)$/i.test( command ) ) self.save();
        else if ( /^cancel$/i.test( command ) ) self.cancel();
    };
};

gp.TableRowEditor.prototype = {

    addCommandHandler: function() {
        gp.on( this.elem, 'click', 'button[value]', this.commandHandler );
    },

    removeCommandHandler: function () {
        gp.off( this.elem, 'click', 'button[value]', this.commandHandler );
    },

    add: function () {
        var self = this,
            tbody = this.config.node.querySelector( 'div.table-body > table > tbody' ),
            bodyCellContent = gp.helpers['bodyCellContent'],
            editCellContent = gp.helpers['editCellContent'],
            builder = new gp.NodeBuilder(),
            cellContent;

        gp.Editor.prototype.add.call( this );

        //this.dataItem = this.createDataItem();
        //this.mode = 'create';

        builder.startElem( 'tr' ).addClass( 'create-mode' ),

        // add td.body-cell elements to the tr
        this.config.columns.forEach( function ( col ) {
            cellContent = col.readonly ?
                bodyCellContent.call( self.config, col, self.dataItem ) :
                editCellContent.call( self.config, col, self.dataItem, 'create' );
            builder.startElem( 'td' ).addClass( 'body-cell' ).addClass( col.BodyCell ).html( cellContent ).endElem();
        } );

        this.elem = builder.close();

        this.addCommandHandler();

        gp.prependChild( tbody, this.elem );

        this.changeMonitor = new gp.ChangeMonitor( this.elem, '[name]', this.dataItem ).start();

        return {
            dataItem: this.dataItem,
            elem: this.elem
        };
    },

    edit: function (dataItem, tr) {

        // replace the cell contents of the table row with edit controls

        var col,
            editCellContent = gp.helpers['editCellContent'],
            cells = tr.querySelectorAll( 'td.body-cell' ),
            uid;

        gp.Editor.prototype.edit.call( this, dataItem );

        //this.dataItem = dataItem;
        //this.originalDataItem = gp.shallowCopy( dataItem );
        this.elem = tr;
        //this.mode = 'update';

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

    save: gp.Editor.prototype.save,

    cancel: function () {

        try {
            var tbl = gp.closest( this.elem, 'table', this.config.node ),
                index;

            if ( gp.hasClass( this.elem, 'create-mode' ) ) {
                // remove elem
                tbl.deleteRow( this.elem.rowIndex );
            }
            else {
                // restore the dataItem to its original state
                gp.shallowCopy( this.originalDataItem, this.dataItem );
                this.restoreUI();
            }

            if ( this.changeMonitor ) {
                this.changeMonitor.stop();
                this.changeMonitor = null;
            }

            this.removeCommandHandler();

        }
        catch ( ex ) {
            gp.error( ex );
        }

    },

    validate: function ( updateModel ) {

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

    createDataItem: gp.Editor.prototype.createDataItem,

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

gp.ModalEditor = function ( config, dal ) {

    gp.TableRowEditor.call( this, config, dal );

};

gp.ModalEditor.prototype = {

    addCommandHandler: gp.TableRowEditor.prototype.addCommandHandler,

    removeCommandHandler: gp.TableRowEditor.prototype.removeCommandHandler,

    add: function () {
        var self = this,
            html,
            modal;

        gp.Editor.prototype.add.call( this );

        //this.dataItem = this.createDataItem();
        //this.mode = 'create';

        // mode: create or update
        html = gp.helpers.bootstrapModal( this.config, this.dataItem, 'create' );

        // append the modal to the top node so button clicks will be picked up by commandHandlder
        modal = $( html ).appendTo( this.config.node ).modal( {
            show: true,
            keyboard: true
        } );

        this.elem = modal[0];

        modal.one( 'hidden.bs.modal', function () {
            $( modal ).remove();
        } );

        this.addCommandHandler();

        this.changeMonitor = new gp.ChangeMonitor( modal[0], '[name]', this.dataItem ).start();

        return {
            dataItem: this.dataItem,
            elem: this.elem
        };
    },

    edit: function (dataItem) {

        var self = this;
        //this.dataItem = dataItem;
        //this.originalDataItem = gp.shallowCopy( dataItem );
        //this.mode = 'udpate';

        gp.Editor.prototype.edit.call( this, dataItem );

        // mode: create or update
        var html = gp.helpers.bootstrapModal( this.config, dataItem, 'udpate' );

        // append the modal to the top node so button clicks will be picked up by commandHandlder
        var modal = $( html ).appendTo( this.config.node ).modal( {
            show: true,
            keyboard: true
        } );

        this.elem = modal[0];

        modal.one( 'hidden.bs.modal', function () {
            $( modal ).remove();
        } );

        this.addCommandHandler();

        this.changeMonitor = new gp.ChangeMonitor( modal[0], '[name]', dataItem ).start();

        return {
            dataItem: dataItem,
            elem: this.elem
        };

    },

    save: gp.Editor.prototype.save,

    cancel: function () {
        $( this.elem ).modal('hide');
        //restore the dataItem to its original state
        if ( this.mode == 'update' && this.originalDataItem ) {
            gp.shallowCopy( this.originalDataItem, this.dataItem );
        }
        if ( this.changeMonitor ) {
            this.changeMonitor.stop();
            this.changeMonitor = null;
        }
        this.removeCommandHandler();
    },

    restoreUI: function () {

        var self = this,
            tbody = this.config.node.querySelector( 'div.table-body > table > tbody' ),
            bodyCellContent = gp.helpers['bodyCellContent'],
            tableRow,
            cells,
            col,
            uid,
            builder,
            cellContent;

        $( this.elem ).modal( 'hide' );

        // if we added a row, add a row to the top of the table
        if ( this.mode == 'create' ) {

            // the save method should have added a uid attr to the modal
            uid = this.config.map.resolveUid( this.elem );
            
            // make sure we have a uid
            if ( uid == -1 ) {
                uid = this.config.map.assign( this.dataItem );
            }
            
            builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-uid', uid );

            // add td.body-cell elements to the tr
            this.config.columns.forEach( function ( col ) {
                cellContent = bodyCellContent.call( self.config, col, self.dataItem );
                builder.startElem( 'td' ).addClass( 'body-cell' ).addClass( col.BodyCell ).html( cellContent ).endElem();
            } );

            tableRow = builder.close();

            gp.prependChild( tbody, tableRow );

        }
        else {
            tableRow = gp.getTableRow( this.config.map, this.dataItem, this.config.node );
    
            if ( tableRow ) {
                cells = tableRow.querySelectorAll( 'td.body-cell' );

                for ( var i = 0 ; i < cells.length; i++ ) {
                    col = this.config.columns[i];
                    cells[i].innerHTML = bodyCellContent.call( this.config, col, this.dataItem );
                }
            }
        }

    },

    validate: gp.TableRowEditor.prototype.validate,

    createDataItem: gp.Editor.prototype.createDataItem

};
