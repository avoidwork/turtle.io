/**
 * "ready" handler
 * 
 * @param  {Object} arg Message argument from Master
 * @return {Object}     Instance
 */
factory.prototype.ready = function ( arg ) {
	var self = this;

	// Setting reference to queue worker
	this.config.queue.id = arg;

	// Starting queue worker
	if ( cluster.worker.id === this.config.queue.id ) {
		this.mode( true );
	}
	// Starting http worker
	else {
		// Setting error handler
		if ( typeof this.config.errorHandler !== "function" ) {
			this.config.errorHandler = function ( res, req, timer ) {
				var body   = messages.NOT_FOUND,
				    status = codes.NOT_FOUND,
				    method = req.method.toLowerCase(),
				    host   = req.headers.host.replace( /:.*/, "" );

				if ( !REGEX_GET.test( method ) ) {
					if ( allowed( req.method, req.url, host ) ) {
						body   = messages.ERROR_APPLICATION;
						status = codes.ERROR_APPLICATION;
					}
					else {
						body   = messages.NOT_ALLOWED;
						status = codes.NOT_ALLOWED;
					}
				}

				self.respond( res, req, body, status, {"Cache-Control": "no-cache"}, timer, false );
			}
		}

		// Bootstrapping instance
		this.bootstrap.call( this, this.config.errorHandler );
	}

	return this;
};
