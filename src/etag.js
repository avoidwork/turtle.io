/**
 * Generates an Etag
 *
 * @method etag
 * @param  {String} url      URL requested
 * @param  {Number} size     Response size
 * @param  {Number} modified Modified time
 * @param  {Object} body     [Optional] Response body
 * @return {String}          Etag value
 */
factory.prototype.etag = function ( /*url, size, modified, body*/ ) {
	return this.hash( $.array.cast( arguments ).join( "-" ) );
};
