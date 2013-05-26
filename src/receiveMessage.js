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

		case MSG_QUEUE:
			queue.items.push( msg.arg );
			break;

		case MSG_DEL_SES:
			delete this.sessions[msg.arg];
			break;

		case MSG_SET_SES:
			if ( this.sessions[msg.arg.id] === undefined ) {
				this.sessions[msg.arg.id] = new Session( msg.arg.id, this );
			}

			$.merge( this.sessions[msg.arg.id], $.decode( msg.arg.session ) );
			break;
	}

	// Acknowledging message
	if ( msg.ack ) {
		process.send( {ack: false, cmd: MSG_ACK, id: msg.id, worker: msg.worker} );
	}
};
