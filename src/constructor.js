class TurtleIO {
/**
 * TurtleIO
 *
 * @constructor
 */
constructor () {
	this.config = {};
	this.codes = CODES;
	this.dtp = null;
	this.etags = lru( 1000 );
	this.levels = LEVELS;
	this.messages = MESSAGES;
	this.middleware = { all: {} };
	this.permissions = lru( 1000 );
	this.routeCache = lru( 5000 ); // verbs * etags
	this.pages = { all: {} };
	this.server = null;
	this.vhosts = [];
	this.vhostsRegExp = [];
	this.watching = {};
}
