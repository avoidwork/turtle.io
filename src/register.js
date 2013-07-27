/**
 * Registers an Etag in the LRU cache
 *
 * @method register
 * @param  {String} url  URL requested
 * @param  {String} etag Etag value (no quotes)
 * @return {Object}      Instance
 */
factory.prototype.register = function ( url, etag ) {
	this.registry.set( url, etag );
	this.sendMessage( MSG_REG_SET, {key: url, value: etag}, true, false );

	return this;
};
