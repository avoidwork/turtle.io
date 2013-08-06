/**
 * Checks queued request status
 *
 * @method queueStatus
 * @public
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} res   HTTP(S) response Object
 * @param  {String} uuid  Queue item UUID
 * @param  {Object} timer Date instance
 * @return {Object}       Instance
 */
factory.prototype.queueStatus = function ( req, res, uuid, timer ) {
	var body, items, position, timestamp;

	if ( this.requestQueue.registry[uuid] === undefined ) {
		this.respond( req, res, this.page( codes.NOT_FOUND, this.hostname( req ) ), codes.NOT_FOUND, {"Cache-Control": "no-cache"}, timer, false );
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

		this.respond( req, res, body, codes.SUCCESS, {"Cache-Control": "no-cache"}, timer, false );
	}
};
