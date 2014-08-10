/**
 * TurtleIO
 *
 * @constructor
 */
function TurtleIO () {
	this.config       = {};
	this.dtp          = dtrace.createDTraceProvider( "turtle-io" );
	this.etags        = lru( 1000 );
	this.middleware   = {all: {}};
	this.pages        = {all: {}};
	this.server       = null;
	this.vhosts       = [];
	this.vhostsRegExp = [];
	this.watching     = {};
}

// Prototype loop
TurtleIO.prototype.constructor = TurtleIO;
