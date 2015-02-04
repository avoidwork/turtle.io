/**
 * Stops the instance
 *
 * @method stop
 * @return {Object} TurtleIO instance
 */
stop () {
	let port = this.config.port;

	this.log( "Stopping " + this.config.id + " on port " + port, "debug" );

	this.config = {};
	this.dtp = null;
	this.etags = lru( 1000 );
	this.pages = { all: {} };
	this.permissions = lru( 1000 );
	this.routeCache = lru( 5000 ); // verbs * etags
	this.vhosts = [];
	this.vhostsRegExp = [];
	this.watching = {};

	if ( this.server !== null ) {
		this.server.close();
		this.server = null;
	}

	return this;
}
