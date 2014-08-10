/**
 * Stops the instance
 *
 * @method stop
 * @return {Object} TurtleIO instance
 */
TurtleIO.prototype.stop = function () {
	var port = this.config.port;

	this.log( "Stopping turtle.io on port " + port, "debug" );

	this.config       = {};
	this.etags        = lru( 1000 );
	this.pages        = {all: {}};
	this.vhosts       = [];
	this.vhostsRegExp = [];
	this.watching     = {};

	if ( this.server !== null ) {
		this.server.close();
		this.server = null;
	}

	return this;
};
