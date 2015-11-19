/***************\
 component base 
\***************/
gp.ComponentBase = Object.create(HTMLElement.prototype);

gp.ComponentBase.initialize = function () {
    this.config = gp.getConfig(this);
    return this;
};

gp.ComponentBase.createdCallback = function () {
    this.initialize();
};
