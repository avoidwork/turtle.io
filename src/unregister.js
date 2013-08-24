/**
 * Unregisters an Etag in the LRU cache
 *
 * @method unregister
 * @param  {String} url URL requested
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.unregister = function ( url ) {
	if ( this.etags.cache[url] ) {
		this.stale( url );
	}

	this.etags.remove( url );

	return this;
};
