/**
 * Determines which verbs are allowed against a URL
 * 
 * @method allows
 * @param  {String} url  URL to query
 * @param  {String} host Hostname
 * @return {String}      Allowed methods
 */
var allows = function ( uri, host ) {
	var result = "",
	    verbs  = ["DELETE", "GET", "POST", "PUT", "PATCH"],
	    timer  = new Date();

	verbs.each( function ( i ) {
		if ( allowed( i, uri, host ) ) result += ( result.length > 0 ? ", " : "" ) + i;
	});

	result = result.replace( "GET", "GET, HEAD, OPTIONS" );

	dtp.fire( "allows", function ( p ) {
		return [host, uri, diff( timer )];
	});

	return result;
};
