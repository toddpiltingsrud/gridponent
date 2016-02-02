﻿/***************\
     model
\***************/
gp.Model = function ( config ) {
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
        var self = this;
        gp.info( 'Model.read: requestModel:', requestModel );

        gp.raiseCustomEvent( this.config.node, gp.events.beforeRead, requestModel );

        this.dal.read( requestModel, function (arg) {
            gp.raiseCustomEvent( self.config.node, gp.events.afterRead, requestModel );
            callback(arg);
        } );
    },

    create: function (callback) {
        var self = this;
        gp.raiseCustomEvent( this.config.node, gp.events.beforeCreate );

        if (typeof this.config.Create === 'function') {
            this.config.Create(function (row) {
                if (self.config.data.Data && self.config.data.Data.push) {
                    self.config.data.Data.push(row);
                }
                gp.raiseCustomEvent( self.config.node, gp.events.afterCreate, row );
                callback( row );
            });
        }
        else {
            // ask the server for a new record
            var http = new gp.Http();
            http.get(this.config.Create, function (row) {
                if (self.config.data.Data && self.config.data.Data.push) {
                    self.config.data.Data.push(row);
                }
                gp.raiseCustomEvent( self.config.node, gp.events.afterCreate, row );
                callback( row );
            });
        }
    },

    update: function (row, callback) {
        var self = this;
        gp.raiseCustomEvent( this.config.node, gp.events.beforeUpdate );
        if ( typeof this.config.Update === 'function' ) {
            this.config.Update( row, function (arg) {
                gp.raiseCustomEvent( self.config.node, gp.events.afterUpdate );
                callback(arg);
            } );
        }
        else {
            var http = new gp.Http();
            http.post( this.config.Update, row, function (arg) {
                gp.raiseCustomEvent( self.config.node, gp.events.afterUpdate );
                callback( arg );
            } );
        }
    },

    destroy: function (row, callback) {
        var self = this;
        gp.raiseCustomEvent( this.config.node, gp.events.beforeDestroy );
        if ( typeof this.config.Destroy === 'function' ) {
            this.config.Destroy( row, function ( arg ) {
                gp.raiseCustomEvent( self.config.node, gp.events.afterDestroy );
                callback( arg );
            } );
        }
        else {
            var http = new gp.Http();
            http.post( this.config.Destroy, row, function ( arg ) {
                gp.raiseCustomEvent( self.config.node, gp.events.afterDestroy );
                callback( arg );
            } );
        }
    }

};