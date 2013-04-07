/**
 * Queues a request for processing
 * 
 * @method queue
 * @param  {Object}   res      HTTP(S) response Object
 * @param  {Object}   req      HTTP(S) request Object
 * @param  {Function} callback Callback function to execute when processed
 * @param  {String}   id       [Optional] Queue item ID
 * @param  {Object}   headers  [Optional] HTTP headers to decorate the response with
 * @param  {Object}   timer    [Optional] Date instance
 * @return {Object}            Instance
 */
factory.prototype.queue = function ( res, req, callback, id, headers, timer ) {
	var uuid   = id   || $.uuid( true ),
	    parsed = $.parse( this.url( req ) ),
	    body;

	if ( typeof callback !== "function" ) {
		throw Error( $.label.error.invalidArguments );
	}

	this.requestQueue.items.push( {callback: callback, uuid: uuid, timestamp: new Date()} );
	this.requestQueue.registry[uuid] = true;

	body = {
		processing: this.requestQueue.items.length < this.config.queue.size ? "now" : moment().fromNow( ( this.requestQueue.items.length / this.config.queue.size * this.config.queue.time ), " seconds" )
	}

	if ( this.config.queue.status ) {
		body.status = parsed.protocol + "//" + req.headers.host + "/queue/" + uuid;
	}

	this.respond( res, req, body, 202, headers, timer, false );

	return this;
};
