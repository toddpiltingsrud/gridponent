$( '#grid1 [data-toggle="popover"]' ).each( function ( index ) {
    var filterBoxTemplate = $( '#filter-box' ).html();
    var filterBox = gridponent.supplant( filterBoxTemplate, {
        field: this.name,
        tabIndex: index + 1
    } );
    $( this ).popover( {
        placement: 'bottom',
        html: true,
        content: $( filterBox )
    } );
} );
$( '#grid1' ).on( 'change', '.filter-box input', function () {
    if ( this.value.length > 0 ) {
        if ( this.name != 'search' ) {
            $( '#grid1 [name=search]' ).val( '' );
        }
        else {
            hidePopovers( true );
        }
    }
    gridponent( '#gridCustomers' ).refresh();
} );
$( '#grid1' ).on( 'click', '.filter-box button', function () {
    gridponent( '#grid1' ).refresh();
} );


<gp-column field="FirstName" width="12%">
    <script type="text/html" data-template="header">
        <a href="javascript:void(0);" data-toggle="popover" name="FirstName" style="outline:none;">
            First
            <span class="glyphicon glyphicon-filter"></span>
        </a>
    </script>
</gp-column>


<script type="text/html" id="filter-box">
    <div class="input-group filter-box" style="width: 180px;">
        <input name="{{field}}" class="form-control" type="text" placeholder="Search for..." tabindex="{{tabIndex}}">
        <span class="input-group-btn">
            <button class="btn btn-default" type="button">
                <span class="glyphicon glyphicon-search"></span>
            </button>
        </span>
    </div>
</script>
