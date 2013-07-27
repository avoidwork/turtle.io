/**
 * Registers an Etag in the LRU cache
 *
 * @method register
 * @param  {String}  url   URL requested
 * @param  {String}  etag  Etag value (no quotes)
 * @param  {Boolean} stale [Optional] Remove cache from disk
 * @return {Object}        Instance
 */
factory.prototype.register = function ( url, etag, stale ) {
	var state;

	// Removing stale cache from disk
	if ( stale === true ) {
		state = this.registry.get( url );

		if ( state && state !== etag ) {
			this.stale( url );
		}
	}

	// Updating LRU
	this.registry.set( url, etag );

	// Announcing state
	this.sendMessage( MSG_REG_SET, {key: url, value: etag}, true, false );

	return this;
};
