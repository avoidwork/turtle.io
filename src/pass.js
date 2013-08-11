/**
 * Sends a command to one or more processes
 *
 * @method pass
 * @private
 * @param  {Object} msg Command
 * @return {Undefined}  undefined
 */
var pass = function ( msg ) {
	var self = this,
	    arg;

	switch ( msg.cmd ) {
		case MSG_ALL:
			msg.cmd = msg.altCmd;
			delete msg.altCmd;

			$.array.cast( cluster.workers ).each( function ( i ) {
				if ( self.config.queue.id !== i.id && i.id !== msg.worker ) {
					cluster.workers[i.id.toString()].send( msg );
				}
			});
			break;

		case MSG_READY:
			arg = {
				ack    : false,
				cmd    : MSG_START,
				id     : $.uuid( true ),
				worker : MSG_MASTER,
				arg    : {
					queue    : this.config.queue.id,
					pages    : this.pages,
					registry : {
						cache : this.registry.cache,
						first : this.registry.first,
						last  : this.registry.last
					}
				}
			};

			cluster.workers[msg.worker.toString()].send( arg );
			break;

		case MSG_REG_WAT:
			this.watcher( msg.arg.url, msg.arg.path, msg.arg.mimetype );
			break;

		default:
			cluster.workers[( msg.cmd === MSG_QUE_NEW ? this.config.queue.id : msg.worker ).toString()].send( msg );
	}
};
