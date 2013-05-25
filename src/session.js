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
	 * @return {Object}     Promise
	 */
	create : function ( res, req ) {
		var instance = this.server,
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    id       = $.uuid( true ),
		    sid      = instance.cipher( id, true, salt );

		instance.cookie.set( res, instance.config.session.id, sid, instance.config.session.valid, domain, secure, "/" );

		return instance.sessions.data.set( id, {} );
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
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    sid      = instance.cookie.get( req, instance.config.session.id ),
		    id       = instance.cipher( sid, false, salt );

		if ( id !== undefined ) {
			instance.cookie.expire( res, instance.config.session.id, domain, secure, "/" );

			if ( instance.sessions.data.get( id ) !== undefined ) {
				instance.sessions.data.del( id );
			}
		}

		return instance;
	},

	/**
	 * Gets a session
	 * 
	 * @method get
	 * @param  {Object} res HTTP(S) response Object
	 * @param  {Object} req HTTP(S) request Object
	 * @return {Mixed}      Session or undefined
	 */
	get : function ( res, req ) {
		var instance = this.server,
		    sid      = instance.cookie.get( req, instance.config.session.id),
		    id, salt, sesh;

		if ( sid !== undefined ) {
			salt = req.connection.remoteAddress + "-" + instance.config.session.salt,
			id   = instance.cipher( sid, false, salt );
			sesh = instance.sessions.data.get( id );

			// Invalid session, expiring cookie
			if ( sesh === undefined ) {
				instance.session.destroy( res, req );
			}
		}

		return sesh;
	},

	// Set & unset from `start()` & `stop()`
	server : null
};
