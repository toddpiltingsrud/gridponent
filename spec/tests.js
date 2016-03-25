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

fns.checkbox = function ( col ) {
    return '<input type="checkbox" name="test" />';
};

fns.getButtonIcon = function ( row, col ) {
    if ( row.MakeFlag ) {
        return 'glyphicon-edit';
    }
    return 'glyphicon-remove';
};

fns.getButtonText = function ( row, col ) {
    if ( row.MakeFlag ) {
        return 'Edit';
    }
    return 'Remove';
};

fns.searchFilter = function ( row, search ) {
    return row.ProductNumber == search;
};

fns.getHeaderText = function ( col ) {
    return col.toString();
}; 

var configOptions = {
    fixedHeaders: false,
    fixedFooters: false,
    responsive: false,
    sorting: false,
    read: null,
    create: '/Products/Create',
    update: '/Products/Update',
    'delete': '/Products/Delete',
    searchFilter: null,
    customCommand: null,
    orRowSelect: null
};

var getTableConfig = function ( options, callback ) {
    options = options || configOptions;
    options.read = options.read || 'data.products';

    var out = [];

    out.push( '<grid-ponent ' );
    if ( options.fixedHeaders ) out.push( '    fixed-headers' );
    if ( options.fixedFooters ) out.push( '    fixed-footers="true"' );
    if ( options.responsive ) out.push( '      responsive="true"' );
    if ( options.sorting ) out.push( '         sorting ' );
    if ( options.onRowSelect ) out.push( '     onrowselect="' + options.onRowSelect + '"' );
    if ( options.searchFilter ) out.push( '    search-function="' + options.searchFilter + '"' );
    if ( options.read ) out.push( '            read="' + options.read + '"' );
    if ( options.create ) out.push( '          create="' + options.create + '"' );
    if ( options.update ) out.push( '          update="' + options.update + '"' );
    if ( options.delete ) out.push( '          delete="' + options.delete + '"' );
    if ( options.refreshEvent ) out.push( '    refresh-event="' + options.refreshEvent + '"' );
    if ( options.validate ) out.push( '        validate="' + options.validate + '7"' );
    out.push( '             pager="top-right"' );
    out.push( '             search="top-left">' );
    if ( options.toolbarTemplate )
    out.push( '    <script type="text/html" data-template="toolbar"><button class="btn" value="xyz"></button></script>' );
    out.push( '    <gp-column>' );
    out.push( '        <script type="text/html" data-template="header body footer"><input type="checkbox" name="test" /></script>' );
    out.push( '    </gp-column>' );
    out.push( '    <gp-column header="ID" sort="Name">' );
    out.push( '        <script type="text/html" data-template="body">{{fns.getName}}</script>' );
    out.push( '        <script type="text/html" data-template="edit">{{fns.dropdown}}</script>' );
    out.push( '    </gp-column>' );
    out.push( '    <gp-column field="MakeFlag" header="Make" width="75px"></gp-column>' );
    out.push( '    <gp-column field="SafetyStockLevel" header="Safety Stock Level">' );
    out.push( '        <script type="text/html" data-template="body"><button class="btn"><span class="glyphicon glyphicon-search"></span>{{SafetyStockLevel}}</button></script>' );
    out.push( '        <script type="text/html" data-template="footer">{{fns.average}}</script>' );
    out.push( '    </gp-column>' );
    out.push( '    <gp-column field="StandardCost" header="Standard Cost" format="C"></gp-column>' );
    out.push( '    <gp-column field="SellStartDate" header="Sell Start Date" format="d MMMM, YYYY"></gp-column>' );
    out.push( '    <gp-column field="Markup" readonly body-class="hidden-xs" header-class="hidden-xs"></gp-column>' );
    out.push( '    <gp-column>' );
    out.push( '        <script type="text/html" data-template="header">Test Header<input type="checkbox"/></script>' );
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
        $node.one( gp.events.beforeInit, function ( evt ) {
            callback( evt.originalEvent.detail );
        } );
    }
    else {
        config = new gp.Initializer( $node[0] ).initialize();
        callback( config );
    }
};

var getValidationErrors = function () {
    return [
        {
            "Key": "Name",
            "Value": {
                "Value": {
                    "AttemptedValue": "",
                    "Culture": "en-US",
                    "RawValue": [""]
                },
                "Errors": [
                {
                    "Exception": null,
                    "ErrorMessage": "Required"
                }
                ]
            }
        },
        {
            "Key": "ProductNumber",
            "Value": {
                "Value": {
                    "AttemptedValue": "",
                    "Culture": "en-US",
                    "RawValue": [""]
                },
                "Errors": [
                {
                    "Exception": null,
                    "ErrorMessage": "Required"
                }
                ]
            }
        },
        {
            "Key": "SafetyStockLevel",
            "Value": {
                "Value": {
                    "AttemptedValue": "non",
                    "Culture": "en-US",
                    "RawValue": ["non"]
                },
                "Errors": [
                {
                    "Exception": null,
                    "ErrorMessage": "The value 'non' is not valid for Safety Stock Level."
                }
                ]
            }
        }
    ];
};

