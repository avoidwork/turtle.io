/**
 * Watches `path` for changes & updated LRU
 *
 * @method watcher
 * @param  {String} url      LRUItem url
 * @param  {String} path     File path
 * @param  {String} mimetype Mimetype of URL
 * @return {Object}          TurtleIO instance
 */
TurtleIO.prototype.watch = function ( url, path, mimetype ) {
	var self = this,
	    watcher;

	/**
	 * Cleans up caches
	 *
	 * @method cleanup
	 * @private
	 * @return {Undefined} undefined
	 */
	function cleanup () {
		watcher.close();
		self.unregister( url );
		delete self.watching[path];
	}

	if ( !( this.watching[path] ) ) {
		// Tracking
		this.watching[path] = 1;

		// Watching path for changes
		watcher = fs.watch( path, function ( ev ) {
			if ( REGEX_RENAME.test( ev ) ) {
				cleanup();
			}
			else {
				fs.lstat( path, function ( e, stat ) {
					if ( e ) {
						self.log( e );
						cleanup();
					}
					else if ( self.etags.cache[url] ) {
						self.register( url, {etag: self.etag( url, stat.size, stat.mtime ), mimetype: mimetype}, true );
					}
					else {
						cleanup();
					}
				} );
			}
		} );
	}

	return this;
};
