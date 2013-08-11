/**
 * Registers an Etag in the LRU cache
 *
 * @method register
 * @public
 * @param  {String}  url   URL requested
 * @param  {Object}  state Object describing state `{etag: $etag, mimetype: $mimetype}`
 * @param  {Boolean} stale [Optional] Remove cache from disk
 * @return {Object}        Instance
 */
factory.prototype.register = function ( url, state, stale ) {
	var cached;

	// Removing stale cache from disk
	if ( stale === true ) {
		cached = this.registry.cache[url];

		if ( cached && cached.value.etag !== state.etag ) {
			this.stale( url );
		}
	}

	// Updating LRU
	this.registry.set( url, state );

	// Announcing state
	if ( !cluster.isMaster ) {
		this.sendMessage( MSG_REG_SET, {key: url, value: state}, true, false );
	}
	else {
		pass.call( this, {ack: false, cmd: MSG_ALL, altCmd: MSG_REG_SET, id: $.uuid( true ), arg: {key: url, value: state}, worker: MSG_MASTER} );
	}

	return this;
};
