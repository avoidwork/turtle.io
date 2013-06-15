/**
 * Creates a hash of arg
 *
 * @param  {Mixed}  arg     String or Buffer
 * @param  {String} encrypt [Optional] Type of encryption
 * @param  {String} digest  [Optional] Type of digest
 * @return {String}         Hash of arg
 */
factory.prototype.hash = function ( arg, encrypt, digest ) {
	encrypt = encrypt || "md5";
	digest  = digest  || "hex";

	if ( typeof arg !== "string" && !arg instanceof Buffer ) {
		arg = "";
	}

	return crypto.createHash( encrypt ).update( arg ).digest( digest );
};
