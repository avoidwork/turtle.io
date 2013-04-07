/**
 * Moves items out of queue
 *
 * @method mode
 * @param  {Boolean} start `true` to start, `false` to stop
 * @return {Object}         Instance
 */
factory.prototype.mode = function ( start ) {
	var id = "queue",
	    self, limit;

	if ( start ) {
		self  = this,
		limit = this.config.queue.size;

		$.repeat( function () {
			var items, nth, now;

			if ( self.requestQueue.items.length > 0 ) {
				self.requestQueue.flushing = true;

				items = self.requestQueue.items.limit(0, limit);
				nth   = items.length;
				now   = new Date();

				items.each( function ( i ) {
					try {
						i.callback();
					}
					catch ( e ) {
						self.log( e );
					}

					self.requestQueue.last = i.uuid;
					self.requestQueue.times.push( now.getTime() - i.timestamp.getTime() );
					delete self.requestQueue.registry[i.uuid];
				});

				self.requestQueue.items.remove(0, (nth - 1));

				self.requestQueue.flushing = false;
			}
		}, this.config.queue.time, id );
	}
	else {
		$.clearTimer( id );
	}
};
