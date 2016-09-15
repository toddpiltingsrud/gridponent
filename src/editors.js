/***************\
     Editor
\***************/

gp.Editor = function ( config, dal, injector ) {

    this.config = config;
    this.dal = dal;
    this.uid = null;
    this.dataItem = null;
    this.originalDataItem = null;
    this.mode = null;
    this.beforeEdit = null;
    this.afterEdit = null;
    this.editReady = null;
    this.button = null;
    this.$n = $( config.node );
    this.injector = injector;

};

gp.Editor.prototype = {

    add: function ( dataItem ) {
        this.dataItem = dataItem || this.createDataItem();
        this.mode = 'create';

        this.injector
            .setResource( '$dataItem', this.dataItem )
            .setResource( '$mode', this.mode );

        // add the data item to the internal data array
        this.config.pageModel.data.push( this.dataItem );

        // map it
        this.uid = this.config.map.assign( this.dataItem );

        return {
            dataItem: this.dataItem,
            uid: this.uid
        };
    },

    edit: function ( dataItem ) {
        this.dataItem = dataItem;
        this.mode = 'update';
        this.setInjectorContext();
        this.originalDataItem = gp.shallowCopy( dataItem );
        return {
            dataItem: dataItem,
        };
    },

    cancel: function () {
        this.setInjectorContext();
        if ( this.mode === 'create' ) {
            // unmap the dataItem
            this.config.map.remove( this.uid );
            // remove the dataItem from the internal array
            var index = this.config.pageModel.data.indexOf( this.dataItem );
            if ( index !== -1 ) {
                this.config.pageModel.data.slice( index, 1 );
            }
        }
        else if ( this.mode == 'update' && this.originalDataItem ) {
            //restore the dataItem to its original state
            gp.shallowCopy( this.originalDataItem, this.dataItem );
        }

        this.removeCommandHandler();
    },

    httpErrorHandler: function ( e ) {
        alert( 'An error occurred while carrying out your request.' );
        gp.error( e );
    },

    save: function ( done, fail ) {
        // create or update
        var self = this,
            returnedDataItem,
            serialized,
            uid,
            fail = fail || gp.error;

        this.setInjectorContext();

        this.addBusy();

        // it's possible for the API to invoke this save method
        // there won't be a form element in that case
        if ( this.elem ) {
            // serialize the form
            serialized = gp.ModelSync.serialize( this.elem );

            // currently the only supported post format is application/x-www-form-urlencoded
            // so normally there'd be no point in converting the serialized form values to their former types
            // but we can't rely on the server to return an updated model (it may simply return a success/fail message)
            // so we'll convert them anyway
            gp.ModelSync.castValues( serialized, this.config.columns );

            // copy the values back to the original dataItem
            gp.shallowCopy( serialized, this.dataItem );
        }

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
                    self.injector.setResource( '$mode', null );

                    if ( gp.hasValue( updateModel.errors )) {
                        self.validate( updateModel );
                    }
                    else {
                        returnedDataItem = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem :
                            ( updateModel.data && updateModel.data.length ) ? updateModel.data[0] :
                            gp.implements(updateModel, self.dataItem) ? updateModel : self.dataItem;

                        // copy to local dataItem so updateUI will bind to current data
                        // do a case-insensitive copy
                        gp.shallowCopy( returnedDataItem, self.dataItem, true );

                        self.updateUI( self.config, self.dataItem, self.elem );

                        if (self.removeCommandHandler) self.removeCommandHandler();
                    }
                }
                catch ( err ) {
                    var error = fail || gp.error;
                    error( err );
                }

                if ( self.button instanceof HTMLElement ) gp.enable( self.button );

                self.removeBusy();

                if ( typeof self.afterEdit == 'function' ) {
                    self.afterEdit( {
                        type: self.mode,
                        dataItem: self.dataItem,
                        elem: self.elem
                    } );
                }

                gp.applyFunc( done, self.config.node.api, updateModel );
            },
            function ( e ) {
                self.removeBusy();
                gp.applyFunc( fail, self, e );
            } );

        }
        else {

            // call the data layer with just the dataItem
            // the data layer should respond with an updateModel
            this.dal.update( this.dataItem, function ( updateModel ) {

                try {
                    self.injector.setResource( '$mode', null );

                    if ( gp.hasValue( updateModel.errors ) ) {
                        self.validate( updateModel );
                    }
                    else {
                        // copy the returned dataItem back to the internal data array
                        // use the existing dataItem if the response is empty
                        returnedDataItem = gp.hasValue( updateModel.dataItem ) ? updateModel.dataItem :
                            ( updateModel.data && updateModel.data.length ) ? updateModel.data[0] :
                            gp.implements( updateModel, self.dataItem ) ? updateModel : self.dataItem;

                        gp.shallowCopy( returnedDataItem, self.dataItem, true );

                        if ( self.elem ) {
                            // refresh the UI
                            self.updateUI( self.config, self.dataItem, self.elem );

                            if ( self.removeCommandHandler ) self.removeCommandHandler();
                        }
                    }
                }
                catch ( err ) {
                    fail( err );
                }

                if ( self.button instanceof HTMLElement ) gp.enable( self.button );

                self.removeBusy();

                if ( typeof self.afterEdit == 'function' ) {
                    self.afterEdit( {
                        type: self.mode,
                        dataItem: self.dataItem,
                        elem: self.elem
                    } );
                }

                gp.applyFunc( done, self.config.node, updateModel );
            },
            function ( e ) {
                self.removeBusy();
                gp.applyFunc( fail, self, e );
            } );

        }
    },

    addBusy: function () {
        this.$n.addClass( 'busy' );
    },

    removeBusy: function () {
        this.$n.removeClass( 'busy' );
    },

    updateUI: function () { },

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
    },

    setInjectorContext: function () {
        // if we add multiple rows at once, the injector context 
        // will have to be reset upon saving or cancelling
        // because there are multiple editors, but only one injector
        this.injector
            .setResource( '$dataItem', this.dataItem )
            .setResource( '$mode', this.mode );
    }

};

