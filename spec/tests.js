QUnit.test( 'gp.getMatchCI', function ( assert ) {

    var ar = 'thiS IS a Test'.split( ' ' );

    ar.push( null );

    var match = gp.getMatchCI( ar, 'THIS' );
    assert.strictEqual( match, ar[0] );

    match = gp.getMatchCI( ar, 'not' );
    assert.strictEqual( match, null );

    match = gp.getMatchCI( ar, undefined );
    assert.strictEqual( match, null );

    match = gp.getMatchCI( ar, 'is' );
    assert.strictEqual( match, 'IS' );

    match = gp.getMatchCI( ar, 'a' );
    assert.strictEqual( match, 'a' );

    match = gp.getMatchCI( ar, 'Testing' );
    assert.strictEqual( match, null );

    match = gp.getMatchCI( ar, 'test' );
    assert.strictEqual( match, 'Test' );

} );

QUnit.test( 'shallowCopy', function ( assert ) {

    var backup = gp.shallowCopy( fns.model );

    var to = fns.model;

    // uncopyable (primitive) types should just return the target untouched
    assert.equal( gp.shallowCopy( true, to ), to );
    assert.equal( gp.shallowCopy( 1, to ), to );
    assert.equal( gp.shallowCopy( "", to ), to );
    assert.equal( gp.shallowCopy( null, to ), to );

    gp.shallowCopy( { test: 'test', number: function () { return 5; } }, to );
    assert.equal( to.test, 'test' );
    assert.equal( to.number, 5 );
    delete to.test;
    delete to.number;

    var d = new Date();
    gp.shallowCopy( d, to );
    Object.getOwnPropertyNames( d ).forEach( function ( prop ) {
        assert.equal( d[prop], to[prop] );
        delete to[prop];
    } );

    // now try to copy it back
    gp.shallowCopy( to, fns.model );

    var rexp = /test/;
    gp.shallowCopy( rexp, to );
    Object.getOwnPropertyNames( rexp ).forEach( function ( prop ) {
        assert.equal( rexp[prop], to[prop] );
        delete to[prop];
    } );

    // do a case-insensitive copy
    to = {};
    var props = Object.getOwnPropertyNames( fns.model ).forEach( function ( prop ) {
        to[prop.toUpperCase()] = null;
    } );

    gp.shallowCopy( fns.model, to, true );

    assert.strictEqual( fns.model.ProductNumber, to.PRODUCTNUMBER );
    assert.strictEqual( fns.model.State, to.STATE );
    assert.strictEqual( fns.model.Name, to.NAME );

    // restore the model
    fns.model = backup;

} );

QUnit.test( 'api.saveChanges', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.read = 'data.products';
    options.create = 'fns.createProduct';
    options.update = 'fns.updateProduct';
    options.destroy = 'fns.destroyProduct';

    getTableConfig( options, function ( api ) {

        // grab a row and modify it
        var dataItem = api.getData()[0];

        var cell = api.find( '.table-body tr:first-child td:nth-child(2)' );

        assert.ok( cell != null, 'should find a table cell' );

        var text = $( cell ).text();

        assert.equal( dataItem.Name, text, 'make sure we found the Name column' );

        dataItem.Name = 'Todd Piltingsrud';

        api.saveChanges( dataItem, function ( response ) {

            assert.ok( response != null, '' );

            text = api.find( '.table-body tr:first-child td:nth-child(2)' ).text();

            assert.equal( dataItem.Name, text, 'saveChanges should update the row and the table cells' );

            assert.equal( text, 'Todd Piltingsrud', 'saveChanges should update the row and the table cells' );

            api.dispose();

            done1();

        } );

    } );

    // try it without an update configuration
    options.update = null;

    getTableConfig( options, function ( api ) {

        // grab a row and modify it
        var dataItem = api.getData()[0];

        var cell = api.find( '.table-body tr:first-child td:nth-child(2)' );

        assert.ok( cell != null, 'should find a table cell' );

        var text = $( cell ).text();

        assert.equal( dataItem.Name, text, 'make sure we found the Name column' );

        dataItem.Name = 'Widget';

        api.saveChanges( dataItem, function ( response ) {

            text = api.find( '.table-body tr:first-child td:nth-child(2)' ).text();

            assert.notStrictEqual( dataItem.Name, text, 'saveChanges should NOT update the row and the table cells' );

            assert.notStrictEqual( text, 'Widget', 'saveChanges should NOT update the row and the table cells' );

            done2();

        } );

    } );

} );

QUnit.test( 'api.toggleBusy', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );
    options.fixedheaders = true;

    gridponent( '#table .box', options ).ready( function ( api ) {

        api.toggleBusy(false);

        assert.ok( api.$n.hasClass( 'busy' ) == false );

        api.toggleBusy();

        assert.ok( api.$n.hasClass( 'busy' ) == true );

        api.dispose();

        $( '#table .box' ).empty();

        done1();

    } );

} );

