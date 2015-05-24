/**
 * Registers an Etag in the LRU cache
 *
 * @method register
 * @param  {String}  url   URL requested
 * @param  {Object}  state Object describing state `{etag: $etag, mimetype: $mimetype}`
 * @param  {Boolean} stale [Optional] Remove cache from disk
 * @return {Object}        TurtleIO instance
 */
register ( url, state, stale ) {
	let cached;

	// Removing stale cache from disk
	if ( stale === true ) {
		cached = this.etags.cache[ url ];

		if ( cached && cached.value.etag !== state.etag ) {
			this.unregister( url );
		}
	}

	// Removing superficial headers
	array.each( [
		"content-encoding",
		"server",
		"status",
		"transfer-encoding",
		"x-powered-by",
		"x-response-time",
		"access-control-allow-origin",
		"access-control-expose-headers",
		"access-control-max-age",
		"access-control-allow-credentials",
		"access-control-allow-methods",
		"access-control-allow-headers"
	], function ( i ) {
		delete state.headers[ i ];
	} );

	// Updating LRU
	this.etags.set( url, state );

	return this;
}
