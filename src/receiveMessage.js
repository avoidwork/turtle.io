/**
 * Cluster command processing
 * 
 * @method cmd
 * @param  {Object} arg Message passed
 * @return {Object}     Instance
 */
factory.prototype.receiveMessage = function ( msg ) {
	var self = this;

	// Processing message
	switch ( msg.cmd ) {
		case MSG_ACK:
			$.clearTimer( msg.id );
			break;

		case MSG_QUE_ID:
			this.config.queue.id = msg.arg;
			break;

		case MSG_QUE_NEW:
			this.requestQueue.registry[msg.arg.uuid] = this.requestQueue.items.length;
			this.requestQueue.items.push( {uuid: msg.arg.uuid, data: msg.arg.data, timestamp: msg.arg.timestamp} );
			this.sendMessage( MSG_QUE_SET, {uuid: msg.arg.uuid, timestamp: msg.arg.timestamp}, true );
			break;

		case MSG_QUE_SET:
			this.requestQueue.registry[msg.arg.uuid] = msg.arg.timestamp;
			break;

		case MSG_QUE_DEL:
			msg.arg.each( function ( i ) {
				delete self.requestQueue.registry[i];
			});
			break;

		case MSG_SES_DEL:
			delete this.sessions[msg.arg];
			break;

		case MSG_SES_SET:
			if ( this.sessions[msg.arg.id] === undefined ) {
				this.sessions[msg.arg.id] = new Session( msg.arg.id, this );
			}

			$.merge( this.sessions[msg.arg.id], msg.arg.session );
			break;

		case MSG_START:
			// Setting reference to queue worker
			this.config.queue.id = msg.arg;

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
				self.bootstrap.call( self, self.config.errorHandler );
			}
			break;
	}

	// Acknowledging message
	if ( msg.ack ) {
		process.send( {ack: false, cmd: MSG_ACK, arg: null, id: msg.id, worker: msg.worker} );
	}
};
