/**
 * Broadcasts a message to other workers every second,
 * until acknowledged
 * 
 * @method sendMessage
 * @param  {String}  cmd Command
 * @param  {Object}  arg Parameter
 * @param  {Boolean} all [Optional] `true` will broadcast message to other workers
 * @param  {Boolean} ack [Optional] `true` will broadcast message until first acknowledgement
 * @return {Object}      Instance
 */
factory.prototype.sendMessage = function ( cmd, arg, all, ack ) {
	all      = ( all === true );
	ack      = ( ack === true );
	var id   = $.uuid( true ),
	    body = {
	    	cmd    : cmd,
	    	id     : id,
	    	arg    : arg,
	    	worker : cluster.worker.id,
	    	ack    : ack
	    };

	if ( all ) {
		body.altCmd = cmd;
		body.cmd    = MSG_ALL;
	}

	if ( ack ) {
		$.repeat( function () {
			process.send( body );
		}, 1000, id);
	}
	else {
		process.send( body );
	}

	return this;
};
