/**
 * Determines what/if compression is supported for a request
 *
 * @method compression
 * @param  {String} agent    User-Agent header value
 * @param  {String} encoding Accept-Encoding header value
 * @param  {String} mimetype Mime type of response body
 * @return {Mixed}           Supported compression or null
 */
compression ( agent, encoding, mimetype ) {
	let timer = precise().start(),
		result = null,
		encodings = typeof encoding == "string" ? string.explode( encoding ) : [];

	// No soup for IE!
	if ( this.config.compress === true && regex.comp.test( mimetype ) && !regex.ie.test( agent ) ) {
		// Iterating supported encodings
		array.iterate( encodings, ( i ) => {
			if ( regex.gzip.test( i ) ) {
				result = "gz";
			}

			if ( regex.def.test( i ) ) {
				result = "zz";
			}

			// Found a supported encoding
			if ( result !== null ) {
				return false;
			}
		} );
	}

	timer.stop();

	this.signal( "compression", () => {
		return [ agent, timer.diff() ];
	} );

	return result;
}
