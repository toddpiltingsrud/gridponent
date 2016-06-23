/***************\
     http        
\***************/
gp.Http = function () { };

gp.Http.prototype = {
    get: function ( url, callback, error ) {
        $.get( url ).done( callback ).fail( error );
    },
    post: function ( url, data, callback, error ) {
        this.ajax( url, data, callback, error, 'POST' );
    },
    destroy: function ( url, data, callback, error ) {
        this.ajax( url, data, callback, error, 'DELETE' );
    },
    ajax: function ( url, data, callback, error, httpVerb ) {
        $.ajax( {
            url: url,
            type: httpVerb.toUpperCase(),
            data: data,
            contentType: 'application/x-www-form-urlencoded; charset=UTF-8'
        } )
            .done( callback )
            .fail( function ( response ) {
                // filter out authentication errors, those are usually handled by the browser
                if ( response.status
                    && /^(4\d\d|5\d\d)/.test( response.status )
                    && /401|403|407/.test( response.status ) == false
                    && typeof error == 'function') {
                    error( response );
                }
            } );
    }

};
