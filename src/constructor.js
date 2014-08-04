/**
 * TurtleIO
 *
 * @constructor
 */
function TurtleIO () {
	this.config         = {};
	this.dtp            = dtrace.createDTraceProvider( "turtle-io" );
	this.etags          = lru( 1000 );
	this.handlers       = {all: {regex: [], routes: [], hosts: {}}, "delete": {regex: [], routes: [], hosts: {}}, get: {regex: [], routes: [], hosts: {}}, patch: {regex: [], routes: [], hosts: {}}, post: {regex: [], routes: [], hosts: {}}, put: {regex: [], routes: [], hosts: {}}};
	this.middleware     = {all: []};
	this.pages          = {all: {}};
	this.server         = null;
	this.vhosts         = [];
	this.vhostsRegExp   = [];
	this.watching       = {};
}

// Prototype loop
TurtleIO.prototype.constructor = TurtleIO;
