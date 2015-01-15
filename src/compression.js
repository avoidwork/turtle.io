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
	var timer = precise().start(),
		result = null,
		encodings = typeof encoding == "string" ? string.explode( encoding ) : [];

	// Safari can't handle compression for proxies (socket doesn't close) or on an iDevice for simple GETs
	if ( this.config.compress === true && regex.comp.test( mimetype ) && !regex.ie.test( agent ) && !regex.idevice.test( agent ) && ( !regex.safari.test( agent ) || regex.chrome.test( agent ) ) ) {
		// Iterating supported encodings
		array.each( encodings, function ( i ) {
			if ( regex.gzip.test( i ) ) {
				result = "gz";
			}
			else if ( regex.def.test( i ) ) {
				result = "zz";
			}

			// Found a supported encoding
			if ( result !== null ) {
				return false;
			}
		} );
	}

	timer.stop();

	this.signal( "compression", function () {
		return [ agent, timer.diff() ];
	} );

	return result;
};