/***************\
 TableRowEditor
\***************/

gp.TableRowEditor = function ( config, dal, injector ) {

    var self = this;

    gp.Editor.call( this, config, dal, injector );

    this.elem = null;
    this.commandHandler = function ( evt ) {
        // handle save or cancel
        var command = $( this ).val();

        if ( /^(create|update|save)$/i.test( command ) ) {
            self.button = evt.target;
            // prevent double clicking
            gp.disable( self.button, 5 );
            self.save(null, self.httpErrorHandler);
        }
        else if ( /^cancel$/i.test( command ) ) self.cancel();
    };

};

gp.TableRowEditor.prototype = {

    save: gp.Editor.prototype.save,

    addBusy: gp.Editor.prototype.addBusy,

    removeBusy: gp.Editor.prototype.removeBusy,

    httpErrorHandler: gp.Editor.prototype.httpErrorHandler,

    createDataItem: gp.Editor.prototype.createDataItem,

    setInjectorContext: gp.Editor.prototype.setInjectorContext,

    addCommandHandler: function () {
        $( this.elem ).on( 'click', 'button[value]', this.commandHandler );
    },

    removeCommandHandler: function () {
        $( this.elem ).off( 'click', this.commandHandler );
    },

    add: function (dataItem) {
        var tbody = this.$n.find( 'div.table-body > table > tbody' );

        // call the base add function
        // the base function sets the injector's $mode and $dataItem resources
        var obj = gp.Editor.prototype.add.call( this, dataItem );

        this.elem = $( this.injector.exec( 'tableRow', obj.uid ) );

        gp.ModelSync.bindElements( this.dataItem, this.elem );

        this.addCommandHandler();

        if ( this.config.newrowposition === 'top' ) {
            tbody.prepend( this.elem );
        }
        else {
            tbody.append( this.elem );
        }

        if (typeof this.elem[0].scrollIntoView === 'function') this.elem[0].scrollIntoView();

        this.invokeEditReady();

        this.injector.setResource( '$mode', null );

        return {
            dataItem: this.dataItem,
            elem: this.elem
        };
    },

    edit: function ( dataItem, tr ) {

        var cells;

        // replace the cell contents of the table row with edit controls

        // call the base add function
        // the base function sets the injector's $mode and $dataItem resources
        gp.Editor.prototype.edit.call( this, dataItem );

        this.elem = tr;

        this.addCommandHandler();

        // grab a new row from the injector
        cells = this.injector.exec( 'tableRowCells' );

        $( tr ).addClass('update-mode').empty().append( cells );

        gp.ModelSync.bindElements( dataItem, this.elem );

        this.invokeEditReady();

        this.injector.setResource( '$mode', null );

        return {
            dataItem: dataItem,
            elem: this.elem
        };
    },

    cancel: function () {
        
        // base cancel method either removes new dataItem or reverts the existing dataItem
        // the base function sets the injector's $mode and $dataItem resources
        gp.Editor.prototype.cancel.call( this );

        try {
            var tbl = $(this.elem).closest( 'table', this.$n ),
                index;

            if ( $( this.elem ).hasClass( 'create-mode' ) ) {
                // remove elem
                $( this.elem ).remove();
                //tbl[0].deleteRow( $(this.elem)[0].rowIndex );
            }
            else {
                this.updateUI();
            }
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
                errors,
                msg;

            builder.add( 'Please correct the following errors:\r\n' );

            // remove error class from inputs
            $( self.elem ).find( '[name].error' ).removeClass( 'error' );

            Object.getOwnPropertyNames( updateModel.errors ).forEach( function ( e ) {

                $( self.elem ).find( '[name="' + e + '"]' ).addClass( 'error' );

                errors = updateModel.errors[e].errors;

                builder
                    .add( e + ':\r\n' )
                    .add(
                    // extract the error message
                    errors.map( function ( m ) { return '    - ' + m + '\r\n'; } ).join( '' )
                );
            } );

            alert( builder.toString() );
        }

    },

    updateUI: function () {
        // take the table row out of edit mode
        var cells;

        this.injector.setResource( '$mode', 'read' );

        cells = this.injector.exec( 'tableRowCells' );

        $( this.elem ).removeClass( 'update-mode create-mode' ).empty().append( cells );
    },

    invokeEditReady: function() {
        if (typeof this.editReady == 'function') {
            this.editReady({
                dataItem: this.dataItem,
                elem: this.elem
            });
        }
    }

};


