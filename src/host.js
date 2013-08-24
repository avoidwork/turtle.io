/**
 * Registers a virtual host
 *
 * @method host
 * @param  {String} arg Virtual host
 * @return {Object}     TurtleIO instance
 */
TurtleIO.prototype.host = function ( arg ) {
	this.vhosts.push( new RegExp( "^" + arg + "$" ) );

	this.handlers.all.hosts[arg]       = {};
	this.handlers["delete"].hosts[arg] = {};
	this.handlers.get.hosts[arg]       = {};
	this.handlers.patch.hosts[arg]     = {};
	this.handlers.post.hosts[arg]      = {};
	this.handlers.put.hosts[arg]       = {};

	return this;
};
