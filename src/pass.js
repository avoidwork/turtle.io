/**
 * Sends a command to one or more processes
 * 
 * @param  {Object} arg Command
 * @return {Undefined}  undefined
 */
var pass = function ( arg ) {
	var self = this,
	    id, cmd;

	switch ( arg.cmd ) {
		case MSG_ALL:
			arg.cmd = arg.altCmd;
			delete arg.altCmd;

			$.array.cast( cluster.workers ).each(function ( i, idx ) {
				if ( self.config.queueWorker !== i.id && i.id !== arg.worker ) {
					cluster.workers[i.id.toString()].send( arg );
				}
			});
			break;

		case MSG_READY:
			cluster.workers[arg.worker.toString()].send( {ack: false, cmd: MSG_START, id: $.uuid(true), arg: {error: self.config.errorHandler, queue: self.config.queueWorker}, worker: MSG_MASTER} );
			break;

		default:
			id = arg.cmd === MSG_QUEUE ? self.config.queueWorker : arg.worker.toString();
			cluster.workers[ id ].send( arg );
	}
};
