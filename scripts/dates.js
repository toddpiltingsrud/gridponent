(function () {

    var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    String.prototype.padLeft = String.prototype.padLeft || function (length, chr) {
        chr = chr || ' ';
        var str = this;
        while (str.length < length)
            str = chr + str;
        return str;
    };

    String.prototype.right = String.prototype.right || function (n) {
        return this.substring(this.length - n);
    };

    Date.prototype.addDays = Date.prototype.addDays || function (days) {
        var dt = new Date(this);
        dt.setDate(this.getDate() + days);
        return dt;
    };

    Date.prototype.addMonths = Date.prototype.addMonths || function (months) {
        var dt = new Date(this);
        dt.setMonth(this.getMonth() + months);
        return dt;
    };

    Date.prototype.getDayName = Date.prototype.getDayName || function () {
        return dayNames[this.getDay()];
    };

    Date.prototype.getMonthName = Date.prototype.getMonthName || function () {
        return monthNames[this.getMonth()];
    };

    Date.prototype.format = Date.prototype.format || function (format) {
        if (format == "d")
            return this.toShortDateString();

        if (format == "D")
            return this.toLongDateString();

        if (format == "t")
            return this.toShortTimeString();

        if (format == "T")
            return this.toLongTimeString();

        var y = this.getFullYear();
        var m = this.getMonth() + 1;
        var d = this.getDate();
        var h = this.getHours();
        var n = this.getMinutes();
        var s = this.getSeconds();
        var f = this.getMilliseconds();
        var w = this.getDay();

        format = format
            .replace('yyyy', y)
            .replace('yy', y.toString().right(2))
            .replace('ss', s.toString().padLeft(2, '0'))
            .replace('s', s)
            .replace('f', f)
            .replace('mm', n.toString().padLeft(2, '0'))
            .replace('m', n)
            .replace('HH', h.toString().padLeft(2, '0'))
            .replace('H', h)
            .replace('hh', (h > 12 ? h - 12 : h).toString().padLeft(2, '0'))
            .replace('h', (h > 12 ? h - 12 : h))
            //replace conflicting tokens with alternate tokens
            .replace('tt', (h > 11 ? '>>' : '<<'))
            .replace('t', (h > 11 ? '##' : '$$'))
            .replace('MMMM', '!!')
            .replace('MMM', '@@')
            .replace('MM', m.toString().padLeft(2, '0'))
            .replace('M', m)
            .replace('dddd', '^^')
            .replace('ddd', '&&')
            .replace('dd', d.toString().padLeft(2, '0'))
            .replace('d', d)
            //replace alternate tokens
            .replace('>>', 'PM')
            .replace('<<', 'AM')
            .replace('##', 'P')
            .replace('$$', 'A')
            .replace('!!', this.getMonthName())
            .replace('@@', this.getMonthName().substring(0, 3))
            .replace('^^', this.getDayName())
            .replace('&&', this.getDayName().substring(0, 3));

        return format;
    };

    Date.prototype.toLongDateString = Date.prototype.toLongDateString || function () {
        return this.format('dddd, MMMM d, yyyy');
    };

    Date.prototype.toShortDateString = Date.prototype.toShortDateString || function () {
        return this.format('M/d/yyyy');
    };

    Date.prototype.toLongTimeString = Date.prototype.toLongTimeString || function () {
        return this.format('h:mm:ss tt');
    };

    Date.prototype.toShortTimeString = Date.prototype.toShortTimeString || function () {
        return this.format('h:mm tt');
    };

})();

var isDate = function (val) {
    if (val instanceof Date)
        return true;
    var d = new Date(val);
    return (!(isNaN(d)));
};

var parseDate = function (dt) {
    var s = (/-?\d+/).exec(dt);
    if (s != null) {
        var d1 = new Date(parseInt(s[0])).toUTCString().replace("UTC", "");
        return new Date(d1);
    }
    else
        return null;
};

var processDates = function (data, cols) {
    if (data.length > 0) {
        cols = cols || Object.getOwnPropertyNames(data[0]);
        data.forEach(function (row) {
            cols.forEach(function (col) {
                var dt = parseDate(row[col]);
                if (dt != null) {
                    row[col] = dt.toShortDateString();
                }
            });
        })
    }
    return data;
};
