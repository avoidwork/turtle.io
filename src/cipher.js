/**
 * Creates a cipher from two input parameters
 *
 * @method cipher
 * @param  {String}  arg    String to encrypt
 * @param  {Boolean} encode [Optional] Encrypt or decrypt `arg` using `salt`, default is `true`
 * @param  {String}  salt   [Optional] Salt for encryption
 * @return {String}         Result of crypto operation
 */
TurtleIO.prototype.cipher = function ( arg, encode, salt ) {
	var cipher, crypted;

	try {
		encode   = ( encode !== false );
		salt     = salt || this.config.session.salt;
		cipher   = crypto[encode ? "createCipher" : "createDecipher"]( "aes-256-cbc", salt ),
		crypted  = encode ? cipher.update( arg, "utf8", "hex" ) : cipher.update( arg, "hex", "utf8" );
		crypted += cipher.final( encode ? "hex" : "utf8" );

		return crypted;
	}
	catch ( e ) {
		this.log( e );

		return undefined;
	}
};
