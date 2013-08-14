/**
 * Starts worker
 *
 * @method ready
 * @public
 * @param  {Object} arg Message argument from Master
 * @return {Object}     Instance
 */
factory.prototype.ready = function ( arg ) {
	var self = this;

	// Setting reference to queue worker
	this.config.queue.id = arg.queue;

	// Setting error pages
	this.pages = arg.pages;

	// Setting LRU
	this.registry.cache = arg.registry.cache;
	this.registry.first = arg.registry.first;
	this.registry.last  = arg.registry.last;

	// Starting queue worker
	if ( cluster.worker.id === this.config.queue.id ) {
		this.mode( true );
	}
	// Starting http worker
	else {
		// Setting error handler
		if ( typeof this.config.errorHandler !== "function" ) {
			this.config.errorHandler = function ( req, res, timer ) {
				errorHandler.call( self, req, res, timer );
			};
		}

		// Setting message handler
		if ( typeof this.config.messageHandler !== "function" ) {
			this.config.messageHandler = function () {
				self.log( new Error( "Unreceived message" ) );
			};
		}

		// Bootstrapping instance
		this.bootstrap.call( this, this.config.errorHandler );
	}

	return this;
};
