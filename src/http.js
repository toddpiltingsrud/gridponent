/***************\
     http        
\***************/
gp.Http = function () { };

gp.Http.prototype = {
    get: function ( url, data, callback, error ) {
        $.get( url, data ).done( callback ).fail( error );
    },
    post: function ( url, data, callback, error ) {
        this.ajax( url, data, callback, error, 'POST' );
    },
    destroy: function ( url, callback, error ) {
        this.ajax( url, null, callback, error, 'DELETE' );
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
                if ( response.status ) {
                    // don't know why jQuery calls fail on DELETE
                    if ( response.status == 200 ) {
                        callback( response );
                        return;
                    }
                    // filter out authentication errors, those are usually handled by the browser
                    if ( /401|403|407/.test( response.status ) == false && typeof error == 'function' ) {
                        error( response );
                    }
                }
            } );
    }

};
