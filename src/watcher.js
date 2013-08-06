/**
 * Watches `path` for changes & updated LRU
 *
 * @method watcher
 * @public
 * @param  {String} url      LRUItem url
 * @param  {String} path     File path
 * @param  {String} mimetype Mimetype of URL
 * @return {Object}          Instance
 */
factory.prototype.watcher = function ( url, path, mimetype ) {
	var self = this,
	    watcher;

	if ( !( this.watching[path] ) ) {
		// Tracking
		this.watching[path] = 1;

		// Watching path for changes
		watcher = fs.watch( path, function ( event ) {
			if ( event === "rename" ) {
				self.stale( url );

				if ( cluster.isMaster ) {
					pass.call( self, {ack: false, cmd: MSG_ALL, altCmd: MSG_REG_DEL, id: $.uuid( true ), arg: url, worker: MSG_MASTER} );
				}
				else {
					self.unregister( url );
				}

				watcher.close();
				delete self.watching[path];
			}
			else {
				fs.stat( path, function ( e, stat ) {
					var etag;

					if ( e ) {
						self.log( e );
						self.stale( url );

						if ( cluster.isMaster ) {
							pass.call( self, {ack: false, cmd: MSG_ALL, altCmd: MSG_REG_DEL, id: $.uuid( true ), arg: url, worker: MSG_MASTER} );
						}
						else {
							self.unregister( url );
						}

						watcher.close();
						delete self.watching[path];
					}
					else if ( self.registry.get( url ) ) {
						etag = self.etag( url, stat.size, stat.mtime );
						self.stale( url );

						if ( cluster.isMaster ) {
							pass.call( self, {ack: false, cmd: MSG_ALL, altCmd: MSG_REG_SET, id: $.uuid( true ), arg: {key: url, value: {etag: etag, mimetype: mimetype}}, worker: MSG_MASTER} );
						}
						else {
							self.register( url, {etag: etag, mimetype: mimetype}, true );
						}
					}
					else {
						watcher.close();
						delete self.watching[path];
					}
				});
			}
		});
	}
};
