// code coverage
var cov = cov || {};
cov.covered = [];
cov.cover = function(index) {
	cov.covered[index] = true;
	if (cov.callout) {
	    cov.callout(index);
	}
};

// namespace
var gridponent = gridponent || {};

(function(gp) { 

    /***************\
          API
    \***************/
    
    gp.api = function ( controller ) {
cov.cover(1);
        this.controller = controller;
    };
    
    gp.api.prototype = {
    
        getData: function ( index ) {
cov.cover(2);
            if ( typeof index == 'number' ) return this.controller.config.data.Data[index];
            return this.controller.config.data.Data;
        },
    
        search: function ( searchTerm ) {
cov.cover(3);
            this.controller.search( searchTerm );
        },
    
        sort: function ( name, desc ) {
cov.cover(4);
            this.controller.sort( name, desc );
        },
    
        read: function ( requestModel, callback ) {
cov.cover(5);
            this.controller.read( requestModel, callback );
        },
    
        create: function (callback) {
cov.cover(6);
            this.controller.createRow(callback);
        },
    
        // This would have to be called after having retrieved the row from the table with getData().
        // The controller will attempt to figure out which tr it is by first calling indexOf(row) on the data.
        // So the original row object reference has to be preserved.
        // this function is mainly for testing
        update: function ( row, callback ) {
cov.cover(7);
            this.controller.updateRow( row, null, callback );
        },
    
        destroy: function ( row, callback ) {
cov.cover(8);
            this.controller.deleteRow( row, callback, true );
        },
    
        cancel: function ( arg ) { },
    
        dispose: function () {
cov.cover(9);
            this.controller.dispose();
        }
    
    };

    /***************\
     change monitor
    \***************/
    gp.ChangeMonitor = function (node, selector, model, afterSync) {
cov.cover(10);
        var self = this;
        this.model = model;
        this.beforeSync = null;
        this.node = node;
        this.selector = selector;
        this.listener = function (evt) {
cov.cover(11);
            self.syncModel.call(self, evt.target, self.model);
        };
        this.afterSync = afterSync;
    };
    
    gp.ChangeMonitor.prototype = {
        start: function () {
cov.cover(12);
            var self = this;
            // add change event handler to node
            gp.on( this.node, 'change', this.selector, this.listener );
        },
        stop: function () {
cov.cover(13);
            // clean up
            gp.off( this.node, 'change', this.listener );
        },
        syncModel: function (target, model) {
cov.cover(14);
            // get name and value of target
            var name = target.name;
            var value = target.value;
            var handled = false;
    
            try {
                if ( !( name in model ) ) return;
    
                if ( typeof ( this.beforeSync ) === 'function' ) {
cov.cover(15);
                    handled = this.beforeSync( name, value, this.model );
                }
                if ( !handled ) {
cov.cover(16);
                    type = gp.getType( model[name] );
                    switch ( type ) {
                        case 'number':
                            model[name] = parseFloat( value );
                            break;
                        case 'boolean':
                            model[name] = ( value.toLowerCase() == 'true' );
                            break;
                        default:
                            model[name] = value;
                    }
                }
                if ( typeof this.afterSync === 'function' ) {
cov.cover(17);
                    this.afterSync( target, model );
                }
    
            } catch ( e ) {
                gp.error( e );
            }
        }
    };

    /***************\
       controller
    \***************/
    gp.Controller = function (config, model, requestModel) {
cov.cover(18);
        var self = this;
        this.config = config;
        this.model = model;
        this.requestModel = requestModel;
        if (config.Pager) {
cov.cover(19);
            this.requestModel.Top = 25;
        }
        this.attachReadEvents();
        this.monitor = null;
    };
    
    gp.Controller.prototype = {
    
        monitorToolbars: function (node) {
cov.cover(20);
            var self = this;
            // monitor changes to search, sort, and paging
            this.monitor = new gp.ChangeMonitor( node, '.table-toolbar [name=Search], thead input, .table-pager input', this.config.data, function ( evt ) {
cov.cover(21);
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
cov.cover(22);
                gp.info( 'beforeSync called' );
                // the OrderBy property requires special handling
                if (name === 'OrderBy') {
cov.cover(23);
                    if (model[name] === value) {
cov.cover(24);
                        model.Desc = !model.Desc;
                    }
                    else {
cov.cover(25);
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
cov.cover(26);
            var command, tr, row, self = this;
            // listen for command button clicks
            gp.on(node, 'click', 'button[value]', function (evt) {
cov.cover(27);
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
                        self.deleteRow( row );
                        break;
                    default:
                        // check the api for an extension
                        if ( command in node.api ) {
cov.cover(28);
                            node.api[command]( row, tr );
                        }
                        else {
cov.cover(29);
                            gp.log( 'Unrecognized command: ' + command );
                        }
                        break;
                }
            });
        },
    
        handleRowSelect: function ( config ) {
cov.cover(30);
            var trs, i = 0, model, type, url, rowSelector = 'div.table-body > table > tbody > tr';
            if ( gp.hasValue( config.Onrowselect ) ) {
cov.cover(31);
                type = typeof config.Onrowselect;
                if ( type === 'string' && config.Onrowselect.indexOf( '{{' ) !== -1 ) type = 'urlTemplate';
                // it's got to be either a function or a URL template
                if ( /function|urlTemplate/.test( type ) ) {
cov.cover(32);
                    // add click handler
                    gp.on( config.node, 'click', rowSelector + ':not(.edit-mode)', function ( evt ) {
cov.cover(33);
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
cov.cover(34);
                            if ( type === 'function' ) {
cov.cover(35);
                                config.Onrowselect.call( this, model );
                            }
                            else {
cov.cover(36);
    
                                // it's a urlTemplate
                                window.location = gp.processRowTemplate( config.Onrowselect, model );
                            }
                        }
                    } );
                }
            }
        },
    
        attachReadEvents: function () {
cov.cover(37);
            gp.on( this.config.node, gp.events.beforeRead, this.addBusy );
            gp.on( this.config.node, gp.events.afterRead, this.removeBusy );
        },
    
        removeReadEvents: function () {
cov.cover(38);
            gp.off( this.config.node, gp.events.beforeRead, this.addBusy );
            gp.off( this.config.node, gp.events.afterRead, this.removeBusy );
        },
    
        addBusy: function(evt) {
cov.cover(39);
            var tblContainer = evt.target.querySelector( 'div.table-container' );
            if ( tblContainer ) {
cov.cover(40);
                gp.addClass( tblContainer, 'busy' );
            }
        },
    
        removeBusy: function ( evt ) {
cov.cover(41);
            var tblContainer = evt.target.querySelector( 'div.table-container' );
            tblContainer = tblContainer || document.querySelector( 'div.table-container.busy' );
            if ( tblContainer ) {
cov.cover(42);
                gp.removeClass( tblContainer, 'busy' );
            }
            else {
cov.cover(43);
                gp.warn( 'could not remove busy class' );
            }
        },
    
        search: function(searchTerm) {
cov.cover(44);
            this.config.data.Search = searchTerm;
            var searchBox = this.config.node.querySelector( 'div.table-toolbar input[name=Search' );
            searchBox.value = searchTerm;
            this.read();
        },
    
        sort: function(field, desc) {
cov.cover(45);
            this.config.data.OrderBy = field;
            this.config.data.Desc = ( desc == true );
            this.read();
        },
    
        read: function ( requestModel, callback ) {
cov.cover(46);
            var self = this;
            if ( requestModel ) {
cov.cover(47);
                gp.shallowCopy( requestModel, this.config.data );
            }
            gp.raiseCustomEvent( this.config.node, gp.events.beforeRead, { model: this.config.data } );
            gp.info( 'read.data:', this.config.data );
            this.model.read( this.config.data, function ( model ) {
cov.cover(48);
                gp.shallowCopy( model, self.config.data );
                self.refresh( self.config );
                gp.raiseCustomEvent( this.config.node, gp.events.afterRead, { model: this.config.data } );
                gp.tryCallback( callback, self.config.node, self.config.data );
            } );
        },
    
        createRow: function (callback) {
cov.cover(49);
            try {
                var self = this;
    
                if ( !gp.hasValue( this.config.Create ) ) {
cov.cover(50);
                    gp.tryCallback( callback, self.config.node );
                    return;
                }
    
                gp.raiseCustomEvent( self.config.node, gp.events.beforeCreate );
    
                this.model.create(function (row) {
cov.cover(51);
                    // create a row in create mode
                    self.config.Row = row;
    
                    gp.info( 'createRow.Columns:', self.config.Columns );
    
                    var tbody = self.config.node.querySelector( 'div.table-body > table > tbody' );
                    var rowIndex = self.config.data.Data.indexOf( row );
                    gp.info( 'createRow.rowIndex:', rowIndex );
                    var editCellContent = gp.helpers['editCellContent'];
                    var builder = new gp.NodeBuilder().startElem( 'tr' ).attr( 'data-index', rowIndex ).addClass('create-mode');
    
                    // put the row in edit mode
                    // IE9 can't set innerHTML of tr, so iterate through each cell
                    // besides, that way we can just skip readonly cells
                    self.config.Columns.forEach( function ( col ) {
cov.cover(52);
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
cov.cover(53);
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
cov.cover(54);
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
cov.cover(55);
            // save the row and return it to read mode
    
            try {
                var monitor,
                    self = this,
                    updateModel = new gp.UpdateModel( row ),
                    tr = tr || gp.getTableRow(this.config.data.Data, row, this.config.node);
    
                // if there is no Update configuration setting, we're done here
                if ( !gp.hasValue( this.config.Update ) ) {
cov.cover(56);
                    gp.tryCallback( callback, self.config.node );
                    return;
                }
    
                gp.raiseCustomEvent(tr, 'beforeUpdate', {
                    model: updateModel
                });
    
                gp.info( 'updateRow.row:', row );
    
                this.model.update( updateModel, function ( updateModel ) {
cov.cover(57);
    
                    gp.info( 'updateRow.updateModel:', updateModel );
    
                    if ( updateModel.ValidationErrors && updateModel.ValidationErrors.length ) {
cov.cover(58);
                        // TODO: handle validation errors
    
    
    
    
    
                    }
                    else {
cov.cover(59);
                        // copy the returned row back to the internal data array
                        gp.shallowCopy( updateModel.Row, row );
                        // refresh the UI
                        self.restoreCells( self.config, row, tr );
                        // dispose of the ChangeMonitor
                        monitor = tr['gp-change-monitor'];
                        if ( monitor ) {
cov.cover(60);
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
cov.cover(61);
            try {
                if (gp.hasClass(tr, 'create-mode')) {
cov.cover(62);
                    // remove row and tr
                    tr.remove();
                    var index = this.config.data.Data.indexOf(row);
                    this.config.data.Data.splice(index, 1);
                }
                else {
cov.cover(63);
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
cov.cover(64);
            try {
                if ( !gp.hasValue( this.config.Destroy ) ) {
cov.cover(65);
                    gp.tryCallback( callback, this.config.node );
                    return;
                }
    
                var self = this,
                    url = this.config.Destroy,
                    confirmed = skipConfirm || confirm( 'Are you sure you want to delete this item?' );
    
                if ( !confirmed ) {
cov.cover(66);
                    gp.tryCallback( callback, this.config.node );
                    return;
                }
    
                gp.raiseCustomEvent(this.config.node, gp.events.beforeDestroy, {
                    row: row
                } );
    
                this.model.destroy( row, function ( response ) {
cov.cover(67);
                    // remove the row from the model
                    var index = self.config.data.Data.indexOf( row );
                    if ( index != -1 ) {
cov.cover(68);
                        self.config.data.Data.splice( index, 1 );
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
cov.cover(69);
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
cov.cover(70);
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
cov.cover(71);
            gp.raiseCustomEvent( this.config.node, gp.events.beforeDispose );
            this.removeReadEvents();
            this.monitor.stop();
        }
    };

    /***************\
      CustomEvent
    \***************/
    (function () {
cov.cover(72);
    
        function CustomEvent(event, params) {
cov.cover(73);
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        }
    
        CustomEvent.prototype = window.Event.prototype;
    
        window.CustomEvent = CustomEvent;
    
    })();

    /***************\
       formatter
    \***************/
    
    // This is a wrapper for the Intl global object.
    // It allows the use of common format strings for dates and numbers.
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
    (function () {
cov.cover(74);
    
        // IE inserts unicode left-to-right-mark characters into the formatted string, 
        // causing the length property to return invalid results, even though the strings look the same.
        // This is unacceptable because it makes equality operations fail.
        var ltr = /\u200E/g;
    
        // constructing Intl.DateTimeFormat objects is resource intensive, so cache them by format, locale, and currencyCode
        var dateTimeFormatCache = {};
        var numberFormatCache = {};
    
        gp.defaultLocale = 'en-US';
    
        gp.defaultCurrencyCode = 'USD';
    
        gp.Formatter = function (locale, currencyCode) {
cov.cover(75);
            this.locale = locale || gp.defaultLocale;
            this.currencyCode = currencyCode || gp.defaultCurrencyCode;
            this.supported = (window.Intl !== undefined);
            if (!this.supported) gp.log('Intl internationalization not supported');
        };
    
        gp.Formatter.prototype = {
            format: function (val, format) {
cov.cover(76);
                var key, dtf, nf, type, options;
                if (!this.supported || !gp.hasValue(val)) return val;
    
                type = gp.getType(val);
                key = (format || '') + '|' + this.locale + '|' + this.currencyCode;
    
                if (type === 'date') {
cov.cover(77);
                    if (key in dateTimeFormatCache) {
cov.cover(78);
                        dtf = dateTimeFormatCache[key];
                    }
                    else {
cov.cover(79);
                        options = getDateTimeFormatOptions(format);
    
                        dtf = new Intl.DateTimeFormat(this.locale, options)
    
                        dateTimeFormatCache[key] = dtf;
                    }
                    return dtf.format(val).replace(ltr, '');
                }
                if (type === 'dateString') {
cov.cover(80);
                    var parts = val.match(/\d+/g);
                    var dt = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
    
                    if (key in dateTimeFormatCache) {
cov.cover(81);
                        dtf = dateTimeFormatCache[key];
                    }
                    else {
cov.cover(82);
                        options = getDateTimeFormatOptions(format);
    
                        dtf = new Intl.DateTimeFormat(this.locale, options)
    
                        dateTimeFormatCache[key] = dtf;
                    }
                    return dtf.format(dt).replace(ltr, '');
                }
                if (type === 'number') {
cov.cover(83);
                    if (key in numberFormatCache) {
cov.cover(84);
                        nf = numberFormatCache[key];
                    }
                    else {
cov.cover(85);
                        options = getNumberFormatOptions(format, this.currencyCode);
                        nf = new Intl.NumberFormat(this.locale, options);
                        numberFormatCache[key] = nf;
                    }
                    return nf.format(val).replace(ltr, '');
                }
    
                return val;
            }
        };
    
        var dateTimeTokens = [
            [/yyyy/g, 'year', 'numeric'],
            [/yy/g, 'year', '2-digit'],
            [/MMMM/g, 'month', 'long'],
            [/MMM/g, 'month', 'short'],
            [/MM/g, 'month', '2-digit'],
            [/M/g, 'month', 'numeric'],
            [/dd/g, 'day', '2-digit'],
            [/d/g, 'day', 'numeric'],
            [/HH/g, 'hour', '2-digit', 'hour24'],
            [/H/g, 'hour', 'numeric', 'hour24'],
            [/hh/g, 'hour', '2-digit', 'hour12'],
            [/h/g, 'hour', 'numeric', 'hour12'],
            [/mm/g, 'minute', '2-digit'],
            [/m/g, 'minute', 'numeric'],
            [/ss/g, 'second', '2-digit'],
            [/s/g, 'second', 'numeric'],
            [/www/g, 'weekday', 'long'],
            [/ww/g, 'weekday', 'short'],
            [/w/g, 'weekday', 'narrow'],
            [/eee/g, 'era', 'long'],
            [/ee/g, 'era', 'short'],
            [/e/g, 'era', 'narrow'],
            [/tt/g, 'timeZoneName', 'long'],
            [/t/g, 'timeZoneName', 'short']
        ];
    
        function getDateTimeFormatOptions(format) {
cov.cover(86);
            var options = {};
    
            if (gp.hasValue(format)) {
cov.cover(87);
    
                dateTimeTokens.forEach(function (token) {
cov.cover(88);
                    if (!(token[1] in options) && format.match(token[0])) {
cov.cover(89);
                        options[token[1]] = token[2];
                        if ( token.length === 4 ) {
cov.cover(90);
                            // set hour12 to true|false
                            options.hour12 = (token[3] === 'hour12');
                        }
                    }
                });
    
            }
    
            return options;
        }
    
        var numberTokens = [
            [/N/, 'style', 'decimal'],
            [/P/, 'style', 'percent'],
            [/C/, 'style', 'currency']
        ];
    
        function getNumberFormatOptions(format, currencyCode) {
cov.cover(91);
            var options = {};
    
            if (gp.hasValue(format)) {
cov.cover(92);
    
                numberTokens.forEach(function (token) {
cov.cover(93);
                    if (!(token[1] in options) && format.match(token[0])) {
cov.cover(94);
                        options[token[1]] = token[2];
                        if (token[2] === 'currency') {
cov.cover(95);
                            options.currency = currencyCode;
                        }
                    }
                });
                var digits = format.match(/\d+/);
                if (digits) {
cov.cover(96);
                    options.minimumFractionDigits = options.maximumFractionDigits = parseInt(digits);
                }
            }
    
            return options;
        }
    
    })();

    /***************\
         globals
    \***************/
    ( function ( gp ) {
cov.cover(97);
    
        gp.rexp = {
            splitPath: /[^\[\]\.\s]+|\[\d+\]/g,
            indexer: /\[\d+\]/,
            iso8601: /^[012][0-9]{3}-[01][0-9]-[0123][0-9]/,
            quoted: /^['"].+['"]$/,
            trueFalse: /true|false/i
        };
    
        // logging
        gp.logging = 'info';
        gp.log = window.console ? window.console.log.bind( window.console ) : function () { };
        gp.error = function ( e ) {
cov.cover(98);
            if ( console && console.error ) {
cov.cover(99);
                console.error( e );
            }
        };
        gp.verbose = /verbose/.test( gp.logging ) ? gp.log : function () { };
        gp.info = /verbose|info/.test( gp.logging ) ? gp.log : function () { };
        gp.warn = /verbose|info|warn/.test( gp.logging ) ? gp.log : function () { };
    
        gp.getAttributes = function ( node ) {
cov.cover(100);
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
cov.cover(101);
            if ( typeof obj !== 'string' ) {
cov.cover(102);
                return obj;
            }
            for ( var i = 0; i < chars.length; i++ ) {
                obj = obj.replace( chars[i], escaped[i] );
            }
            return obj;
        };
    
        gp.camelize = function ( str ) {
cov.cover(103);
            return str.replace( /(?:^|[-_])(\w)/g, function ( _, c ) {
cov.cover(104);
                return c ? c.toUpperCase() : '';
            } );
        };
    
        gp.shallowCopy = function ( from, to ) {
cov.cover(105);
            to = to || {};
            var props = Object.getOwnPropertyNames( from );
            props.forEach( function ( prop ) {
cov.cover(106);
                to[prop] = from[prop];
            } );
            return to;
        };
    
        gp.getLocalISOString = function ( date ) {
cov.cover(107);
            if ( typeof date === 'string' ) return date;
            var offset = date.getTimezoneOffset();
            var adjustedDate = new Date( date.valueOf() - ( offset * 60000 ) );
            return adjustedDate.toISOString();
        };
    
        gp.getType = function ( a ) {
cov.cover(108);
            if ( a === null || a === undefined ) {
cov.cover(109);
                return a;
            }
            if ( a instanceof Date ) {
cov.cover(110);
                return 'date';
            }
            if ( typeof ( a ) === 'string' && gp.rexp.iso8601.test( a ) ) {
cov.cover(111);
                return 'dateString';
            }
            if ( Array.isArray( a ) ) {
cov.cover(112);
                return 'array';
            }
            // 'number','string','boolean','function','object'
            return typeof ( a );
        };
    
        gp.on = function ( elem, event, targetSelector, listener ) {
cov.cover(113);
            // if elem is a selector, convert it to an element
            if ( typeof ( elem ) === 'string' ) {
cov.cover(114);
                elem = document.querySelector( elem );
            }
    
            if ( !gp.hasValue( elem ) ) {
cov.cover(115);
                return;
            }
    
            if ( typeof targetSelector === 'function' ) {
cov.cover(116);
                elem.addEventListener( event, targetSelector, false );
                return;
            }
    
            // this allows us to attach an event handler to the document
            // and handle events that match a selector
            var privateListener = function ( evt ) {
cov.cover(117);
    
                var e = evt.target;
    
                // get all the elements that match targetSelector
                var potentials = elem.querySelectorAll( targetSelector );
    
                // find the first element that matches targetSelector
                // usually this will be the first one
                while ( e ) {
                    for ( var j = 0; j < potentials.length; j++ ) {
                        if ( e == potentials[j] ) {
cov.cover(118);
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
cov.cover(119);
            // check for a matching listener store on the element
            var listeners = elem['gp-listeners-' + event];
            if ( listeners ) {
cov.cover(120);
                for ( var i = 0; i < listeners.length; i++ ) {
                    if ( listeners[i].pub === listener ) {
cov.cover(121);
    
                        // remove the event handler
                        elem.removeEventListener( event, listeners[i].priv );
    
                        // remove it from the listener store
                        listeners.splice( i, 1 );
                        return;
                    }
                }
            }
            else {
cov.cover(122);
                elem.removeEventListener( event, listener );
            }
        };
    
        gp.closest = function ( elem, selector, parentNode ) {
cov.cover(123);
            var e, potentials, j;
            parentNode = parentNode || document;
            // if elem is a selector, convert it to an element
            if ( typeof ( elem ) === 'string' ) {
cov.cover(124);
                elem = document.querySelector( elem );
            }
            gp.info( 'closest: elem:' );
            gp.info( elem );
    
            if ( elem ) {
cov.cover(125);
                // start with elem's immediate parent
                e = elem.parentElement;
    
                potentials = parentNode.querySelectorAll( selector );
    
                while ( e ) {
                    for ( j = 0; j < potentials.length; j++ ) {
                        if ( e == potentials[j] ) {
cov.cover(126);
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
cov.cover(127);
            parent = parent || document;
            // if elem is a selector, convert it to an element
            if ( typeof ( elem ) === 'string' ) {
cov.cover(128);
                elem = parent.querySelector( elem );
            }
            // if selector is a string, convert it to a node list
            if ( typeof ( selector ) === 'string' ) {
cov.cover(129);
                selector = parent.querySelectorAll( selector );
            }
            for ( var i = 0; i < selector.length; i++ ) {
                if ( selector[i] === elem ) return true;
            }
            return false;
        };
    
        gp.hasValue = function ( val ) {
cov.cover(130);
            return val !== undefined && val !== null;
        };
    
        gp.isNullOrEmpty = function ( val ) {
cov.cover(131);
            return gp.hasValue( val ) === false || val.length === undefined || val.length === 0;
        };
    
        gp.coalesce = function ( array ) {
cov.cover(132);
            if ( gp.isNullOrEmpty( array ) ) return array;
    
            for ( var i = 0; i < array.length; i++ ) {
                if ( gp.hasValue( array[i] ) ) {
cov.cover(133);
                    return array[i];
                }
            }
    
            return array[array.length - 1];
        };
    
        gp.getObjectAtPath = function ( path, root ) {
cov.cover(134);
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
cov.cover(135);
                    // convert to int
                    segment = parseInt( /\d+/.exec( segment ) );
                }
                else if ( gp.rexp.quoted.test( segment ) ) {
cov.cover(136);
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
cov.cover(137);
               return function ( func ) {
cov.cover(138);
                   return function () {
cov.cover(139);
                       return call.apply( func, arguments );
                   };
               };
           }( FP.call ) );
    
        var uids = {};
        var slice = callbind( ''.slice );
        var zero = 0;
        var numberToString = callbind( zero.toString );
    
        gp.createUID = function () {
cov.cover(140);
            // id's can't begin with a number
            var key = 'gp' + slice( numberToString( Math.random(), 36 ), 2 );
            return key in uids ? createUID() : uids[key] = key;
        };
    
        gp.hasPositiveWidth = function ( nodes ) {
cov.cover(141);
            if ( gp.isNullOrEmpty( nodes ) ) return false;
            for ( var i = 0; i < nodes.length; i++ ) {
                if ( nodes[i].offsetWidth > 0 ) return true;
            }
            return false;
        };
    
    
        gp.resolveTemplate = function ( template ) {
cov.cover(142);
            // it's either a selector or a function
            var t = gp.getObjectAtPath( template );
            if ( typeof ( t ) === 'function' ) {
cov.cover(143);
                return t;
            }
            else {
cov.cover(144);
                t = document.querySelector( template );
                if ( t ) {
cov.cover(145);
                    return t.innerHTML;
                }
            }
            return null;
        };
    
        gp.formatter = new gp.Formatter();
    
        gp.getFormattedValue = function ( row, col, escapeHTML ) {
cov.cover(146);
            var type = ( col.Type || '' ).toLowerCase();
            var val = row[col.Field];
    
            if ( /date|datestring/.test( type ) ) {
cov.cover(147);
                // apply default formatting to dates
                //return gp.formatDate(val, col.Format || 'M/d/yyyy');
                return gp.formatter.format( val, col.Format );
            }
            if ( type === 'number' && col.Format ) {
cov.cover(148);
                return gp.formatter.format( val, col.Format );
            }
            if ( type === 'string' && escapeHTML ) {
cov.cover(149);
                return gp.escapeHTML( val );
            }
            return val;
        };
    
        gp.processRowTemplate = function ( template, row, col ) {
cov.cover(150);
            var fn, val, match, tokens = template.match( /{{.+?}}/g );
            if ( tokens ) {
cov.cover(151);
                for ( var i = 0; i < tokens.length; i++ ) {
                    match = tokens[i].slice( 2, -2 );
                    if ( match in row ) {
cov.cover(152);
                        val = row[match];
                        if ( gp.hasValue( val ) === false ) val = '';
                        template = template.replace( tokens[i], val );
                    }
                    else {
cov.cover(153);
                        fn = gp.getObjectAtPath( match );
                        if ( typeof fn === 'function' ) {
cov.cover(154);
                            template = template.replace( tokens[i], fn.call( this, row, col ) );
                        }
                    }
                }
            }
            return template;
        };
    
        gp.processColumnTemplate = function ( template, col ) {
cov.cover(155);
            var fn, match, tokens = template.match( /{{.+?}}/g );
            if ( tokens ) {
cov.cover(156);
                for ( var i = 0; i < tokens.length; i++ ) {
                    match = tokens[i].slice( 2, -2 );
                    fn = gp.getObjectAtPath( match );
                    if ( typeof fn === 'function' ) {
cov.cover(157);
                        template = template.replace( tokens[i], fn.call( this, col ) );
                    }
                }
            }
            return template;
        };
    
        gp.trim = function ( str ) {
cov.cover(158);
            return str.trim ? str.trim() : str.replace( /^\s+|\s+$/g, '' );
        };
    
        gp.hasClass = function ( el, cn ) {
cov.cover(159);
            return ( ' ' + el.className + ' ' ).indexOf( ' ' + cn + ' ' ) !== -1;
        };
    
        gp.addClass = function ( el, cn ) {
cov.cover(160);
            if ( !gp.hasClass( el, cn ) ) {
cov.cover(161);
                el.className = ( el.className === '' ) ? cn : el.className + ' ' + cn;
            }
        };
    
        gp.removeClass = function ( el, cn ) {
cov.cover(162);
            el.className = gp.trim(( ' ' + el.className + ' ' ).replace( ' ' + cn + ' ', ' ' ) );
        };
    
        gp.appendChild = function ( node, child ) {
cov.cover(163);
            if ( typeof node === 'string' ) node = document.querySelector( node );
            if ( typeof child === 'string' ) {
cov.cover(164);
                // using node.tagName to convert child to DOM node helps ensure that what we create is compatible with node
                var div = document.createElement( node.tagName.toLowerCase() );
                div.innerHTML = child;
                child = div.firstChild;
            }
            node.appendChild( child );
            return child;
        };
    
        gp.prependChild = function ( node, child ) {
cov.cover(165);
            if ( typeof node === 'string' ) node = document.querySelector( node );
            if ( typeof child === 'string' ) {
cov.cover(166);
                // using node.tagName to convert child to DOM node helps ensure that what we create is compatible with node
                var div = document.createElement( node.tagName.toLowerCase() );
                div.innerHTML = child;
                child = div.firstChild;
            }
            var firstChild = node.firstChild;
            if ( !firstChild ) {
cov.cover(167);
                node.appendChild( child );
            }
            node.insertBefore( child, firstChild );
            return child;
        };
    
        gp.getRowModel = function ( data, tr ) {
cov.cover(168);
            var index = parseInt( tr.attributes['data-index'].value );
            return data[index];
        };
    
        gp.getTableRow = function ( data, row, node ) {
cov.cover(169);
            var index = data.indexOf( row );
            if ( index == -1 ) return;
            return node.querySelector( 'tr[data-index="' + index + '"]' );
        };
    
        gp.raiseCustomEvent = function ( node, name, detail ) {
cov.cover(170);
            var event = new CustomEvent( name, { bubbles: true, detail: detail, cancelable: true } );
            node.dispatchEvent( event );
            gp.info( 'raiseCustomEvent: name', name );
        };
    
        gp.events = {
            beforeRead: 'beforeRead',
            beforeCreate: 'beforeCreate',
            beforeUpdate: 'beforeUpdate',
            beforeDestroy: 'beforeDestroy',
            afterRead: 'afterRead',
            afterCreate: 'afterCreate',
            afterUpdate: 'afterUpdate',
            afterDestroy: 'afterDestroy',
            beforeDispose: 'beforeDispose'
        };
    
        gp.tryCallback = function ( callback, $this, args ) {
cov.cover(171);
            if ( typeof callback !== 'function' ) return;
            // anytime there's the possibility of executing 
            // user-supplied code, wrap it with a try-catch block
            // so it doesn't affect my component
            // keep your sloppy JavaScript OUT of my area
            try {
                if ( args == undefined ) {
cov.cover(172);
                    callback.call( $this );
                }
                else {
cov.cover(173);
                    args = Array.isArray( args ) ? args : [args];
                    callback.apply( $this, args );
                }
            }
            catch ( ex ) {
                gp.error( ex );
            }
        };
    
    } )( gridponent );

    /***************\
      table helpers
    \***************/
    
    (function () {
cov.cover(174);
    
        gp.helpers = {};
    
        var extend = function (name, func) {
cov.cover(175);
            gp.helpers[name] = func;
        };
    
        extend('template', function (name, arg) {
cov.cover(176);
            var template = gp.templates[name];
            if (template) {
cov.cover(177);
                return template(this, arg);
            }
        });
    
        extend('toolbarTemplate', function () {
cov.cover(178);
            var html = new gp.StringBuilder();
    
            if (this.ToolbarTemplate) {
cov.cover(179);
                // it's either a selector or a function name
                template = gp.getObjectAtPath(this.ToolbarTemplate);
                if (typeof (template) === 'function') {
cov.cover(180);
                    html.add(template(this));
                }
                else {
cov.cover(181);
                    template = document.querySelector(this.ToolbarTemplate);
                    if (template) {
cov.cover(182);
                        html.add(template.innerHTML);
                    }
                }
            }
    
            return html.toString();
        });
    
        extend('thead', function () {
cov.cover(183);
            var self = this;
            var html = new gp.StringBuilder();
            var sort, type, template;
            html.add('<thead>');
            html.add('<tr>');
            this.Columns.forEach(function (col) {
cov.cover(184);
                if (self.Sorting) {
cov.cover(185);
                    // if sort isn't specified, use the field
                    sort = gp.escapeHTML(gp.coalesce([col.Sort, col.Field]));
                }
                else {
cov.cover(186);
                    // only provide sorting where it is explicitly specified
                    if (col.Sort === true && gp.hasValue(col.Field)) {
cov.cover(187);
                        sort = gp.escapeHTML(col.Field);
                    }
                    else {
cov.cover(188);
                        sort = gp.escapeHTML(col.Sort);
                    }
                }
                type = gp.coalesce([col.Type, '']).toLowerCase();
                html.add('<th class="header-cell ' + type + ' ' + sort + '">');
    
                gp.verbose('helpers.thead: col:');
                gp.verbose(col);
    
                // check for a template
                if (col.HeaderTemplate) {
cov.cover(189);
                    gp.verbose('helpers.thead: col.HeaderTemplate:');
                    gp.verbose(col.HeaderTemplate);
                    if (typeof (col.HeaderTemplate) === 'function') {
cov.cover(190);
                        html.add(col.HeaderTemplate.call(self, col));
                    }
                    else {
cov.cover(191);
                        html.add(gp.processColumnTemplate.call(this, col.HeaderTemplate, col));
                    }
                }
                else if (gp.hasValue(sort)) {
cov.cover(192);
                    html.add('<label class="table-sort">')
                    .add('<input type="radio" name="OrderBy" value="' + sort + '" />')
                    .add(gp.coalesce([col.Header, col.Field, sort]))
                    .add('</label>');
                }
                else {
cov.cover(193);
                    html.add(gp.coalesce([col.Header, col.Field, '&nbsp;']));
                }
                html.add('</th>');
            });
            html.add('</tr>')
                .add('</thead>');
            return html.toString();
        });
    
        extend('tableRows', function() {
cov.cover(194);
            var self = this;
            var html = new gp.StringBuilder();
            this.data.Data.forEach(function (row, index) {
cov.cover(195);
                self.Row = row;
                html.add('<tr data-index="')
                .add(index)
                .add('">')
                .add(gp.templates['gridponent-cells'](self))
                .add('</tr>');
            });
            return html.toString();
        });
    
        extend('rowIndex', function () {
cov.cover(196);
            return this.data.Data.indexOf(this.Row);
        });
    
        extend('bodyCell', function (col) {
cov.cover(197);
            var type = ( col.Type || '' ).toLowerCase();
            gp.info( 'bodyCell: type:', type );
            var html = new gp.StringBuilder();
            html.add('<td class="body-cell ' + type + '"');
            if (col.BodyStyle) {
cov.cover(198);
                html.add(' style="' + col.BodyStyle + '"');
            }
            html.add('>')
                .add(gp.helpers['bodyCellContent'].call(this, col))
                .add('</td>');
            return html.toString();
        });
    
        extend( 'bodyCellContent', function ( col ) {
cov.cover(199);
            var self = this,
                template,
                format,
                hasDeleteBtn = false,
                val = gp.getFormattedValue( this.Row, col, true ),
                type = (col.Type || '').toLowerCase(),
                html = new gp.StringBuilder();
    
            // check for a template
            if (col.Template) {
cov.cover(200);
                if (typeof (col.Template) === 'function') {
cov.cover(201);
                    html.add(col.Template.call(this, this.Row, col));
                }
                else {
cov.cover(202);
                    html.add(gp.processRowTemplate.call(this, col.Template, this.Row, col));
                }
            }
            else if (col.Commands && col.Commands.length) {
cov.cover(203);
                html.add('<div class="btn-group" role="group">');
                col.Commands.forEach(function (cmd, index) {
cov.cover(204);
                    if (cmd == 'Edit' && gp.hasValue(self.Update )) {
cov.cover(205);
                        html.add('<button type="button" class="btn btn-default btn-xs" value="')
                            .add(cmd)
                            .add('">')
                            .add('<span class="glyphicon glyphicon-edit"></span>')
                            .add(cmd)
                            .add('</button>');
                    }
                    else if ( cmd == 'Delete' && gp.hasValue( self.Destroy ) ) {
cov.cover(206);
                        // put the delete btn last
                        hasDeleteBtn = true;
                    }
                    else {
cov.cover(207);
                        html.add( '<button type="button" class="btn btn-default btn-xs" value="' )
                            .add( cmd )
                            .add( '">' )
                            .add( '<span class="glyphicon glyphicon-cog"></span>' )
                            .add( cmd )
                            .add( '</button>' );
                    }
                } );
    
                // put the delete btn last
                if ( hasDeleteBtn ) {
cov.cover(208);
                    html.add( '<button type="button" class="btn btn-danger btn-xs" value="Delete">' )
                        .add( '<span class="glyphicon glyphicon-remove"></span>Delete' )
                        .add( '</button>' );
                }
    
                html.add('</div>');
            }
            else if (gp.hasValue(val)) {
cov.cover(209);
                // show a checkmark for bools
                if (type === 'boolean') {
cov.cover(210);
                    if (val === true) {
cov.cover(211);
                        html.add('<span class="glyphicon glyphicon-ok"></span>');
                    }
                }
                else {
cov.cover(212);
                    html.add(val);
                }
            }
            return html.toString();
        });
    
    
        extend('editCell', function (col) {
cov.cover(213);
            if (col.Readonly) {
cov.cover(214);
                return gp.helpers.bodyCell.call(this, col);
            }
    
            var html = new gp.StringBuilder();
            var type = col.Type;
            if (col.Commands) type = 'commands-cell';
    
            html.add('<td class="body-cell ' + type + '"');
            if (col.BodyStyle) {
cov.cover(215);
                html.add(' style="' + col.BodyStyle + '"');
            }
            html.add('>')
            .add(gp.helpers['editCellContent'].call(this, col))
            .add('</td>');
            return html.toString();
        });
    
        extend('editCellContent', function (col) {
cov.cover(216);
            var template, html = new gp.StringBuilder();
    
            // check for a template
            if (col.EditTemplate) {
cov.cover(217);
                if (typeof (col.EditTemplate) === 'function') {
cov.cover(218);
                    html.add(col.EditTemplate.call(this, this.Row, col));
                }
                else {
cov.cover(219);
                    html.add(gp.processRowTemplate.call(this, col.EditTemplate, this.Row, col));
                }
            }
            else if (col.Commands) {
cov.cover(220);
                html.add('<div class="btn-group" role="group">')
                    .add('<button type="button" class="btn btn-primary btn-xs" value="Update">')
                    .add('<span class="glyphicon glyphicon-save"></span>Save')
                    .add('</button>')
                    .add('<button type="button" class="btn btn-default btn-xs" value="Cancel">')
                    .add('<span class="glyphicon glyphicon-remove"></span>Cancel')
                    .add('</button>')
                    .add('</div>');
            }
            else {
cov.cover(221);
                var val = this.Row[col.Field];
                // render empty cell if this field doesn't exist in the data
                if (val === undefined) return '';
                // render null as empty string
                if (val === null) val = '';
                html.add('<input class="form-control" name="' + col.Field + '" type="');
                switch (col.Type) {
                    case 'date':
                    case 'dateString':
                        // use the required format for the date input element
                        val = gp.getLocalISOString(val).substring(0, 10);
                        html.add('date" value="' + gp.escapeHTML(val) + '" />');
                        break;
                    case 'number':
                        html.add('number" value="' + gp.escapeHTML(val) + '" />');
                        break;
                    case 'boolean':
                        html.add('checkbox" value="true"');
                        if (val) {
cov.cover(222);
                            html.add(' checked="checked"');
                        }
                        html.add(' />');
                        break;
                    default:
                        html.add('text" value="' + gp.escapeHTML(val) + '" />');
                        break;
                };
            }
            return html.toString();
        });
    
        extend('footerCell', function (col) {
cov.cover(223);
            var html = new gp.StringBuilder();
            if (col.FooterTemplate) {
cov.cover(224);
                if (typeof (col.FooterTemplate) === 'function') {
cov.cover(225);
                    html.add(col.FooterTemplate.call(this, col));
                }
                else {
cov.cover(226);
                    html.add(gp.processColumnTemplate.call(this, col.FooterTemplate, col));
                }
            }
            return html.toString();
        });
    
        extend('setPagerFlags', function () {
cov.cover(227);
            this.data.IsFirstPage = this.data.Page === 1;
            this.data.IsLastPage = this.data.Page === this.data.PageCount;
            this.data.HasPages = this.data.PageCount > 1;
            this.data.PreviousPage = this.data.Page === 1 ? 1 : this.data.Page - 1;
            this.data.NextPage = this.data.Page === this.data.PageCount ? this.data.PageCount : this.data.Page + 1;
        });
    
        extend('sortStyle', function () {
cov.cover(228);
            var html = new gp.StringBuilder();
            if (gp.isNullOrEmpty(this.data.OrderBy) === false) {
cov.cover(229);
                html.add('#' + this.ID + ' thead th.header-cell.' + this.data.OrderBy + '> label:after')
                    .add('{ content: ');
                if (this.data.Desc) {
cov.cover(230);
                    html.add('"\\e114"; }');
                }
                else {
cov.cover(231);
                    html.add('"\\e113"; }');
                }
            }
            return html.toString();
        });
    
        extend('columnWidthStyle', function () {
cov.cover(232);
            var self = this,
                html = new gp.StringBuilder(),
                index = 0,
                bodyCols = document.querySelectorAll('#' + this.ID + ' .table-body > table > tbody > tr:first-child > td');
    
            // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
            this.Columns.forEach(function (col) {
cov.cover(233);
                html.add('#' + self.ID + ' .table-header th.header-cell:nth-child(' + (index + 1) + '),')
                    .add('#' + self.ID + ' .table-footer td.footer-cell:nth-child(' + (index + 1) + ')');
                if (col.Width) {
cov.cover(234);
                    // fixed width should include the body
                    html.add(',')
                        .add('#' + self.ID + ' > .table-body > table > thead th:nth-child(' + (index + 1) + '),')
                        .add('#' + self.ID + ' > .table-body > table > tbody td:nth-child(' + (index + 1) + ')')
                        .add('{ width:')
                        .add(col.Width);
                    if (isNaN(col.Width) == false) html.add('px');
                }
                else if (bodyCols.length && (self.FixedHeaders || self.FixedFooters)) {
cov.cover(235);
                    // sync header and footer to body
                    width = bodyCols[index].offsetWidth;
                    html.add('{ width:')
                        .add(bodyCols[index].offsetWidth)
                        .add('px');
                }
                html.add(';}');
                index++;
            });
    
            gp.verbose('columnWidthStyle: html:');
            gp.verbose(html.toString());
    
            return html.toString();
        });
    
        extend('containerClasses', function () {
cov.cover(236);
            var html = new gp.StringBuilder();
            if (this.FixedHeaders) {
cov.cover(237);
                html.add(' fixed-headers');
            }
            if (this.FixedFooters) {
cov.cover(238);
                html.add(' fixed-footers');
            }
            if (this.Pager) {
cov.cover(239);
                html.add(' pager-' + this.Pager);
            }
            if (this.Responsive) {
cov.cover(240);
                html.add(' responsive');
            }
            if (this.Search) {
cov.cover(241);
                html.add(' search-' + this.Search);
            }
            if (this.Onrowselect) {
cov.cover(242);
                html.add(' selectable');
            }
            return html.toString();
        });
    
    })();

    /***************\
       Initializer
    \***************/
    gp.Initializer = function ( node ) {
cov.cover(243);
        this.node = node;
    };
    
    gp.Initializer.prototype = {
    
        initialize: function (callback) {
cov.cover(244);
            var self = this;
            this.config = this.getConfig(this.node);
            this.node.config = this.config;
            var model = new gp.Model( this.config );
            var requestModel = new gp.RequestModel();
            var controller = new gp.Controller( self.config, model, requestModel );
            this.node.api = new gp.api( controller );
    
            model.read( requestModel, function ( data ) {
cov.cover(245);
                self.config.data = data;
                self.resolvePaging( self.config );
                self.resolveTypes( self.config );
                self.render( self.config );
                controller.monitorToolbars( self.config.node );
                controller.addCommandHandlers( self.config.node );
                controller.handleRowSelect( self.config );
    
                if ( typeof callback === 'function' ) callback( self.config );
            } );
    
            return this.config;
    
        },
    
        getConfig: function (node) {
cov.cover(246);
            var self = this;
            var obj, config = gp.getAttributes(node);
            config.Columns = [];
            config.data = {};
            config.ID = gp.createUID();
            for (var i = 0; i < node.children.length; i++) {
                var col = node.children[i];
                var colConfig = gp.getAttributes(col);
                config.Columns.push(colConfig);
                this.resolveCommands(colConfig);
                this.resolveTemplates(colConfig);
            }
            config.Footer = this.resolveFooter(config);
            var options = 'Onrowselect SearchFunction Read Create Update Destroy'.split(' ');
            options.forEach( function ( option ) {
cov.cover(247);
    
                if ( gp.hasValue(config[option]) ) {
cov.cover(248);
                    // see if this config option points to an object
                    // otherwise it must be a URL
                    obj = gp.getObjectAtPath( config[option] );
    
                    if ( gp.hasValue( obj ) ) config[option] = obj;
                }
    
            } );
            gp.info('getConfig.config:', config);
            return config;
        },
    
        render: function ( config ) {
cov.cover(249);
            var self = this;
            try {
                var node = config.node;
    
                node.innerHTML = gp.templates['gridponent']( config );
    
                // sync column widths
                if ( config.FixedHeaders || config.FixedFooters ) {
cov.cover(250);
                    var nodes = node.querySelectorAll( '.table-body > table > tbody > tr:first-child > td' );
    
                    if ( gp.hasPositiveWidth( nodes ) ) {
cov.cover(251);
                        // call syncColumnWidths twice because the first call causes things to shift around a bit
                        self.syncColumnWidths( config )
                        self.syncColumnWidths( config )
                    }
                    //else {
                    //    new gp.polar(function () {
                    //        return gp.hasPositiveWidth(nodes);
                    //    }, function () {
                    //        self.syncColumnWidths.call(config)
                    //        self.syncColumnWidths.call(config)
                    //    });
                    //}
    
                    window.addEventListener( 'resize', function () {
cov.cover(252);
                        self.syncColumnWidths( config );
                    } );
                }
            }
            catch ( ex ) {
                gp.error( ex );
            }
        },
    
        syncColumnWidths: function (config) {
cov.cover(253);
            var html = gp.helpers.columnWidthStyle.call( config );
            config.node.querySelector( 'style.column-width-style' ).innerHTML = html;
        },
    
        resolveFooter: function (config) {
cov.cover(254);
            for (var i = 0; i < config.Columns.length; i++) {
                if (config.Columns[i].FooterTemplate) return true;
            }
            return false;
        },
    
        resolveTemplates: function (column) {
cov.cover(255);
            var props = 'HeaderTemplate Template EditTemplate FooterTemplate'.split(' ');
            props.forEach(function (prop) {
cov.cover(256);
                column[prop] = gp.resolveTemplate(column[prop]);
            });
        },
    
        resolveCommands: function (col) {
cov.cover(257);
            if (col.Commands) {
cov.cover(258);
                col.Commands = col.Commands.split(',');
            }
        },
    
        resolvePaging: function ( config ) {
cov.cover(259);
            // if we've got all the data, do paging/sorting/searching on the client
    
        },
    
        resolveTypes: function ( config ) {
cov.cover(260);
            if ( !config || !config.data || !config.data.Data ) return;
            config.Columns.forEach( function ( col ) {
cov.cover(261);
                for ( var i = 0; i < config.data.Data.length; i++ ) {
                    if ( config.data.Data[i][col.Field] !== null ) {
cov.cover(262);
                        col.Type = gp.getType( config.data.Data[i][col.Field] );
                        break;
                    }
                }
            } );
        }
        //measureTables: function (node) {
        //    // for fixed headers, adjust the padding on the header to match the width of the main table
        //    var header = node.querySelector('.table-header');
        //    var footer = node.querySelector('.table-footer');
        //    if (header || footer) {
        //        var bodyWidth = node.querySelector('.table-body > table').offsetWidth;
        //        var headerWidth = (header || footer).querySelector('table').offsetWidth;
        //        var diff = (headerWidth - bodyWidth);
        //        if (diff !== 0) {
        //            var paddingRight = diff;
        //            gp.log('diff:' + diff + ', paddingRight:' + paddingRight);
        //            if (header) {
        //                header.style.paddingRight = paddingRight.toString() + 'px';
        //            }
        //            if (footer) {
        //                footer.style.paddingRight = paddingRight.toString() + 'px';
        //            }
        //        }
        //    }
        //}
    
    };

    /***************\
       mock-http
    \***************/
    (function (gp) {
cov.cover(263);
        gp.Http = function () { };
    
        // http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
        var routes = {
            read: /Read/,
            update: /Update/,
            create: /Create/,
            destroy: /Destroy/
        };
    
        gp.Http.prototype = {
            serialize: function (obj, props) {
cov.cover(264);
                // creates a query string from a simple object
                var self = this;
                props = props || Object.getOwnPropertyNames(obj);
                var out = [];
                props.forEach(function (prop) {
cov.cover(265);
                    out.push(encodeURIComponent(prop) + '=' + encodeURIComponent(obj[prop]));
                });
                return out.join('&');
            },
            deserialize: function (queryString) {
cov.cover(266);
                var nameValue, split = queryString.split( '&' );
                var obj = {};
                if ( !queryString ) return obj;
                split.forEach( function ( s ) {
cov.cover(267);
                    nameValue = s.split( '=' );
                    var val = nameValue[1];
                    if ( !val ) {
cov.cover(268);
                        obj[nameValue[0]] = null;
                    }
                    else if ( /true|false/i.test( val ) ) {
cov.cover(269);
                        obj[nameValue[0]] = ( /true/i.test( val ) );
                    }
                    else if ( parseFloat( val ).toString() === val ) {
cov.cover(270);
                        obj[nameValue[0]] = parseFloat( val );
                    }
                    else {
cov.cover(271);
                        obj[nameValue[0]] = val;
                    }
                } );
                return obj;
            },
            get: function (url, callback, error) {
cov.cover(272);
                if (routes.read.test(url)) {
cov.cover(273);
                    var index = url.substring(url.indexOf('?'));
                    if (index !== -1) {
cov.cover(274);
                        var queryString = url.substring(index + 1);
                        var model = this.deserialize(queryString);
                        this.post(url.substring(0, index), model, callback, error);
                    }
                    else {
cov.cover(275);
                        this.post(url, null, callback, error);
                    }
                }
                else if (routes.create.test(url)) {
cov.cover(276);
                    var result = { "ProductID": 0, "Name": "", "ProductNumber": "", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": "", "SafetyStockLevel": 0, "ReorderPoint": 0, "StandardCost": 0, "ListPrice": 0, "Size": "", "SizeUnitMeasureCode": "", "WeightUnitMeasureCode": "", "Weight": 0, "DaysToManufacture": 0, "ProductLine": "", "Class": "", "Style": "", "ProductSubcategoryID": 0, "ProductModelID": 0, "SellStartDate": "2007-07-01T00:00:00", "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "00000000-0000-0000-0000-000000000000", "ModifiedDate": "2008-03-11T10:01:36.827", "Markup": null };
                    callback(result);
                }
                else {
cov.cover(277);
                    throw 'Not found: ' + url;
                }
            },
            post: function (url, model, callback, error) {
cov.cover(278);
                model = model || {};
                if (routes.read.test(url)) {
cov.cover(279);
                    getData(model, callback);
                }
                else if (routes.update.test(url)) {
cov.cover(280);
                    callback(model);
                }
                else if (routes.destroy.test(url)) {
cov.cover(281);
                    var index = data.products.indexOf(model);
                    callback(true);
                }
                else {
cov.cover(282);
                    throw '404 Not found: ' + url;
                }
            }
        };
    
        var getData = function (model, callback) {
cov.cover(283);
            var count, d = data.products;
            if (!gp.isNullOrEmpty(model.Search)) {
cov.cover(284);
                var props = Object.getOwnPropertyNames(d[0]);
                var search = model.Search.toLowerCase();
                d = d.filter(function (row) {
cov.cover(285);
                    for (var i = 0; i < props.length; i++) {
                        if (row[props[i]] && row[props[i]].toString().toLowerCase().indexOf(search) !== -1) {
cov.cover(286);
                            return true;
                        }
                    }
                    return false;
                });
            }
            if (!gp.isNullOrEmpty(model.OrderBy)) {
cov.cover(287);
                if (model.Desc) {
cov.cover(288);
                    d.sort(function (row1, row2) {
cov.cover(289);
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
                        if (a === null) {
cov.cover(290);
                            if (b != null) {
cov.cover(291);
                                return 1;
                            }
                        }
                        else if (b === null) {
cov.cover(292);
                            // we already know a isn't null
                            return -1;
                        }
                        if (a > b) {
cov.cover(293);
                            return -1;
                        }
                        if (a < b) {
cov.cover(294);
                            return 1;
                        }
    
                        return 0;
                    });
                }
                else {
cov.cover(295);
                    d.sort(function (row1, row2) {
cov.cover(296);
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
                        if (a === null) {
cov.cover(297);
                            if (b != null) {
cov.cover(298);
                                return -1;
                            }
                        }
                        else if (b === null) {
cov.cover(299);
                            // we already know a isn't null
                            return 1;
                        }
                        if (a > b) {
cov.cover(300);
                            return 1;
                        }
                        if (a < b) {
cov.cover(301);
                            return -1;
                        }
    
                        return 0;
                    });
                }
            }
            count = d.length;
            if (model.Top !== -1) {
cov.cover(302);
                model.Data = d.slice(model.Skip).slice(0, model.Top);
            }
            else {
cov.cover(303);
                model.Data = d;
            }
            model.ValidationErrors = [];
            setTimeout(function () {
cov.cover(304);
                callback(model);
            });
    
        };
    
    })(gridponent);

    /***************\
         model
    \***************/
    gp.Model = function ( config ) {
cov.cover(305);
        this.config = config;
        this.dal = null;
        var type = gp.getType( config.Read );
        gp.info( 'Model: type:', type );
        switch ( type ) {
            case 'string':
                this.dal = new gp.ServerPager( config );
                break;
            case 'function':
                this.dal = new gp.FunctionPager( config );
                break;
            case 'object':
                // Read is a RequestModel
                this.config.data = config.Read;
                this.dal = new gp.ClientPager( this.config );
                break;
            case 'array':
                this.config.data.Data = this.config.Read;
                this.dal = new gp.ClientPager( this.config );
                break;
            default:
                throw 'Unsupported Read configuration';
        }
    };
    
    gp.Model.prototype = {
    
        read: function ( requestModel, callback ) {
cov.cover(306);
            var self = this;
            gp.info( 'Model.read: requestModel:', requestModel );
    
            gp.info( 'Model.dal: :', this.dal );
    
            this.dal.read( requestModel, function (arg) {
cov.cover(307);
                gp.tryCallback( callback, self.config.node, arg );
            } );
        },
    
        create: function (callback) {
cov.cover(308);
            var self = this,
                row;
    
            if ( typeof this.config.Create === 'function' ) {
cov.cover(309);
                this.config.Create( function ( row ) {
cov.cover(310);
                    if (self.config.data.Data && self.config.data.Data.push) {
cov.cover(311);
                        self.config.data.Data.push(row);
                    }
                    gp.tryCallback( callback, self.config.node, row );
                } );
            }
            else {
cov.cover(312);
                // ask the server for a new record
                var http = new gp.Http();
                http.get(this.config.Create, function (row) {
cov.cover(313);
                    if (self.config.data.Data && self.config.data.Data.push) {
cov.cover(314);
                        self.config.data.Data.push(row);
                    }
                    gp.tryCallback( callback, self.config.node, row );
                } );
            }
        },
    
        update: function (updateModel, callback) {
cov.cover(315);
            var self = this;
            // config.Update can be a function or URL
            gp.raiseCustomEvent( this.config.node, gp.events.beforeUpdate );
            if ( typeof this.config.Update === 'function' ) {
cov.cover(316);
                this.config.Update( updateModel, function ( arg ) {
cov.cover(317);
                    gp.tryCallback( callback, self.config.node, arg );
                } );
            }
            else {
cov.cover(318);
                var http = new gp.Http();
                http.post( this.config.Update, updateModel, function ( arg ) {
cov.cover(319);
                    gp.tryCallback( callback, self.config.node, arg );
                } );
            }
        },
    
        destroy: function (row, callback) {
cov.cover(320);
            var self = this;
            if ( typeof this.config.Destroy === 'function' ) {
cov.cover(321);
                this.config.Destroy( row, function ( arg ) {
cov.cover(322);
                    gp.tryCallback( callback, self.config.node, arg );
                } );
            }
            else {
cov.cover(323);
                var http = new gp.Http();
                http.post( this.config.Destroy, row, function ( arg ) {
cov.cover(324);
                    gp.tryCallback( callback, self.config.node, arg );
                } );
            }
        }
    
    };

    /***************\
       NodeBuilder
    \***************/
    
    gp.NodeBuilder = function ( ) {
cov.cover(325);
        this.node = null;
    };
    
    gp.NodeBuilder.prototype = {
    
        startElem: function ( tagName, value ) {
cov.cover(326);
            var n = document.createElement( tagName );
    
            if ( value != undefined ) {
cov.cover(327);
                n.innerHTML = value;
            }
    
            if ( this.node ) {
cov.cover(328);
                this.node.appendChild( n );
            }
    
            this.node = n;
    
            return this;
        },
    
        addClass: function ( name ) {
cov.cover(329);
            var hasClass = ( ' ' + this.node.className + ' ' ).indexOf( ' ' + name + ' ' ) !== -1;
    
            if ( !hasClass ) {
cov.cover(330);
                this.node.className = ( this.node.className === '' ) ? name : this.node.className + ' ' + name;
            }
    
            return this;
        },
    
        html: function ( html ) {
cov.cover(331);
            if (gp.hasClass(html) && html !== '') this.node.innerHTML = html;
            return this;
        },
    
        endElem: function () {
cov.cover(332);
            if ( this.node.parentElement ) {
cov.cover(333);
                this.node = this.node.parentElement;
            }
            return this;
        },
    
        attr: function ( name, value ) {
cov.cover(334);
            var attr = document.createAttribute( name );
    
            if ( value != undefined ) {
cov.cover(335);
                attr.value = value;
            }
    
            this.node.setAttributeNode( attr );
    
            return this;
        },
    
        close: function () {
cov.cover(336);
            while ( this.node.parentElement ) {
                this.node = this.node.parentElement;
            }
            return this.node;
        }
    
    };

    /***************\
       ObjectProxy
    \***************/
    gp.ObjectProxy = function (obj, onPropertyChanged, syncChanges) {
cov.cover(337);
        var self = this;
        var dict = {};
    
        // create mirror properties
        var props = Object.getOwnPropertyNames( obj );
    
        props.forEach(function (prop) {
cov.cover(338);
            Object.defineProperty(self, prop, {
                get: function () {
cov.cover(339);
                    return dict[prop];
                },
                set: function (value) {
cov.cover(340);
                    if (dict[prop] != value) {
cov.cover(341);
                        var oldValue = dict[prop];
                        dict[prop] = value;
                        if ( syncChanges ) {
cov.cover(342);
                            // write changes back to the original object
                            obj[prop] = value;
                        }
                        if ( typeof onPropertyChanged === 'function' ) {
cov.cover(343);
                            onPropertyChanged(self, prop, oldValue, value);
                        }
                    }
                }
            });
            dict[prop] = obj[prop];
        });
    };

    /***************\
    server-side pager
    \***************/
    gp.ServerPager = function (config) {
cov.cover(344);
        this.config = config;
        this.url = config.Read;
    };
    
    gp.ServerPager.prototype = {
        read: function (model, callback, error) {
cov.cover(345);
            var h = new gp.Http();
            h.post(this.url, model, callback, error);
        }
    };
    
    
    /***************\
    client-side pager
    \***************/
    gp.ClientPager = function (config) {
cov.cover(346);
        var value, self = this;
        this.data = config.data.Data;
        this.columns = config.Columns.filter(function (c) {
cov.cover(347);
            return c.Field !== undefined || c.Sort !== undefined;
        });
        if (typeof config.SearchFunction === 'function') {
cov.cover(348);
            this.searchFilter = config.SearchFunction;
        }
        else {
cov.cover(349);
            this.searchFilter = function (row, search) {
cov.cover(350);
                var s = search.toLowerCase();
                for (var i = 0; i < self.columns.length; i++) {
                    value = gp.getFormattedValue( row, self.columns[i], false );
                    if (gp.hasValue(value) && value.toString().toLowerCase().indexOf(s) !== -1) {
cov.cover(351);
                        return true;
                    }
                }
                return false;
            };
        }
    };
    
    gp.ClientPager.prototype = {
        read: function (model, callback, error) {
cov.cover(352);
            try {
                var self = this;
                var skip = this.getSkip( model );
    
                model.Data = this.data;
    
                var count;
                // filter first
                if (!gp.isNullOrEmpty(model.Search)) {
cov.cover(353);
                    model.Data = model.Data.filter(function (row) {
cov.cover(354);
                        return self.searchFilter(row, model.Search);
                    });
                }
    
                // set TotalRows after filtering, but before paging
                model.TotalRows = model.Data.length;
    
                // then sort
                if (gp.isNullOrEmpty(model.OrderBy) === false) {
cov.cover(355);
                    var col = this.getColumnByField( this.columns, model.OrderBy );
                    if (gp.hasValue(col)) {
cov.cover(356);
                        var sortFunction = this.getSortFunction( col, model.Desc );
                        var fieldName = col.Field || col.Sort;
                        model.Data.sort( function ( row1, row2 ) {
cov.cover(357);
                            return sortFunction( row1[fieldName], row2[fieldName] );
                        });
                    }
                }
    
                // then page
                if (model.Top !== -1) {
cov.cover(358);
                    model.Data = model.Data.slice(skip).slice(0, model.Top);
                }
            }
            catch (ex) {
                gp.error( ex );
            }
            callback(model);
        },
        getSkip: function ( model ) {
cov.cover(359);
            var data = model;
            if ( data.PageCount == 0 ) {
cov.cover(360);
                return 0;
            }
            if ( data.Page < 1 ) {
cov.cover(361);
                data.Page = 1;
            }
            else if ( data.Page > data.PageCount ) {
cov.cover(362);
                return data.Page = data.PageCount;
            }
            return ( data.Page - 1 ) * data.Top;
        },
        getColumnByField: function ( columns, field ) {
cov.cover(363);
            var col = columns.filter(function (c) { return c.Field === field || c.Sort === field });
            return col.length ? col[0] : null;
        },
        getSortFunction: function (col, desc) {
cov.cover(364);
            if ( /number|date|boolean/.test( col.Type ) ) {
cov.cover(365);
                if ( desc ) {
cov.cover(366);
                    return this.diffSortDesc;
                }
                return this.diffSortAsc;
            }
            else {
cov.cover(367);
                if ( desc ) {
cov.cover(368);
                    return this.stringSortDesc;
                }
                return this.stringSortAsc;
            }
        },
        diffSortDesc: function(a, b) {
cov.cover(369);
            return b - a;
        },
        diffSortAsc: function(a, b) {
cov.cover(370);
            return a - b;
        },
        stringSortDesc: function (a, b) {
cov.cover(371);
            if (a === null) {
cov.cover(372);
                if (b != null) {
cov.cover(373);
                    return 1;
                }
            }
            else if (b === null) {
cov.cover(374);
                // we already know a isn't null
                return -1;
            }
            if (a.toLowerCase() > b.toLowerCase()) {
cov.cover(375);
                return -1;
            }
            if (a.toLowerCase() < b.toLowerCase()) {
cov.cover(376);
                return 1;
            }
    
            return 0;
        },
        stringSortAsc: function (a, b) {
cov.cover(377);
            if (a === null) {
cov.cover(378);
                if (b != null) {
cov.cover(379);
                    return -1;
                }
            }
            else if (b === null) {
cov.cover(380);
                // we already know a isn't null
                return 1;
            }
            if (a.toLowerCase() > b.toLowerCase()) {
cov.cover(381);
                return 1;
            }
            if (a.toLowerCase() < b.toLowerCase()) {
cov.cover(382);
                return -1;
            }
    
            return 0;
        }
    };
    
    /***************\
      FunctionPager
    \***************/
    
    gp.FunctionPager = function ( config ) {
cov.cover(383);
        this.config = config;
    };
    
    gp.FunctionPager.prototype = {
        read: function ( model, callback, error ) {
cov.cover(384);
            try {
                var result = this.config.Read( model, callback );
    
                if ( result != undefined ) callback( result );
            }
            catch (ex) {
                if (typeof error === 'function') {
cov.cover(385);
                    error( ex );
                }
                else {
cov.cover(386);
                    callback();
                }
                gp.error( ex );
            }
        }
    };

    // pilfered from JQuery
    /*!
     * jQuery JavaScript Library v2.1.4
     * http://jquery.com/
     *
     * Copyright 2005, 2014 jQuery Foundation, Inc. and other contributors
     * Released under the MIT license
     * http://jquery.org/license
     *
     * Date: 2015-04-28T16:01Z
     */
    gp.ready = function (fn) {
cov.cover(387);
    
        var isReady = false;
    
        var completed = function (event) {
cov.cover(388);
            // readyState === "complete" is good enough for us to call the dom ready in oldIE
            if (document.addEventListener || event.type === "load" || document.readyState === "complete") {
cov.cover(389);
                isReady = true;
                detach();
                fn();
            }
        };
    
        var detach = function () {
cov.cover(390);
            if (document.addEventListener) {
cov.cover(391);
                document.removeEventListener("DOMContentLoaded", completed, false);
                window.removeEventListener("load", completed, false);
    
            } else {
cov.cover(392);
                document.detachEvent("onreadystatechange", completed);
                window.detachEvent("onload", completed);
            }
        };
    
        if (document.readyState === "complete") {
cov.cover(393);
            // Handle it asynchronously to allow scripts the opportunity to delay ready
            setTimeout(fn);
    
            // Standards-based browsers support DOMContentLoaded
        } else if (document.addEventListener) {
cov.cover(394);
            // Use the handy event callback
            document.addEventListener("DOMContentLoaded", completed, false);
    
            // A fallback to window.onload, that will always work
            window.addEventListener("load", completed, false);
    
            // If IE event model is used
        } else {
cov.cover(395);
            // Ensure firing before onload, maybe late but safe also for iframes
            document.attachEvent("onreadystatechange", completed);
    
            // A fallback to window.onload, that will always work
            window.attachEvent("onload", completed);
    
            // If IE and not a frame
            // continually check to see if the document is ready
            var top = false;
    
            try {
                top = window.frameElement == null && document.documentElement;
            } catch (e) { }
    
            if (top && top.doScroll) {
cov.cover(396);
                (function doScrollCheck() {
cov.cover(397);
                    if (!isReady) {
cov.cover(398);
    
                        try {
                            // Use the trick by Diego Perini
                            // http://javascript.nwbox.com/IEContentLoaded/
                            top.doScroll("left");
                        } catch (e) {
                            return setTimeout(doScrollCheck, 50);
                        }
    
                        // detach all dom ready events
                        detach();
    
                        fn();
                    }
                })();
            }
        }
    };

    /***************\
      RequestModel
    \***************/
    gp.RequestModel = function (data) {
cov.cover(399);
        var self = this;
        // properites are capitalized here because that's the convention for server-side classes (C#)
        // we want the serialized version of the corresponding server-side class to look exactly like this prototype
    
        this.Top = -1; // this is a flag to let the pagers know if paging is enabled
        this.Page = 1;
        this.OrderBy = '';
        this.Desc = false;
        this.Search = '';
        this.Data = data;
        this.TotalRows = 0;
    
        Object.defineProperty(self, 'PageIndex', {
            get: function () {
cov.cover(400);
                return self.Page - 1;
            }
        });
    
        Object.defineProperty(self, 'PageCount', {
            get: function () {
cov.cover(401);
                if ( self.Top > 0 ) {
cov.cover(402);
                    return Math.ceil( self.TotalRows / self.Top );
                }
                if ( self.TotalRows === 0 ) return 0;
                return 1;
            }
        });
    
        Object.defineProperty(self, 'Skip', {
            get: function () {
cov.cover(403);
                if (self.Top !== -1) {
cov.cover(404);
                    if (self.PageCount === 0) return 0;
                    if (self.Page < 1) self.Page = 1;
                    else if (self.Page > self.PageCount) return self.Page = self.PageCount;
                    return self.PageIndex * self.Top;
                }
                return 0;
            }
        });
    };

    /***************\
      StringBuilder
    \***************/
    
    gp.StringBuilder = function () {
cov.cover(405);
        this.out = [];
    };
    
    gp.StringBuilder.prototype = {
    
        add: function ( str ) {
cov.cover(406);
            this.out.push( str );
            return this;
        },
    
        toString: function ( ) {
cov.cover(407);
            return this.out.join('');
        }
    
    };

    /***************\
       UpdateModel
    \***************/
    gp.UpdateModel = function ( row, validationErrors ) {
cov.cover(408);
    
        this.Row = row;
        this.ValidationErrors = validationErrors;
        this.Original = gp.shallowCopy( row );
    
    };

    /***************\
       Gridponent
    \***************/
    
    // check for web component support
    if (document.registerElement) {
cov.cover(409);
    
        gp.Gridponent = Object.create(HTMLElement.prototype);
    
        gp.Gridponent.createdCallback = function () {
cov.cover(410);
            new gp.Initializer(this).initialize();
        };
    
        gp.Gridponent.detachedCallback = function () {
cov.cover(411);
            gp.info( 'detachedCallback called' );
            this.api.dispose();
        };
    
        document.registerElement('grid-ponent', {
            prototype: gp.Gridponent
        });
    }
    else {
cov.cover(412);
        // no web component support
        // provide a static function to initialize grid-ponent elements manually
        gp.initialize = function (root) {
cov.cover(413);
            root = root || document;
            var node, nodes = root.querySelectorAll( 'grid-ponent' );
            for ( var i = 0; i < nodes.length; i++ ) {
                new gp.Initializer( nodes[i] ).initialize();
            }
        };
    
        gp.ready( gp.initialize );
    }

    /***************\
        templates
    \***************/
    gp.templates = gp.templates || {};
    gp.templates['gridponent-body'] = function ( model, arg ) {
cov.cover(414);
        var out = [];
        out.push( '<table class="table" cellpadding="0" cellspacing="0">' );
        if ( !model.FixedHeaders ) {
cov.cover(415);
            out.push( gp.helpers['thead'].call( model ) );
        }
        out.push( '<tbody>' );
        out.push( gp.helpers['tableRows'].call( model ) );
        out.push( '</tbody>' );
        if ( model.Footer && !model.FixedFooters ) {
cov.cover(416);
            out.push( gp.templates['gridponent-tfoot']( model ) );
        }
        out.push( '</table>' );
        return out.join( '' );
    };
    gp.templates['gridponent-cells'] = function ( model, arg ) {
cov.cover(417);
        var out = [];
        model.Columns.forEach( function ( col, index ) {
cov.cover(418);
            out.push( '    <td class="body-cell ' );
            out.push( col.Type );
            out.push( '" ' );
            if ( col.BodyStyle ) {
cov.cover(419);
                out.push( ' style="' );
                out.push( col.BodyStyle );
                out.push( '"' );
            }
            out.push( '>' );
            out.push( gp.helpers['bodyCellContent'].call( model, col ) );
            out.push( '</td>' );
        } );
        return out.join( '' );
    };
    gp.templates['gridponent-new-row'] = function ( model, arg ) {
cov.cover(420);
        var out = [];
        out.push( '<tr data-index="' );
        out.push( gp.helpers['rowIndex'].call( model ) );
        out.push( '" class="create-mode">' );
        model.Columns.forEach( function ( col, index ) {
cov.cover(421);
            out.push( gp.helpers['editCell'].call( model, col ) );
        } );
        out.push( '</tr>' );
        return out.join( '' );
    };
    gp.templates['gridponent-pager'] = function ( model, arg ) {
cov.cover(422);
        var out = [];
        out.push( gp.helpers['setPagerFlags'].call( model ) );
        if ( model.data.HasPages ) {
cov.cover(423);
            out.push( '<div class="btn-group">' );
            out.push( '        <label class="ms-page-index btn btn-default ' );
            if ( model.data.IsFirstPage ) {
cov.cover(424);
                out.push( ' disabled ' );
            }
            out.push( '" title="First page">' );
            out.push( '<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>' );
            if ( model.data.IsFirstPage == false ) {
cov.cover(425);
                out.push( '<input type="radio" name="Page" value="1" />' );
            }
            out.push( '</label>' );
            out.push( '        <label class="ms-page-index btn btn-default ' );
            if ( model.data.IsFirstPage ) {
cov.cover(426);
                out.push( ' disabled ' );
            }
            out.push( '" title="Previous page">' );
            out.push( '<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>' );
            if ( model.data.IsFirstPage == false ) {
cov.cover(427);
                out.push( '                <input type="radio" name="Page" value="' );
                out.push( model.data.PreviousPage );
                out.push( '" />' );
            }
            out.push( '</label>' );
            out.push( '</div>' );
            out.push( '    <input type="number" name="Page" value="' );
            out.push( model.data.Page );
            out.push( '" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" /> of ' );
            out.push( model.data.PageCount );
            out.push( '<div class="btn-group">' );
            out.push( '        <label class="ms-page-index btn btn-default ' );
            if ( model.data.IsLastPage ) {
cov.cover(428);
                out.push( ' disabled ' );
            }
            out.push( '" title="Next page">' );
            out.push( '<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>' );
            if ( model.data.IsLastPage == false ) {
cov.cover(429);
                out.push( '            <input type="radio" name="Page" value="' );
                out.push( model.data.NextPage );
                out.push( '" />' );
            }
            out.push( '</label>' );
            out.push( '        <label class="ms-page-index btn btn-default ' );
            if ( model.data.IsLastPage ) {
cov.cover(430);
                out.push( ' disabled ' );
            }
            out.push( '" title="Last page">' );
            out.push( '<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>' );
            if ( model.data.IsLastPage == false ) {
cov.cover(431);
                out.push( '            <input type="radio" name="Page" value="' );
                out.push( model.data.PageCount );
                out.push( '" />' );
            }
            out.push( '</label>' );
            out.push( '</div>' );
        }
        return out.join( '' );
    };
    gp.templates['gridponent-tfoot'] = function ( model, arg ) {
cov.cover(432);
        var out = [];
        out.push( '<tfoot>' );
        out.push( '<tr>' );
        model.Columns.forEach( function ( col, index ) {
cov.cover(433);
            out.push( '<td class="footer-cell">' );
            out.push( gp.helpers['footerCell'].call( model, col ) );
            out.push( '</td>' );
        } );
        out.push( '</tr>' );
        out.push( '</tfoot>' );
        return out.join( '' );
    };
    gp.templates['gridponent'] = function ( model, arg ) {
cov.cover(434);
        var out = [];
        out.push( '<div class="table-container' );
        out.push( gp.helpers['containerClasses'].call( model ) );
        out.push( '" id="' );
        out.push( model.ID );
        out.push( '">' );
        if ( model.Search || model.ToolbarTemplate || model.Create ) {
cov.cover(435);
            out.push( '<div class="table-toolbar">' );
            if ( model.ToolbarTemplate ) {
cov.cover(436);
                out.push( gp.templates['toolbarTemplate']( model ) );
            } else {
cov.cover(437);
                if ( model.Search ) {
cov.cover(438);
                    out.push( '<div class="input-group gridponent-searchbox">' );
                    out.push( '<input type="text" name="Search" class="form-control" placeholder="Search...">' );
                    out.push( '<span class="input-group-btn">' );
                    out.push( '<button class="btn btn-default" type="button">' );
                    out.push( '<span class="glyphicon glyphicon-search"></span>' );
                    out.push( '</button>' );
                    out.push( '</span>' );
                    out.push( '</div>' );
                }
                if ( model.Create ) {
cov.cover(439);
                    out.push( '<button class="btn btn-default" type="button" value="Create">' );
                    out.push( '<span class="glyphicon glyphicon-plus"></span>Add' );
                    out.push( '</button>' );
                }
            }
            out.push( '</div>' );
        }
        if ( model.FixedHeaders ) {
cov.cover(440);
            out.push( '<div class="table-header">' );
            out.push( '<table class="table" cellpadding="0" cellspacing="0" style="margin-bottom:0">' );
            out.push( gp.helpers['thead'].call( model ) );
            out.push( '</table>' );
            out.push( '</div>' );
        }
        out.push( '        <div class="table-body ' );
        if ( model.FixedHeaders ) {
cov.cover(441);
            out.push( 'table-scroll' );
        }
        out.push( '" style="' );
        out.push( model.Style );
        out.push( '">' );
        out.push( gp.templates['gridponent-body']( model ) );
        out.push( '</div>' );
        if ( model.FixedFooters ) {
cov.cover(442);
            out.push( '<div class="table-footer">' );
            out.push( '<table class="table" cellpadding="0" cellspacing="0" style="margin-top:0">' );
            out.push( gp.templates['gridponent-tfoot']( model ) );
            out.push( '</table>' );
            out.push( '</div>' );
        }
        if ( model.Pager ) {
cov.cover(443);
            out.push( '<div class="table-pager">' );
            out.push( gp.templates['gridponent-pager']( model ) );
            out.push( '</div>' );
        }
        out.push( '<style type="text/css" class="sort-style">' );
        out.push( gp.helpers['sortStyle'].call( model ) );
        out.push( '</style>' );
        out.push( '<style type="text/css" class="column-width-style">' );
        out.push( gp.helpers['columnWidthStyle'].call( model ) );
        out.push( '</style>' );
        out.push( '<div class="progress-overlay">' );
        out.push( '<div class="progress progress-container">' );
        out.push( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' );
        out.push( '</div>' );
        out.push( '</div>' );
        out.push( '</div>' );
        return out.join( '' );
    };
cov.maxCoverage = 443;


})(gridponent);
