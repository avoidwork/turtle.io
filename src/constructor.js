/**
 * TurtleIO
 *
 * @constructor
 */
function TurtleIO () {
	this.config   = {};
	this.etags    = $.lru( 1000 );
	this.handlers = {all: {regex: [], routes: [], hosts: {}}, "delete": {regex: [], routes: [], hosts: {}}, get: {regex: [], routes: [], hosts: {}}, patch: {regex: [], routes: [], hosts: {}}, post: {regex: [], routes: [], hosts: {}}, put: {regex: [], routes: [], hosts: {}}};
	this.pages    = {};
	this.server   = null;
	this.vhosts   = [];
	this.watching = {};
}

// Prototype loop
TurtleIO.prototype.constructor = TurtleIO;
