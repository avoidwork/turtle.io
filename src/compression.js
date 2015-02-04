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

	// Safari can't handle compression for proxies (socket doesn't close) or on an iDevice for simple GETs
	if ( this.config.compress === true && REGEX.comp.test( mimetype ) && !REGEX.ie.test( agent ) && !REGEX.idevice.test( agent ) && ( !REGEX.safari.test( agent ) || REGEX.chrome.test( agent ) ) ) {
		// Iterating supported encodings
		array.each( encodings, ( i ) => {
			if ( REGEX.gzip.test( i ) ) {
				result = "gz";
			}
			else if ( REGEX.def.test( i ) ) {
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