/***************\
   ModalEditor
\***************/

gp.ModalEditor = function ( config, dal, injector ) {

    gp.TableRowEditor.call( this, config, dal, injector );

};

gp.ModalEditor.prototype = {

    save: gp.Editor.prototype.save,

    addBusy: gp.Editor.prototype.addBusy,

    removeBusy: gp.Editor.prototype.removeBusy,

    httpErrorHandler: gp.Editor.prototype.httpErrorHandler,

    addCommandHandler: gp.TableRowEditor.prototype.addCommandHandler,

    removeCommandHandler: gp.TableRowEditor.prototype.removeCommandHandler,

    validate: gp.TableRowEditor.prototype.validate,

    createDataItem: gp.Editor.prototype.createDataItem,

    setInjectorContext: gp.Editor.prototype.setInjectorContext,

    invokeEditReady: gp.TableRowEditor.prototype.invokeEditReady,

    add: function (dataItem) {
        var self = this,
            html,
            modal;

        // the base function sets the injector's $mode and $dataItem resources
        gp.Editor.prototype.add.call( this, dataItem );

        // mode: create or update
        html = this.injector.exec( 'bootstrapModal' );

        // append the modal to the top node so button clicks will be picked up by commandHandlder
        modal = $( html )
            .appendTo( this.config.node )
            .one( 'shown.bs.modal', function () {
                // IE9 can't add handlers until the modal is completely shown
                self.addCommandHandler();
                self.invokeEditReady();
            } );

        this.elem = modal[0];

        modal.modal( {
            show: true,
            keyboard: true,
            backdrop: 'static'
        } );

        gp.ModelSync.bindElements( this.dataItem, this.elem );

        modal.one( 'hidden.bs.modal', function () {
            $( modal ).remove();
        } );

        return {
            dataItem: this.dataItem,
            elem: this.elem
        };
    },

    edit: function (dataItem) {
        var self = this,
            html,
            modal;

        // the base function sets the injector's $mode and $dataItem resources
        gp.Editor.prototype.edit.call( this, dataItem );

        // mode: create or update
        html = this.injector.exec( 'bootstrapModal' );

        // append the modal to the top node so button clicks will be picked up by commandHandlder
        modal = $( html )
            .appendTo( this.config.node )
            .one( 'shown.bs.modal', self.invokeEditReady.bind( self ) );

        this.elem = modal[0];

        modal.modal( {
            show: true,
            keyboard: true,
            backdrop: 'static'
        } );

        gp.ModelSync.bindElements( dataItem, this.elem );

        modal.one( 'hidden.bs.modal', function () {
            $( modal ).remove();
        } );

        this.addCommandHandler();

        return {
            dataItem: dataItem,
            elem: this.elem
        };

    },

    cancel: function () {

        // base cancel method either removes new dataItem or reverts the existing dataItem
        // the base function sets the injector's $mode and $dataItem resources
        gp.Editor.prototype.cancel.call( this );

        $( this.elem ).modal( 'hide' );
    },

    updateUI: function () {

        var tbody,
            tr,
            newTr,
            cells,
            newCells;

        $( this.elem ).modal( 'hide' );

        newTr = this.injector.exec( 'tableRow', this.uid );

        // if we added a row, add a row to the top of the table
        if ( this.mode == 'create' ) {
            tbody = this.$n.find( 'div.table-body > table > tbody' );

            if ( this.config.newrowposition === 'top' ) {
                tbody.prepend( newTr );
            }
            else {
                tbody.append( newTr );
            }
        }
        else {
            // find the existing table row for the dataItem
            tr = gp.getTableRow( this.config.map, this.dataItem, this.config.node );

            cells = tr.find( 'td.body-cell' );

            newCells = $( newTr ).find( 'td.body-cell' );

            // replace the contents of the existing tr with that of the new one
            cells.each( function ( i ) {
                $(this).empty().append( newCells[i] );
            } );
        }

    }

};
