/***************\
  CustomEvent
\***************/
(function () {

    function CustomEvent(event, params) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent('CustomEvent');
        evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
        return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;

} )();


//gp.raiseCustomEvent = function ( node, name, detail ) {
//    var event = new CustomEvent( name, { bubbles: true, detail: detail, cancelable: true } );
//    node.dispatchEvent( event );
//    return event;
//};