QUnit.test( 'inject', function ( assert ) {

    var done1 = assert.async();
    //var done2 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.inject = 'fns';

    options.headerCellContent = '{{{fns.getCustomHeader}}}';

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'th span[style]' );

        assert.ok( element.length > 0, 'injecting custom resource works' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );


    var done2 = assert.async();

    var config = gp.shallowCopy( configOptions );

    config.inject = 'fns';

    config.headerCellContent = '{{{fns.getCustomHeader}}}';

    getTableConfig( config, function ( api ) {

        var element = api.find( 'th span[style]' );

        assert.ok( element.length > 0, 'injecting custom resource works' );

        done2();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'required field', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    var standardCostColumn = options.columns.filter( function ( col ) {
        return col.field == 'StandardCost';
    } )[0];

    standardCostColumn.required = true;

    gridponent( '#table .box', options ).ready( function ( api ) {

        // put one of the rows into edit mode
        var btn = api.find( 'button[value=edit]' );

        clickButton( btn );

        var element = api.find( 'input[required]' );

        assert.ok( element.length > 0, 'required attribute is rendered' );

        assert.strictEqual( element[0].name, 'StandardCost' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );


    var done2 = assert.async();

    getTableConfig( configOptions, function ( api ) {

        // put one of the rows into edit mode
        var btn = api.find( 'button[value=edit]' );

        clickButton( btn );

        var element = api.find( 'input[required]' );

        assert.ok( element.length > 0, 'required attribute is rendered' );

        assert.strictEqual( element[0].name, 'StandardCost' );

        done2();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override headerCellContent', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.headerCellContent = function ( $column, $injector ) {
        if ( $column.field == 'MakeFlag' ) {
            return '<div class="custom-header-content">Make Flag</div>';
        }
        else {
            return $injector.base( 'headerCellContent' );
        }
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'div.custom-header-content' );

        assert.ok( element.length > 0, 'headerCellContent can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override headerCell', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.headerCell = function ( $column, $injector ) {
        if ( $column.field == 'MakeFlag' ) {
            return '<th class="header-cell custom-header-cell">Make Flag</th>';
        }
        else {
            return $injector.base( 'headerCell' );
        }
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'th.custom-header-cell' );

        assert.ok( element.length > 0, 'headerCell can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override header', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.header = function ( $columns, $config, $injector ) {
        // depending on whether or not fixedheaders has been specified
        // this template is rendered either in a table by itself or inside the main table
        var html = new gp.StringBuilder();
        html.add( '<thead><tr class="custom-header-row">' );
        $columns.forEach( function ( col ) {
            html.add( $injector.setResource( '$column', col ).exec( 'headerCell' ) );
        } );
        html.add( '</tr></thead>' );
        return html.toString();
    };


    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'tr.custom-header-row' );

        assert.ok( element.length > 0, 'header can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override tableRow', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.tableRow = function ( $injector, uid ) {
        var self = this,
            html = new gp.StringBuilder();
        html.add( '<tr class="custom-table-row" data-uid="' )
            .add( uid )
            .add( '">' )
            .add( $injector.exec( 'tableRowCells' ) )
            .add( '</tr>' );
        return html.toString();
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'tr.custom-table-row' );

        assert.ok( element.length > 0, 'tableRow can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override tableRowCells', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.tableRowCells = function ( $columns, $injector ) {
        var self = this,
            html = new gp.StringBuilder(),
            makeFlagColumn = $columns.filter( function ( col ) { return col.field == 'MakeFlag'; } )[0];
        
        html.add( '<td class="body-cell" colspan="2">' )
            .add( $injector.setResource( '$column', makeFlagColumn ).exec( 'bodyCellContent' ) );

        $columns.forEach( function ( col ) {
            if ( col.field != 'MakeFlag' ) {
                // set the current column for bodyCellContent template
                $injector.setResource( '$column', col );
                html.add( $injector.exec( 'tableRowCell' ) );
            }
        } );
        return html.toString();
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'td.body-cell[colspan=2]' );

        assert.ok( element.length > 0, 'tableRowCells can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override tableRowCell', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.tableRowCell = function ( $column, $injector ) {
        var self = this,
            html = new gp.StringBuilder();

        // set the current column for bodyCellContent template
        $injector.setResource( '$column', $column );
        html.add( '<td class="body-cell custom-body-cell ' );
        if ( $column.commands ) {
            html.add( 'commands ' );
        }
        html.add( $column.bodyclass )
            .add( '">' )
            .add( $injector.exec( 'bodyCellContent' ) )
            .add( '</td>' );

        return html.toString();
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'td.custom-body-cell' );

        assert.ok( element.length > 0, 'tableRowCell can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override tableBody', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.tableBody = function ( $config, $injector ) {
        var html = new gp.StringBuilder();
        html.add( '<table class="table custom-table-body" cellpadding="0" cellspacing="0">' );
        if ( !$config.fixedheaders ) {
            html.add( $injector.exec( 'header' ) );
        }
        html.add( '<tbody>' )
            .add( $injector.exec( 'tableRows' ) )
            .add( '</tbody>' );
        if ( $config.hasFooter && !$config.fixedfooters ) {
            html.add( $injector.exec( 'footer' ) );
        }
        html.add( '</table>' );
        return html.toString();
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'table.custom-table-body' );

        assert.ok( element.length > 0, 'tableBody can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override pagerBar', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.read = data.products;

    options.pagerBar = function ( $pageModel ) {
        var pageModel = gp.shallowCopy( $pageModel ),
            html = new gp.StringBuilder();

        pageModel.IsFirstPage = pageModel.page === 1;
        pageModel.IsLastPage = pageModel.page === pageModel.pagecount;
        pageModel.HasPages = pageModel.pagecount > 1;
        pageModel.PreviousPage = pageModel.page === 1 ? 1 : pageModel.page - 1;
        pageModel.NextPage = pageModel.page === pageModel.pagecount ? pageModel.pagecount : pageModel.page + 1;

        pageModel.firstPageClass = ( pageModel.IsFirstPage ? 'disabled' : '' );
        pageModel.lastPageClass = ( pageModel.IsLastPage ? 'disabled' : '' );

        if ( pageModel.HasPages ) {
            html.add( '<div class="btn-group custom-pager">' )
                .add( '<button class="ms-page-index btn btn-default {{firstPageClass}}" title="First page" value="page" data-page="1">' )
                .add( '<span class="glyphicon glyphicon-triangle-left" aria-hidden="true"></span>' )
                .add( '</button>' )
                .add( '<button class="ms-page-index btn btn-default {{firstPageClass}}" title="Previous page" value="page" data-page="{{PreviousPage}}">' )
                .add( '<span class="glyphicon glyphicon-menu-left" aria-hidden="true"></span>' )
                .add( '</button>' )
                .add( '</div>' )
                .add( '<input type="number" name="page" value="{{page}}" class="form-control" style="width:75px;display:inline-block;vertical-align:middle" />' )
                .add( '<span class="page-count"> of {{pagecount}}</span>' )
                .add( '<div class="btn-group">' )
                .add( '<button class="ms-page-index btn btn-default {{lastPageClass}}" title="Next page" value="page" data-page="{{NextPage}}">' )
                .add( '<span class="glyphicon glyphicon-menu-right" aria-hidden="true"></span>' )
                .add( '</button>' )
                .add( '<button class="ms-page-index btn btn-default {{lastPageClass}}" title="Last page" value="page" data-page="{{pagecount}}">' )
                .add( '<span class="glyphicon glyphicon-triangle-right" aria-hidden="true"></span>' )
                .add( '</button>' )
                .add( '</div>' );
        }
        return gp.supplant.call( this, html.toString(), pageModel );
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'div.custom-pager' );

        assert.ok( element.length > 0, 'pagerBar can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override input', function ( assert ) {

    var done1 = assert.async();

    var hasModel = false;

    var options = gp.shallowCopy( configuration );

    options.input = function ( model ) {
        var obj = {
            type: ( model.type == 'boolean' ? 'checkbox' : ( model.type == 'number' ? 'number' : 'text' ) ),
            name: model.name,
            value: ( model.type == 'boolean' ? 'true' : ( model.type == 'date' ? gp.formatter.format( model.value, 'YYYY-MM-DD' ) : gp.escapeHTML( model.value ) ) ),
            checked: ( model.type == 'boolean' && model.value ? ' checked' : '' ),
            // Don't bother with the date input type.
            // Indicate the type using data-type attribute so a custom date picker can be used.
            // This sidesteps the problem of polyfilling browsers that don't support the date input type
            // and provides a more consistent experience across browsers.
            dataType: ( /^date/.test( model.type ) ? ' data-type="date"' : '' )
        };

        if ( model ) {
            hasModel = true;
        }

        return gp.supplant.call( this, '<input type="{{type}}" name="{{name}}" value="{{value}}" class="form-control custom-class"{{{dataType}}}{{checked}} />', obj );
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        // put one of the rows into edit mode
        var btn = api.find( 'button[value=edit]' );

        clickButton( btn );

        var element = api.find( 'input.custom-class' );

        assert.ok( element.length > 0, 'input can be overridden' );

        assert.ok( hasModel, 'model is passed to override correctly' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override formGroup', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.editmode = 'modal';

    options.formGroup = function ( model ) {
        var template = '<div class="form-group {{editclass}} custom-class"><label class="col-sm-4 control-label">{{{label}}}</label><div class="col-sm-6">{{{input}}}</div></div>';
        return gp.supplant.call( this, template, model );
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        // put one of the rows into edit mode
        var btn = api.find( 'button[value=edit]' );

        clickButton( btn );

        var element = api.find( 'div.form-group.custom-class' );

        assert.ok( element.length > 0, 'formGroup can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

        $( 'div.modal-backdrop' ).remove();

        $( '.modal-open' ).removeClass('modal-open');

    } );

} );

QUnit.test( 'override footerCellContent', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.fixedfooters = true;

    options.footerTable = function ( $injector ) {
        var html = new gp.StringBuilder();
        html.add( '<table class="table footer-table custom-class">' )
            .add( $injector.exec( 'footer' ) )
            .add( '</table>' );
        return html.toString();
    };


    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'table.footer-table.custom-class' );

        assert.ok( element.length > 0, 'footerTable can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override footerCellContent', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.footerCellContent = function ( $column, $injector ) {
        if ( $column.field == 'MakeFlag' ) {
            return '<div class="custom-class">Make Flag</div>';
        }
        else {
            return $injector.base( 'footerCellContent' );
        }
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'tfoot td div.custom-class' );

        assert.ok( element.length > 0, 'footerCellContent can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override footerCell', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.footerCell = function ( $injector ) {
        var html = new gp.StringBuilder();
        html.add( '<td class="footer-cell custom-class">' )
            .add( $injector.exec( 'footerCellContent' ) )
            .add( '</td>' );
        return html.toString();
    };


    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'tfoot td.custom-class' );

        assert.ok( element.length > 0, 'footerCell can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override footer', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.footer = function ( $columns, $injector ) {
        var self = this,
            html = new gp.StringBuilder();
        html.add( '<tfoot>' )
            .add( '<tr class="custom-class">' )
        $columns.forEach( function ( col ) {
            $injector.setResource( '$column', col );
            html.add( $injector.exec( 'footerCell' ) );
        } );
        html.add( '</tr>' )
            .add( '</tfoot>' );
        return html.toString();
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'tfoot > tr.custom-class' );

        assert.ok( element.length > 0, 'footer can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override editCellContent', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.editCellContent = function ( $column, $injector ) {
        if ( $column.field == 'MakeFlag' ) {
            return '<input type="checkbox" value="true" name="MakeFlag" class="custom-class" />'
        }
        else {
            return $injector.base( 'editCellContent' );
        }
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        // put one of the rows into edit mode
        var btn = api.find( 'button[value=edit]' );

        clickButton( btn );

        var element = api.find( 'input[type=checkbox].custom-class' );

        assert.ok( element.length > 0, 'editCellContent can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override containerClasses', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.containerClasses = function ( $config, $injector ) {
        return $injector.base( 'containerClasses' ) + ' custom-class';
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'div.table-container.custom-class' );

        assert.ok( element.length > 0, 'containerClasses can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override container', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.container = function ( $config, $injector ) {
        var html = new gp.StringBuilder();
        html.add( '<div class="gp table-container custom-class ' )
            .add( $injector.exec( 'containerClasses' ) )
            .add( '" id="' )
            .add( $config.ID )
            .add( '">' );
        if ( $config.search || $config.create || $config.toolbar ) {
            html.add( '<div class="table-toolbar">' );
            html.add( $injector.exec( 'toolbar' ) );
            html.add( '</div>' );
        }
        if ( $config.fixedheaders ) {
            html.add( '<div class="table-header">' )
                .add( '<table class="table" cellpadding="0" cellspacing="0">' )
                .add( $injector.exec( 'header' ) )
                .add( '</table>' )
                .add( '</div>' );
        }
        html.add( '<div class="table-body ' );
        if ( $config.fixedheaders ) {
            html.add( 'table-scroll' );
        }
        html.add( '">' )
            .add( '<table class="table" cellpadding="0" cellspacing="0"><tbody></tbody></table>' )
            .add( '</div>' );
        if ( $config.fixedfooters ) {
            html.add( '<div class="table-footer"></div>' );
        }
        if ( $config.pager ) {
            html.add( '<div class="table-pager"></div>' );
        }
        html.add( '<style type="text/css" class="column-width-style">' )
            .add( $injector.exec( 'columnWidthStyle' ) )
            .add( '</style>' )
            .add( '<div class="gp-progress-overlay">' )
            .add( '<div class="gp-progress gp-progress-container">' )
            .add( '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100"></div>' )
            .add( '</div>' )
            .add( '</div>' )
            .add( '</div>' );
        return html.toString();
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var element = api.find( 'div.table-container.custom-class' );

        assert.ok( element.length > 0, 'container can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'override bodyCellContent', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.bodyCellContent = function ( $column, $dataItem, $injector ) {
        if ( $column.field == 'MakeFlag' ) {
            return $dataItem.MakeFlag ? '<span class="glyphicon glyphicon-thumbs-up"></span>' : '';
        }
        else {
            return $injector.base( 'bodyCellContent' );
        }
    };

    gridponent( '#table .box', options ).ready( function ( api ) {

        var spans = api.find( 'td.body-cell span.glyphicon-thumbs-up' );

        assert.ok( spans.length > 0, 'bodyCellContent can be overridden' );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'column fields can be functions', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configuration );

    var functionCalled = false;

    options.columns.push( {
        field: function ( dataItem ) {
            functionCalled = true;
            return data.products.indexOf( dataItem );
        },
        header: 'index',
        format: '$0,0.00'
    } );

    gridponent( '#table .box', options ).ready( function ( api ) {

        var config = api.config;

        assert.ok( functionCalled, 'function was called' );

        var lastColumn = api.find( 'td.body-cell:last-child' ).first().text();

        assert.ok( /^\$\d\.00/.test(lastColumn), 'field function results can still be formatted'  );

        done1();

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'get a reference to a new dataItem via the API', function ( assert ) {

    //var done1 = assert.async();
    var done2 = assert.async();

    var options = gp.shallowCopy( configOptions );

    var api1, api2;

    options.editready = 'fns.editReady';

    fns.editReady = function ( model ) {

        // use the api to find the dataItem
        var uid = $(model.elem).attr( 'data-uid' );

        assert.ok( uid != null && uid != '' );

        var dataItem = api1.getData( uid );

        assert.ok( dataItem != null );

        // cancel it
        var cancelBtn = $( model.elem ).find( 'button[value=cancel]' );
        clickButton( cancelBtn[1] );

        dataItem = api1.getData( uid );

        assert.ok( dataItem == null );

        api1.dispose();

        $( '#table .box' ).empty();

        done1();
    };

    //getTableConfig( options, function ( api ) {

    //    api1 = api;

    //    var addBtn = api.find( '[value=AddRow]' );

    //    clickButton( addBtn[0] );

    //} );

    // now try it with a modal

    options.editmode = 'modal';
    options.editready = 'fns.editReady2';
    fns.editReady2 = function ( model ) {

        // use the api to find the dataItem
        var uid = $( model.elem ).attr( 'data-uid' );

        assert.ok( uid != null && uid != '' );

        var dataItem = api2.getData( uid );

        assert.ok( dataItem != null );

        // cancel it
        var cancelBtn = $( model.elem ).find( 'button[value=cancel]' );
        clickButton( cancelBtn[0] );

        dataItem = api2.getData( uid );

        assert.ok( dataItem == null, 'clicking cancel should remove the dataItem' );

        api2.dispose();

        $( '#table .box' ).empty();

        $( 'div.modal-backdrop' ).remove();

        $( '.modal-open' ).removeClass('modal-open');

        done2();
    };

    getTableConfig( options, function ( api ) {

        $( '#table .box' ).append( api.config.node );

        api2 = api;

        var addBtn = api.find( '[value=AddRow]' );

        clickButton( addBtn[0] );

    } );


} );

QUnit.test( 'Injector', function ( assert ) {

    var resources = {
        $config: { fixedheaders: false },
        $columns: [],
        $pageModel: { pagecount: 15 }
    };

    var injector = new gp.Injector( resources );


    // test $inject property

    var func = function ( c, p ) {
        assert.strictEqual( resources.$config, c );

        assert.strictEqual( resources.$pageModel, p );

        return c.fixedheaders;
    };

    func.$inject = ['$config', '$pageModel'];

    var result = injector.exec( func );

    assert.strictEqual( result, false );


    // test getParamNames and optional second arg

    func = function ( $pageModel, obj ) {

        assert.strictEqual( resources.$pageModel, $pageModel );

        assert.strictEqual( obj.test, true );

        return $pageModel.pagecount;
    }

    result = injector.exec( func, { test: true } );

    assert.strictEqual( result, 15 );


} );


QUnit.test( 'preload option', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.model = fns.model;

    options.preload = false;

    gridponent( '#table .box', options ).ready( function ( api ) {

        var config = api.config;

        // there should not be any rows in the table

        var rows = api.find( 'div.table-body tbody > tr' );

        assert.strictEqual( rows.length, 0, 'there should not be any rows in the table' );

        var types = config.columns.filter( function ( col ) {
            return col.Type != undefined;
        } );

        assert.ok( types.length > 0, 'there should be types in the columns' );

        // we should still be able to add a row with the API
        api.create( fns.model );

        rows = api.find( 'div.table-body tbody > tr' );

        assert.strictEqual( rows.length, 1, 'there should be one row in the table' );

        done1();

        // performing a search should trigger a read and resolve types

        api.onRead( function () {

            types = config.columns.filter( function ( col ) {
                return col.Type != undefined;
            } );

            assert.ok( types.length > 0, 'there should be types in the columns' );

            done2();

            api.dispose();

        } );

        api.search( 'Adjustable Race' );

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

QUnit.test( 'custom toolbar button', function ( assert ) {

    var done = assert.async();

    fns.customToolbarCommand = function () {
        assert.ok( true, 'custom toolbar buttons should resolve to a function' );
        done();
    }

    var options = gp.shallowCopy( configuration );

    options.toolbar = '<button class="btn" value="fns.customToolbarCommand">Custom Command</button>';

    gridponent( '#table .box', options ).ready( function ( api ) {

        var btn = api.find( 'button[value="fns.customToolbarCommand"]' );

        clickButton( btn );

        api.dispose();

        $( '#table .box' ).empty();

    } );

} );

function getInput( type, name, value ) {
    var model = {
        type: type,
        name: name,
        value: value
    };

    return gp.templates.input( model );
}

QUnit.test( 'ModelSync.bindElements', function ( assert ) {

    div.append( getInput( 'string', 'ProductID', "" ) );
    div.append( getInput( 'number', 'SafetyStockLevel', -1 ) );
    div.append( getInput( 'date', 'SellEndDate', "" ) );

    div.append( '<input type="checkbox" name="MakeFlag" value="true" />' );
    div.append( '<input type="checkbox" name="MakeFlag" value="false" />' );

    div.append( '<input type="radio" name="Color" value="red" />' );
    div.append( '<input type="radio" name="Color" value="blue" />' );
    div.append( '<input type="radio" name="Color" value="green" />' );

    div.append( '<input type="radio" name="FinishedGoodsFlag" value="true" />' );
    div.append( '<input type="radio" name="FinishedGoodsFlag" value="false" />' );

    div.append( '<textarea name="Markup"></textarea>' );

    var select = [];
    select.push( '<select name="Style">' );
    (['A', 'B', 'C']).forEach( function ( style ) {
        select.push( '<option value="' + style + '">' + style + '</option>' );
    } );
    select.push( '</select>' )
    div.append( select.join( '' ) );

    // array of values
    var checkboxList = [];
    (['MN', 'IA', 'WI', 'SD', 'ND']).forEach( function ( item ) {
        checkboxList.push( '<input name="State" type="checkbox" value="' + item + '" />' );
    } );
    div.append( checkboxList.join( '' ) );

    gp.ModelSync.bindElements( fns.model, div[0] );

    var input = div.find( '[name=ProductID]' );
    assert.equal( input.val(), '0' );

    input = div.find( '[name=MakeFlag][value=true]' );
    assert.equal( input.prop('checked'), false );

    input = div.find( '[name=MakeFlag][value=false]' );
    assert.equal( input.prop( 'checked' ), true );

    input = div.find( '[name=SafetyStockLevel]' );
    assert.equal( input.val(), '0' );

    input = div.find( '[name=Color]:checked' ).val();
    assert.equal( input, 'blue' );

    input = div.find( '[name=FinishedGoodsFlag]:checked' ).val();
    assert.equal( input, 'false' );

    input = div.find( '[name=Style]' ).val();
    assert.equal( input, 'C' );

    input = div.find( '[name=SellEndDate]' ).val();
    assert.equal( input, '' );

    input = div.find( '[name=Markup]' ).val();
    assert.equal( input, fns.model.Markup );

    input = div.find( '[name=State]:checked' );
    assert.strictEqual( input.length, 2 );
    assert.ok( input[0].value == 'MN' );
    assert.ok( input[1].value == 'WI' );

    fns.model.FinishedGoodsFlag = true;
    gp.ModelSync.bindElements( fns.model, div[0] );
    input = div.find( '[name=FinishedGoodsFlag]:checked' ).val();
    assert.equal( input, 'true' );

    div.empty();

} );

QUnit.test( 'ModelSync.serialize', function ( assert ) {

    div.append( getInput( 'boolean', 'IsSelected', true ) );

    div.append( getInput( 'number', 'Total', 123.5 ) );

    var d = new Date( 1463069066619 ); // 5/12/2016

    div.append( getInput( 'date', 'Date', d ) );

    div.append( getInput( 'datestring', 'Date2', '2016-04-03' ) );

    div.append( getInput( 'string', 'FirstName', 'Todd' ) );

    //div.append( getInput( 'radio', 'FirstName', 'Todd' ) );

    div.append( '<input type="radio" name="Color" value="red" />' );
    div.append( '<input type="radio" name="Color" value="blue" checked />' );
    div.append( '<input type="radio" name="Color" value="green" />' );

    div.append( '<input type="checkbox" name="Flavor" value="chocolate" checked />' );
    div.append( '<input type="checkbox" name="Flavor" value="vanilla" checked />' );
    div.append( '<input type="checkbox" name="Flavor" value="strawberry" />' );

    div.append( '<textarea name="Markup">some text</textarea>' );

    var obj = gp.ModelSync.serialize( div[0] );

    assert.strictEqual( obj.IsSelected, 'true' );
    assert.strictEqual( obj.Total, '123.5' );
    assert.strictEqual( obj.Date, '2016-05-12' );
    assert.strictEqual( obj.Date2, '2016-04-03' );
    assert.strictEqual( obj.FirstName, 'Todd' );
    assert.strictEqual( obj.Color, 'blue' );
    assert.strictEqual( obj.Markup, 'some text' );
    assert.strictEqual( obj.Flavor.length, 2 );
    assert.strictEqual( obj.Flavor[0], 'chocolate' );
    assert.strictEqual( obj.Flavor[1], 'vanilla' );

    // uncheck the IsSelected box
    div.find( 'input[type=checkbox]' ).prop( 'checked', false );

    var obj = gp.ModelSync.serialize( div[0] );

    assert.strictEqual( obj.IsSelected, null );

    div.empty();

} );

QUnit.test( 'Initializer.resolveCommands', function ( assert ) {

    var fn = gp.Initializer.prototype.resolveCommands;

    var config = {
        columns:[
            { commands: 'Search:fns.customSearchFunction,Edit,Delete,Filter:fns.filter:btn-primary,Add:fns.addItem:btn-primary:glyphicon-plus' }
        ]
    };

    fns.customSearchFunction = function () { };
    fns.filter = function () { };
    fns.addItem = function () { };

    fn( config );

    var col = config.columns[0];

    assert.equal( col.commands[0].text, 'Search' );
    assert.equal( col.commands[0].value, 'fns.customSearchFunction' );
    assert.equal( col.commands[0].btnClass, 'btn-default' );
    assert.equal( col.commands[0].glyphicon, 'glyphicon-cog' );
    assert.equal( col.commands[0].func, fns.customSearchFunction );

    assert.equal( col.commands[1].text, 'Edit' );
    assert.equal( col.commands[1].value, 'Edit' );
    assert.equal( col.commands[1].btnClass, 'btn-default' );
    assert.equal( col.commands[1].glyphicon, 'glyphicon-edit' );

    assert.equal( col.commands[2].text, 'Delete' );
    assert.equal( col.commands[2].value, 'Delete' );
    assert.equal( col.commands[2].btnClass, 'btn-danger' );
    assert.equal( col.commands[2].glyphicon, 'glyphicon-remove' );

    assert.equal( col.commands[3].text, 'Filter' );
    assert.equal( col.commands[3].value, 'fns.filter' );
    assert.equal( col.commands[3].btnClass, 'btn-primary' );
    assert.equal( col.commands[3].glyphicon, 'glyphicon-cog' );
    assert.equal( col.commands[3].func, fns.filter );

    assert.equal( col.commands[4].text, 'Add' );
    assert.equal( col.commands[4].value, 'fns.addItem' );
    assert.equal( col.commands[4].btnClass, 'btn-primary' );
    assert.equal( col.commands[4].glyphicon, 'glyphicon-plus' );
    assert.equal( col.commands[4].func, fns.addItem );

} );


QUnit.test( 'busy class', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.beforeread = 'fns.beforeRead';
    options.onread = 'fns.afterRead';

    fns.beforeRead = function () {
        var hasClass = $(this.config.node).hasClass( 'busy' );
        assert.equal( hasClass, true );
        done1();
    };

    fns.afterRead = function () {
        var hasClass = $( this.config.node).hasClass( 'busy' );
        assert.equal( hasClass, false );
        done2();
    };

    getTableConfig( options, function ( api ) { } );

} );

QUnit.test( 'sorting', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.paging = true;
    options.sorting = true;
    options.read = 'products/read';

    getTableConfig( options, function ( api ) {

        var lbl = api.find( 'a.table-sort' );

        clickButton( lbl );

        assert.ok( true, 'sorting works' );

        clickButton( lbl );

        assert.ok( true, 'sorting works' );

        done1();

    } );

} );

QUnit.test( 'paging', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.paging = true;
    options.editmode = 'modal';

    getTableConfig( options, function ( api ) {

        // find the ProductNumber column
        var productNumber1 = api.find( 'tr[data-uid] td.body-cell:nth-child(10)' ).html();

        var pageNumber1 = api.config.pageModel.page;

        var btn = api.find( 'button[title="Next page"]' );

        clickButton( btn );

        var productNumber2 = api.find( 'tr[data-uid] td.body-cell:nth-child(10)' ).html();

        var pageNumber2 = api.config.pageModel.page;

        assert.notStrictEqual( productNumber1, productNumber2, 'paging should change the contents of the grid to the next set' );
        assert.notStrictEqual( pageNumber1, pageNumber2, 'paging should change the contents of the grid to the next set' );


        // search
        var pageCount1 = api.find( 'span.page-count' ).html();

        api.search( '$1' );

        var pageCount2 = api.find( 'span.page-count' ).html();

        assert.notStrictEqual( pageCount1, pageCount2, 'searching should change the page count' );


        api.dispose();

        $( '#table .box' ).empty();

        $( 'div.modal-backdrop' ).remove();

        $( '.modal-open' ).removeClass('modal-open');

        done1();

    } );

} );


QUnit.test( 'model', function ( assert ) {

    var done = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.model = 'fns.model';

    getTableConfig( options, function ( api ) {

        var config = api.config;

        assert.equal( config.columns[1].Type, 'string' );
        assert.equal( config.columns[2].Type, 'boolean' );
        assert.equal( config.columns[4].Type, 'number' );
        assert.equal( config.columns[5].Type, 'datestring' );

        done();

    } );

} );

function getInjector( config ) {
    return new gp.Injector( {
        $config: config,
        $columns: config.columns,
        $node: config.node,
        $pageModel: config.pageModel,
        $map: config.map,
        $data: config.pageModel.data
    }, gp.templates ); // specify gp.templates object as root
}

QUnit.test( 'ModalEditor', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();
    var done3 = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.editmode = 'modal';

    getTableConfig( options, function ( api ) {

        var config = api.config;

        var injector = getInjector( config );

        var editor = new gp.ModalEditor( config, api.controller.model, injector );

        var model = editor.add();

        assert.ok( model != null, 'add should return a model' );
        assert.ok( model.dataItem != null, 'model should contain the new data row' );
        assert.ok( model.elem != null, 'model should contain the modal' );

        editor.cancel();

        var dataItem = api.getData()[0];

        model = editor.edit( dataItem );

        assert.ok( model != null, 'edit should return a model' );
        assert.ok( model.dataItem != null, 'model should contain the new data row' );
        assert.ok( model.elem != null, 'model should contain the modal' );

        editor.cancel();

        editor.add();

        editor.save( function ( updateModel ) {

            assert.ok( updateModel != null, 'save should return an updateModel' );
            assert.ok( updateModel.dataItem != null, 'model should contain the new data row' );

            done1();
        } );

        editor.edit( dataItem );

        editor.save( function ( updateModel ) {

            assert.ok( updateModel != null, 'save should return an updateModel' );
            assert.ok( updateModel.dataItem != null, 'model should contain the new data row' );

            done2();
        } );

        // validation

        // mock an updateModel with validation errors
        var updateModel = {
            dataItem: dataItem,
            errors: getValidationErrors(),
            originalItem: dataItem
        };

        editor.validate( updateModel );

        assert.ok( true, 'validate should not throw errors' );

        // not try it with a custom validate function

        config.validate = function ( elem, updateModel ) {

            assert.ok( elem != null, 'elem should be the modal' );
            assert.ok( updateModel != null, 'validate should return an updateModel' );

            api.dispose();

            $( '#table .box' ).empty();

            $( 'div.modal-backdrop' ).remove();

            $( '.modal-open' ).removeClass('modal-open');

            done3();

        };

        editor.validate( updateModel );

    } );

} );

QUnit.test( 'modal edit', function ( assert ) {

    var done = assert.async();

    var options = gp.shallowCopy( configuration );

    options.editmode = 'modal';

    getTableConfig( options, function ( api ) {

        assert.ok( true, 'read can be a template' )

        api.dispose();

        $( '#table .box' ).empty();

        $( 'div.modal-backdrop' ).remove();

        $( '.modal-open' ).removeClass('modal-open');

        done();

    } );

} );

QUnit.test( 'templates.input', function ( assert ) {

    var input = getInput( 'boolean', 'IsSelected', false );

    assert.equal( input, '<input type="checkbox" name="IsSelected" value="true" class="form-control" />' );

    input = getInput( 'boolean', 'IsSelected', true );

    assert.equal( input, '<input type="checkbox" name="IsSelected" value="true" class="form-control" checked />' );

    input = getInput( 'number', 'Total', 123.5 );

    assert.equal( input, '<input type="number" name="Total" value="123.5" class="form-control" />' );

    var d = new Date();
    var s = moment( d ).format( 'YYYY-MM-DD' );

    input = getInput( 'date', 'Date', d );

    assert.equal( input, '<input type="text" name="Date" value="' + s + '" class="form-control" data-type="date" />' );

    input = getInput( 'datestring', 'Date', '2016-04-03' );

    assert.equal( input, '<input type="text" name="Date" value="2016-04-03" class="form-control" data-type="date" />' );

    input = getInput( 'string', 'FirstName', 'Todd' );

    assert.equal( input, '<input type="text" name="FirstName" value="Todd" class="form-control" />' );
} );

//QUnit.test( 'camelize', function ( assert ) {

//    var dict = {
//        updateModel: 'updateModel',
//        'header-template': 'headerTemplate',
//        ALLCAPS: 'allcaps',
//        TableRow: 'tableRow',
//    };

//    Object.getOwnPropertyNames( dict ).forEach( function ( prop ) {

//        assert.equal( gp.camelize( prop ), dict[prop] );

//    } );

//} );


QUnit.test( 'options', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();

    var options = gp.shallowCopy( configuration );

    options.editmode = 'modal';

    options.toolbar = function ( arg ) {

        done1();

        return '<button value="customtoolbarbutton">Custom Toolbar Button</button>';

    };

    options.columns[0].headertemplate = function () {
        return '<span class="custom-header">custom header</span>';
    };
    options.columns[0].bodytemplate = function () {
        return '<span class="body-template">custom body template</span>'
    };
    options.columns[0].edittemplate = function () {
        return '<span class="custom-edit-template">custom edit template</span>'
    };
    options.columns[0].footertemplate = function () {
        return '<span class="custom-footer">custom footer</span>'
    };
    options.columns[4].headertemplate = function () {
        return '<span class="header-template">custom header</span>'
    };

    gridponent( '#div1', options ).ready( function ( api ) {

        $( '#table .box' ).append( api.config.node );

        var config = api.config;

        assert.ok( true, 'initialization with JSON works' );

        // find the toolbar button 

        var btn = api.find( 'button[value=customtoolbarbutton]' );

        assert.ok( btn != null, 'should be able to use a function as the toolbar template' );

        var span = api.find( 'span.custom-header' );

        assert.ok( span != null, 'should be able to use a function as a custom header template' );

        span = api.find( 'span.body-template' );

        assert.ok( span != null, 'should be able to use a function as a body template' );

        span = api.find( 'span.custom-footer' );

        assert.ok( span != null, 'should be able to use a function as a custom footer template' );

        // put one of the rows into edit mode
        var btn = api.find( 'button[value=edit]' );

        clickButton( btn );

        span = api.find( 'span.custom-edit-template' );

        assert.ok( span != null, 'should be able to use a function as a custom edit template' );

        span = api.find( 'span.header-template' );

        assert.ok( span != null, 'should be able to use a function as a custom header template inside a modal' );

        btn = api.find( 'button[value=cancel]' );

        clickButton( btn );

        btn = api.find( 'button[value=View]' );

        fns.viewed = false;

        assert.ok( btn != null, 'should find custom commands' );

        clickButton( btn );

        assert.strictEqual( fns.viewed, true );

        api.dispose();

        $( '#table .box' ).empty();

        $( 'div.modal-backdrop' ).remove();

        $( '.modal-open' ).removeClass('modal-open');

        done2();
    } );

} );

QUnit.test( 'read', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();
    var done3 = assert.async();
    var done4 = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.read = '/Products/read?page={{page}}';

    getTableConfig( options, function ( api ) {

        assert.ok( true, 'read can be a template' )

        done1();

    } );



    // read with a function

    fns.read = function ( model, callback ) {
        callback( data.products );
        assert.ok( true, 'read can be a function' )
        done2();
    };

    options.read = 'fns.read';

    getTableConfig( options, function ( api ) { } );


    // read with an array
    options.read = 'data.products';

    getTableConfig( options, function ( api ) {

        assert.ok( true, 'read can be an array' )

        done3();

    } );

    // read as a PagingModel
    var options = gp.shallowCopy( configuration );

    options.read = new gp.PagingModel( data.products );

    options.read.search = 'AR-';

    gridponent( '#table .box', options ).ready( function ( api ) {

        assert.ok( true, 'can be a PagingModel' );

        var cell = api.find( '.table-body tr:last-child td:nth-child(10)' );

        assert.ok( cell != null, 'should find a table cell' );

        var text = $( cell ).text();

        assert.equal( text.substr(0, 3), 'AR-', 'should have filtered the table' );

        api.dispose();

        $( '#table .box' ).empty();

        done4();

    } );

} );

QUnit.test( 'commandHandler', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configOptions );

    fns.rowSelected = function ( dataItem ) {
        assert.ok( false, 'clicking a button in the table should not trigger row selection' );
    };

    options.rowselected = 'fns.rowSelected';

    getTableConfig( options, function ( api ) {

        $( '#table .box' ).empty().append(api.$n);

        var config = api.config;

        var controller = api.controller;

        var addBtn = api.find( '[value=AddRow]' );

        clickButton( addBtn[0] );

        var editRow = api.find( 'tr.create-mode' );

        editRow.find( 'input[name=ProductNumber]' ).val( 'removethisrow' );

        assert.ok( editRow.length > 0, 'clicking the addrow button should create a tr in create mode' );

        // save it
        var createBtn = editRow.find( '[value=create]' );

        clickButton( createBtn[0] );


        // add another row
        clickButton( addBtn[0] );

        editRow = api.find( 'tr.create-mode' );

        assert.ok( editRow.length > 0, 'clicking the addrow button should create a tr in create mode' );

        // cancel it
        var cancelBtn = editRow.find( '[value=cancel]' );

        clickButton( cancelBtn[0] );

        editRow = api.find( 'tr.create-mode' );

        assert.ok( editRow.length == 0, 'clicking cancel should remove the dataItem' );

        // delete the row we created
        var destroyBtn = api.find( '[value=destroy],[value=delete],[value=Delete]' )

        clickButton( destroyBtn[0] );

        // perform a search

        var searchBox = api.find( '[name=search]' ).val('AR-5381');

        var searchBtn = api.find( '[value=search]' );

        clickButton( searchBtn[0] );

        //var deletedRow = data.products.filter( function ( row ) {
        //    return row.ProductNumber == 'removethisrow';
        //} );

        //assert.ok( deletedRow.length == 0, 'clicking delete should remove the row' );

        done1();

    } );

} );

QUnit.test( 'handleEnterKey', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configOptions );

    getTableConfig( options, function ( api ) {

        var config = api.config;

        var controller = config.node.api.controller;

        var evt = {
            keyCode: 13,
            target: {
                blur: function () {

                    assert.ok( true, 'change monitor should call blur on enter key' );

                    done1();
                }
            }
        };

        controller.toolbarEnterKeyHandler( evt );

    } );

} );

QUnit.test( 'toolbarChangeHandler', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configOptions );

    getTableConfig( options, function ( api ) {

        var controller = api.controller;

        var evt = {
            target: {
                value: '1000',
                name: 'search'
            },
        };

        api.controller.toolbarChangeHandler( evt );

        assert.equal( api.config.pageModel.search, '1000' );

        evt.target.value = '2';
        evt.target.name = 'page';

        api.controller.toolbarChangeHandler( evt );

        assert.equal( api.config.pageModel.page, 2 );

        done1();

    } );

} );

QUnit.test( 'api.getTableRow', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configOptions );

    getTableConfig( options, function ( api ) {

        var dataItem = data.products[0];

        var tr = api.getTableRow( dataItem );

        assert.ok( tr != null, 'getTableRow should find a table dataItem for a data dataItem' );

        done1();

    } );

} );

QUnit.test( 'gp.ClientPager', function ( assert ) {

    var done = assert.async();

    getTableConfig( null, function ( api ) {

        var config = api.config;

        var pager = new gp.ClientPager( config );

        pager.data = data.products;

        var model = new gp.PagingModel();

        // turn paging off
        model.top = -1;

        pager.read( model, function ( response ) {
            assert.ok( response != null );
            assert.equal( response.data.length, data.products.length, 'should return all rows' );
        } );

        // turn paging on
        model.top = 10;

        pager.read( model, function ( response ) {
            assert.equal( response.data.length, 10, 'should return a subset of rows' );
        } );

        model.search = 'BA-8327';

        pager.read( model, function ( response ) {
            assert.equal( response.data.length, 1, 'should return a single dataItem' );
        } );

        model.search = null;

        model.sort = 'MakeFlag';

        pager.read( model, function ( response ) {
            assert.equal( response.data[0].MakeFlag, false, 'ascending sort should put false values at the top' );
        } );

        model.desc = true;

        pager.read( model, function ( response ) {
            assert.equal( response.data[0].MakeFlag, true, 'descending sort should put true values at the top' );
        } );

        // descending string sort 
        model.sort = 'Color';
        model.top = -1;

        model.desc = true;

        pager.read( model, function ( response ) {
            assert.ok( gp.hasValue( response.data[0].Color ), 'descending string sort should put non-null values at the top ' );
            assert.ok( response.data[response.data.length - 1].Color == null, 'descending string sort should put null values at the bottom ' );
        } );

        // ascending string sort
        model.desc = false;

        pager.read( model, function ( response ) {
            assert.ok( response.data[0].Color == null, 'ascending string sort should put null values at the top ' );
            assert.ok( response.data[response.data.length - 1].Color != null, 'ascending string sort should put non-null values at the bottom ' );
        } );

        // page range checks
        model.top = 25;
        model.page = 0;

        pager.getSkip( model );

        assert.equal( model.page, 1, 'getSkip should correct values outside of the page range' );

        model.page = model.pagecount + 1;
        pager.getSkip( model );

        assert.equal( model.page, model.pagecount, 'getSkip should correct values outside of the page range' );

        done();

    } );

} );

QUnit.test( 'toolbar', function ( assert ) {

    var done = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.toolbar = true;

    getTableConfig( options, function ( api ) {

        var config = api.config;

        var btn = $( config.node ).find( 'div.table-toolbar button[value=xyz]' );

        assert.equal( btn.length, 1, 'should create a custom toolbar' );

        done();

    } );

} );

QUnit.test( 'api.search', function ( assert ) {

    var done = assert.async();

    getTableConfig( null, function ( api ) {

        var config = api.config;

        config.node.api.search( 'Bearing' );

        // take note of the content of the column before sorting
        var rows = config.node.querySelectorAll( 'div.table-body tbody tr' );

        assert.strictEqual( rows.length, 3, 'Should yield 3 rows' );

        done();

    } );

} );

QUnit.test( 'api.refresh', function ( assert ) {

    var done = assert.async();

    getTableConfig( configOptions, function ( api ) {

        var config = api.config;

        var firstRow = data.products[0];

        data.products.splice( 0, 1 );

        config.node.api.refresh( function () {
            // firstRow should be gone

            var productNumber = $( config.node ).find( 'tr[data-uid]:first-child > td.body-cell:nth-child(10)' ).text();

            assert.equal( productNumber, data.products[0].ProductNumber, 'product number should equal the second dataItem in the table' );

            data.products.push( firstRow );

            done();

        } );

    } );

} );

QUnit.test( 'supplant', function ( assert ) {

    var template = 'http://products/{{ProductID}}?MakeFlag={{MakeFlag}}&Color={{Color}}';

    var dataItem = { "ProductID": 1, "Name": "Adjustable Race", "ProductNumber": "AR-5381", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": null, "SafetyStockLevel": 1000, "ReorderPoint": 750, "StandardCost": 0.0000, "ListPrice": 0.0000, "Size": null, "SizeUnitMeasureCode": null, "WeightUnitMeasureCode": null, "Weight": null, "DaysToManufacture": 0, "ProductLine": null, "Class": null, "Style": null, "ProductSubcategoryID": null, "ProductModelID": null, "SellStartDate": "2002-06-01T00:00:00", "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "694215b7-08f7-4c0d-acb1-d734ba44c0c8", "ModifiedDate": "2008-03-11T10:01:36.827", "Markup": "<p>Product's name: \"Adjustable Race\"</p>" };

    var result = gp.supplant( template, dataItem );

    assert.equal( result, 'http://products/1?MakeFlag=false&Color=' );

    var obj = {
        apos: "I've got an apostrophe",
        quot: '"I have a dream!"',
        html: '<button value="save">Save</button>',
        amp: 'You & me'
    };

    // apos
    template = '<div class="the-class">{{apos}}</div>';
    result = gp.supplant( template, obj );
    assert.equal( result, '<div class="the-class">I&apos;ve got an apostrophe</div>' );


    // quot
    template = '<div class="the-class">{{quot}}</div>';
    result = gp.supplant( template, obj );
    assert.equal( result, '<div class="the-class">&quot;I have a dream!&quot;</div>' );


    // html
    template = '<div class="the-class">{{{html}}}</div>';
    result = gp.supplant( template, obj );
    assert.equal( result, '<div class="the-class"><button value="save">Save</button></div>' );


    // amp
    template = '<div class="the-class">{{amp}}</div>';
    result = gp.supplant( template, obj );
    assert.equal( result, '<div class="the-class">You &amp; me</div>' );

} );

QUnit.test( 'getDefaultValue', function ( assert ) {

    var type = gp.getType( 5 );

    var defaultVal = gp.getDefaultValue( type );

    assert.strictEqual( defaultVal, 0 );

    type = gp.getType( new Date() );

    defaultVal = gp.getDefaultValue( type );

    assert.strictEqual( defaultVal, null );


    type = gp.getType( '2016-04-05' );

    defaultVal = gp.getDefaultValue( type );

    assert.strictEqual( defaultVal, null );


    type = gp.getType( true );

    defaultVal = gp.getDefaultValue( type );

    assert.strictEqual( defaultVal, false );

} );

QUnit.test( 'refresh-event', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.refreshevent = 'data-changed';
    options.onread = 'fns.onread';

    var reads = 0;

    var refreshevent = new CustomEvent( options.refreshevent, { detail: 'test', bubbles: true } );

    fns.onread = function () {
        var config = this.config;
        reads++;

        // trigger the refresh event after the grid fully initializes
        if ( reads == 1 ) {
            document.dispatchEvent( refreshevent );
        }
        else {

            assert.ok( true, 'triggering the refresh event should cause the grid to read' );
            // remove the event handler
            config.node.api.controller.removeRefreshEventHandler( config );
            done1();
            $( '#table .box' ).empty();
        }
    };

    getTableConfig( options, function ( api ) {} );

} );

QUnit.test( 'api.create 1', function ( assert ) {

    var done = assert.async();

    var dataItem = { "ProductID": 0, "Name": "test", "ProductNumber": "", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": null, "SafetyStockLevel": 0, "ReorderPoint": 0, "StandardCost": 0.0000, "ListPrice": 0.0000, "Size": null, "SizeUnitMeasureCode": null, "WeightUnitMeasureCode": null, "Weight": null, "DaysToManufacture": 0, "ProductLine": null, "Class": null, "Style": null, "ProductSubcategoryID": null, "ProductModelID": null, "SellStartDate": new Date(), "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "694215b7-70dd-4c0d-acb1-d734ba44c0c8", "ModifiedDate": null, "Markup": "" };

    getTableConfig( configOptions, function ( api ) {

        $( '#table .box' ).append( api.config.node );

        var config = api.config;

        var cellCount1 = config.node.querySelectorAll( 'div.table-body tbody > tr:nth-child(1) td.body-cell' ).length;

        api.create( dataItem );

        var cellCount2 = config.node.querySelectorAll( 'div.table-body tbody > tr:nth-child(1) td.body-cell' ).length;
        assert.strictEqual( cellCount1, cellCount2, 'should create the same number of cells' );
        api.dispose();
        done();

    } );

} );

//QUnit.test( 'api.create 2', function ( assert ) {

//    var done = assert.async();

//    getTableConfig( configOptions, function ( api ) {

//        api.create( null, function ( updateModel ) {
//            assert.ok( updateModel.dataItem != null, 'calling api.create with no dataItem should create a default one' );

//            api.dispose();
//            done();
//        } );

//    } );

//} );

//QUnit.test( 'api.create 3', function ( assert ) {

//    var done = assert.async();

//    var options = gp.shallowCopy( configOptions );
//    options.create = null;

//    getTableConfig( options, function ( api ) {

//        api.create( null, function ( updateModel ) {
//            assert.ok( updateModel == null, 'calling api.create with no create configuration should return null' );
//            api.dispose();
//            done();
//        } );

//    } );

//} );

QUnit.test( 'api.ready', function ( assert ) {

    var done = assert.async();

    getTableConfig( configOptions, function ( api ) {

        api.ready( function () {

            api.ready( function () {

                assert.ok( true, 'calls to api.ready should execute even if ready state has already occurred' );

                done();

            } );

        } );

    } );

} );

//QUnit.test( 'api.update', function ( assert ) {

//    var done1 = assert.async();
//    var done2 = assert.async();
//    var done3 = assert.async();

//    // this would be called instead of posting the dataItem to a URL
//    updateFn = function ( dataItem, callback ) {
//        // simulate some validation errors
//        var updateModel = new gp.UpdateModel( dataItem );
//        updateModel.errors = getValidationErrors();
//        callback( updateModel );
//    };

//    showValidationErrors = function ( tr, updateModel ) {
//        // find the input
//        updateModel.errors.forEach( function ( v ) {
//            var input = tr.querySelector( '[name="' + v.Key + '"]' );
//            if ( input ) {
//                // extract the error message
//                var msg = v.Value.errors.map( function ( e ) { return e.ErrorMessage; } ).join( '<br/>' );
//                gp.addClass( input, 'input-validation-error' );
//                $( input ).tooltip( {
//                    html: true,
//                    placement: 'top',
//                    title: msg
//                } );
//            }
//        } );
//    };

//    var options = gp.shallowCopy( configOptions );

//    options.update = 'updateFn';
//    options.validate = 'showValidationErrors';

//    getTableConfig( options, function ( api ) {

//        var dataItem = api.getData()[0];

//        dataItem.Name = 'test';

//        api.update( dataItem, function ( updateModel ) {
//            assert.strictEqual( updateModel.dataItem.Name, 'test', 'update should support functions' );
//            api.dispose();
//            done1();
//        } );

//    } );

//    // now try it with a URL
//    options.update = '/Products/update';


//    getTableConfig( options, function ( api ) {

//        var dataItem = api.getData()[0];

//        api.update( dataItem, function ( updateModel ) {
//            assert.strictEqual( updateModel.dataItem.Name, 'test', 'update should support functions that use a URL' );
//            api.dispose();
//            done2();
//        } );

//    } );

//    // now try it with a null update setting
//    options.update = null;

//    getTableConfig( options, function ( api ) {

//        var dataItem = api.getData()[0];

//        api.update( dataItem, function ( updateModel ) {
//            assert.ok( updateModel == undefined, 'empty update setting should execute the callback with no arguments' );
//            api.dispose();
//            done3();
//        } );

//    } );


//} );

QUnit.test( 'api.sort', function ( assert ) {

    var options = gp.shallowCopy( configOptions );

    options.sorting = false;

    var done = assert.async();

    getTableConfig( options, function ( api ) {

        var config = api.config;

        $( '#table .box' ).append( config.node );

        // since sorting is false, we should have only a couple columns where sorting is enabled
        // iterate through the columns to find an explicit sort configuration
        config.columns.forEach( function ( col, index ) {

            var sortAttribute = $( config.node ).find( 'thead th[data-sort]:nth-child(' + ( index + 1 ) + ')' ).attr( 'data-sort' );

            if ( col.sort ) {
                assert.strictEqual( sortAttribute, col.sort, 'there should be a sort header' );
            }
            else {
                assert.strictEqual( sortAttribute, '', 'there should NOT be a sort header' );
            }

        } );


        // trigger an initial sort to make sure this column is sorted 
        config.node.api.sort( 'Name', false );

        // take note of the content of the column before sorting
        var content1 = api.find( 'tr[data-uid]:first-child td:nth-child(2)' ).html();

        // trigger another sort
        config.node.api.sort( 'Name', true );

        // take note of the content of the column after sorting
        var content2 = api.find( 'tr[data-uid]:first-child td:nth-child(2)' ).html();

        assert.notStrictEqual( content1, content2, 'sorting should change the order' );

        config.node.api.sort( 'Name', false );

        // take note of the content of the column after sorting
        content2 = api.find( 'tr[data-uid]:first-child td:nth-child(2)' ).html();

        assert.strictEqual( content1, content2, 'sorting again should change it back' );

        done();

    } );

} );

QUnit.test( 'api.read', function ( assert ) {

    var options = gp.shallowCopy( configOptions );
    options.paging = true;
    var done = assert.async();

    getTableConfig( options, function ( api ) {

        var requestModel = new gp.PagingModel();
        requestModel.top = 25;
        requestModel.page = 2;

        api.read( requestModel, function ( model ) {
            assert.strictEqual( model.page, 2, 'should be able to set the page' );
            done();
        } );

    } );

} );

QUnit.test( 'api.destroy', function ( assert ) {

    var options = gp.shallowCopy( configOptions );
    var done1 = assert.async();

    getTableConfig( options, function ( api ) {

        var dataItem = api.getData()[0];

        api.destroy( dataItem, function ( dataItem ) {
            var index = api.getData().indexOf( dataItem );
            assert.strictEqual( index, -1, 'destroy should remove the dataItem' );
            done1();
        } );

    } );

    // test it with a function
    fns = fns || {};
    fns.destroy = function ( dataItem, callback ) {
        var index = data.products.indexOf( dataItem );
        data.products.splice( index, 1 );
        callback( {
            Success: true,
            Message: null
        } );
    };

    options = gp.shallowCopy( configOptions );
    options.destroy = 'fns.destroy';
    var done2 = assert.async();

    getTableConfig( options, function ( api ) {

        dataItem = api.getData()[0];

        api.destroy( dataItem, function ( dataItem ) {
            var index = api.getData().indexOf( dataItem );
            assert.strictEqual( index, -1, 'destroy should remove the dataItem' );
            done2();
        } );

    } );

    // now try it with a null destroy setting
    options = gp.shallowCopy( configOptions );
    options.destroy = null;
    var done3 = assert.async();

    getTableConfig( options, function ( api ) {

        dataItem = api.getData()[0];

        api.destroy( dataItem, function ( response ) {
            var index = api.getData().indexOf( dataItem );
            assert.ok( index > -1, 'destroy should do nothing' );
            done3();
        } );

    } );

} );

QUnit.test( 'pageModel.desc', function ( assert ) {

    var done = assert.async();

    getTableConfig( configOptions, function ( api ) {

        var config = api.config;

        // set one of the radio buttons a couple of times
        var sortInput = api.find( 'a.table-sort' );

        clickButton( sortInput );

        assert.equal( config.pageModel.desc, false );

        // Need a fresh reference to the input or the second change event won't do anything.
        // This happens when thead is inside div.table-body (no fixed headers) because thead gets rendered again.
        sortInput = api.find( 'a.table-sort' );

        clickButton( sortInput );

        assert.equal( config.pageModel.desc, true );

        done();

    } );

} );

//QUnit.test( 'custom command', function ( assert ) {

//    var done1 = assert.async();

//    var options = gp.shallowCopy( configOptions );

//    fns.Assert = function ( dataItem, tr ) {
//        assert.ok( true, 'custom commands work' );
//        done1();
//    };

//    options.customCommand = 'does not exist';

//    getTableConfig( options, function ( api ) {

//        api.ready( function () {

//            var btn = api.find( 'button[value="does not exist"]' );

//            $( btn ).click();

//        } );

//    } );


//    options.customCommand = 'fns.Assert';

//    getTableConfig( options, function ( api ) {

//        var btn = api.find( 'button[value="fns.Assert"]' );

//        $( btn ).click();


//    } );

//} );


QUnit.test( 'events.rowselected', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.rowselected = 'rowselected';

    rowselected = function () {
        assert.ok( true, 'row selection works' );
        done1();
    };

    rowselected2 = function () {
        assert.ok( true, 'post init row selection works' );
        done2();
    };

    getTableConfig( options, function ( api ) {

        var config = api.config;

        api.rowSelected( rowselected2 );

        assert.equal( config.rowselected, rowselected, 'rowselected can be a function' );

        var btn = api.find( 'td.body-cell' );

        clickButton( btn[0] );

    } );

} );

QUnit.test( 'events.rowselected 2', function ( assert ) {

    var done = assert.async();

    var options = gp.shallowCopy( configOptions );

    rowselected = function () {
        assert.ok( true, 'Row selection can be added after the grid is initialized' );
        done();
    };

    getTableConfig( options, function ( api ) {

        var config = api.config;

        var selectable = api.find( '.selectable' );

        assert.equal( selectable.length, 0 );

        api.rowSelected( rowselected );

        selectable = api.find( '.selectable' );

        assert.equal( selectable.length, 1 );

        var btn = api.find( 'td.body-cell' );

        clickButton( btn );

    } );

} );

QUnit.test( 'gp.getAttributes', function ( assert ) {

    var elem = $( '<tp-custom-element bool="true" number="1" string="my string" novalue></tp-custom-element>' );

    var config = gp.getAttributes( elem[0] );

    assert.equal( config.bool, true, "should resolve bools" );

    assert.equal( config.number, '1', 'should not resolve numbers' );

    assert.equal( config.string, 'my string', 'should resolve strings' );

    assert.equal( config.novalue, true, 'empty values should be resolve to true' );
} );

QUnit.test( 'gp.coalesce', function ( assert ) {

    assert.equal( gp.coalesce( [null, undefined] ), undefined );

    assert.equal( gp.coalesce( [null, undefined, false] ), false );

    assert.equal( gp.coalesce( [null, undefined, ''] ), '' );

    assert.equal( gp.coalesce( [null, '', undefined] ), '' );

    assert.equal( gp.coalesce( [0, '', undefined] ), 0 );

    assert.equal( gp.coalesce( null ), null );

    var emptyArray = [];

    assert.equal( gp.coalesce( emptyArray ), emptyArray );
} );

QUnit.test( 'gp.error', function ( assert ) {

    var errored = false;

    try {
        gp.error( 'this is an error' );
    }
    catch ( ex ) {
        errored = true;
    }
    assert.strictEqual( errored, false, 'gp.error should not throw an exception' );

} );

QUnit.test( 'CustomEvent', function ( assert ) {

    var done = assert.async();

    document.addEventListener( 'myCustomEvent', function ( evt ) {
        assert.ok( evt.detail != null );
        done();
    } );

    var myCustomEvent = new CustomEvent( 'myCustomEvent', { detail: 'test', bubbles: true } );

    div[0].dispatchEvent( myCustomEvent );

} );

QUnit.test( 'gp.getType', function ( assert ) {
    var notDefined = gp.getType( notDefined );
    assert.equal( gp.getType( true ), 'boolean' );
    assert.equal( gp.getType( null ), null );
    assert.equal( gp.getType( new Date() ), 'date' );
    assert.equal( gp.getType( '2015-11-24' ), 'datestring' );
    assert.equal( gp.getType( '2015-31-24' ), 'string' );
    assert.equal( notDefined, undefined );
    assert.equal( gp.getType( 3.0 ), 'number' );
    assert.equal( gp.getType( {} ), 'object' );
    assert.equal( gp.getType( [] ), 'array' );
} );

QUnit.test( 'gp.getObjectAtPath', function ( assert ) {

    window.indexer = 'search';

    window.testobj = {
        array: [true, false],
        num: 1,
        obj: {
            str: 'false',
            array: [0, false, '']
        },
        search: 'search'
    };

    var val = gp.getObjectAtPath( 'window.location.search' );
    assert.equal( val, window.location.search );

    val = gp.getObjectAtPath( 'window.location.search[0]' );
    assert.equal( val, window.location.search[0] );

    val = gp.getObjectAtPath( 'window.location["search"]' );
    assert.equal( val, window.location.search );

    val = gp.getObjectAtPath( 'window.location["search"][0]' );
    assert.equal( val, window.location.search[0] );

    //val = gp.getObjectAtPath( 'testobj[indexer]' );
    //assert.equal( val, window.testobj.search );

    val = gp.getObjectAtPath( 'testobj.array[1]' );
    assert.equal( val, window.testobj.array[1] );

    val = gp.getObjectAtPath( 'testobj["search"]' );
    assert.equal( val, window.testobj.search );

    val = gp.getObjectAtPath( 'testobj["num"]' );
    assert.equal( val, 1 );

    val = gp.getObjectAtPath( 'testobj["search"][0]' );
    assert.equal( val, window.testobj.search[0] );

    //val = gp.getObjectAtPath( 'testobj[indexer]' );
    //assert.equal( val, window.testobj.search );

} );

//QUnit.test( 'gp.PagingModel', function ( assert ) {

//    var rm = new gp.PagingModel();

//    assert.equal( rm.pagecount, 0 );

//    assert.equal( rm.skip, 0 );

//    rm.data = data.products;

//    rm.totalrows = data.products.length;

//    assert.equal( rm.pagecount, 1 );

//    assert.equal( rm.skip, 0 );

//    rm.top = 25;

//    assert.equal( rm.pagecount, Math.ceil( data.products.length / 25 ) );

//    assert.equal( rm.skip, 0 );

//    rm.page = 3;

//    assert.equal( rm.skip, 50 );
//} );


QUnit.test( 'gp.DataLayer', function ( assert ) {

    var done1 = assert.async(),
        done2 = assert.async(),
        done3 = assert.async(),
        done4 = assert.async(),
        done5 = assert.async(),
        done6 = assert.async(),
        done7 = assert.async(),
        done8 = assert.async(),
        done9 = assert.async(),
        //done10 = assert.async(),
        done11 = assert.async(),
        done12 = assert.async(),
        done13 = assert.async();

    getTableConfig( null, function ( api ) {

        var config = api.config;

        var model = new gp.DataLayer( config );

        var request = new gp.PagingModel();

        model.read( request, function ( response ) {
            assert.equal( response.data.length, data.products.length, 'should return all rows' );
            done1();
        } );

        // turn paging on
        request.top = 10;

        model.read( request, function ( response ) {
            assert.equal( response.data.length, 10, 'should return a subset of rows' );
            done2();
        } );

        request.search = data.products[1].ProductNumber;

        model.read( request, function ( response ) {
            assert.equal( response.data.length, 1, 'should return a single dataItem' );
            done3();
        } );

        request.search = null;

        request.sort = 'MakeFlag';

        model.read( request, function ( response ) {
            assert.equal( response.data[0].MakeFlag, false, 'ascending sort should put false values at the top' );
            done4();
        } );

        request.desc = true;

        model.read( request, function ( response ) {
            assert.equal( response.data[0].MakeFlag, true, 'descending sort should put true values at the top' );
            done5();
        } );


        // test read as function
        // the read function can use a callback
        // or return an array or PagingModel object

        // test function with callback

        config.read = function ( m, callback ) {
            assert.ok( true, 'calling read should execute this function' );
            callback();
            done6();
        };

        // create a new model
        model = new gp.DataLayer( config );

        model.read( request, function ( response ) {
            assert.ok( true, 'calling read should execute this function' );
            done7();
        } );


        config.read = function ( m ) {
            return data.products;
        };

        model = new gp.DataLayer( config );

        model.read( request, function ( response ) {
            assert.ok( true, 'calling read should execute this function' );
            done8();
        } );

        // test function with object return value

        config.read = function ( m ) {
            return new gp.PagingModel( data.products );
        };

        model = new gp.DataLayer( config );

        model.read( request, function ( response ) {
            assert.ok( true, 'calling read should execute this function' );
            done9();
        } );

        //// test function with unsupported return value

        //config.read = function ( m ) {
        //    return false;
        //};

        //model = new gp.DataLayer( config );

        //model.read( request, function ( response ) {
        //    assert.ok( false, 'calling read should NOT execute this function' );
        //    done10();
        //},
        //function ( response ) {
        //    assert.ok( true, 'calling read should execute this function' );
        //    done10();
        //} );



        // test read as url

        config.read = '/Products/read';

        model = new gp.DataLayer( config );

        request = new gp.PagingModel();

        request.search = data.products[2].ProductNumber;

        model.read( request, function ( response ) {
            assert.equal( response.data.length, 1, 'should return a single record' );
            done11();
        } );


        // update
        var dataItem = data.products[0];
        dataItem.Name = 'Test';

        model.update( dataItem, function ( updateModel ) {
            assert.equal( updateModel.dataItem.Name, 'Test', 'should return the updated record' );
            done12();
        } );


        // destroy
        request = data.products[0];
        model = new gp.DataLayer( config );

        model.destroy( request, function ( response ) {
            assert.equal( response.Success, true, 'destroy should return true if the record was found and deleted' );
            done13();
        } );

    } );

} );

QUnit.test( 'gp.Table.getConfig', function ( assert ) {

    var done1 = assert.async(),
        done2 = assert.async(),
        done3 = assert.async(),
        done4 = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.fixedheaders = true;
    options.sorting = true;

    getTableConfig( options, function ( api ) {

        var config = api.config;

        assert.equal( config.sorting, true );

        assert.equal( config.fixedheaders, true );

        assert.equal( config.sorting, true );

        assert.equal( config.columns.length, 11 );

        assert.equal( config.columns[1].header, 'ID' );

        done1();

    } );



    var options = gp.shallowCopy( configOptions );

    options.read = '/Products/read';

    getTableConfig( options, function ( api ) {
        var config = api.config;

        assert.strictEqual( config.read, '/Products/read', 'read can be a URL' );

        done2();

    } );



    window.model = {};

    window.model.read = function ( requestModel, callback ) {
        var model = new gp.PagingModel( data.products );
        callback( model );
    };

    var options = gp.shallowCopy( configOptions );

    options.read = 'model.read';

    getTableConfig( options, function ( api ) {
        var config = api.config;

        assert.strictEqual( config.read, model.read, 'read can be a function' );

        assert.strictEqual( config.pageModel.data.length, data.products.length );

        done3();
    } );




    options = gp.shallowCopy( configOptions );

    options.read = 'data.products';

    getTableConfig( options, function ( api ) {

        var config = api.config;

        assert.strictEqual( config.read, data.products, 'read can be an array' );

        done4();
    } );

} );

QUnit.test( 'edit and update', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.fixedheaders = true;
    options.sorting = true;
    options.editready = 'fns.editready';
    options.onedit = 'fns.onupdate';
    var colIndex = -1;
    var col = null;

    var changeEvent = new CustomEvent( 'change', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );

    fns.editready = function ( evt ) {
        assert.ok( evt != null );
        assert.ok( evt.dataItem != null );
        assert.ok( evt.elem != null );
        // change some of the values
        var input = this.find( '[name=StandardCost]' );
        input.val( '5' );
        done1();
        var saveBtn = this.find( 'button[value=update]' );
        clickButton( saveBtn );
    };

    fns.onupdate = function ( evt ) {
        assert.ok( evt != null );
        assert.ok( evt.dataItem != null );
        assert.strictEqual( evt.dataItem.StandardCost, 5, 'clicking save button should update the model' );

        // make sure the grid is updated with the correct value
        var updatedCellValue = evt.elem.find( 'td:nth-child(' + ( colIndex + 1 ) + ')' ).html();

        var expectedValue = gp.getFormattedValue( evt.dataItem, col, true );

        assert.equal( updatedCellValue, expectedValue, 'grid should be updated with the correct value' );

        done2();
    };

    getTableConfig( options, function ( api ) {

        $( '#table .box' ).append( api.config.node );

        var config = api.config;

        var node = config.node;

        // find the StandardCost column
        col = config.columns.filter( function ( col, index ) {
            if ( col.field == "StandardCost" ) {
                colIndex = index;
                return true;
            }
            return false;
        } )[0];

        // trigger a click event on an edit button
        var btn = api.find( 'button[value=edit]' );

        clickButton( btn[0] );

    } );

} );

QUnit.test( 'gp.templates.thead', function ( assert ) {

    var done1 = assert.async(),
        done2 = assert.async(),
        done3 = assert.async();

    function testHeaders( headers ) {
        assert.ok( $(headers[0]).find( 'input[type=checkbox]' ).length > 0 );

        assert.ok( $(headers[1]).find( 'a.table-sort' ).length > 0 );

        assert.equal( $(headers[6]).find( 'a.table-sort' ).text(), 'Markup' );
    }

    // fixed headers, with sorting
    var options = gp.shallowCopy( configOptions );
    options.fixedheaders = true;
    options.sorting = true;

    getTableConfig( options, function ( api ) {

        $( '#table .box' ).append( api.config.node );

        var config = api.config;

        var node = config.node;

        var headers = $(node).find( 'div.table-header th.header-cell' );

        testHeaders( headers );

        api.dispose();

        $( '#table .box' ).empty();

        done2();

    } );


    // no fixed headers, with sorting
    options = gp.shallowCopy( configOptions );
    options.sorting = true;

    getTableConfig( options, function ( api ) {

        $( '#table .box' ).append( api.config.node );

        var config = api.config;

        var node = config.node;

        headers = node.querySelectorAll( 'div.table-body th.header-cell' );

        testHeaders( headers );

        api.dispose();

        $( '#table .box' ).empty();

        done3();

    } );


    // no fixed headers, no sorting
    options = gp.shallowCopy( configOptions );
    options.sorting = false;

    getTableConfig( options, function ( api ) {

        var config = api.config;

        var node = config.node;

        headers = node.querySelectorAll( 'div.table-body th.header-cell' );

        //assert.ok(headers[0].querySelector('input[type=checkbox]') != null, 'functions as templates');

        //assert.equal(headers[1].innerHTML, 'ID');

        //assert.equal(headers[2].querySelector('label.table-sort'), null);

        //assert.ok(headers[5].querySelector('label.table-sort > input[value=SellStartDate]') != null);

        //assert.equal(headers[5].textContent, 'Sell Start Date');

        //assert.ok(headers[6].querySelector('label.table-sort > input[value=Name]') != null);

        //assert.equal(headers[6].textContent, 'Markup');

        //assert.equal(headers[8].textContent, 'Test header');

        //assert.ok(headers[9].querySelector('input[type=checkbox]') != null);

        //assert.equal(headers[10].textContent, 'Test header');

        //assert.ok(headers[10].querySelector('input[type=checkbox]') != null);

        done1();

    } );

} );

QUnit.test( 'gp.templates.bodyCell', function ( assert ) {

    var done = assert.async();

    function testCells( cells ) {

        assert.ok( cells[0].querySelector( 'input[type=checkbox]' ) != null, 'there should be a checkbox' );

        assert.ok( cells[2].querySelector( 'span.glyphicon.glyphicon-ok' ) != null );

        assert.ok( cells[3].querySelector( 'button > span' ) != null );

        assert.equal( isNaN( parseInt( cells[3].textContent ) ), false, 'should be a number' );

    }

    var options = gp.shallowCopy( configOptions );
    options.fixedheaders = true;
    options.sorting = true;

    getTableConfig( options, function ( api ) {

        var config = api.config;

        var node = config.node;

        var cells = node.querySelectorAll( 'div.table-body tbody > tr:nth-child(3) td.body-cell' );

        testCells( cells );

        var rows = node.querySelectorAll( 'div.table-body tbody > tr' );

        for ( var i = 0; i < rows.length; i++ ) {
            var make = data.products[i].MakeFlag;
            if ( make ) {
                assert.ok( rows[i].querySelector( 'td:nth-child(9) span.glyphicon-edit' ) != null, 'template should create an edit button' );
                assert.ok( rows[i].querySelector( 'td:nth-child(3) span.glyphicon-ok' ) != null, 'there should be a checkmark' );
            }
            else {
                assert.ok( rows[i].querySelector( 'td:nth-child(9) span.glyphicon-remove' ) != null, 'template should create a remove button' );
            }
        }

        done();

    } );

} );

QUnit.test( 'gp.templates.footerCell', function ( assert ) {

    var done1 = assert.async(),
        done2 = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.fixedheaders = true;
    options.sorting = true;

    getTableConfig( options, function ( api ) {

        var cell = api.find( '.table-body tfoot tr:first-child td.footer-cell:nth-child(1)' );

        assert.ok( cell.find( 'input[type=checkbox]' ).length > 0 );

        done1();

    } );

    var beforeReadCalled = false;

    fns.beforeread = function () {

        beforeReadCalled = true;

        cell = this.find( '.table-footer tr:first-child td.footer-cell:nth-child(4)' );

        assert.equal( cell.length, 0, 'table footer should not be rendered before data is requested' );

    };

    options.fixedFooters = true;
    options.beforeread = 'fns.beforeread';

    getTableConfig( options, function ( api ) {

        var config = api.config;

        cell = api.find( '.table-footer tr:first-child td.footer-cell:nth-child(4)' );

        assert.equal( isNaN( parseFloat( cell.text() ) ), false );

        assert.equal( cell.text(), '10' );

        assert.ok( beforeReadCalled );

        done2();

    } );

} );


QUnit.test( 'gp.syncModel', function ( assert ) {

    var model = {
        number: 1,
        date: '2015-01-01',
        bool: true,
        name: 'Todd'
    };

    var columns = [
        { field: 'number', Type: 'number' },
        { field: 'date', Type: 'dateString' },
        { sort: 'bool', Type: 'boolean' },
        { sort: 'name', Type: 'string' },
    ];

    $( div ).empty();

    div.append( '<input type="number" name="number" value="1" />' );
    div.append( '<input type="date" name="date" value="2015-01-01" />' );
    div.append( '<input type="checkbox" name="bool" value="true" checked />' );
    div.append( '<input type="checkbox" name="name" value="Todd" checked="checked" />' );
    div.append( '<input type="text" name="notInModel" value="text" />' );

    var numberInput = div[0].querySelector( '[name=number]' );
    numberInput.value = '2';
    var obj = gp.ModelSync.serialize( div[0] );
    gp.ModelSync.castValues( obj, columns );
    assert.strictEqual( obj.number, 2 );

    var textInput = div[0].querySelector( '[name=notInModel]' );
    textInput.value = 'more text';
    obj = gp.ModelSync.serialize( div[0] );
    gp.ModelSync.castValues( obj, columns );
    assert.equal( obj.notInModel, 'more text', 'should add properties not present in the model' );

    var checkbox = div[0].querySelector( '[name=bool]' );
    checkbox.checked = false;
    obj = gp.ModelSync.serialize( div[0] );
    gp.ModelSync.castValues( obj, columns );
    assert.equal( obj.bool, false, 'afterSync should return values after changing them' );

} );

QUnit.test( 'custom search filter', function ( assert ) {

    var done = assert.async();

    var event = new CustomEvent( 'change', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );

    var options = gp.shallowCopy( configOptions );
    options.fixedheaders = true;
    options.sorting = true;
    options.searchFilter = 'fns.searchFilter';

    getTableConfig( options, function ( api ) {

        var config = api.config;

        //$( '#table .box' ).append( config.node );

        var productNumber = data.products[1].ProductNumber;

        // find the search box
        var searchInput = api.find( 'input[name=search]' );

        searchInput.val( productNumber );

        assert.equal( config.searchfunction, fns.searchFilter );

        // listen for the change event
        config.node.addEventListener( 'change', function ( evt ) {
            assert.equal( config.pageModel.data.length, 1, 'Should filter a single record' );
            assert.equal( config.pageModel.data[0].ProductNumber, productNumber, 'Should filter a single record' );
            done();
        } );

        // trigger a change event on the input
        searchInput[0].dispatchEvent( event );

    } );


} );

QUnit.test( 'editready event', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();

    // test TableRowEditor

    var options = gp.shallowCopy( configOptions );
    options.fixedheaders = true;
    options.sorting = true;
    options.editready = 'fns.editready';

    fns.editready = function ( evt ) {
        assert.ok( evt != null );
        assert.ok( evt.dataItem != null );
        assert.ok( evt.elem != null );
        done1();
    };

    getTableConfig( options, function ( api ) {

        var config = api.config;

        var node = config.node;

        // trigger a click event on an edit button
        var btn = node.querySelector( 'button[value=edit]' );

        clickButton( btn );

    } );


    // test ModalEditor

    var options2 = gp.shallowCopy( configOptions );
    options2.fixedheaders = true;
    options2.sorting = true;
    options2.editready = 'fns.editready2';
    options2.editmode = 'modal';

    fns.editready2 = function ( model ) {
        assert.ok( model != null );
        assert.ok( model.dataItem != null );
        assert.ok( model.elem != null );
        done2();

        var btn = model.elem.querySelector( 'button[value=cancel]' );

        clickButton( btn );

        $( '#table .box' ).empty();

        $( 'div.modal-backdrop.in' ).remove();

        $( '.modal-open' ).removeClass('modal-open');
    };

    getTableConfig( options2, function ( api ) {

        var config = api.config;

        var node = config.node;

        // trigger a click event on an edit button
        var btn = node.querySelector( 'button[value=edit]' );

        clickButton( btn );

    } );

} );


QUnit.test( 'date formatting', function ( assert ) {

    // the polyfill fails half of these tests
    // https://github.com/andyearnshaw/Intl.js/issues

    // use local time so our test will work regardless of time zone
    var date = new Date( 2015, 11, 6, 13, 5, 6 );

    var formatter = new gp.Formatter();

    var formatted = formatter.format( date, 'M/D/YYYY' );
    assert.equal( formatted, '12/6/2015' );

    formatted = formatter.format( new Date( 2015, 11, 7, 13, 5, 6 ), 'M/D/YYYY' );
    assert.equal( formatted, '12/7/2015' );

    formatted = formatter.format( date, 'MMMM DD, YY' );
    assert.equal( formatted, 'December 06, 15' );

    formatted = formatter.format( date, 'MMM D, YY' );
    assert.equal( formatted, 'Dec 6, 15' );

    formatted = formatter.format( date, 'h:mm:ss A' );
    assert.equal( formatted, '1:05:06 PM' );

    formatted = formatter.format( date, 'HH:mm' );
    assert.equal( formatted, '13:05' );

    formatted = formatter.format( date, 'dddd' );
    assert.equal( formatted, 'Sunday' );

    formatted = formatter.format( date, 'ddd' );
    assert.equal( formatted, 'Sun' );

    formatted = formatter.format( date, 'dd' );
    assert.equal( formatted, 'Su' );

} );

QUnit.test( 'number formatting', function ( assert ) {

    var formatter = new gp.Formatter();

    var formatted = formatter.format( 5, '0%' );
    assert.equal( formatted, '500%' );

    formatted = formatter.format( .05, '0%' );
    assert.equal( formatted, '5%' );

    formatted = formatter.format( .05, '0%' );
    assert.equal( formatted, '5%' );

    formatted = formatter.format( .05, '0.00%' );
    assert.equal( formatted, '5.00%' );

    formatted = formatter.format( .05, '0.00' );
    assert.equal( formatted, '0.05' );

    formatted = formatter.format( 1234.56, '0,0.0' );
    assert.equal( formatted, '1,234.6' );

    formatted = formatter.format( 1234.56, '0,0.00' );
    assert.equal( formatted, '1,234.56' );

    formatted = formatter.format( 1234.56, '0,0' );
    assert.equal( formatted, '1,235' );

    formatted = formatter.format( 1234.56, '$0,0.00' );
    assert.equal( formatted, '$1,234.56' );

    formatted = formatter.format( 1234.56, '$0,0' );
    assert.equal( formatted, '$1,235' );

    formatted = formatter.format( 1234.56 );
    assert.equal( formatted, '1,235' );
} );

QUnit.test( 'gp.createUID', function ( assert ) {

    var id, ids = {};

    for ( var i = 0; i < 100; i++ ) {
        id = gp.createUID();
        assert.ok( !( id in ids ) );
        ids[id] = 1;
    }

} );

QUnit.test( 'readonly fields', function ( assert ) {

    var done = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.fixedheaders = true;
    options.sorting = true;
    options.editready = 'fns.editready';

    var index;

    fns.editready = function ( evt ) {
        var input = this.find( 'td:nth-child(' + ( index + 1 ).toString() + ') input' );
        assert.equal( input.length, 0, 'there should not be an input' );
        done();
    };

    getTableConfig( options, function ( api ) {

        var config = api.config;

        var node = config.node;

        var readonlyColumns = config.columns.filter( function ( col ) {
            return col.readonly;
        } );

        assert.ok( readonlyColumns != null && readonlyColumns.length, 'should find a readonly column' );

        // use this index to locate the table cell
        index = config.columns.indexOf( readonlyColumns[0] );


        // trigger a click event on an edit button
        var btn = api.find( 'button[value=edit]' );

        clickButton( btn[0] );

    } );

} );

QUnit.test( 'controller.render', function ( assert ) {

    var done1 = assert.async(),
        done2 = assert.async();

    function tests( config ) {
        var search = config.node.querySelector( '.table-toolbar input[name=search]' );

        if ( config.search ) {
            assert.ok( search != null, 'there should be a search box' );
        }
        else {
            assert.ok( search == null, 'there should be no search box' );
        }

        var pager = config.node.querySelector( '.table-pager input' );

        if ( config.pager ) {
            assert.ok( pager != null, 'there should be a pager with some inputs in it' );
        }
        else {
            assert.ok( pager == null, 'there should be no pager' );
        }

        var addButton = config.node.querySelector( '.table-toolbar button[value=AddRow]' );

        if ( config.create ) {
            assert.ok( addButton != null, 'there should be a button for adding new rows' );
        }
        else {
            assert.ok( addButton == null, 'there should not be a button for adding new rows' );
        }

        var columnWidthStyle = config.node.querySelector( 'style.column-width-style' );

        assert.ok( columnWidthStyle != null, 'column width styles should always render' );
    }

    var options = gp.shallowCopy( configOptions );
    options.fixedheaders = true;
    options.fixedFooters = true;
    options.responsive = true;
    options.sorting = true;

    getTableConfig( options, function ( api ) {

        var config = api.config;

        tests( config );

        done1();

    } );

    getTableConfig( null, function ( api ) {

        var config = api.config;

        tests( config );

        done2();

    } );

} );

QUnit.test( 'coverage report', function ( assert ) {

    assert.ok( true );

    if ( cov ) {

        var gaps = [];

        setTimeout( function () {
            var gapStart, gapEnd;
            for ( var i = 1; i <= cov.maxCoverage; i++ ) {
                if ( !cov.covered[i] ) {
                    if ( !gapStart ) {
                        gapStart = i;
                    }
                    else {
                        gapEnd = i;
                    }
                }
                    // are we in a gap?
                else if ( gapStart ) {
                    gaps.push( { start: gapStart, end: gapEnd } );
                    // reset
                    gapStart = null;
                    gapEnd = null;
                }
            }

            var out = [];

            out.push( '<ul>' );

            gaps.forEach( function ( gap ) {
                out.push( '<li>' );
                out.push( gap.start );
                if ( gap.end ) {
                    out.push( ' - ' );
                    out.push( gap.end );
                }
                out.push( '</li>' );
            } );

            out.push( '</ul>' );

            if ( gaps.length > 40 ) {
                out.push( '<p>That&apos;s a lot of gaps!</p>' );
            }

            $( '#coverage-gaps' ).html( out.join( '' ) );
        } );
    }

} );

var div = null;

$( function () {
    div = $( '<div id="div1" style="display:none"></div>' ).appendTo( 'body' );
} );

function ChangeEvent() {
    return new CustomEvent( 'change', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );
}

var gridponent = gridponent || {};

var gp = gridponent;

var fns = fns || {};

var clickButton = function ( btn ) {

    var evt = new CustomEvent( 'click', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );

    $( btn )[0].dispatchEvent( evt );

};

var changeInput = function ( input ) {

    var evt = new CustomEvent( 'change', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );

    $( input )[0].dispatchEvent( evt );

};

fns.checkbox = function ( col ) {
    return '<input type="checkbox" name="test" />';
};

fns.getButtonIcon = function ( dataItem, col ) {
    if ( dataItem.MakeFlag ) {
        return 'glyphicon-edit';
    }
    return 'glyphicon-remove';
};

fns.getButtonText = function ( dataItem, col ) {
    if ( dataItem.MakeFlag ) {
        return 'edit';
    }
    return 'Remove';
};

fns.searchFilter = function ( dataItem, search ) {
    return dataItem.ProductNumber == search;
};

fns.getHeaderText = function ( col ) {
    return col.toString();
};

fns.getCustomHeader = function ( resources ) {
    return '<span style="color:red">' + resources.$column.field + '</span>';
};

fns.createProduct = function ( dataItem, done, fail ) {
    // create a unique ProductID
    var maxProductID = 0;
    data.products.forEach( function ( product ) {
        if ( product.ProductID > maxProductID ) {
            maxProductID = product.ProductID;
        }
    } );
    dataItem.ProductID = maxProductID + 1;
    data.products.push( dataItem );
    done( dataItem );
};

fns.updateProduct = function ( dataItem, done, fail ) {
    var existing = data.products.filter( function ( obj ) {
        return obj.ProductID === dataItem.ProductID;
    } );
    if ( existing.length === 1 ) {
        gridponent.shallowCopy( dataItem, existing[0] );
    }
    done( dataItem );
};

fns.destroyProduct = function ( dataItem, done, fail ) {
    var existing = data.products.filter( function ( obj ) {
        return obj.ProductID === dataItem.ProductID;
    } );
    if ( existing.length === 1 ) {
        var index = data.products.indexOf( existing[0] );
        data.products.splice( index, 1 );
        done( true );
    }
    done( false );
};

var configOptions = {
    fixedheaders: false,
    fixedFooters: false,
    responsive: false,
    sorting: false,
    read: null,
    create: '/Products/create',
    update: '/Products/update',
    destroy: '/Products/Delete',
    searchFilter: null,
    customCommand: null,
    inject: null
};

var getTableConfig = function ( options, callback ) {
    options = options || configOptions;
    options.read = options.read || 'data.products';

    var out = [];

    out.push( '<grid-ponent ' );
    if ( options.fixedheaders ) out.push( '    fixed-headers' );
    if ( options.fixedFooters ) out.push( '    fixed-footers="true"' );
    if ( options.responsive ) out.push( '      responsive="true"' );
    if ( options.sorting ) out.push( '         sorting ' );
    if ( options.pager ) out.push( '           pager ' );
    if ( options.rowselected ) out.push( '     rowselected="' + options.rowselected + '"' );
    if ( options.searchFilter ) out.push( '    search-function="' + options.searchFilter + '"' );
    if ( options.read ) out.push( '            read="' + options.read + '"' );
    if ( options.create ) out.push( '          create="' + options.create + '"' );
    if ( options.update ) out.push( '          update="' + options.update + '"' );
    if ( options.destroy ) out.push( '         destroy="' + options.destroy + '"' );
    if ( options.refreshevent ) out.push( '    refresh-event="' + options.refreshevent + '"' );
    if ( options.validate ) out.push( '        validate="' + options.validate + '"' );
    if ( options.onread ) out.push( '          onread="' + options.onread + '"' );
    if ( options.editready ) out.push( '       editready="' + options.editready + '"' );
    if ( options.onedit ) out.push( '          onedit="' + options.onedit + '"' );
    if ( options.model ) out.push( '           model="' + options.model + '"' );
    if ( options.beforeread ) out.push( '      beforeread="' + options.beforeread + '"' );
    if ( options.editmode ) out.push( '        edit-mode="' + options.editmode + '"' );
    if ( options.inject ) out.push( '          inject="' + options.inject + '"' );
    out.push( '             pager="top-right"' );
    out.push( '             search="top-left">' );
    if ( options.toolbar )
        out.push( '    <script type="text/html" data-template="toolbar"><button class="btn" value="xyz"></button></script>' );
    if ( options.headerCellContent )
        out.push( '    <script type="text/html" data-template="headerCellContent">' + options.headerCellContent + '</script>' );

    out.push( '    <gp-column>' );
    out.push( '        <script type="text/html" data-template="header body edit footer"><input type="checkbox" name="test" /></script>' );
    out.push( '    </gp-column>' );
    out.push( '    <gp-column header="ID" sort="Name">' );
    out.push( '        <script type="text/html" data-template="body">{{fns.getName}}</script>' );
    out.push( '        <script type="text/html" data-template="edit">{{{fns.dropdown}}}</script>' );
    out.push( '    </gp-column>' );
    out.push( '    <gp-column field="MakeFlag" header="Make" width="75px"></gp-column>' );
    out.push( '    <gp-column field="SafetyStockLevel" header="Safety Stock Level">' );
    out.push( '        <script type="text/html" data-template="body"><button class="btn"><span class="glyphicon glyphicon-search"></span>{{SafetyStockLevel}}</button></script>' );
    out.push( '        <script type="text/html" data-template="footer">{{fns.average}}</script>' );
    out.push( '    </gp-column>' );
    out.push( '    <gp-column field="StandardCost" header="Standard Cost" format="$0" required></gp-column>' );
    out.push( '    <gp-column field="SellStartDate" header="Sell Start Date" format="d MMMM, YYYY"></gp-column>' );
    out.push( '    <gp-column field="Markup" readonly body-class="hidden-xs" header-class="hidden-xs"></gp-column>' );
    out.push( '    <gp-column>' );
    out.push( '        <script type="text/html" data-template="header">Test header<input type="checkbox"/></script>' );
    out.push( '    </gp-column>' );
    out.push( '    <gp-column sort="Color" body-style="border:solid 1px #ccc;">' );
    out.push( '        <script type="text/html" data-template="header"><button class="btn" value="">{{fns.getHeaderText}}</button></script>' );
    out.push( '        <script type="text/html" data-template="body"><button class="btn" value="{{fns.getButtonText}}"><span class="glyphicon {{fns.getButtonIcon}}"></span>{{fns.getButtonText}}</button></script>' );
    out.push( '    </gp-column>' );
    out.push( '    <gp-column field="ProductNumber" header="Product #"></gp-column>' );
    out.push( '    <gp-column commands="Edit,Delete"></gp-column>' );
    if ( options.customCommand ) {
        out.push( '    <gp-column commands="' + options.customCommand + '"></gp-column>' );
    }
    out.push( '</grid-ponent>' );

    // if we have web component support, this line will initialize the component automatically
    // otherwise trigger initialization manually
    var $node = $( out.join( '' ) );

    if ( document.registerElement ) {
        setTimeout( function () {
            gridponent( $node[0] ).ready( callback );
        } );
    }
    else {
        config = new gp.Initializer( $node[0] ).initialize();
        config.node.api.ready( callback );
    }
};

var getValidationErrors = function () {
    return {
        "Name": {
            "errors": [
                "Required"
            ]
        },
        "ProductNumber": {
            "errors": [
                "Required"
            ]
        },
        "SafetyStockLevel": {
            "errors": [
                "The value 'non' is not valid for Safety Stock Level."
            ]
        }
    };
};

var configuration = {
    read: '/products/read?page={{page}}',
    create: '/products/create',
    update: '/products/update',
    destroy: '/products/delete',
    search: 'top-left',
    pager: 'bottom-left',
    columns: [
        {
            headertemplate: '<input type="checkbox" name="test" />',
            bodytemplate: '<input type="checkbox" name="test" />',
            footertemplate: '<input type="checkbox" name="test" />'
        },
        {
            sort: 'Name',
            header: 'ID',
            bodytemplate: fns.getname,
            edittemplate: fns.dropdown
        },
        {
            width: '75px',
            header: 'Make',
            field: 'MakeFlag',
            edittemplate: '<input type="radio" name="MakeFlag" value="true" /><input type="radio" name="MakeFlag" value="false" />'
        },
        {
            header: 'Safety Stock Level',
            field: 'SafetyStockLevel',
            bodytemplate: '<button class="btn"><span class="glyphicon glyphicon-search"></span>{{SafetyStockLevel}}</button>',
            footertemplate: fns.average
        },
        {
            format: 'c',
            header: 'Standard Cost',
            field: 'StandardCost'
        },
        {
            format: 'D MMMM, YYYY',
            header: 'Sell Start Date',
            field: 'SellStartDate'
        },
        {
            headerclass: 'hidden-xs',
            bodyclass: 'hidden-xs',
            readonly: true,
            field: 'Markup'
        },
        {
            headertemplate: 'Test Header<input type="checkbox"/>'
        },
        {
            sort: 'Color',
            headertemplate: '<button class="btn" value="">{{fns.getHeaderText}}</button>',
            bodytemplate: '<button class="btn" value="{{fns.getButtonText}}"><span class="glyphicon {{fns.getButtonIcon}}"></span>{{fns.getButtonText}}</button>'
        },
        {
            header: 'Product #',
            field: 'ProductNumber'
        },
        {
            commands: [
                { text: 'Edit' },
                { text: 'Delete' },
                {
                    text: 'View',
                    func: function ( dataItem ) {
                        fns.viewed = true;
                    }
                }
            ]
        }
    ]
};

fns.model = {
    "ProductID": 0,
    "State": ['MN', 'WI'],
    "Name": "Adjustable Race",
    "ProductNumber": "",
    "MakeFlag": false,
    "FinishedGoodsFlag": false,
    "Color": "blue",
    "SafetyStockLevel": 0,
    "ReorderPoint": 0, "StandardCost": 0, "ListPrice": 0, "Size": "", "SizeUnitMeasureCode": "", "WeightUnitMeasureCode": "", "Weight": 0, "DaysToManufacture": 0, "ProductLine": "", "Class": "", "Style": "C", "ProductSubcategoryID": 0, "ProductModelID": 0, "SellStartDate": "2007-07-01T00:00:00", "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "00000000-0000-0000-0000-000000000000", "ModifiedDate": "2008-03-11T10:01:36.827", "Markup": "<p>Product's name: \"Adjustable Race\"</p>"
};

// creete a read-only property on the model
Object.defineProperty( fns.model, 'ReadOnlyProp', {
    get: function () {
        return 'value';
    }
} );
