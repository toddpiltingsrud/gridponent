/***************\
 component base 
\***************/
tp.ComponentBase = Object.create(HTMLElement.prototype);

tp.ComponentBase.initialize = function () {
    this.config = tp.getConfig(this);
    return this;
};


tp.ComponentBase.createdCallback = function () {
    this.initialize();
};
