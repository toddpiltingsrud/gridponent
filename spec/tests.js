var test = test || {};

Object.defineProperty(test, 'log', {
    get: function () {
        // switch console logging on and off with a url parameter
        if (window.location.search.indexOf('log') !== -1 && window.console) {
            // this is so sexy
            return window.console.log.bind(window.console);
        }
    }
});

QUnit.test("qunit init", function (assert) {
    assert.ok(true, "QUnit is initialized");
});

