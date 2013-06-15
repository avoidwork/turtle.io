/**
 * Queues a request for processing
 *
 * @method queue
 * @param  {Object} res     HTTP(S) response Object
 * @param  {Object} req     HTTP(S) request Object
 * @param  {Mixed}  arg     Argument to pass to queue
 * @param  {String} id      [Optional] Queue item ID
 * @param  {Object} headers [Optional] HTTP headers to decorate the response with
 * @param  {Object} timer   [Optional] Date instance
 * @return {Object}         Instance
 */
factory.prototype.queue = function ( res, req, arg, id, headers, timer ) {
	var uuid   = id || $.uuid( true ),
	    parsed = $.parse( this.url( req ) ),
	    epoch  = moment().utc().unix(),
	    body, total;

	this.requestQueue.registry[uuid] = epoch;
	this.sendMessage( MSG_QUE_NEW, {uuid: uuid, data: arg, timestamp: epoch}, false );

	total = $.array.cast( this.requestQueue.registry ).length - 1;
	body  = {processing: total < this.config.queue.size ? "now" : moment().fromNow( ( total / this.config.queue.size * this.config.queue.time ), " seconds" )};

	if ( this.config.queue.status ) {
		body.status = parsed.protocol + "//" + req.headers.host + "/queue/" + uuid;
	}

	this.respond( res, req, body, codes.ACCEPTED, headers, timer, false );

	return this;
};