var productsTable = function () {
    var out = [];

    out.push( '<grid-ponent id="gp"' );
    out.push( '                search="top-left"' );
    out.push( '                pager="bottom-right" ' );
    out.push( '                fixed-headers' );
    out.push( '                sorting="true" ' );
    out.push( '                responsive="true"' );
    out.push( '                onrowselect="/test?productid={{ProductID}}&color={{Color}}"' );
    out.push( '                read="data.products"' );
    out.push( '                create="/Products/Create"' );
    out.push( '                update="/Products/Update"' );
    out.push( '                delete="/Products/Delete">' );
    out.push( '    <gp-column header="Product" field="ProductID">' );
    out.push( '        <script type="text/html" data-template="body">{{fns.getName}}</script>' );
    out.push( '        <script type="text/html" data-template="edit">{{fns.dropdown}}</script>' );
    out.push( '    </gp-column>' );
    out.push( '    <gp-column field="MakeFlag" header="Make" width="75px"></gp-column>' );
    out.push( '    <gp-column field="SafetyStockLevel" header="Safety Stock Level" footer-template="fns.average"></gp-column>' );
    out.push( '    <gp-column field="StandardCost" header="Standard Cost" footer-template="fns.average" format="C"></gp-column>' );
    out.push( '    <gp-column field="SellStartDate" header="Sell Start Date" format="d MMMM, YYYY"></gp-column>' );
    out.push( '    <gp-column field="Markup" readonly header="Marked-Up Name"></gp-column>' );
    out.push( '    <gp-column commands="Edit,Delete,Show Row" body-style="width:155px;text-align:center"></gp-column>' );
    out.push( '</grid-ponent>' );

    // if we have web component support, this line will initialize the component automatically
    // otherwise trigger initialization manually
    var $node = $( out.join( '' ) );

    var config = $node[0].config;

    if ( !config ) {
        var i = new gp.Initializer( $node[0] );
        config = i.config;
    }

    return config;
};

QUnit.test( 'gp.ClientPager', function ( assert ) {

    var done = assert.async();

    getTableConfig( null, function ( config ) {

        config.node.api.ready( function () {

            var pager = new gp.ClientPager( config );

            pager.data = data.products;

            var model = new gp.PagingModel();

            // turn paging off
            model.Top = -1;

            pager.read( model, function ( response ) {
                assert.ok( response != null );
                assert.equal( response.Data.length, data.products.length, 'should return all rows' );
            } );

            // turn paging on
            model.Top = 10;

            pager.read( model, function ( response ) {
                assert.equal( response.Data.length, 10, 'should return a subset of rows' );
            } );

            model.Search = 'BA-8327';

            pager.read( model, function ( response ) {
                assert.equal( response.Data.length, 1, 'should return a single row' );
            } );

            model.Search = null;

            model.OrderBy = 'MakeFlag';

            pager.read( model, function ( response ) {
                assert.equal( response.Data[0].MakeFlag, false, 'ascending sort should put false values at the top' );
            } );

            model.Desc = true;

            pager.read( model, function ( response ) {
                assert.equal( response.Data[0].MakeFlag, true, 'descending sort should put true values at the top' );
            } );

            // descending string sort 
            model.OrderBy = 'Color';
            model.Top = -1;

            model.Desc = true;

            pager.read( model, function ( response ) {
                assert.ok( gp.hasValue( response.Data[0].Color ), 'descending string sort should put non-null values at the top ' );
                assert.ok( response.Data[response.Data.length - 1].Color == null, 'descending string sort should put null values at the bottom ' );
            } );

            // ascending string sort
            model.Desc = false;

            pager.read( model, function ( response ) {
                assert.ok( response.Data[0].Color == null, 'ascending string sort should put null values at the top ' );
                assert.ok( response.Data[response.Data.length - 1].Color != null, 'ascending string sort should put non-null values at the bottom ' );
            } );

            // page range checks
            model.Top = 25;
            model.Page = 0;

            pager.getSkip( model );

            assert.equal( model.Page, 1, 'getSkip should correct values outside of the page range' );

            model.Page = model.PageCount + 1;
            pager.getSkip( model );

            assert.equal( model.Page, model.PageCount, 'getSkip should correct values outside of the page range' );

            done();

        } );

    } );

} );

QUnit.test( 'ToolbarTemplate', function ( assert ) {

    var done = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.toolbarTemplate = true;

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            var btn = $( config.node ).find( 'div.table-toolbar button[value=xyz]' );

            assert.equal( btn.length, 1, 'should create a custom toolbar' );

            done();

        } );

    } );

} );

QUnit.test( 'api.search', function ( assert ) {

    var done = assert.async();

    getTableConfig( null, function ( config ) {

        config.node.api.ready( function () {

            config.node.api.search( 'Bearing' );

            // take note of the content of the column before sorting
            var rows = config.node.querySelectorAll( 'div.table-body tbody tr' );

            assert.strictEqual( rows.length, 3, 'Should yield 3 rows' );

            done();
        } );

    } );

} );

QUnit.test( 'api.refresh', function ( assert ) {

    var done = assert.async();

    getTableConfig( configOptions, function ( config ) {

        config.node.api.ready( function () {

            var firstRow = data.products[0];

            data.products.splice( 0, 1 );

            config.node.api.refresh( function () {
                // firstRow should be gone

                var productNumber = $( config.node ).find( 'tr[data-index=0] > td.body-cell:nth-child(10)' ).text();

                assert.equal( productNumber, data.products[0].ProductNumber, 'product number should equal the second row in the table' );

                done();

            } );

        } );

    } );

} );

QUnit.test( 'supplant', function ( assert ) {

    var supplant = function ( str, o ) {
        var types = /string|number|boolean/;
        return str.replace( /{{([^{}]*)}}/g,
            function ( a, b ) {
                var r = o[b], t = typeof r;
                return types.test(t) ? r : r == null ? '' : a;
            }
        );
    };

    var template = 'http://products/{{ProductID}}?MakeFlag={{MakeFlag}}&Color={{Color}}';

    var row = { "ProductID": 1, "Name": "Adjustable Race", "ProductNumber": "AR-5381", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": null, "SafetyStockLevel": 1000, "ReorderPoint": 750, "StandardCost": 0.0000, "ListPrice": 0.0000, "Size": null, "SizeUnitMeasureCode": null, "WeightUnitMeasureCode": null, "Weight": null, "DaysToManufacture": 0, "ProductLine": null, "Class": null, "Style": null, "ProductSubcategoryID": null, "ProductModelID": null, "SellStartDate": "2002-06-01T00:00:00", "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "694215b7-08f7-4c0d-acb1-d734ba44c0c8", "ModifiedDate": "2008-03-11T10:01:36.827", "Markup": "<p>Product's name: \"Adjustable Race\"</p>" };

    var url = supplant( template, row );

    assert.equal( url, 'http://products/1?MakeFlag=false&Color=' );

} );

