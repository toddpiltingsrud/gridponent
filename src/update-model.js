/***************\
   UpdateModel
\***************/
gp.UpdateModel = function ( row, validationErrors ) {

    this.Row = row;
    this.ValidationErrors = validationErrors;
    this.Original = gp.shallowCopy( row );

};
