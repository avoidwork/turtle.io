/**
 * Verifies a method is allowed on a URI
 *
 * @method allowed
 * @param  {String}  method   HTTP verb
 * @param  {String}  uri      URI to query
 * @param  {String}  host     Hostname
 * @param  {Boolean} override Overrides cached version
 * @return {Boolean}          Boolean indicating if method is allowed
 */
allowed ( method, uri, host, override ) {
	let timer = precise().start();
	let result = this.routes( uri, host, method, override ).filter( ( i ) => {
		return this.config.noaction[ i.hash || this.hash( i ) ] === undefined;
	} );

	timer.stop();

	this.signal( "allowed", () => {
		return [ host, uri, method.toUpperCase(), timer.diff() ];
	} );

	return result.length > 0;
}