QUnit.test( 'refresh-event', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.refreshEvent = 'data-changed';

    var reads = 0;

    var refreshEvent = new CustomEvent( options.refreshEvent, { detail: 'test', bubbles: true } );

    document.addEventListener( gp.events.afterRead, function () {
        reads++;

        // trigger the refresh event after the grid fully initializes
        if ( reads == 1 ) {
            document.dispatchEvent( refreshEvent );
        }
        else {
            assert.ok( true, 'triggering the refresh event should cause the grid to read' );
            done1();
            $( '#table .box' ).empty( );
        }
    } );

    getTableConfig( options, function ( config ) {
        $( '#table .box' ).append( config.node );
    } );

} );

QUnit.test( 'api.create 1', function ( assert ) {

    var done = assert.async();

    var row = { "ProductID": 0, "Name": "test", "ProductNumber": "", "MakeFlag": false, "FinishedGoodsFlag": false, "Color": null, "SafetyStockLevel": 0, "ReorderPoint": 0, "StandardCost": 0.0000, "ListPrice": 0.0000, "Size": null, "SizeUnitMeasureCode": null, "WeightUnitMeasureCode": null, "Weight": null, "DaysToManufacture": 0, "ProductLine": null, "Class": null, "Style": null, "ProductSubcategoryID": null, "ProductModelID": null, "SellStartDate": new Date(), "SellEndDate": null, "DiscontinuedDate": null, "rowguid": "694215b7-70dd-4c0d-acb1-d734ba44c0c8", "ModifiedDate": null, "Markup": "" };

    getTableConfig( configOptions, function ( config ) {

        config.node.api.ready( function () {

            var cellCount1 = config.node.querySelectorAll( 'div.table-body tbody > tr:nth-child(1) td.body-cell' ).length;

            config.node.api.create( row, function ( updateModel ) {
                var cellCount2 = config.node.querySelectorAll( 'div.table-body tbody > tr:nth-child(1) td.body-cell' ).length;
                assert.ok( gp.hasValue( updateModel.Row ), 'api should return an UpdateModel' );
                assert.strictEqual( cellCount1, cellCount2, 'should create the same number of cells' );
                assert.ok( data.products.indexOf( row ) != -1, 'the row should have been added to the source' );
                config.node.api.dispose();
                done();
            } );

        } );

    } );

} );

QUnit.test( 'api.create 2', function ( assert ) {

    var done = assert.async();

    getTableConfig( configOptions, function ( config ) {

        config.node.api.ready( function () {

            config.node.api.create( null, function ( updateModel ) {
                assert.ok( updateModel.Row != null, 'calling api.create with no row should create a default one' );
                config.node.api.dispose();
                done();
            } );

        } );

    } );

} );

QUnit.test( 'api.create 3', function ( assert ) {

    var done = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.create = null;

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            config.node.api.create( null, function ( updateModel ) {
                assert.ok( updateModel == null, 'calling api.create with no Create configuration should return null' );
                config.node.api.dispose();
                done();
            } );

        } );

    } );

} );

QUnit.test( 'api.ready', function ( assert ) {

    var done = assert.async();

    getTableConfig( configOptions, function ( config ) {

        config.node.api.ready( function () {

            config.node.api.ready( function () {

                assert.ok( true, 'calls to api.ready should execute even if ready state has already occurred' );

                done();

            } );

        } );

    } );

} );

QUnit.test( 'api.update', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();
    var done3 = assert.async();

    // this would be called instead of posting the row to a URL
    updateFn = function ( row, callback ) {
        // simulate some validation errors
        var updateModel = new gp.UpdateModel( row );
        updateModel.ValidationErrors = getValidationErrors();
        callback( updateModel );
    };

    showValidationErrors = function ( tr, updateModel ) {
        // find the input
        updateModel.ValidationErrors.forEach( function ( v ) {
            var input = tr.querySelector( '[name="' + v.Key + '"]' );
            if ( input ) {
                // extract the error message
                var msg = v.Value.Errors.map( function ( e ) { return e.ErrorMessage; } ).join( '<br/>' );
                gp.info( 'validation.msg', msg );
                gp.addClass( input, 'input-validation-error' );
                $( input ).tooltip( {
                    html: true,
                    placement: 'top',
                    title: msg
                } );
            }
        } );
    };

    var options = gp.shallowCopy( configOptions );

    options.update = 'updateFn';
    options.validate = 'showValidationErrors';

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            var row = config.node.api.getData( 0 );

            row.Name = 'test';

            config.node.api.update( row, function ( updateModel ) {
                assert.strictEqual( updateModel.Row.Name, 'test', 'update should support functions' );
                config.node.api.dispose();
                done1();
            } );

        } );

    } );

    // now try it with a URL
    options.update = '/Products/Update';


    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            var row = config.node.api.getData( 0 );

            config.node.api.update( row, function ( updateModel ) {
                assert.strictEqual( updateModel.Row.Name, 'test', 'update should support functions that use a URL' );
                config.node.api.dispose();
                done2();
            } );

        } );

    } );

    // now try it with a null update setting
    options.update = null;

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            var row = config.node.api.getData( 0 );

            config.node.api.update( row, function ( updateModel ) {
                assert.ok( updateModel == undefined, 'empty update setting should execute the callback with no arguments' );
                config.node.api.dispose();
                done3();
            } );

        } );

    } );


} );

