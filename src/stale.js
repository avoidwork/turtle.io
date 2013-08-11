/**
 * Removes stale representation from disk
 *
 * @method stale
 * @public
 * @param  {String} url LRUItem key
 * @return {Object}     Instance
 */
factory.prototype.stale = function ( url ) {
	var self   = this,
	    cached = this.registry.cached[url],
	    path   = this.config.tmp + "/",
	    gz, df;

	if ( cached ) {
		gz = path + cached.value.etag + ".gz";
		df = path + cached.value.etag + ".df";

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
