/**
 * TurtleIO
 *
 * @constructor
 */
function TurtleIO () {
	this.config       = {};
	this.dtp          = null;
	this.etags        = lru( 1000 );
	this.middleware   = {all: {}};
	this.routeCache   = lru( 5000 ); // verbs * etags
	this.pages        = {all: {}};
	this.server       = null;
	this.vhosts       = [];
	this.vhostsRegExp = [];
	this.watching     = {};
}

// Prototype loop
TurtleIO.prototype.constructor = TurtleIO;