QUnit.test( 'api.sort', function ( assert ) {

    var options = gp.shallowCopy( configOptions );

    options.sorting = false;

    var done = assert.async();

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            $( '#table .box' ).append( config.node );

            // since sorting is false, we should have only a couple columns where sorting is enabled
            // iterate through the columns to find an explicit sort configuration
            config.Columns.forEach( function ( col, index ) {

                var sortAttribute = $( config.node ).find( 'thead th[data-sort]:nth-child(' + ( index + 1 ) + ')' ).attr( 'data-sort' );

                if ( col.Sort ) {
                    assert.strictEqual( sortAttribute, col.Sort, 'there should be a sort header' );
                }
                else {
                    assert.strictEqual( sortAttribute, '', 'there should NOT be a sort header' );
                }

            } );


            // trigger an initial sort to make sure this column is sorted 
            config.node.api.sort( 'Name', false );

            // take note of the content of the column before sorting
            var content1 = config.node.querySelector( 'tr[data-index="0"] td:nth-child(2)' ).innerHTML;

            // trigger another sort
            config.node.api.sort( 'Name', true );

            // take note of the content of the column after sorting
            var content2 = config.node.querySelector( 'tr[data-index="0"] td:nth-child(2)' ).innerHTML;

            assert.notStrictEqual( content1, content2, 'Sorting should change the order' );

            config.node.api.sort( 'Name', false );

            // take note of the content of the column after sorting
            content2 = config.node.querySelector( 'tr[data-index="0"] td:nth-child(2)' ).innerHTML;

            assert.strictEqual( content1, content2, 'Sorting again should change it back' );

            done();

        } );

    } );

} );

QUnit.test( 'api.read', function ( assert ) {

    var options = gp.shallowCopy( configOptions );
    options.paging = true;
    var done = assert.async();

    getTableConfig( options, function ( config ) {

        var requestModel = new gp.PagingModel();
        requestModel.Top = 25;
        requestModel.Page = 2;

        config.node.api.ready( function () {

            config.node.api.read( requestModel, function ( model ) {
                assert.strictEqual( model.Page, 2, 'should be able to set the page' );
                done();
            } );

        } );

    } );

} );

QUnit.test( 'api.delete', function ( assert ) {

    var options = gp.shallowCopy( configOptions );
    var done1 = assert.async();

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            var row = config.pageModel.Data[0];

            config.node.api.delete( row, function ( row ) {
                var index = config.pageModel.Data.indexOf( row );
                assert.strictEqual( index, -1, 'delete should remove the row' );
                done1();
            } );

        } );

    } );

    // test it with a function
    fns = fns || {};
    fns.delete = function ( row, callback ) {
        var index = data.products.indexOf( row );
        data.products.splice( index, 1 );
        callback( {
            Success: true,
            Message: null
        } );
    };

    options = gp.shallowCopy( configOptions );
    options.delete = 'fns.delete';
    var done2 = assert.async();

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            row = config.pageModel.Data[0];

            config.node.api.delete( row, function ( row ) {
                var index = config.pageModel.Data.indexOf( row );
                assert.strictEqual( index, -1, 'delete should remove the row' );
                done2();
            } );

        } );

    } );

    // now try it with a null delete setting
    options = gp.shallowCopy( configOptions );
    options.delete = null;
    var done3 = assert.async();

    getTableConfig( options, function (config) {

        config.node.api.ready( function () {

            row = config.pageModel.Data[1];

            config.node.api.delete( row, function (response) {
                var index = config.pageModel.Data.indexOf( row );
                assert.ok( index > -1, 'delete should do nothing' );
                done3();
            } );

        } );

    } );

} );

if ( document.registerElement ) {

    QUnit.test( 'dispose', function ( assert ) {

        var done = assert.async();

        getTableConfig( null, function ( config ) {

            config.node.api.ready( function () {

                $( '#table .box' ).empty().append( config.node );


                var handler = function () {
                    assert.ok( true, 'dispose was called' );
                    config.node.removeEventListener( gp.events.beforeDispose, handler, false );
                    done();
                };

                config.node.addEventListener( gp.events.beforeDispose, handler, false );

                config.node.parentNode.removeChild( config.node );

            } );

        } );

    } );

}

QUnit.test( 'ChangeMonitor.beforeSync', function ( assert ) {

    var done = assert.async();

    getTableConfig( configOptions, function ( config ) {

        config.node.api.ready( function () {

            //$( '#table .box' ).empty().append( config.node );

            // set one of the radio buttons a couple of times
            var sortInput = config.node.querySelector( 'input[name=OrderBy]' );

            sortInput.checked = true;

            gp.raiseCustomEvent( sortInput, 'change' );

            assert.equal( config.pageModel.Desc, false );

            // Need a fresh reference to the input or the second change event won't do anything.
            // That's probably because the header gets recreated. If so, is that necessary?
            sortInput = config.node.querySelector( 'input[name=OrderBy]' );

            sortInput.checked = true;

            gp.raiseCustomEvent( sortInput, 'change' );

            assert.equal( config.pageModel.Desc, true );

            done();

        } );

    } );

} );

QUnit.test( 'custom command', function ( assert ) {

    var done1 = assert.async();

    var options = gp.shallowCopy( configOptions );

    fns.Assert = function ( row, tr ) {
        assert.ok( true, 'custom commands work' );
        done1();
    };

    options.customCommand = 'does not exist';

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            var btn = config.node.querySelector( 'button[value="does not exist"]' );

            $( btn ).click();

        } );

    } );


    options.customCommand = 'fns.Assert';

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            var btn = config.node.querySelector( 'button[value="fns.Assert"]' );

            $( btn ).click();
        } );

    } );

} );

QUnit.test( 'row selection', function ( assert ) {

    var done = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.onRowSelect = 'onRowSelect';

    onRowSelect = function () {
        assert.ok( true, 'row selection works' );
        done();
    };

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            assert.equal( config.Onrowselect, onRowSelect, 'onRowSelect can be a function' );

            var btn = config.node.querySelector( 'td.body-cell' );

            $( btn ).click();

        } );

    } );

} );

