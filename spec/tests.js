var div = null;

$(function () {
    div = $('<div id="div1"></div>').appendTo('body');
});

var gridponent = gridponent || {};

var gp = gridponent;

QUnit.test("gp.getConfig", function (assert) {

    var elem = $('<tp-custom-element bool="true" number="1" string="my string" novalue></tp-custom-element>');

    var config = gp.getConfig(elem[0]);

    assert.equal(config.Bool, true, "should resolve bools");

    assert.equal(config.Number, "1", "should not resolve numbers");

    assert.equal(config.String, "my string", "should resolve strings");

    assert.equal(config.Novalue, true, "empty values should be resolve to true");
});

QUnit.test("gp.coalesce", function (assert) {

    assert.equal(gp.coalesce([null, undefined]), undefined);

    assert.equal(gp.coalesce([null, undefined, false]), false);

    assert.equal(gp.coalesce([null, undefined, '']), '');

    assert.equal(gp.coalesce([null, '', undefined]), '');

    assert.equal(gp.coalesce([0, '', undefined]), 0);

    assert.equal(gp.coalesce(null), null);

    var emptyArray = [];

    assert.equal(gp.coalesce(emptyArray), emptyArray);
});

QUnit.test("gp.getType", function (assert) {
    var notDefined = gp.getType(notDefined);
    assert.equal(gp.getType(true), 'boolean');
    assert.equal(gp.getType(null), null);
    assert.equal(gp.getType(new Date()), 'date');
    assert.equal(gp.getType('2015-11-24'), 'date');
    assert.equal(gp.getType('2015-31-24'), 'string');
    assert.equal(notDefined, undefined);
    assert.equal(gp.getType(3.0), 'number');
    assert.equal(gp.getType({}), 'object');
    assert.equal(gp.getType([]), 'array');
});

QUnit.test("gp.closest", function (assert) {

    var body = gp.closest(div[0], 'body');

    assert.ok(body !== undefined);

});

QUnit.test("gp.resolveObjectPath", function (assert) {

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

    var val = gp.resolveObjectPath('window.location.search');
    assert.equal(val, window.location.search);

    val = gp.resolveObjectPath('window.location.search[0]');
    assert.equal(val, window.location.search[0]);

    val = gp.resolveObjectPath('window.location["search"]');
    assert.equal(val, window.location.search);

    val = gp.resolveObjectPath('window.location["search"][0]');
    assert.equal(val, window.location.search[0]);

    val = gp.resolveObjectPath('window.location["search"][0]');
    assert.equal(val, window.location.search[0]);

    val = gp.resolveObjectPath('testobj[indexer]');
    assert.equal(val, window.testobj.search);

    val = gp.resolveObjectPath('testobj.array[1]');
    assert.equal(val, window.testobj.array[1]);

    val = gp.resolveObjectPath('testobj["search"]');
    assert.equal(val, window.testobj.search);

    val = gp.resolveObjectPath('testobj["num"]');
    assert.equal(val, 1);

    val = gp.resolveObjectPath('testobj["search"][0]');
    assert.equal(val, window.testobj.search[0]);

    val = gp.resolveObjectPath('testobj[indexer]');
    assert.equal(val, window.testobj.search);

});

var fns = fns || {};

fns.checkbox = function (col) {
    return '<input type="checkbox" name="test" />';
}

