/**
 * Encodes `obj` as JSON if applicable
 *
 * @param  {Mixed} obj Object to encode
 * @return {Mixed}     Original Object or JSON string
 */
var encode = function ( obj ) {
	var result;

	// Do not want to coerce this Object to a String!
	if ( obj instanceof Buffer ) {
		result = obj;
	}
	// Converting to JSON
	else if ( obj instanceof Array || obj instanceof Object ) {
		result = $.encode( obj );
	}
	// Nothing to do, leave it as it is
	else {
		result = obj;
	}

	return result;
};
