/**
 * Verifies a method is allowed on a URI
 *
 * @method allowed
 * @param  {String} method HTTP verb
 * @param  {String} uri    URI to query
 * @param  {String} host   Hostname
 * @return {Boolean}       Boolean indicating if method is allowed
 */
TurtleIO.prototype.allowed = function ( method, uri, host ) {
	var result = false,
	    exist  = false,
	    d, hosts;

	host  = host || "all";
	hosts = this.handlers[method].hosts;
	d     = hosts[this.config["default"]];
	exist = ( hosts[host] );

	this.handlers[method].regex.each( function ( i, idx ) {
		var route = this.handlers[method].routes[idx];

		if ( i.test( uri ) && ( ( exist && route in hosts[host] ) || route in d || route in hosts.all ) ) {
			return !( result = true );
		}
	}.bind( this ) );

	if ( !result ) {
		hosts = this.handlers.all.hosts;
		d     = hosts[this.config["default"]];
		exist = ( hosts[host] );

		this.handlers.all.regex.each( function ( i, idx ) {
			var route = this.handlers.all.routes[idx];

			if ( i.test( uri ) && ( ( exist && route in hosts[host] ) || route in d || route in hosts.all ) ) {
				return !( result = true );
			}
		}.bind( this ) );
	}

	return result;
};
