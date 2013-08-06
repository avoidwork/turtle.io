/**
 * Watches `path` for changes & updated LRU
 *
 * @method watch
 * @public
 * @param  {String} url      LRUItem url
 * @param  {String} path     File path
 * @param  {String} mimetype Mimetype of URL
 * @return {Object}          Instance
 */
factory.prototype.watch = function ( url, path, mimetype ) {
	this.sendMessage( MSG_REG_WAT, {url: url, path: path, mimetype: mimetype}, false, false );
};
