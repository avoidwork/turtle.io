/**
 * Cluster command processing
 * 
 * @method sendMessage
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
			self.requestQueue.last = msg.arg.last();
			msg.arg.each( function ( i ) {
				delete self.requestQueue.registry[i];
			});
			break;

		case MSG_SES_DEL:
			delete this.sessions[msg.arg];
			break;

		case MSG_SES_SET:
			this.session.set( msg.arg );
			break;

		case MSG_START:
			this.ready( msg.arg );
			break;
	}

	// Acknowledging message
	if ( msg.ack ) {
		process.send( {ack: false, cmd: MSG_ACK, arg: null, id: msg.id, worker: msg.worker} );
	}
};
