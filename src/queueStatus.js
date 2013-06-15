/**
 * Checks queued request status
 *
 * @method queueStatus
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} req   HTTP(S) request Object
 * @param  {String} uuid  Queue item UUID
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.queueStatus = function ( res, req, uuid, timer ) {
	var body, items, position, timestamp;

	if ( this.requestQueue.registry[uuid] === undefined ) {
		this.respond( res, req, messages.NOT_FOUND, 404, {"Cache-Control": "no-cache"}, timer, false );
	}
	else {
		items     = $.array.keys( this.requestQueue.registry, true );
		position  = items.index( uuid );
		timestamp = this.requestQueue.registry[uuid];
		body      = {
			position  : position,
			total     : items.length,
			estimate  : Math.ceil( this.requestQueue.times.mean() ) + " seconds",
			timestamp : timestamp
		};

		this.respond( res, req, body, 200, {"Cache-Control": "no-cache"}, timer, false );
	}
};
