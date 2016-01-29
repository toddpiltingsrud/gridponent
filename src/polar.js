/***************\
     polar
\***************/
(function () {

    var testers = [];

    var timeout = null;

    var poll = function () {

        testers.forEach(function (testor) {
            testor.test();
        });

        if (testers.length) {
            timeout = setTimeout(poll, 250);
        }
        else {
            timeout = null;
        }
    };

    gp.polar = function (fn, val, callback) {

        testers.push(new gp.testor(fn, val, callback));

        if (timeout === null) {
            poll();
        }

        this.stop = function () {
            if (timeout != null) {
                clearTimeout(timeout);
            }
            if (testers.length) {
                testers.splice(0, testers.length);
            }
        };

    };

    gp.testor = function (test, val, callback) {
        var result, index;

        try {
            this.test = function () {
                result = test();
                if (result == val) {
                    callback(result);
                    index = testers.indexOf(this);
                    if (index !== -1) {
                        testers.splice(index, 1);
                    }
                }
            };
        }
        catch (ex) {
            index = testers.indexOf(this);
            if (index !== -1) {
                testers.splice(index, 1);
            }
            gp.error( ex );
        }
    };

})();