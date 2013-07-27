/**
 * Invalidates LRU & removes cached rep from disk
 *
 * @param  {String} key  LRUItem key
 * @param  {String} etag Etag
 * @return {Object}      Instance
 */
factory.prototype.stale = function ( key ) {
	var self = this,
	    etag = this.registry.get( key ),
	    gz, df;

	if ( etag ) {
		gz = this.config.tmp + "/" + etag + ".gz";
		df = this.config.tmp + "/" + etag + ".df";

		this.registry.remove( key );

		fs.exists( gz, function ( exists ) {
			if ( exists ) {
				fs.unlink( gz, function ( e ) {
					if ( e ) {
						self.log( e );
					}
				});
			}
		});

		fs.exists( df, function ( exists ) {
			if ( exists ) {
				fs.unlink( df, function ( e ) {
					if ( e ) {
						self.log( e );
					}
				});
			}
		});
	}

	return this;
};
