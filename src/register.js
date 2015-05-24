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
	delete state.headers[ "content-encoding" ];
	delete state.headers[ "server" ];
	delete state.headers[ "transfer-encoding" ];
	delete state.headers[ "x-powered-by" ];
	delete state.headers[ "x-response-time" ];

	// Updating LRU
	this.etags.set( url, state );

	return this;
}
