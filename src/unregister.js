/**
 * Unregisters an Etag in the LRU cache
 *
 * @method unregister
 * @public
 * @param  {String} url URL requested
 * @return {Object}     Instance
 */
factory.prototype.unregister = function ( url ) {
	if ( this.registry.cache[url] ) {
		this.stale( url );
	}

	// Updating LRU
	this.registry.remove( url );

	// Announcing state
	if ( !cluster.isMaster ) {
		this.sendMessage( MSG_REG_DEL, url, true, false );
	}
	else {
		pass.call( this, {ack: false, cmd: MSG_ALL, altCmd: MSG_REG_DEL, id: $.uuid( true ), arg: url, worker: MSG_MASTER} );
	}

	return this;
};
