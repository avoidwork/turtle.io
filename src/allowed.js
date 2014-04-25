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
	var self   = this,
	    result = false,
	    exist  = false,
		time   = process.hrtime(),
	    d, hosts;

	host  = host || ALL;
	hosts = this.handlers[method].hosts;
	d     = hosts[this.config["default"]];
	exist = ( hosts[host] );

	array.each( this.handlers[method].regex, function ( i, idx ) {
		var route = self.handlers[method].routes[idx];

		if ( i.test( uri ) && ( ( exist && route in hosts[host] ) || route in d || route in hosts.all ) ) {
			return !( result = true );
		}
	} );

	if ( !result ) {
		hosts = this.handlers.all.hosts;
		d     = hosts[this.config["default"]];
		exist = ( hosts[host] );

		array.each( this.handlers.all.regex, function ( i, idx ) {
			var route = self.handlers.all.routes[idx];

			if ( i.test( uri ) && ( ( exist && route in hosts[host] ) || route in d || route in hosts.all ) ) {
				return !( result = true );
			}
		} );
	}

	this.dtp.fire( "allowed", function () {
		return [host, uri, method.toUpperCase(), diff( time )];
	});

	return result;
};
