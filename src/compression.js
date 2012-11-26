
/**
 * Determines what/if compression is supported for a request
 * 
 * @param  {String} agent    User-Agent header value
 * @param  {String} encoding Accept-Encoding header value
 * @return {Mixed}           Supported compression or null
 */
factory.prototype.compression = function (agent, encoding) {
	var result    = "",
	    encodings = typeof encoding === "string" ? encoding.explode(",") : [],
	    nth       = encodings.length - 1;

	
	if (!REGEX_IE.test(agent)) {
		// Iterating supported encodings
		encodings.each(function (i, idx) {
			switch (true) {
				case REGEX_GZIP.test(i):
					result = "gzip";
					break;
				case REGEX_DEF.test(i):
					result = "deflate";
					break;
			}

			// Found a supported encoding
			if (!result.isEmpty()) return false;
		});
	}

	// Setting null to imply no compression is supported
	if (result.isEmpty()) result = null;

	return result;
};
