
/**
 * Determines what/if compression is supported for a request
 * 
 * @method compression
 * @param  {String} agent    User-Agent header value
 * @param  {String} encoding Accept-Encoding header value
 * @return {Mixed}           Supported compression or null
 */
factory.prototype.compression = function ( agent, encoding ) {
	var result    = null,
	    encodings = typeof encoding === "string" ? encoding.explode( "," ) : [],
	    nth       = encodings.length - 1;

	if ( this.config.compress === true && !REGEX_IE.test( agent ) ) {
		// Iterating supported encodings
		encodings.each( function ( i, idx ) {
			switch (true) {
				case REGEX_GZIP.test( i ):
					result = "gzip";
					break;
				case REGEX_DEF.test( i ):
					result = "deflate";
					break;
			}

			// Found a supported encoding
			if ( result !== null ) return false;
		});
	}

	return result;
};
