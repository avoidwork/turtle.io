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
	var cleanup, watcher;

	/**
	 * Cleans up caches
	 *
	 * @method cleanup
	 * @private
	 * @return {Undefined} undefined
	 */
	cleanup = function () {
		watcher.close();
		this.unregister( url );
		delete this.watching[path];
	}.bind( this );

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
						this.log( e );
						cleanup();
					}
					else if ( this.etags.cache[url] ) {
						this.register( url, {etag: this.etag( url, stat.size, stat.mtime ), mimetype: mimetype}, true );
					}
					else {
						cleanup();
					}
				}.bind( this ) );
			}
		}.bind( this ) );
	}

	return this;
};
