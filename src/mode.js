/**
 * Moves items out of queue
 *
 * @method mode
 * @param  {Boolean} start `true` to start, `false` to stop
 * @return {Object}         Instance
 */
factory.prototype.mode = function ( start ) {
	start     = ( start === true );
	var id    = "queue",
	    self  = this,
	    limit = this.config.queue.size,
	    fn    = ( self.config.queue.handler instanceof Function );

	if ( start ) {
		$.repeat( function () {
			var processed = [],
			    now       = moment().utc().unix(),
			    items, nth;

			// Resetting queue time tracking every 1000 items
			if ( self.requestQueue.times.length >= 1000 ) {
				self.requestQueue.times = [];
			}

			// Batch processing the queue
			if ( self.requestQueue.items.length > 0 ) {
				items = self.requestQueue.items.limit( 0, limit );
				nth   = items.length - 1;

				items.each( function ( i ) {
					if ( fn ) {
						try {
							self.config.queue.handler.call( self, i.data );
						}
						catch ( e ) {
							self.log( e );
						}
					}

					self.requestQueue.last = i.uuid;
					self.requestQueue.times.push( now - i.timestamp );
					delete self.requestQueue.registry[i.uuid];

					processed.push( i.uuid );
				});

				// Removing processed items
				self.requestQueue.items.remove( 0, nth );

				// Announcing which items where processed
				self.sendMessage( MSG_QUE_DEL, processed, true );
			}
		}, this.config.queue.time, id );
	}
	else {
		$.clearTimer( id );
	}

	return this;
};
