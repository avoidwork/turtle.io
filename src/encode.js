/**
 * Encodes `arg` as JSON if applicable
 *
 * @method encode
 * @param  {Mixed}  arg    Object to encode
 * @param  {String} accept Accept HTTP header
 * @return {Mixed}         Original Object or JSON string
 */
encode ( arg, accept ) {
	let header, indent;

	// Do not want to coerce this Object to a String!
	if ( arg instanceof Buffer || typeof arg.pipe == "function" ) {
		return arg;
	}
	// Converting to JSON
	else if ( arg instanceof Array || arg instanceof Object ) {
		header = regex.indent.exec( accept );
		indent = header !== null ? parseInt( header[ 1 ], 10 ) : this.config.json;

		return JSON.stringify( arg, null, indent );
	}
	// Nothing to do, leave it as it is
	else {
		return arg;
	}
}
