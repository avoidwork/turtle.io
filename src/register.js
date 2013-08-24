/**
 * Registers an Etag in the LRU cache
 *
 * @method register
 * @param  {String}  url   URL requested
 * @param  {Object}  state Object describing state `{etag: $etag, mimetype: $mimetype}`
 * @param  {Boolean} stale [Optional] Remove cache from disk
 * @return {Object}        TurtleIO instance
 */
TurtleIO.prototype.register = function ( url, state, stale ) {
	var cached;

	// Removing stale cache from disk
	if ( stale === true ) {
		cached = this.etags.cache[url];

		if ( cached && cached.value.etag !== state.etag ) {
			this.stale( url );
		}
	}

	// Updating LRU
	this.etags.set( url, state );

	return this;
};