var getTableConfig = function (fixedHeaders, fixedFooters, responsive, sorting) {
    div.append('<script type="text/html" id="headerTemplate1">Test Header</script>');
    div.append('<script type="text/html" id="headerTemplate2"><input type="checkbox"/></script>');
    div.append('<script type="text/html" id="headerTemplate3">Test Header<input type="checkbox"/></script>');

    var out = [];

    out.push('<grid-ponent paging="bottom-right" ');
    if (fixedHeaders) out.push(' fixed-headers');
    if (fixedFooters) out.push(' fixed-footers="true"');
    if (responsive)   out.push(' responsive="true"');
    if (sorting)      out.push(' sorting ');
    out.push('             style="width:100%;height:411px" ');
    out.push('             search="top-left"');
    out.push('             oncreated="fns.getData"');
    out.push('             update="/Products/Update"');
    out.push('             destroy="/Products/Destroy">');
    out.push('    <gp-column header-template="fns.checkbox" template="fns.checkbox"></gp-column>');
    out.push('    <gp-column header="ID" template="fns.getName" edit-template="fns.dropdown"></gp-column>');
    out.push('    <gp-column field="MakeFlag" header="Make" width="75px"></gp-column>');
    out.push('    <gp-column field="SafetyStockLevel" header="Safety Stock Level" footer-template="fns.average"></gp-column>');
    out.push('    <gp-column field="StandardCost" header="Standard Cost" footer-template="fns.average"></gp-column>');
    out.push('    <gp-column field="SellStartDate" sort header="Sell Start Date" format="d MMMM, yyyy"></gp-column>');
    out.push('    <gp-column field="Markup" sort="Name"></gp-column>');
    out.push('    <gp-column commands="Edit,Delete"></gp-column>');
    out.push('    <gp-column header-template="#headerTemplate1"></gp-column>');
    out.push('    <gp-column header-template="#headerTemplate2"></gp-column>');
    out.push('    <gp-column header-template="#headerTemplate3"></gp-column>');
    out.push('</grid-ponent>');

    // if we have web component support, this line will initialize the component automatically
    // otherwise we need to trigger initialization manually
    var $node = $(out.join(''));

    var config = $node[0].config;

    if (!config) {
        var table = new gp.Table($node[0]);
        config = table.config;
    }

    return config;
};

QUnit.test("gp.Table.getConfig", function (assert) {

    var config = getTableConfig(true, false, false, true);

    assert.equal(config.Sorting, true);

    assert.equal(config.FixedHeaders, true);

    assert.equal(config.Sorting, true);

    assert.equal(config.Columns.length, 11);

    assert.equal(config.Columns[1].Header, "ID");

});

QUnit.test("gp.helpers.thead", function (assert) {

    function testHeaders(headers) {
        assert.ok(headers[0].querySelector('input[type=checkbox]') != null);

        assert.equal(headers[1].innerHTML, 'ID');

        assert.ok(headers[2].querySelector('label.table-sort > input[type=checkbox]') != null);

        assert.equal(headers[6].querySelector('label.table-sort').innerText, 'Markup');

        assert.equal(headers[8].innerText, 'Test Header');

        assert.ok(headers[9].querySelector('input[type=checkbox]') != null);

        assert.equal(headers[10].innerText, 'Test Header');

        assert.ok(headers[10].querySelector('input[type=checkbox]') != null);
    }

    // fixed headers, with sorting
    var node = getTableConfig(true, false, false, true).node;

    var headers = node.querySelectorAll('div.table-header th.header-cell');

    testHeaders(headers);

    // no fixed headers, with sorting
    node = getTableConfig(false, false, false, true).node;

    headers = node.querySelectorAll('div.table-body th.header-cell');

    testHeaders(headers);

    // no fixed headers, no sorting
    node = getTableConfig(false, false, false, false).node;

    headers = node.querySelectorAll('div.table-body th.header-cell');

    assert.ok(headers[0].querySelector('input[type=checkbox]') != null);

    assert.equal(headers[1].innerHTML, 'ID');

    assert.equal(headers[2].querySelector('label.table-sort'), null);

    assert.ok(headers[5].querySelector('label.table-sort > input[value=SellStartDate]') != null);

    assert.equal(headers[5].innerText, 'Sell Start Date');

    assert.ok(headers[6].querySelector('label.table-sort > input[value=Name]') != null);

    assert.equal(headers[6].innerText, 'Markup');

    assert.equal(headers[8].innerText, 'Test Header');

    assert.ok(headers[9].querySelector('input[type=checkbox]') != null);

    assert.equal(headers[10].innerText, 'Test Header');

    assert.ok(headers[10].querySelector('input[type=checkbox]') != null);

});

QUnit.test("gp.helpers.tableRows", function (assert) {

    var node = getTableConfig(true, false, false, true).node;

});

