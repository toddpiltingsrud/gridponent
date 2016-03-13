/***************\
   formatter
\***************/

// This is a wrapper for the Intl global object.
// It allows the use of common format strings for dates and numbers.
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl
(function () {

    // IE inserts unicode left-to-right-mark characters into the formatted string, 
    // causing the length property to return invalid results, even though the strings look the same.
    // This is unacceptable because it makes equality operations fail.
    var ltr = /\u200E/g;

    // constructing Intl.DateTimeFormat objects is resource intensive, so cache them by format, locale, and currencyCode
    var dateTimeFormatCache = {};
    var numberFormatCache = {};

    gp.defaultLocale = 'en-US';

    gp.defaultCurrencyCode = 'USD';

    gp.Formatter = function (locale, currencyCode) {
        this.locale = locale || gp.defaultLocale;
        this.currencyCode = currencyCode || gp.defaultCurrencyCode;
        this.supported = (window.Intl !== undefined);
        if (!this.supported) gp.log('Intl internationalization not supported');
    };

    gp.Formatter.prototype = {
        format: function (val, format) {
            var key, dtf, nf, type, options, dt;
            if (!this.supported || !gp.hasValue(val)) return val;

            type = gp.getType(val);
            key = (format || '') + '|' + this.locale + '|' + this.currencyCode;

            if (type === 'date') {
                if (key in dateTimeFormatCache) {
                    dtf = dateTimeFormatCache[key];
                }
                else {
                    options = getDateTimeFormatOptions(format);

                    dtf = new Intl.DateTimeFormat(this.locale, options)

                    dateTimeFormatCache[key] = dtf;
                }
                return dtf.format(val).replace(ltr, '');
            }
            if (type === 'dateString') {
                var parts = val.match( /\d+/g );
                if ( parts.length >= 6 ) {
                    dt = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
                }
                else {
                    dt = new Date( parts[0], parts[1] - 1, parts[2] );
                }

                if (key in dateTimeFormatCache) {
                    dtf = dateTimeFormatCache[key];
                }
                else {
                    options = getDateTimeFormatOptions(format);

                    dtf = new Intl.DateTimeFormat(this.locale, options)

                    dateTimeFormatCache[key] = dtf;
                }
                return dtf.format(dt).replace(ltr, '');
            }
            if (type === 'number') {
                if (key in numberFormatCache) {
                    nf = numberFormatCache[key];
                }
                else {
                    options = getNumberFormatOptions(format, this.currencyCode);
                    nf = new Intl.NumberFormat(this.locale, options);
                    numberFormatCache[key] = nf;
                }
                return nf.format(val).replace(ltr, '');
            }

            return val;
        }
    };

    var dateTimeTokens = [
        [/yyyy/g, 'year', 'numeric'],
        [/yy/g, 'year', '2-digit'],
        [/MMMM/g, 'month', 'long'],
        [/MMM/g, 'month', 'short'],
        [/MM/g, 'month', '2-digit'],
        [/M/g, 'month', 'numeric'],
        [/dd/g, 'day', '2-digit'],
        [/d/g, 'day', 'numeric'],
        [/HH/g, 'hour', '2-digit', 'hour24'],
        [/H/g, 'hour', 'numeric', 'hour24'],
        [/hh/g, 'hour', '2-digit', 'hour12'],
        [/h/g, 'hour', 'numeric', 'hour12'],
        [/mm/g, 'minute', '2-digit'],
        [/m/g, 'minute', 'numeric'],
        [/ss/g, 'second', '2-digit'],
        [/s/g, 'second', 'numeric'],
        [/www/g, 'weekday', 'long'],
        [/ww/g, 'weekday', 'short'],
        [/w/g, 'weekday', 'narrow'],
        [/eee/g, 'era', 'long'],
        [/ee/g, 'era', 'short'],
        [/e/g, 'era', 'narrow'],
        [/tt/g, 'timeZoneName', 'long'],
        [/t/g, 'timeZoneName', 'short']
    ];

    function getDateTimeFormatOptions(format) {
        var options = {};

        if (gp.hasValue(format)) {

            dateTimeTokens.forEach(function (token) {
                if (!(token[1] in options) && format.match(token[0])) {
                    options[token[1]] = token[2];
                    if ( token.length === 4 ) {
                        // set hour12 to true|false
                        options.hour12 = (token[3] === 'hour12');
                    }
                }
            });

        }

        return options;
    }

    var numberTokens = [
        [/N/, 'style', 'decimal'],
        [/P/, 'style', 'percent'],
        [/C/, 'style', 'currency']
    ];

    function getNumberFormatOptions(format, currencyCode) {
        var options = {};

        if (gp.hasValue(format)) {

            numberTokens.forEach(function (token) {
                if (!(token[1] in options) && format.match(token[0])) {
                    options[token[1]] = token[2];
                    if (token[2] === 'currency') {
                        options.currency = currencyCode;
                    }
                }
            });
            var digits = format.match(/\d+/);
            if (digits) {
                options.minimumFractionDigits = options.maximumFractionDigits = parseInt(digits);
            }
        }

        return options;
    }

})();
