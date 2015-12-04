/***************\
 main component
\***************/
//gp.Table = function (node) {

//    var i = new gp.Initializer(node);

//    this.config = i.config;
//    //this.initialize(node);
//};

if (document.registerElement) {

    gp.Table = Object.create(HTMLElement.prototype);

    //gp.Table.constructor = gp.Table;

    gp.Table.createdCallback = function () {
        gp.info(this);
        new gp.Initializer(this);
    };

    document.registerElement('grid-ponent', {
        prototype: gp.Table
    });
}
else {
    gp.Table = Object.create(Object.prototype);

    //gp.Table.constructor = gp.Table;

    gp.ready(function () {
        var node, nodes = document.querySelectorAll('grid-ponent');
        for (var i = 0; i < nodes.length; i++) {
            node = nodes[i];
            new gp.Initializer(node);
        }
    });
}

gp.Table.api = {
    filter: function (obj) {
        // obj is either a search term or a function 
    },
    sort: function (obj) {
        // obj is either a function or a sort expression
    },
    getPage: function(index) {

    },
    create: function (row) {

    },
    read: function (page) {
        // page is an object specifying sort, search, page, etc.
        // if not supplied, read acts like a refresh function
    },
    update: function (index, row) {

    },
    destroy: function(index) {

    }
};