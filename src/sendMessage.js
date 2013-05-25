/**
 * Broadcasts a message to other workers every second,
 * until acknowledged
 * 
 * @param  {String}  cmd Command
 * @param  {Object}  arg Parameter
 * @param  {Boolean} all `true` will broadcast message to other workers
 * @return {Object}      Instance
 */
factory.prototype.sendMessage = function ( cmd, arg, all ) {
	var id   = $.uuid( true ),
	    body = {
	    	cmd    : cmd,
	    	id     : id,
	    	arg    : arg,
	    	worker : cluster.worker.id
	    };

	if ( all ) {
		body.oldCmd = cmd;
		body.cmd    = "announce";
	}

	$.repeat( function () {
		process.send( body );
	}, 1000, id);

	return this;
};
