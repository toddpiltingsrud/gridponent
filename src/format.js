/***************\
   formatter
\***************/

// Use moment.js to format dates.
// Use numeral.js to format numbers.
gp.Formatter = function () {};

gp.Formatter.prototype = {
    format: function (val, format) {
        var type = gp.getType( val );

        try {
            if ( /^(date|datestring)$/.test( type ) ) {
                format = format || 'M/D/YYYY H:mm a';
                return moment( val ).format( format );
            }
            if ( type === 'timestamp' ) {
                format = format || 'M/D/YYYY H:mm a';
                val = parseInt( val.match( gp.rexp.timestamp )[1] );
                return moment( val ).format( format );
            }
            if ( type === 'number' ) {
                // numeral's defaultFormat option doesn't work as of 3/25/2016
                format = format || '0,0';
                return numeral( val ).format( format );
            }
        }
        catch ( e ) {
            gp.error( e );
        }
        return val;
    }
};