QUnit.test( 'events.rowSelected', function ( assert ) {

    var done = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.onRowSelect = 'onRowSelect';

    onRowSelect = function () {
        assert.ok( true, 'row selection works' );
        done();
    };

    getTableConfig( options, function ( config ) {

        $( config.node ).one( gp.events.rowSelected, function ( evt ) {

            evt.originalEvent.cancel = true;

            done();

        } );

        config.node.api.ready( function () {

            assert.equal( config.Onrowselect, onRowSelect, 'onRowSelect can be a function' );

            var btn = config.node.querySelector( 'td.body-cell' );

            $( btn ).click();

        } );

    } );

} );

QUnit.test( 'gp.getAttributes', function ( assert ) {

    var elem = $( '<tp-custom-element bool="true" number="1" string="my string" novalue></tp-custom-element>' );

    var config = gp.getAttributes( elem[0] );

    assert.equal( config.Bool, true, "should resolve bools" );

    assert.equal( config.Number, '1', 'should not resolve numbers' );

    assert.equal( config.String, 'my string', 'should resolve strings' );

    assert.equal( config.Novalue, true, 'empty values should be resolve to true' );
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

QUnit.test( 'gp.on', function ( assert ) {

    var listener = function ( evt ) {

    };

    var selector = 'div';

    var elem = gp.on( selector, 'click', 'button', listener );

    assert.ok( typeof elem == 'object', 'should turn a selector into a DOM object' );

    assert.ok( elem['gp-listeners-click'] != null, 'a list of listeners should be attached to the element' );

    selector = 'does-not-exist';

    elem = gp.on( selector, 'click', 'button', listener );

    assert.ok( elem == undefined, 'non-existent elem should return undefined' );
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
    assert.equal( gp.getType( '2015-11-24' ), 'dateString' );
    assert.equal( gp.getType( '2015-31-24' ), 'string' );
    assert.equal( notDefined, undefined );
    assert.equal( gp.getType( 3.0 ), 'number' );
    assert.equal( gp.getType( {} ), 'object' );
    assert.equal( gp.getType( [] ), 'array' );
} );

QUnit.test( 'gp.closest', function ( assert ) {

    var body = gp.closest( div[0], 'body' );

    assert.ok( body !== undefined );

    var elem = gp.closest( 'div', 'body' );

    assert.ok( typeof elem == 'object', 'should turn a selector into a DOM object' );

    elem = gp.closest( 'does-not-exist', 'body' );

    assert.ok( elem == undefined, 'non-existent elem should return undefined' );

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

//    assert.equal( rm.PageCount, 0 );

//    assert.equal( rm.Skip, 0 );

//    rm.Data = data.products;

//    rm.TotalRows = data.products.length;

//    assert.equal( rm.PageCount, 1 );

//    assert.equal( rm.Skip, 0 );

//    rm.Top = 25;

//    assert.equal( rm.PageCount, Math.ceil( data.products.length / 25 ) );

//    assert.equal( rm.Skip, 0 );

//    rm.Page = 3;

//    assert.equal( rm.Skip, 50 );
//} );


QUnit.test( 'gp.Model', function ( assert ) {

    var done1 = assert.async(),
        done2 = assert.async(),
        done3 = assert.async(),
        done4 = assert.async(),
        done5 = assert.async(),
        done6 = assert.async(),
        done8 = assert.async(),
        done9 = assert.async();

    getTableConfig( null, function ( config ) {

        config.node.api.ready( function () {

            var model = new gp.Model( config );

            var request = new gp.PagingModel();

            gridponent.logging = null;

            model.read( request, function ( response ) {
                assert.equal( response.Data.length, data.products.length, 'should return all rows' );
            } );

            // turn paging on
            request.Top = 10;

            model.read( request, function ( response ) {
                assert.equal( response.Data.length, 10, 'should return a subset of rows' );
            } );

            request.Search = 'BA-8327';

            model.read( request, function ( response ) {
                assert.equal( response.Data.length, 1, 'should return a single row' );
            } );

            request.Search = null;

            request.OrderBy = 'MakeFlag';

            model.read( request, function ( response ) {
                assert.equal( response.Data[0].MakeFlag, false, 'ascending sort should put false values at the top' );
            } );

            request.Desc = true;

            model.read( request, function ( response ) {
                assert.equal( response.Data[0].MakeFlag, true, 'descending sort should put true values at the top' );
            } );


            // test Read as function
            // the Read function can use a callback
            // or return a URL, array or PagingModel object

            // test function with callback

            config.Read = function ( m, callback ) {
                assert.ok( true, 'calling read should execute this function' );
                callback();
            };

            // create a new model
            model = new gp.Model( config );

            model.read( request, function ( response ) {
                assert.ok( true, 'calling read should execute this function' );
                done1();
            } );



            // test function with URL return value

            config.Read = function ( m ) {
                return '/Products/Read/5';
            };

            model = new gp.Model( config );

            model.read( request, function ( response ) {
                assert.ok( true, 'calling read should execute this function' );
                done2();
            } );

            // test function with array return value

            config.Read = function ( m ) {
                return data.products;
            };

            model = new gp.Model( config );

            model.read( request, function ( response ) {
                assert.ok( true, 'calling read should execute this function' );
                done3();
            } );

            // test function with object return value

            config.Read = function ( m ) {
                return new gp.PagingModel( data.products );
            };

            model = new gp.Model( config );

            model.read( request, function ( response ) {
                assert.ok( true, 'calling read should execute this function' );
                done4();
            } );

            // test function with unsupported return value

            config.Read = function ( m ) {
                return false;
            };

            model = new gp.Model( config );

            model.read( request, function ( response ) {
                assert.ok( false, 'calling read should NOT execute this function' );
                done5();
            },
            function ( response ) {
                assert.ok( true, 'calling read should execute this function' );
                done5();
            } );



            // test Read as url

            config.Read = '/Products/Read';

            model = new gp.Model( config );

            request = new gp.PagingModel();

            request.Search = 'BA-8327';

            model.read( request, function ( response ) {
                assert.equal( response.Data.length, 1, 'should return a single record' );
                done6();
            } );


            // update
            var row = data.products[0];
            row.Name = 'Test';

            model.update( row, function ( updateModel ) {
                assert.equal( updateModel.Row.Name, 'Test', 'should return the updated record' );
                done8();
            } );


            // 'delete'
            request = data.products[0];
            model = new gp.Model( config );

            model.delete( request, function ( response ) {
                assert.equal( response.Success, true, 'delete should return true if the record was found and deleted' );
                done9();
            } );

        } );

    } );

} );

QUnit.test( 'gp.Table.getConfig', function ( assert ) {

    var done1 = assert.async(),
        done2 = assert.async(),
        done3 = assert.async(),
        done4 = assert.async();

    var options = gp.shallowCopy( configOptions );

    options.fixedHeaders = true;
    options.sorting = true;

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            assert.equal( config.Sorting, true );

            assert.equal( config.FixedHeaders, true );

            assert.equal( config.Sorting, true );

            assert.equal( config.Columns.length, 11 );

            assert.equal( config.Columns[1].Header, 'ID' );

            done1();
        } );

    } );



    var options = gp.shallowCopy( configOptions );

    options.read = '/Products/Read';

    getTableConfig( options, function ( config ) {
        config.node.api.ready( function () {

            assert.strictEqual( config.Read, '/Products/Read', 'Read can be a URL' );

            done2();

        } );
    } );



    window.model = {};

    window.model.read = function ( requestModel, callback ) {
        var model = new gp.PagingModel( data.products );
        callback( model );
    };

    var options = gp.shallowCopy( configOptions );

    options.read = 'model.read';

    getTableConfig( options, function ( config ) {
        config.node.api.ready( function () {

            assert.strictEqual( config.Read, model.read, 'Read can be a function' );

            assert.strictEqual( config.pageModel.Data.length, data.products.length );

            done3();

        } );
    } );




    options = gp.shallowCopy( configOptions );

    options.read = 'data.products';

    getTableConfig( options, function ( config ) {
        config.node.api.ready( function () {

            assert.strictEqual( config.Read, data.products, 'Read can be an array' );

            done4();

        } );
    } );



} );

