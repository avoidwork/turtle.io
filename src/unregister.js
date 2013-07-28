/**
 * Unregisters an Etag in the LRU cache
 *
 * @method unregister
 * @param  {String} url URL requested
 * @return {Object}     Instance
 */
factory.prototype.unregister = function ( url ) {
	this.sendMessage( MSG_REG_DEL, url, true, false );

	return this;
};
