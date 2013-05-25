/**
 * Sends a command to one or more processes
 * 
 * @param  {Object} arg Command
 * @return {Undefined}  undefined
 */
var pass = function ( arg ) {
	var id, cmd;

	if ( arg.cmd === "announce" ) {
		arg.cmd = arg.oldCmd;
		delete arg.oldCmd;

		$.array.cast( cluster.workers ).each(function ( i, idx ) {
			if ( idx > 0 && i.id !== arg.worker ) {
				cluster.workers[i.id.toString()].send( arg );
			}
		});
	}
	else {
		id = arg.cmd === "queue" ? "1" : arg.worker.toString();
		cluster.workers[ id ].send( arg );
	}
};
