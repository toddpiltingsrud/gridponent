/***************\
 main component
\***************/
gp.Initializer = function (node) {
    this.initialize(node);
};

gp.Initializer.prototype = {

    initialize: function (node) {
        var self = this;
        this.config = this.getConfig(node);
        node.config = this.config;
        gp.info(this.config);
        new gp.Controller(self.config);
    },

    getConfig: function (node) {
        var self = this;
        var config = gp.getConfig(node);
        config.Columns = [];
        config.data = {};
        config.ID = gp.createUID();
        for (var i = 0; i < node.children.length; i++) {
            var col = node.children[i];
            var colConfig = gp.getConfig(col);
            config.Columns.push(colConfig);
            this.resolveCommands(colConfig);
            this.resolveTemplates(colConfig);
        }
        config.Footer = this.resolveFooter(config);
        var options = 'Onrowselect SearchFilter DataSource Read Create Update Destroy'.split(' ');
        options.forEach(function (option) {
            gp.resolveObject(config, option);
        });
        gp.info(config);
        return config;
    },

    resolveFooter: function (config) {
        for (var i = 0; i < config.Columns.length; i++) {
            if (config.Columns[i].FooterTemplate) return true;
        }
        return false;
    },

    resolveTemplates: function (column) {
        var props = 'HeaderTemplate Template EditTemplate FooterTemplate'.split(' ');
        props.forEach(function (prop) {
            column[prop] = gp.resolveTemplate(column[prop]);
        });
    },

    resolveCommands: function (col) {
        if (col.Commands) {
            col.Commands = col.Commands.split(',');
        }
    },

    resolveTypes: function (config) {
        config.Columns.forEach(function (col) {
            for (var i = 0; i < config.data.Data.length; i++) {
                if (config.data.Data[i][col.Field] !== null) {
                    col.Type = gp.getType(config.data.Data[i][col.Field]);
                    break;
                }
            }
        });
    }
};