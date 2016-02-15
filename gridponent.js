// namespace
var gridponent = gridponent || {};

(function(gp) { 

    /***************\
          API
    \***************/
    
    gp.api = function ( controller ) {
        this.controller = controller;
    };
    
    gp.api.prototype = {
    
        getData: function ( index ) {
            if ( typeof index == 'number' ) return this.controller.config.pageModel.Data[index];
            return this.controller.config.pageModel.Data;
        },
    
        search: function ( searchTerm, callback ) {
            this.controller.search( searchTerm, callback );
        },
    
        sort: function ( name, desc, callback ) {
            this.controller.sort( name, desc, callback );
        },
    
        read: function ( requestModel, callback ) {
            this.controller.read( requestModel, callback );
        },
    
        create: function (callback) {
            this.controller.createRow(callback);
        },
    
        // This would have to be called after having retrieved the row from the table with getData().
        // The controller will attempt to figure out which tr it is by first calling indexOf(row) on the data.
        // So the original row object reference has to be preserved.
        // this function is mainly for testing
        update: function ( row, callback ) {
            this.controller.updateRow( row, null, callback );
        },
    
        destroy: function ( row, callback ) {
            this.controller.deleteRow( row, callback, true );
        },
    
        cancel: function ( arg ) { },
    
        dispose: function () {
            this.controller.dispose();
        }
    
    };

    /***************\
     change monitor
    \***************/
    gp.ChangeMonitor = function (node, selector, model, afterSync) {
        var self = this;
        this.model = model;
        this.beforeSync = null;
        this.node = node;
        this.selector = selector;
        this.listener = function (evt) {
            self.syncModel.call(self, evt.target, self.model);
        };
        this.afterSync = afterSync;
    };
    
    gp.ChangeMonitor.prototype = {
        start: function () {
            var self = this;
            // add change event handler to node
            gp.on( this.node, 'change', this.selector, this.listener );
        },
        stop: function () {
            // clean up
            gp.off( this.node, 'change', this.listener );
        },
        syncModel: function (target, model) {
            // get name and value of target
            var name = target.name;
            var value = target.value;
            var handled = false;
    
            try {
                if ( !( name in model ) ) return;
    
                if ( typeof ( this.beforeSync ) === 'function' ) {
                    handled = this.beforeSync( name, value, this.model );
                }
                if ( !handled ) {
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
            }
        },
    
        search: function(searchTerm, callback) {
            this.config.pageModel.Search = searchTerm;
            var searchBox = this.config.node.querySelector( 'div.table-toolbar input[name=Search' );
            searchBox.value = searchTerm;
            this.read(null, callback);
        },
    
        sort: function(field, desc, callback) {
            this.config.pageModel.OrderBy = field;
            this.config.pageModel.Desc = ( desc == true );
            this.read(null, callback);
        },
    
        read: function ( requestModel, callback ) {
            var self = this;
            if ( requestModel ) {
                gp.shallowCopy( requestModel, this.config.pageModel );
            }
            gp.raiseCustomEvent( this.config.node, gp.events.beforeRead, { model: this.config.pageModel } );
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
    
    
                    var tbody = self.config.node.querySelector( 'div.table-body > table > tbody' );
                    var rowIndex = self.config.pageModel.Data.indexOf( row );
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
    
    
                    gp.prependChild( tbody, tr );
    
                    tr['gp-change-monitor'] = new gp.ChangeMonitor(tr, '[name]', row, function () { });
    
    
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
    
    
                this.model.update( updateModel, function ( updateModel ) {
    
    
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

    /***************\
      CustomEvent
    \***************/
    (function () {
    
        function CustomEvent(event, params) {
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
            this.locale = locale || gp.defaultLocale;
            this.currencyCode = currencyCode || gp.defaultCurrencyCode;
            this.supported = (window.Intl !== undefined);
        };
    
        gp.Formatter.prototype = {
            format: function (val, format) {
                var key, dtf, nf, type, options;
                if (!this.supported || !gp.hasValue(val)) return val;
    
                type = gp.getType(val);
                key = (format || '') + '|' + this.locale + '|' + this.currencyCode;
    
                if (type === 'date') {
                    if (key in dateTimeFormatCache) {
                        dtf = dateTimeFormatCache[key];
                    }
                    else {
                        options = getDateTimeFormatOptions(format);
    
                        dtf = new Intl.DateTimeFormat(this.locale, options)
    
                        dateTimeFormatCache[key] = dtf;
                    }
                    return dtf.format(val).replace(ltr, '');
                }
                if (type === 'dateString') {
                    var parts = val.match(/\d+/g);
                    var dt = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
    
                    if (key in dateTimeFormatCache) {
                        dtf = dateTimeFormatCache[key];
                    }
                    else {
                        options = getDateTimeFormatOptions(format);
    
                        dtf = new Intl.DateTimeFormat(this.locale, options)
    
                        dateTimeFormatCache[key] = dtf;
                    }
                    return dtf.format(dt).replace(ltr, '');
                }
                if (type === 'number') {
                    if (key in numberFormatCache) {
                        nf = numberFormatCache[key];
                    }
                    else {
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
            var options = {};
    
            if (gp.hasValue(format)) {
    
                dateTimeTokens.forEach(function (token) {
                    if (!(token[1] in options) && format.match(token[0])) {
                        options[token[1]] = token[2];
                        if ( token.length === 4 ) {
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
            var options = {};
    
            if (gp.hasValue(format)) {
    
                numberTokens.forEach(function (token) {
                    if (!(token[1] in options) && format.match(token[0])) {
                        options[token[1]] = token[2];
                        if (token[2] === 'currency') {
                            options.currency = currencyCode;
                        }
                    }
                });
                var digits = format.match(/\d+/);
                if (digits) {
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
            var config = {}, name, attr, attrs = node.attributes;
            config.node = node;
            for ( var i = attrs.length - 1; i >= 0; i-- ) {
                attr = attrs[i];
                name = gp.camelize( attr.name );
                // convert "true", "false" and empty to boolean
                config[name] = gp.rexp.trueFalse.test( attr.value ) || attr.value === '' ?
                    ( attr.value === "true" || attr.value === '' ) : attr.value;
            }
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
    
            if ( elem ) {
                // start with elem's immediate parent
                e = elem.parentElement;
    
                potentials = parentNode.querySelectorAll( selector );
    
                while ( e ) {
                    for ( j = 0; j < potentials.length; j++ ) {
                        if ( e == potentials[j] ) {
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

    /***************\
      table helpers
    \***************/
    
    gp.helpers = {
    
        'thead': function () {
            var self = this;
            var html = new gp.StringBuilder();
            var sort, type, template;
            html.add( '<thead>' );
            html.add( '<tr>' );
            this.Columns.forEach( function ( col ) {
                sort = '';
                if ( self.Sorting ) {
                    // if sort isn't specified, use the field
                    sort = gp.escapeHTML( gp.coalesce( [col.Sort, col.Field] ) );
                }
                else {
                    // only provide sorting where it is explicitly specified
                    if ( gp.hasValue( col.Sort ) ) {
                        sort = gp.escapeHTML( col.Sort );
                    }
                }
                type = gp.coalesce( [col.Type, ''] ).toLowerCase();
    
                html.add( '<th class="header-cell ' + type + '" data-sort="' + sort + '">' );
    
                // check for a template
                if ( col.HeaderTemplate ) {
                    if ( typeof ( col.HeaderTemplate ) === 'function' ) {
                        html.add( col.HeaderTemplate.call( self, col ) );
                    }
                    else {
                        html.add( gp.processHeaderTemplate.call( this, col.HeaderTemplate, col ) );
                    }
                }
                else if ( sort != '' ) {
                    html.add( '<label class="table-sort">' )
                    .add( '<input type="radio" name="OrderBy" value="' + sort + '" />' )
                    .add( gp.coalesce( [col.Header, col.Field, sort] ) )
                    .add( '</label>' );
                }
                else {
                    html.add( gp.coalesce( [col.Header, col.Field, '&nbsp;'] ) );
                }
                html.add( '</th>' );
            } );
            html.add( '</tr>' )
                .add( '</thead>' );
            return html.toString();
        },
    
        'tableRows': function () {
            var self = this;
            var html = new gp.StringBuilder();
            this.pageModel.Data.forEach( function ( row, index ) {
                self.Row = row;
                html.add( '<tr data-index="' )
                .add( index )
                .add( '">' )
                .add( gp.templates['gridponent-cells']( self ) )
                .add( '</tr>' );
            } );
            return html.toString();
        },
    
        'bodyCellContent': function ( col ) {
            var self = this,
                template,
                format,
                hasDeleteBtn = false,
                val = gp.getFormattedValue( this.Row, col, true ),
                type = ( col.Type || '' ).toLowerCase(),
                html = new gp.StringBuilder();
    
            // check for a template
            if ( col.BodyTemplate ) {
                if ( typeof ( col.BodyTemplate ) === 'function' ) {
                    html.add( col.BodyTemplate.call( this, this.Row, col ) );
                }
                else {
                    html.add( gp.processBodyTemplate.call( this, col.BodyTemplate, this.Row, col ) );
                }
            }
            else if ( col.Commands && col.Commands.length ) {
                html.add( '<div class="btn-group" role="group">' );
                col.Commands.forEach( function ( cmd, index ) {
                    if ( cmd == 'Edit' && gp.hasValue( self.Update ) ) {
                        html.add( '<button type="button" class="btn btn-default btn-xs" value="' )
                            .add( cmd )
                            .add( '">' )
                            .add( '<span class="glyphicon glyphicon-edit"></span>' )
                            .add( cmd )
                            .add( '</button>' );
                    }
                    else if ( cmd == 'Delete' && gp.hasValue( self.Destroy ) ) {
                        // put the delete btn last
                        hasDeleteBtn = true;
                    }
                    else {
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
                    html.add( '<button type="button" class="btn btn-danger btn-xs" value="Delete">' )
                        .add( '<span class="glyphicon glyphicon-remove"></span>Delete' )
                        .add( '</button>' );
                }
    
                html.add( '</div>' );
            }
            else if ( gp.hasValue( val ) ) {
                // show a checkmark for bools
                if ( type === 'boolean' ) {
                    if ( val === true ) {
                        html.add( '<span class="glyphicon glyphicon-ok"></span>' );
                    }
                }
                else {
                    html.add( val );
                }
            }
            return html.toString();
        },
    
        'editCellContent': function ( col ) {
            var template, html = new gp.StringBuilder();
    
            // check for a template
            if ( col.EditTemplate ) {
                if ( typeof ( col.EditTemplate ) === 'function' ) {
                    html.add( col.EditTemplate.call( this, this.Row, col ) );
                }
                else {
                    html.add( gp.processBodyTemplate.call( this, col.EditTemplate, this.Row, col ) );
                }
            }
            else if ( col.Commands ) {
                html.add( '<div class="btn-group" role="group">' )
                    .add( '<button type="button" class="btn btn-primary btn-xs" value="Update">' )
                    .add( '<span class="glyphicon glyphicon-save"></span>Save' )
                    .add( '</button>' )
                    .add( '<button type="button" class="btn btn-default btn-xs" value="Cancel">' )
                    .add( '<span class="glyphicon glyphicon-remove"></span>Cancel' )
                    .add( '</button>' )
                    .add( '</div>' );
            }
            else {
                var val = this.Row[col.Field];
                // render empty cell if this field doesn't exist in the data
                if ( val === undefined ) return '';
                // render null as empty string
                if ( val === null ) val = '';
                html.add( '<input class="form-control" name="' + col.Field + '" type="' );
                switch ( col.Type ) {
                    case 'date':
                    case 'dateString':
                        // use the required format for the date input element
                        val = gp.getLocalISOString( val ).substring( 0, 10 );
                        html.add( 'date" value="' + gp.escapeHTML( val ) + '" />' );
                        break;
                    case 'number':
                        html.add( 'number" value="' + gp.escapeHTML( val ) + '" />' );
                        break;
                    case 'boolean':
                        html.add( 'checkbox" value="true"' );
                        if ( val ) {
                            html.add( ' checked="checked"' );
                        }
                        html.add( ' />' );
                        break;
                    default:
                        html.add( 'text" value="' + gp.escapeHTML( val ) + '" />' );
                        break;
                };
            }
            return html.toString();
        },
    
        'validation': function ( tr, validationErrors ) {
            var builder = new gp.StringBuilder();
            builder.add('Please correct the following errors:\r\n');
            validationErrors.forEach( function ( v ) {
                builder.add(v.Key + ':\r\n');
                // extract the error message
                var msg = v.Value.Errors.map( function ( e ) { return '    - ' + e.ErrorMessage + '\r\n'; } ).join( '' );
                builder.add( msg );
            } );
            alert( builder.toString() );
        },
    
        'footerCell': function ( col ) {
            var html = new gp.StringBuilder();
            if ( col.FooterTemplate ) {
                if ( typeof ( col.FooterTemplate ) === 'function' ) {
                    html.add( col.FooterTemplate.call( this, col ) );
                }
                else {
                    html.add( gp.processHeaderTemplate.call( this, col.FooterTemplate, col ) );
                }
            }
            return html.toString();
        },
    
        'setPagerFlags': function () {
            this.pageModel.IsFirstPage = this.pageModel.Page === 1;
            this.pageModel.IsLastPage = this.pageModel.Page === this.pageModel.PageCount;
            this.pageModel.HasPages = this.pageModel.PageCount > 1;
            this.pageModel.PreviousPage = this.pageModel.Page === 1 ? 1 : this.pageModel.Page - 1;
            this.pageModel.NextPage = this.pageModel.Page === this.pageModel.PageCount ? this.pageModel.PageCount : this.pageModel.Page + 1;
        },
    
        'sortStyle': function () {
            var html = new gp.StringBuilder();
            if ( gp.isNullOrEmpty( this.pageModel.OrderBy ) === false ) {
                html.add( '#' + this.ID + ' thead th.header-cell[data-sort="' + gp.escapeHTML(this.pageModel.OrderBy) + '"] > label:after' )
                    .add( '{ content: ' );
                if ( this.pageModel.Desc ) {
                    html.add( '"\\e114"; }' );
                }
                else {
                    html.add( '"\\e113"; }' );
                }
            }
            return html.toString();
        },
    
        'columnWidthStyle': function () {
            var self = this,
                html = new gp.StringBuilder(),
                index = 0,
                bodyCols = document.querySelectorAll( '#' + this.ID + ' .table-body > table > tbody > tr:first-child > td' );
    
            // even though the table might not exist yet, we still should render width styles because there might be fixed widths specified
            this.Columns.forEach( function ( col ) {
                html.add( '#' + self.ID + ' .table-header th.header-cell:nth-child(' + ( index + 1 ) + '),' )
                    .add( '#' + self.ID + ' .table-footer td.footer-cell:nth-child(' + ( index + 1 ) + ')' );
                if ( col.Width ) {
                    // fixed width should include the body
                    html.add( ',' )
                        .add( '#' + self.ID + ' > .table-body > table > thead th:nth-child(' + ( index + 1 ) + '),' )
                        .add( '#' + self.ID + ' > .table-body > table > tbody td:nth-child(' + ( index + 1 ) + ')' )
                        .add( '{ width:' )
                        .add( col.Width );
                    if ( isNaN( col.Width ) == false ) html.add( 'px' );
                }
                else if ( bodyCols.length && ( self.FixedHeaders || self.FixedFooters ) ) {
                    // sync header and footer to body
                    width = bodyCols[index].offsetWidth;
                    html.add( '{ width:' )
                        .add( bodyCols[index].offsetWidth )
                        .add( 'px' );
                }
                html.add( ';}' );
                index++;
            } );
    
    
            return html.toString();
        },
    
        'containerClasses': function () {
            var html = new gp.StringBuilder();
            if ( this.FixedHeaders ) {
                html.add( ' fixed-headers' );
            }
            if ( this.FixedFooters ) {
                html.add( ' fixed-footers' );
            }
            if ( this.Pager ) {
                html.add( ' pager-' + this.Pager );
            }
            if ( this.Responsive ) {
                html.add( ' responsive' );
            }
            if ( this.Search ) {
                html.add( ' search-' + this.Search );
            }
            if ( this.Onrowselect ) {
                html.add( ' selectable' );
            }
            return html.toString();
        }
    
    };
    

    /***************\
       Initializer
    \***************/
    gp.Initializer = function ( node ) {
        this.node = node;
    };
    
    gp.Initializer.prototype = {
    
        initialize: function (callback) {
            var self = this;
            this.config = this.getConfig(this.node);
            this.node.config = this.config;
            var model = new gp.Model( this.config );
            var requestModel = new gp.RequestModel();
            var controller = new gp.Controller( self.config, model, requestModel );
            this.node.api = new gp.api( controller );
    
            model.read( requestModel, function ( data ) {
                self.config.pageModel = data;
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
            var self = this;
            var obj, config = gp.getAttributes(node);
            config.Columns = [];
            config.pageModel = {};
            config.ID = gp.createUID();
            for (var i = 0; i < node.children.length; i++) {
                var col = node.children[i];
                var colConfig = gp.getAttributes(col);
                config.Columns.push(colConfig);
                this.resolveCommands(colConfig);
                this.resolveTemplates(colConfig);
            }
            config.Footer = this.resolveFooter(config);
            var options = 'Onrowselect SearchFunction Read Create Update Destroy Validate'.split(' ');
            options.forEach( function ( option ) {
    
                if ( gp.hasValue(config[option]) ) {
                    // see if this config option points to an object
                    // otherwise it must be a URL
                    obj = gp.getObjectAtPath( config[option] );
    
                    if ( gp.hasValue( obj ) ) config[option] = obj;
                }
    
            } );
            return config;
        },
    
        render: function ( config ) {
            var self = this;
            try {
                var node = config.node;
    
                node.innerHTML = gp.templates['gridponent']( config );
    
                // sync column widths
                if ( config.FixedHeaders || config.FixedFooters ) {
                    var nodes = node.querySelectorAll( '.table-body > table > tbody > tr:first-child > td' );
    
                    if ( gp.hasPositiveWidth( nodes ) ) {
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
                        self.syncColumnWidths( config );
                    } );
                }
            }
            catch ( ex ) {
                gp.error( ex );
            }
        },
    
        syncColumnWidths: function (config) {
            var html = gp.helpers.columnWidthStyle.call( config );
            config.node.querySelector( 'style.column-width-style' ).innerHTML = html;
        },
    
        resolveFooter: function (config) {
            for (var i = 0; i < config.Columns.length; i++) {
                if (config.Columns[i].FooterTemplate) return true;
            }
            return false;
        },
    
        resolveTemplates: function (column) {
            var props = 'HeaderTemplate BodyTemplate EditTemplate FooterTemplate'.split(' ');
            props.forEach(function (prop) {
                column[prop] = gp.resolveTemplate(column[prop]);
            });
        },
    
        resolveCommands: function (col) {
            if (col.Commands) {
                col.Commands = col.Commands.split(',');
            }
        },
    
        resolvePaging: function ( config ) {
            // if we've got all the data, do paging/sorting/searching on the client
    
        },
    
        resolveTypes: function ( config ) {
            if ( !config || !config.pageModel || !config.pageModel.Data ) return;
            config.Columns.forEach( function ( col ) {
                for ( var i = 0; i < config.pageModel.Data.length; i++ ) {
                    if ( config.pageModel.Data[i][col.Field] !== null ) {
                        col.Type = gp.getType( config.pageModel.Data[i][col.Field] );
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
                // creates a query string from a simple object
                var self = this;
                props = props || Object.getOwnPropertyNames(obj);
                var out = [];
                props.forEach(function (prop) {
                    out.push(encodeURIComponent(prop) + '=' + encodeURIComponent(obj[prop]));
                });
                return out.join('&');
            },
            deserialize: function (queryString) {
                var nameValue, split = queryString.split( '&' );
                var obj = {};
                if ( !queryString ) return obj;
                split.forEach( function ( s ) {
                    nameValue = s.split( '=' );
                    var val = nameValue[1];
                    if ( !val ) {
                        obj[nameValue[0]] = null;
                    }
                    else if ( /true|false/i.test( val ) ) {
                        obj[nameValue[0]] = ( /true/i.test( val ) );
                    }
                    else if ( parseFloat( val ).toString() === val ) {
                        obj[nameValue[0]] = parseFloat( val );
                    }
                    else {
                        obj[nameValue[0]] = val;
                    }
                } );
                return obj;
            },
            get: function (url, callback, error) {
                if (routes.read.test(url)) {
                    var index = url.substring(url.indexOf('?'));
                    if (index !== -1) {
                        var queryString = url.substring(index + 1);
                        var model = this.deserialize(queryString);
                        this.post(url.substring(0, index), model, callback, error);
                    }
                    else {
                        this.post(url, null, callback, error);
                    }
                }
                else if (routes.create.test(url)) {
                    var result = { "ProductID": 0, "Name": "", "ProductNumber": "", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": "", "SafetyStockLevel": 0, "ReorderPoint": 0, "StandardCost": 0, "ListPrice": 0, "Size": "", "SizeUnitMeasureCode": "", "WeightUnitMeasureCode": "", "Weight": 0, "DaysToManufacture": 0, "ProductLine": "", "Class": "", "Style": "", "ProductSubcategoryID": 0, "ProductModelID": 0, "SellStartDate": "2007-07-01T00:00:00", "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "00000000-0000-0000-0000-000000000000", "ModifiedDate": "2008-03-11T10:01:36.827", "Markup": null };
                    callback(result);
                }
                else {
                    throw 'Not found: ' + url;
                }
            },
            post: function (url, model, callback, error) {
                model = model || {};
                if (routes.read.test(url)) {
                    getData(model, callback);
                }
                else if (routes.update.test(url)) {
                    callback(model);
                }
                else if (routes.destroy.test(url)) {
                    var index = data.products.indexOf(model);
                    callback(true);
                }
                else {
                    throw '404 Not found: ' + url;
                }
            }
        };
    
        var getData = function (model, callback) {
            var count, d = data.products;
            if (!gp.isNullOrEmpty(model.Search)) {
                var props = Object.getOwnPropertyNames(d[0]);
                var search = model.Search.toLowerCase();
                d = d.filter(function (row) {
                    for (var i = 0; i < props.length; i++) {
                        if (row[props[i]] && row[props[i]].toString().toLowerCase().indexOf(search) !== -1) {
                            return true;
                        }
                    }
                    return false;
                });
            }
            if (!gp.isNullOrEmpty(model.OrderBy)) {
                if (model.Desc) {
                    d.sort(function (row1, row2) {
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
                        if (a === null) {
                            if (b != null) {
                                return 1;
                            }
                        }
                        else if (b === null) {
                            // we already know a isn't null
                            return -1;
                        }
                        if (a > b) {
                            return -1;
                        }
                        if (a < b) {
                            return 1;
                        }
    
                        return 0;
                    });
                }
                else {
                    d.sort(function (row1, row2) {
                        var a = row1[model.OrderBy];
                        var b = row2[model.OrderBy];
                        if (a === null) {
                            if (b != null) {
                                return -1;
                            }
                        }
                        else if (b === null) {
                            // we already know a isn't null
                            return 1;
                        }
                        if (a > b) {
                            return 1;
                        }
                        if (a < b) {
                            return -1;
                        }
    
                        return 0;
                    });
                }
            }
            count = d.length;
            if (model.Top !== -1) {
                model.Data = d.slice(model.Skip).slice(0, model.Top);
            }
            else {
                model.Data = d;
            }
            model.ValidationErrors = [];
            setTimeout(function () {
                callback(model);
            });
    
        };
    
    })(gridponent);

    /***************\
         model
    \***************/
    gp.Model = function ( config ) {
        this.config = config;
        this.dal = null;
        var type = gp.getType( config.Read );
        switch ( type ) {
            case 'string':
                this.dal = new gp.ServerPager( config );
                break;
            case 'function':
                this.dal = new gp.FunctionPager( config );
                break;
            case 'object':
                // Read is a RequestModel
                this.config.pageModel = config.Read;
                this.dal = new gp.ClientPager( this.config );
                break;
            case 'array':
                this.config.pageModel.Data = this.config.Read;
                this.dal = new gp.ClientPager( this.config );
                break;
            default:
                throw 'Unsupported Read configuration';
        }
    };
    
    gp.Model.prototype = {
    
        read: function ( requestModel, callback ) {
            var self = this;
    
    
            this.dal.read( requestModel, function (arg) {
                gp.tryCallback( callback, self.config.node, arg );
            } );
        },
    
        create: function (callback) {
            var self = this,
                row;
    
            if ( typeof this.config.Create === 'function' ) {
                this.config.Create( function ( row ) {
                    if (self.config.pageModel.Data && self.config.pageModel.Data.push) {
                        self.config.pageModel.Data.push(row);
                    }
                    gp.tryCallback( callback, self.config.node, row );
                } );
            }
            else {
                // ask the server for a new record
                var http = new gp.Http();
                http.get(this.config.Create, function (row) {
                    if (self.config.pageModel.Data && self.config.pageModel.Data.push) {
                        self.config.pageModel.Data.push(row);
                    }
                    gp.tryCallback( callback, self.config.node, row );
                } );
            }
        },
    
        update: function (updateModel, callback) {
            var self = this;
            // config.Update can be a function or URL
            gp.raiseCustomEvent( this.config.node, gp.events.beforeUpdate );
            if ( typeof this.config.Update === 'function' ) {
                this.config.Update( updateModel, function ( arg ) {
                    gp.tryCallback( callback, self.config.node, arg );
                } );
            }
            else {
                var http = new gp.Http();
                http.post( this.config.Update, updateModel, function ( arg ) {
                    gp.tryCallback( callback, self.config.node, arg );
                } );
            }
        },
    
        destroy: function (row, callback) {
            var self = this;
            if ( typeof this.config.Destroy === 'function' ) {
                this.config.Destroy( row, function ( arg ) {
                    gp.tryCallback( callback, self.config.node, arg );
                } );
            }
            else {
                var http = new gp.Http();
                http.post( this.config.Destroy, row, function ( arg ) {
                    gp.tryCallback( callback, self.config.node, arg );
                } );
            }
        }
    
    };

    /***************\
       NodeBuilder
    \***************/
    
    gp.NodeBuilder = function ( parent ) {
        this.node = parent || null;
    };
    
    gp.NodeBuilder.prototype = {
    
        startElem: function ( tagName ) {
            var n = document.createElement( tagName );
    
            if ( this.node ) {
                this.node.appendChild( n );
            }
    
            this.node = n;
    
            return this;
        },
    
        addClass: function ( name ) {
            var hasClass = ( ' ' + this.node.className + ' ' ).indexOf( ' ' + name + ' ' ) !== -1;
    
            if ( !hasClass ) {
                this.node.className = ( this.node.className === '' ) ? name : this.node.className + ' ' + name;
            }
    
            return this;
        },
    
        html: function ( html ) {
            if (gp.hasClass(html) && html !== '') this.node.innerHTML = html;
            return this;
        },
    
        endElem: function () {
            if ( this.node.parentElement ) {
                this.node = this.node.parentElement;
            }
            return this;
        },
    
        attr: function ( name, value ) {
            var attr = document.createAttribute( name );
    
            if ( value != undefined ) {
                attr.value = gp.escapeHTML( value );
            }
    
            this.node.setAttributeNode( attr );
    
            return this;
        },
    
        close: function () {
            while ( this.node.parentElement ) {
                this.node = this.node.parentElement;
            }
            return this.node;
        }
    
    };

    /***************\
       ObjectProxy
    \***************/
    gp.ObjectProxy = function (obj, onPropertyChanged ) {
        var self = this;
        var dict = {};
    
        // create mirror properties
        var props = Object.getOwnPropertyNames( obj );
    
        props.forEach(function (prop) {
            Object.defineProperty(self, prop, {
                get: function () {
                    return dict[prop];
                },
                set: function (value) {
                    if (dict[prop] != value) {
                        var oldValue = dict[prop];
                        dict[prop] = value;
                        if ( typeof onPropertyChanged === 'function' ) {
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
        this.config = config;
        this.url = config.Read;
    };
    
    gp.ServerPager.prototype = {
        read: function (model, callback, error) {
            var h = new gp.Http();
            h.post(this.url, model, callback, error);
        }
    };
    
    
    /***************\
    client-side pager
    \***************/
    gp.ClientPager = function (config) {
        var value, self = this;
        this.data = config.pageModel.Data;
        this.columns = config.Columns.filter(function (c) {
            return c.Field !== undefined || c.Sort !== undefined;
        });
        if (typeof config.SearchFunction === 'function') {
            this.searchFilter = config.SearchFunction;
        }
        else {
            this.searchFilter = function (row, search) {
                var s = search.toLowerCase();
                for (var i = 0; i < self.columns.length; i++) {
                    value = gp.getFormattedValue( row, self.columns[i], false );
                    if (gp.hasValue(value) && value.toString().toLowerCase().indexOf(s) !== -1) {
                        return true;
                    }
                }
                return false;
            };
        }
    };
    
    gp.ClientPager.prototype = {
        read: function (model, callback, error) {
            try {
                var self = this;
                var skip = this.getSkip( model );
    
                model.Data = this.data;
    
                var count;
                // filter first
                if (!gp.isNullOrEmpty(model.Search)) {
                    model.Data = model.Data.filter(function (row) {
                        return self.searchFilter(row, model.Search);
                    });
                }
    
                // set TotalRows after filtering, but before paging
                model.TotalRows = model.Data.length;
    
                // then sort
                if (gp.isNullOrEmpty(model.OrderBy) === false) {
                    var col = this.getColumnByField( this.columns, model.OrderBy );
                    if (gp.hasValue(col)) {
                        var sortFunction = this.getSortFunction( col, model.Desc );
                        var fieldName = col.Field || col.Sort;
                        model.Data.sort( function ( row1, row2 ) {
                            return sortFunction( row1[fieldName], row2[fieldName] );
                        });
                    }
                }
    
                // then page
                if (model.Top !== -1) {
                    model.Data = model.Data.slice(skip).slice(0, model.Top);
                }
            }
            catch (ex) {
                gp.error( ex );
            }
            callback(model);
        },
        getSkip: function ( model ) {
            var data = model;
            if ( data.PageCount == 0 ) {
                return 0;
            }
            if ( data.Page < 1 ) {
                data.Page = 1;
            }
            else if ( data.Page > data.PageCount ) {
                return data.Page = data.PageCount;
            }
            return ( data.Page - 1 ) * data.Top;
        },
        getColumnByField: function ( columns, field ) {
            var col = columns.filter(function (c) { return c.Field === field || c.Sort === field });
            return col.length ? col[0] : null;
        },
        getSortFunction: function (col, desc) {
            if ( /number|date|boolean/.test( col.Type ) ) {
                if ( desc ) {
                    return this.diffSortDesc;
                }
                return this.diffSortAsc;
            }
            else {
                if ( desc ) {
                    return this.stringSortDesc;
                }
                return this.stringSortAsc;
            }
        },
        diffSortDesc: function(a, b) {
            return b - a;
        },
        diffSortAsc: function(a, b) {
            return a - b;
        },
        stringSortDesc: function (a, b) {
            if (a === null) {
                if (b != null) {
                    return 1;
                }
                return 0;
            }
            else if (b === null) {
                // we already know a isn't null
                return -1;
            }
            if (a.toLowerCase() > b.toLowerCase()) {
                return -1;
            }
            if (a.toLowerCase() < b.toLowerCase()) {
                return 1;
            }
    
            return 0;
        },
        stringSortAsc: function (a, b) {
            if (a === null) {
                if (b != null) {
                    return -1;
                }
                return 0;
            }
            else if (b === null) {
                // we already know a isn't null
                return 1;
            }
            if (a.toLowerCase() > b.toLowerCase()) {
                return 1;
            }
            if (a.toLowerCase() < b.toLowerCase()) {
                return -1;
            }
    
            return 0;
        }
    };
    
    /***************\
      FunctionPager
    \***************/
    
    gp.FunctionPager = function ( config ) {
        this.config = config;
    };
    
    gp.FunctionPager.prototype = {
        read: function ( model, callback, error ) {
            try {
                var result = this.config.Read( model, callback );
    
                if ( result != undefined ) callback( result );
            }
            catch (ex) {
                if (typeof error === 'function') {
                    gp.tryCallback( error, this, ex );
                }
                else {
                    gp.tryCallback( callback, this, this.config );
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
    
        var isReady = false;
    
        var completed = function (event) {
            // readyState === "complete" is good enough for us to call the dom ready in oldIE
            if (document.addEventListener || event.type === "load" || document.readyState === "complete") {
                isReady = true;
                detach();
                fn();
            }
        };
    
        var detach = function () {
            if (document.addEventListener) {
                document.removeEventListener("DOMContentLoaded", completed, false);
                window.removeEventListener("load", completed, false);
    
            } else {
                document.detachEvent("onreadystatechange", completed);
                window.detachEvent("onload", completed);
            }
        };
    
        if (document.readyState === "complete") {
            // Handle it asynchronously to allow scripts the opportunity to delay ready
            setTimeout(fn);
    
            // Standards-based browsers support DOMContentLoaded
        } else if (document.addEventListener) {
            // Use the handy event callback
            document.addEventListener("DOMContentLoaded", completed, false);
    
            // A fallback to window.onload, that will always work
            window.addEventListener("load", completed, false);
    
            // If IE event model is used
        } else {
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
                (function doScrollCheck() {
                    if (!isReady) {
    
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
                return self.Page - 1;
            }
        });
    
        Object.defineProperty(self, 'PageCount', {
            get: function () {
                if ( self.Top > 0 ) {
                    return Math.ceil( self.TotalRows / self.Top );
                }
                if ( self.TotalRows === 0 ) return 0;
                return 1;
            }
        });
    
        Object.defineProperty(self, 'Skip', {
            get: function () {
                if (self.Top !== -1) {
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
        this.out = [];
    };
    
    gp.StringBuilder.prototype = {
    
        add: function ( str ) {
            this.out.push( str );
            return this;
        },
    
        toString: function ( ) {
            return this.out.join('');
        }
    
    };

    /***************\
       UpdateModel
    \***************/
    gp.UpdateModel = function ( row, validationErrors ) {
    
        this.Row = row;
        this.ValidationErrors = validationErrors;
        this.Original = gp.shallowCopy( row );
    
    };

    /***************\
       Gridponent
    \***************/
    
    // check for web component support
    if (document.registerElement) {
    
        gp.Gridponent = Object.create(HTMLElement.prototype);
    
        gp.Gridponent.createdCallback = function () {
            new gp.Initializer(this).initialize();
        };
    
        gp.Gridponent.detachedCallback = function () {
            this.api.dispose();
        };
    
        document.registerElement('grid-ponent', {
            prototype: gp.Gridponent
        });
    }
    else {
        // no web component support
        // provide a static function to initialize grid-ponent elements manually
        gp.initialize = function (root) {
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
    gp.templates['gridponent-body'] = function(model, arg) {
        var out = [];
        out.push('<table class="table" cellpadding="0" cellspacing="0">');
                if (!model.FixedHeaders) {
                        out.push(gp.helpers['thead'].call(model));
                    }
            out.push('<tbody>');
                    out.push(gp.helpers['tableRows'].call(model));
            out.push('</tbody>');
                if (model.Footer && !model.FixedFooters) {
                        out.push(gp.templates['gridponent-tfoot'](model));
                    }
            out.push('</table>');
        return out.join('');
    };
    gp.templates['gridponent-cells'] = function(model, arg) {
        var out = [];
        model.Columns.forEach(function(col, index) {
                out.push('    <td class="body-cell ');
        out.push(col.Type);
        out.push('" ');
        if (col.BodyStyle) {
        out.push(' style="');
        out.push(col.BodyStyle);
        out.push('"');
        }
        out.push('>');
                    out.push(gp.helpers['bodyCellContent'].call(model, col));
            out.push('</td>');
        });
                return out.join('');
    };
    gp.templates['gridponent-pager'] = function(model, arg) {
        var out = [];
        out.push(gp.helpers['setPagerFlags'].call(model));
                if (model.pageModel.HasPages) {
                out.push('<div class="btn-group">');
        out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsFirstPage) {
        out.push(' disabled ');
        }
        out.push('" title="First page">');
        out.push('<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>');
                        if (model.pageModel.IsFirstPage == false) {
            out.push('<input type="radio" name="Page" value="1" />');
                        }
            out.push('</label>');
            out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsFirstPage) {
        out.push(' disabled ');
        }
        out.push('" title="Previous page">');
        out.push('<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>');
                        if (model.pageModel.IsFirstPage == false) {
            out.push('                <input type="radio" name="Page" value="');
        out.push(model.pageModel.PreviousPage);
        out.push('" />');
                        }
            out.push('</label>');
        out.push('</div>');
        out.push('    <input type="number" name="Page" value="');
        out.push(model.pageModel.Page);
        out.push('" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" /> of ');
        out.push(model.pageModel.PageCount);
            out.push('<div class="btn-group">');
        out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsLastPage) {
        out.push(' disabled ');
        }
        out.push('" title="Next page">');
        out.push('<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>');
                        if (model.pageModel.IsLastPage == false) {
            out.push('            <input type="radio" name="Page" value="');
        out.push(model.pageModel.NextPage);
        out.push('" />');
                        }
            out.push('</label>');
            out.push('        <label class="ms-page-index btn btn-default ');
        if (model.pageModel.IsLastPage) {
        out.push(' disabled ');
        }
        out.push('" title="Last page">');
        out.push('<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>');
                        if (model.pageModel.IsLastPage == false) {
            out.push('            <input type="radio" name="Page" value="');
        out.push(model.pageModel.PageCount);
        out.push('" />');
                        }
            out.push('</label>');
        out.push('</div>');
        }
                return out.join('');
    };
    gp.templates['gridponent-tfoot'] = function(model, arg) {
        var out = [];
        out.push('<tfoot>');
        out.push('<tr>');
                    model.Columns.forEach(function(col, index) {
            out.push('<td class="footer-cell">');
                            out.push(gp.helpers['footerCell'].call(model, col));
            out.push('</td>');
                    });
            out.push('</tr>');
        out.push('</tfoot>');
        return out.join('');
    };
    gp.templates['gridponent'] = function(model, arg) {
        var out = [];
        out.push('<div class="table-container');
        out.push(gp.helpers['containerClasses'].call(model));
        out.push('" id="');
        out.push(model.ID);
        out.push('">');
                if (model.Search || model.Create) {
            out.push('<div class="table-toolbar">');
                        if (model.Search) {
            out.push('<div class="input-group gridponent-searchbox">');
        out.push('<input type="text" name="Search" class="form-control" placeholder="Search...">');
        out.push('<span class="input-group-btn">');
        out.push('<button class="btn btn-default" type="button">');
        out.push('<span class="glyphicon glyphicon-search"></span>');
        out.push('</button>');
        out.push('</span>');
        out.push('</div>');
                        }
                            if (model.Create) {
            out.push('<button class="btn btn-default" type="button" value="Create">');
        out.push('<span class="glyphicon glyphicon-plus"></span>Add');
        out.push('</button>');
                        }
            out.push('</div>');
                }
                    if (model.FixedHeaders) {
            out.push('<div class="table-header">');
        out.push('<table class="table" cellpadding="0" cellspacing="0" style="margin-bottom:0">');
                            out.push(gp.helpers['thead'].call(model));
            out.push('</table>');
        out.push('</div>');
                }
            out.push('        <div class="table-body ');
        if (model.FixedHeaders) {
        out.push('table-scroll');
        }
        out.push('" style="');
        out.push(model.Style);
        out.push('">');
                        out.push(gp.templates['gridponent-body'](model));
            out.push('</div>');
                if (model.FixedFooters) {
            out.push('<div class="table-footer">');
        out.push('<table class="table" cellpadding="0" cellspacing="0" style="margin-top:0">');
                            out.push(gp.templates['gridponent-tfoot'](model));
            out.push('</table>');
        out.push('</div>');
                }
                    if (model.Pager) {
            out.push('<div class="table-pager">');
                        out.push(gp.templates['gridponent-pager'](model));
            out.push('</div>');
                }
            out.push('<style type="text/css" class="sort-style">');
                    out.push(gp.helpers['sortStyle'].call(model));
            out.push('</style>');
        out.push('<style type="text/css" class="column-width-style">');
                    out.push(gp.helpers['columnWidthStyle'].call(model));
            out.push('</style>');
        out.push('<div class="progress-overlay">');
        out.push('<div class="progress progress-container">');
        out.push('<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>');
        out.push('</div>');
        out.push('</div>');
        out.push('</div>');
        return out.join('');
    };


})(gridponent);