QUnit.test( 'gp.helpers.thead', function ( assert ) {

    var done1 = assert.async(),
        done2 = assert.async(),
        done3 = assert.async();

    function testHeaders( headers ) {
        assert.ok( headers[0].querySelector( 'input[type=checkbox]' ) != null );

        assert.ok( headers[1].querySelector( 'input[type=radio][name=OrderBy]' ) != null );

        assert.ok( headers[2].querySelector( 'label.table-sort > input[type=radio]' ) != null );

        assert.equal( headers[6].querySelector( 'label.table-sort' ).textContent, 'Markup' );
    }

    // fixed headers, with sorting
    var options = gp.shallowCopy( configOptions );
    options.fixedHeaders = true;
    options.sorting = true;

    getTableConfig( options, function ( config ) {

        var node = config.node;

        node.api.ready( function () {

            var headers = node.querySelectorAll( 'div.table-header th.header-cell' );

            testHeaders( headers );

            done2();

        } );

    } );


    // no fixed headers, with sorting
    options = gp.shallowCopy( configOptions );
    options.sorting = true;

    getTableConfig( options, function ( config ) {

        var node = config.node;

        node.api.ready( function () {

            headers = node.querySelectorAll( 'div.table-body th.header-cell' );
            testHeaders( headers );

            done3();

        } );

    } );


    // no fixed headers, no sorting
    options = gp.shallowCopy( configOptions );
    options.sorting = false;

    getTableConfig( options, function ( config ) {

        var node = config.node;

        node.api.ready( function () {

            headers = node.querySelectorAll( 'div.table-body th.header-cell' );

            //assert.ok(headers[0].querySelector('input[type=checkbox]') != null, 'functions as templates');

            //assert.equal(headers[1].innerHTML, 'ID');

            //assert.equal(headers[2].querySelector('label.table-sort'), null);

            //assert.ok(headers[5].querySelector('label.table-sort > input[value=SellStartDate]') != null);

            //assert.equal(headers[5].textContent, 'Sell Start Date');

            //assert.ok(headers[6].querySelector('label.table-sort > input[value=Name]') != null);

            //assert.equal(headers[6].textContent, 'Markup');

            //assert.equal(headers[8].textContent, 'Test Header');

            //assert.ok(headers[9].querySelector('input[type=checkbox]') != null);

            //assert.equal(headers[10].textContent, 'Test Header');

            //assert.ok(headers[10].querySelector('input[type=checkbox]') != null);

            done1();

        } );

    } );

} );

QUnit.test( 'gp.helpers.bodyCell', function ( assert ) {

    var done = assert.async();

    function testCells( cells ) {

        assert.ok( cells[0].querySelector( 'input[type=checkbox]' ) != null, 'there should be a checkbox' );

        assert.ok( cells[2].querySelector( 'span.glyphicon.glyphicon-ok' ) != null );

        assert.ok( cells[3].querySelector( 'button > span' ) != null );

        assert.equal( isNaN( parseInt( cells[3].textContent ) ), false, 'should be a number' );

    }

    var options = gp.shallowCopy( configOptions );
    options.fixedHeaders = true;
    options.sorting = true;

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

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

} );

