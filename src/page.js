/**
 * Gets an HTTP status page
 * 
 * @param  {Number} code HTTP status code
 * @param  {[type]} host [description]
 * @return {[type]}      [description]
 */
factory.prototype.page = function ( code, host ) {
	host = host && this.pages[host] ? host : "all"

	return this.pages[host][code] || this.pages[host]["500"] || this.pages.all["500"];
};
