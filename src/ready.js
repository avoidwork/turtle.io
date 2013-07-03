/**
 * Starts worker
 *
 * @method ready
 * @param  {Object} arg Message argument from Master
 * @return {Object}     Instance
 */
factory.prototype.ready = function ( arg ) {
	var self = this;

	// Setting reference to queue worker
	this.config.queue.id = arg.queue;

	// Setting error pages
	this.pages = arg.pages;

	// Starting queue worker
	if ( cluster.worker.id === this.config.queue.id ) {
		this.mode( true );
	}
	// Starting http worker
	else {
		// Setting error handler
		if ( typeof this.config.errorHandler !== "function" ) {
			this.config.errorHandler = function ( res, req, timer ) {
				errorHandler.call( self, res, req, timer );
			};
		}

		// Bootstrapping instance
		this.bootstrap.call( this, this.config.errorHandler );
	}

	return this;
};