QUnit.test( 'gp.helpers.footerCell', function ( assert ) {

    var done1 = assert.async(),
        done2 = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.fixedHeaders = true;
    options.sorting = true;

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            var cell = config.node.querySelector( '.table-body tfoot tr:first-child td.footer-cell:nth-child(1)' );

            assert.ok( cell.querySelector( 'input[type=checkbox]' ) != null )

            done1();

        } );

    } );


    options.fixedFooters = true;

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            cell = config.node.querySelector( '.table-footer tr:first-child td.footer-cell:nth-child(4)' );

            assert.equal( isNaN( parseFloat( cell.textContent ) ), false );

            // test a string template with a function reference
            var template = '<b>{{fns.average}}</b>';

            var result = gp.processFooterTemplate( template, config.Columns[0], data.products );

            assert.equal(result, '<b>10</b>')

            done2();

        } );

    } );



} );

QUnit.test( 'gp.ChangeMonitor', function ( assert ) {

    var model = {
        number: 1,
        date: '2015-01-01',
        bool: true,
        name: 'Todd'
    };

    $( div ).empty();

    div.append( '<input type="number" name="number" value="1" />' );
    div.append( '<input type="date" name="date" value="2015-01-01" />' );
    div.append( '<input type="checkbox" name="bool" value="true" checked />' );
    div.append( '<input type="checkbox" name="name" value="Todd" checked="checked" />' );
    div.append( '<input type="text" name="notInModel" value="text" />' );

    var done1 = assert.async();
    var done2 = assert.async();
    var done3 = assert.async();
    var done4 = assert.async();

    var monitor = new gp.ChangeMonitor( div[0], '[name]', model, function ( target, m ) {
        assert.equal( model.number, 2 );
        done1();
    } );

    var numberInput = div[0].querySelector( '[name=number]' );
    numberInput.value = '2';
    monitor.syncModel( numberInput, model );

    monitor.afterSync = function ( target, m ) {
        assert.ok( true, 'ChangeMonitor should call afterSync for values not present in the model.' );
        done2();
    };

    var textInput = div[0].querySelector( '[name=notInModel]' );
    textInput.value = 'more text';
    monitor.syncModel( textInput, model );
    assert.equal( 'notInModel' in model, false, 'ChangeMonitor should raise call afterSync for values not present in the model.' );


    monitor.beforeSync = function ( name, value, model ) {
        assert.equal( model.bool, true, 'beforeSync should return values before changing them' );
        done3();
    };

    monitor.afterSync = function ( target, m ) {
        assert.equal( model.bool, false, 'afterSync should return values after changing them' );
        done4();
    };

    var checkbox = div[0].querySelector( '[name=bool]' );
    checkbox.checked = false;
    monitor.syncModel( checkbox, model );

} );

QUnit.test( 'custom search filter', function ( assert ) {

    var done = assert.async();

    var event = new CustomEvent( 'change', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );

    var options = gp.shallowCopy( configOptions );
    options.fixedHeaders = true;
    options.sorting = true;
    options.searchFilter = 'fns.searchFilter';

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            //$( '#table .box' ).append( config.node );

            var productNumber = 'BA-8327';

            // find the search box
            var searchInput = config.node.querySelector( 'input[name=Search]' );

            console.log( config.node );

            searchInput.value = productNumber;

            assert.equal( config.SearchFunction, fns.searchFilter );

            // listen for the change event
            config.node.addEventListener( 'change', function ( evt ) {
                assert.equal( config.pageModel.Data.length, 1, 'Should filter a single record' );
                assert.equal( config.pageModel.Data[0].ProductNumber, productNumber, 'Should filter a single record' );
                done();
            } );

            // trigger a change event on the input
            searchInput.dispatchEvent( event );

        } );
    } );


} );

QUnit.test( 'editMode event', function ( assert ) {

    var done2 = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.fixedHeaders = true;
    options.sorting = true;

    getTableConfig( options, function ( config ) {

        var node = config.node;

        config.node.api.ready( function () {

            node.addEventListener( gp.events.editMode, function ( evt ) {
                assert.ok( evt != null );
                assert.ok( evt.detail != null );
                assert.ok( evt.detail.row != null );
                assert.ok( evt.detail.tableRow != null );
                done2();
            } );

            // trigger a click event on an edit button
            var btn = node.querySelector( 'button[value=Edit]' );

            var event = new CustomEvent( 'click', {
                'view': window,
                'bubbles': true,
                'cancelable': true
            } );

            btn.dispatchEvent( event );


        } );

    } );


} );

QUnit.test( 'edit and update', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.fixedHeaders = true;
    options.sorting = true;

    var clickEvent1 = new CustomEvent( 'click', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );

    var clickEvent2 = new CustomEvent( 'click', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );

    var changeEvent = new CustomEvent( 'change', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );

    getTableConfig( options, function ( config ) {

        var node = config.node;

        node.api.ready( function () {

            // find the SafetyStockLevel column
            var colIndex = -1;
            var col = node.config.Columns.filter( function ( col, index ) {
                if ( col.Field == "StandardCost" ) {
                    colIndex = index;
                    return true;
                }
                return false;
            } )[0];

            node.addEventListener( gp.events.editMode, function ( evt ) {
                assert.ok( evt != null );
                assert.ok( evt.detail != null );
                assert.ok( evt.detail.row != null );
                assert.ok( evt.detail.tableRow != null );
                // change some of the values
                var input = evt.target.querySelector( '[name=StandardCost]' )
                input.value = '5';
                input.dispatchEvent( ChangeEvent() );
                done1();
                var saveBtn = node.querySelector( 'button[value=Update]' );
                saveBtn.dispatchEvent( clickEvent2 );
            } );

            node.addEventListener( gp.events.afterUpdate, function ( evt ) {
                assert.ok( evt != null );
                assert.ok( evt.detail != null );
                assert.ok( evt.detail.Row != null );
                assert.strictEqual( evt.detail.Row.StandardCost, 5, 'change monitor should update the model' );

                // make sure the grid is updated with the correct value
                var updatedCellValue = evt.target.querySelector( 'td:nth-child(' + ( colIndex + 1 ) + ')' ).innerHTML;

                var expectedValue = gp.getFormattedValue( evt.detail.Row, col, true );

                assert.equal( updatedCellValue, expectedValue, 'grid should be updated with the correct value' );

                done2();
            } );

            // trigger a click event on an edit button
            var btn = node.querySelector( 'button[value=Edit]' );

            btn.dispatchEvent( clickEvent1 );

        } );

    } );



} );

