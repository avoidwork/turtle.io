/**
 * Sessions
 * 
 * @type {Object}
 */
factory.prototype.session = {
	/**
	 * Creates a session
	 * 
	 * @method create
	 * @param  {Object} res HTTP(S) response Object
	 * @param  {Object} req HTTP(S) request Object
	 * @return {Object}     Session
	 */
	create : function ( res, req ) {
		var instance = this.server,
		    parsed   = $.parse( instance.url( req ) ),
		    secure   = ( parsed.protocol === "https:" ),
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    id       = instance.cipher( $.uuid( true ), true, salt );

		instance.cookie.set( res, instance.config.session.id, id, parsed.host, secure, "/" );
		instance.sessions.data.set( id, {} );

		return instance.sessions.data.get( id );
	},

	/**
	 * Destroys a session
	 * 
	 * @method destroy
	 * @param  {Object} res HTTP(S) response Object
	 * @param  {Object} req HTTP(S) request Object
	 * @return {Object}     Instance
	 */
	destroy : function ( res, req ) {
		var instance = this.server,
		    parsed   = $.parse( instance.url( req ) ),
		    secure   = ( parsed.protocol === "https:" ),
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    id       = instance.cipher( req.headers[instance.config.session.id], false, salt );

		if ( id !== undefined ) {
			instance.cookie.expire( res, instance.config.session.id, id, parsed.host, secure, "/" );
			instance.sessions.data.del( id );
		}

		return instance;
	},

	/**
	 * Gets a session Object
	 * 
	 * @param  {String} id Session id
	 * @return {Object}    Session Object
	 */
	get : function ( req ) {
		var instance = this.server,
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    id       = instance.cipher( req.headers[instance.config.session.id], false, salt );

		return instance.sessions.data.get( id );
	},

	// Set & unset from `start()` & `stop()`
	server : null
};
