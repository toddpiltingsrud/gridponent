/***************\
   UpdateModel
\***************/
gp.UpdateModel = function ( dataItem, validationErrors ) {

    this.dataItem = dataItem;
    this.errors = validationErrors;
    this.original = gp.shallowCopy( dataItem );

};