QUnit.test( 'edit and cancel', function ( assert ) {

    var done1 = assert.async();
    var done2 = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.fixedHeaders = true;
    options.sorting = true;

    var clickEvent1 = new CustomEvent( 'click', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );

    var clickEvent2 = new CustomEvent( 'click', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    } );

    getTableConfig( options, function ( config ) {

        var node = config.node;

        node.api.ready( function () {

            node.addEventListener( gp.events.editMode, function ( evt ) {
                assert.ok( evt != null );
                assert.ok( evt.detail != null );
                assert.ok( evt.detail.row != null );
                assert.ok( evt.detail.tableRow != null );
                done1();
                var saveBtn = node.querySelector( 'button[value=Cancel]' );
                saveBtn.dispatchEvent( clickEvent2 );
            } );

            node.addEventListener( 'cancelEdit', function ( evt ) {
                assert.ok( evt != null );
                assert.ok( evt.detail != null );
                assert.ok( evt.detail.row != null );
                assert.ok( evt.detail.tableRow != null );
                done2();
            } );

            // trigger a click event on an edit button
            var btn = node.querySelector( 'button[value=Edit]' );

            btn.dispatchEvent( clickEvent1 );

        } );

    } );



} );

QUnit.test( 'Intl.DateTimeFormat', function ( assert ) {

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
    assert.equal( formatted, 'December 06, 15');

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

QUnit.test( 'Intl.NumberFormat', function ( assert ) {

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

QUnit.test( 'gp.prependChild', function ( assert ) {

    $( '#div1' ).empty();

    var child = document.createElement( 'span' );

    gp.prependChild( '#div1', child );

    var span = div[0].querySelector( 'span' );

    assert.equal( span, div[0].firstChild );

} );

QUnit.test( 'gp.createUID', function ( assert ) {

    var id, ids = {};

    for ( var i = 0; i < 100; i++ ) {
        id = gp.createUID();
        assert.ok( !(id in ids) );
        ids[id] = 1;
    }

} );

QUnit.test( 'readonly fields', function ( assert ) {

    var done = assert.async();

    var options = gp.shallowCopy( configOptions );
    options.fixedHeaders = true;
    options.sorting = true;

    getTableConfig( options, function ( config ) {

        var node = config.node;

        node.api.ready( function () {

            var readonlyColumns = config.Columns.filter( function ( col ) {
                return col.Readonly;
            } );

            assert.ok( readonlyColumns != null && readonlyColumns.length, 'should find a readonly column' );

            // use this index to locate the table cell
            var index = config.Columns.indexOf( readonlyColumns[0] );

            node.addEventListener( gp.events.editMode, function ( evt ) {
                var input = evt.target.querySelector( 'td:nth-child(' + ( index + 1 ).toString() + ') input' );
                assert.equal( input, null, 'there should not be an input' );
                done();
            } );

            // trigger a click event on an edit button
            var btn = node.querySelector( 'button[value=Edit]' );

            var event = new CustomEvent( 'click', {
                'view': window,
                'bubbles': true,
                'cancelable': true
            } );

            btn.dispatchEvent( event );

        } );

    } );

} );

QUnit.test( 'controller.render', function ( assert ) {

    var done1 = assert.async(),
        done2 = assert.async();

    function tests( config ) {
        var search = config.node.querySelector( '.table-toolbar input[name=Search]' );

        if ( config.Search ) {
            assert.ok( search != null, 'there should be a search box' );
        }
        else {
            assert.ok( search == null, 'there should be no search box' );
        }

        var pager = config.node.querySelector( '.table-pager input' );

        if ( config.Pager ) {
            assert.ok( pager != null, 'there should be a pager with some inputs in it' );
        }
        else {
            assert.ok( pager == null, 'there should be no pager' );
        }

        var addButton = config.node.querySelector( '.table-toolbar button[value=AddRow]' );

        if ( config.Create ) {
            assert.ok( addButton != null, 'there should be a button for adding new rows' );
        }
        else {
            assert.ok( addButton == null, 'there should not be a button for adding new rows' );
        }

        var columnWidthStyle = config.node.querySelector( 'style.column-width-style' );

        assert.ok( columnWidthStyle != null, 'column width styles should always render' );
    }

    var options = gp.shallowCopy( configOptions );
    options.fixedHeaders = true;
    options.fixedFooters = true;
    options.responsive = true;
    options.sorting = true;

    getTableConfig( options, function ( config ) {

        config.node.api.ready( function () {

            tests( config );

            done1();

        } );

    } );

    getTableConfig( null, function ( config ) {

        config.node.api.ready( function () {

            tests( config );

            done2();

        } );

    } );

} );

QUnit.test( 'gp.ObjectProxy', function ( assert ) {

    var row = data.products[0];

    var propertyChanged = false;

    var i;

    var propertyChangedCallback = function ( obj, prop, oldValue, newValue ) {
        propertyChanged = true;
        assert.strictEqual( newValue, i, 'propertyChanged: oldValue = ' + oldValue + '  newValue = ' + newValue );
    };

    var proxy = new gp.ObjectProxy( row, propertyChangedCallback );

    var props = Object.getOwnPropertyNames( row );

    props.forEach( function ( prop ) {
        assert.equal( row[prop], proxy[prop], 'object and its proxy should have identical properties' );
        proxy[prop] = i = !row[prop];
        assert.notStrictEqual( row[prop], proxy[prop], 'changing proxy should not effect original object' );
    } );

    assert.equal( propertyChanged, true, 'propertyChangedCallback should be called' );

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