/**
 * Registers an Etag in the LRU cache
 *
 * @method register
 * @param  {String}  url   URL requested
 * @param  {Object}  state Object describing state `{etag: $etag, mimetype: $mimetype}`
 * @param  {Boolean} stale [Optional] Remove cache from disk
 * @return {Object}        Instance
 */
factory.prototype.register = function ( url, state, stale ) {
	var cached;

	// Removing stale cache from disk
	if ( stale === true ) {
		cached = this.registry.get( url );

		if ( cached && cached.etag !== state.etag ) {
			this.stale( url );
		}
	}

	// Updating LRU
	this.registry.set( url, state );

	// Announcing state
	this.sendMessage( MSG_REG_SET, {key: url, value: state}, true, false );

	return this;
};
