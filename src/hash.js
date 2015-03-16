/**
 * Creates a hash of arg
 *
 * @method hash
 * @param  {Mixed}  arg String or Buffer
 * @return {String} Hash of arg
 */
hash ( arg ) {
	return mmh3( arg, this.config.seed );
}
