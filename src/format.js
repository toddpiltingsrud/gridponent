/***************\
   formatter
\***************/

// Use moment.js to format dates.
// Use numeral.js to format numbers.
(function () {

    gp.Formatter = function () {};

    gp.Formatter.prototype = {
        format: function (val, format) {
            var type = gp.getType( val );

            if ( /^(date|dateString)$/.test(  type ) ) {
                return moment(val).format( format );
            }
            if ( type === 'number' ) {
                // numeral's defaultFormat option doesn't work as of 3/25/2016
                format = format || '0,0';
                return numeral( val ).format( format );
            }

            return val;
        }
    };

})();
