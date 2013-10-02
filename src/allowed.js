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
	host       = host || "all";
	var self   = this,
	    result = false,
	    exist  = false,
	    d, hosts;

	hosts = self.handlers[method].hosts;
	d     = hosts[self.config["default"]];
	exist = ( hosts[host] );

	this.handlers[method].regex.each( function ( i, idx ) {
		var route = self.handlers[method].routes[idx];

		if ( i.test( uri ) && ( ( exist && route in hosts[host] ) || route in d || route in hosts.all ) ) {
			return !( result = true );
		}
	} );

	if ( !result ) {
		hosts = self.handlers.all.hosts;
		d     = hosts[self.config["default"]];
		exist = ( hosts[host] );

		this.handlers.all.regex.each( function ( i, idx ) {
			var route = self.handlers.all.routes[idx];

			if ( i.test( uri ) && ( ( exist && route in hosts[host] ) || route in d || route in hosts.all ) ) {
				return !( result = true );
			}
		} );
	}

	return result;
};
