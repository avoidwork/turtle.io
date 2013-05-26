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

		case MSG_QUE_NEW:
			this.config.queueWorker = msg.arg;
			break;

		case MSG_QUE_SET:
			queue.items.push( msg.arg );
			break;

		case MSG_QUE_DEL:
			queue.items.push( msg.arg );
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
			// Starting queue worker
			if ( cluster.worker.id === msg.arg.queue ) {
				this.mode( true );
			}
			// Starting http worker
			else {
				// Setting error handler
				if ( typeof msg.arg.error !== "function" ) {
					msg.arg.error = function ( res, req, timer ) {
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
				self.bootstrap.call( self, msg.arg.error );
			}
			break;
	}

	// Acknowledging message
	if ( msg.ack ) {
		process.send( {ack: false, cmd: MSG_ACK, arg: null, id: msg.id, worker: msg.worker} );
	}
};
