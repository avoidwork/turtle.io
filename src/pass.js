/**
 * Sends a command to one or more processes
 *
 * @method pass
 * @param  {Object} arg Command
 * @return {Undefined}  undefined
 */
var pass = function ( arg ) {
	var self = this;

	switch ( arg.cmd ) {
		case MSG_ALL:
			arg.cmd = arg.altCmd;
			delete arg.altCmd;

			$.array.cast( cluster.workers ).each( function ( i ) {
				if ( self.config.queue.id !== i.id && i.id !== arg.worker ) {
					cluster.workers[i.id.toString()].send( arg );
				}
			});
			break;

		case MSG_READY:
			cluster.workers[arg.worker.toString()].send( {ack: false, cmd: MSG_START, id: $.uuid( true ), arg: this.config.queue.id, worker: MSG_MASTER} );
			break;

		default:
			cluster.workers[( arg.cmd === MSG_QUE_NEW ? this.config.queue.id : arg.worker ).toString()].send( arg );
	}
};
