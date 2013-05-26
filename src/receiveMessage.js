/**
 * Cluster command processing
 * 
 * @method cmd
 * @param  {Object} arg Message passed
 * @return {Object}     Instance
 */
factory.prototype.receiveMessage = function ( msg ) {
	// Processing message
	switch ( msg.cmd ) {
		case MSG_ACK:
			$.clearTimer( msg.id );
			break;

		case MSG_SET_QUE:
			queue.items.push( msg.arg );
			break;

		case MSG_DEL_QUE:
			queue.items.push( msg.arg );

		case MSG_DEL_SES:
			delete this.sessions[msg.arg];
			break;

		case MSG_SET_SES:
			if ( this.sessions[msg.arg.id] === undefined ) {
				this.sessions[msg.arg.id] = new Session( msg.arg.id, this );
			}

			$.merge( this.sessions[msg.arg.id], $.decode( msg.arg.session ) );
			break;

		case MSG_START:
			// Starting queue processor
			if ( cluster.worker.id === "1" ) {
				this.mode( true );
			}
			// Starting http workers
			else {
				// Setting error handler
				if ( typeof fn === "function" ) {
					error = fn;
				}
				else {
					error = function ( res, req, timer ) {
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
				self.bootstrap.call( self, error );
			}



			break;


	}

	// Acknowledging message
	if ( msg.ack ) {
		process.send( {ack: false, cmd: MSG_ACK, id: msg.id, worker: msg.worker} );
	}
};
