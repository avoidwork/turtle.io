/**
 * Creates a cipher from two input parameters
 *
 * @method cipher
 * @param  {String}  arg    String to encrypt
 * @param  {Boolean} encode [Optional] Encrypt or decrypt `arg` using `iv`, default is `true`
 * @param  {String}  iv     [Optional] Initialization vector
 * @return {String}         Result of crypto operation
 */
TurtleIO.prototype.cipher = function ( arg, encode, iv ) {
	var cipher, crypted;

	encode   = ( encode !== false );
	iv       = iv || this.config.session.iv;
	cipher   = crypto[encode ? "createCipher" : "createDecipher"]( "aes-256-cbc", iv ),
	crypted  = encode ? cipher.update( arg, "utf8", "hex" ) : cipher.update( arg, "hex", "utf8" );
	crypted += cipher.final( encode ? "hex" : "utf8" );

	return crypted;
};
