
/**
 * Determines what/if compression is supported for a request
 *
 * @method compression
 * @param  {String} agent    User-Agent header value
 * @param  {String} encoding Accept-Encoding header value
 * @param  {String} mimetype Mime type of response body
 * @return {Mixed}           Supported compression or null
 */
TurtleIO.prototype.compression = function ( agent, encoding, mimetype ) {
	var result    = null,
	    encodings = typeof encoding == "string" ? encoding.explode() : [];

	// Safari can't handle compression for proxies (socket doesn't close) or on an iDevice for simple GETs
	if ( this.config.compress === true && REGEX_COMP.test( mimetype ) && !REGEX_IE.test( agent ) && !REGEX_IDEVICE.test( agent ) && ( !REGEX_SAFARI.test( agent ) || REGEX_CHROME.test( agent ) ) ) {
		// Iterating supported encodings
		encodings.each( function ( i ) {
			if ( REGEX_GZIP.test( i ) ) {
				result = "gz";
			}
			else if ( REGEX_DEF.test( i ) ) {
				result = "zz";
			}

			// Found a supported encoding
			if ( result !== null ) {
				return false;
			}
		} );
	}

	return result;
};
