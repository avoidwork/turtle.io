/**
 * Invalidates LRU & removes cached rep from disk
 *
 * @param  {String} key  LRUItem key
 * @param  {String} etag Etag
 * @return {Object}      Instance
 */
factory.prototype.stale = function ( key ) {
	var self = this,
	    etag = this.registry.get( key );

	if ( etag ) {
		this.registry.remove( key );

		fs.unlink( this.config.tmp + "/" + etag + ".*", function ( e ) {
			if ( e ) {
				self.log( e );
			}
		});
	}

	return this;
};
