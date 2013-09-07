/**
 * Session factory
 *
 * @method Session
 * @constructor
 * @param {String} id     Session ID
 * @param {Object} server Server instance
 */
function Session ( id, server ) {
	this._id        = id;
	this._server    = server;
	this._timestamp = 0;
}

// Setting constructor loop
Session.prototype.constructor = Session;

/**
 * Sessions
 *
 * @class sessions
 * @type {Object}
 * @todo too slow!
 */
TurtleIO.prototype.session = {
	/**
	 * Creates a session
	 *
	 * @method create
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     Session instance
	 */
	create : function ( req, res ) {
		var instance = this.server,
		    expires  = instance.session.expires,
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    id       = $.uuid( true ),
		    salt, sesh, sid;

		 salt = req.connection.remoteAddress + "-" + instance.config.session.salt;
		 sesh = this.server.sessions[id] = new Session( id, this.server );
		 sid  = instance.cipher( id, true, salt );

		instance.cookie.set( res, instance.config.session.id, sid, expires, domain, secure, "/" );

		 return sesh;
	},

	/**
	 * Destroys a session
	 *
	 * @method destroy
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     TurtleIO instance
	 */
	destroy : function ( req, res ) {
		var instance = this.server,
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    sid      = req.cookies[instance.config.session.id],
		    id       = instance.cipher( sid, false, salt );

		if ( id ) {
			instance.cookie.expire( res, instance.config.session.id, domain, secure, "/" );
			delete instance.sessions[id];
		}

		return instance;
	},

	/**
	 * Gets a session
	 *
	 * @method get
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Mixed}      Session or undefined
	 */
	get : function ( req, res ) {
		var instance = this.server,
		    sid      = req.cookies[instance.config.session.id],
		    sesh     = null,
		    id, salt;

		if ( sid !== undefined ) {
			salt = req.connection.remoteAddress + "-" + instance.config.session.salt;
			id   = instance.cipher( sid, false, salt );
			sesh = instance.sessions[id] || null;

			if ( sesh !== null ) {
				if ( sesh._timestamp.diff( moment().utc().unix() ) > 1 ) {
					this.save( req, res );
				}
			}
			else {
				this.destroy( req, res );
			}
		}

		return sesh;
	},

	/**
	 * Saves a session
	 *
	 * @method save
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     TurtleIO instance
	 */
	save : function ( req, res ) {
		var instance = this.server,
		    expires  = instance.session.expires,
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    sid      = req.cookies[instance.config.session.id],
		    id       = instance.cipher( sid, false, salt );

		if ( id ) {
			instance.sessions[id]._timestamp = moment().unix();
			instance.cookie.set( res, instance.config.session.id, sid, expires, domain, secure, "/" );
		}

		return instance;
	},

	// Transformed `config.session.valid` for $.cookie{}
	expires : "",

	// Determines if a session has expired
	maxDiff : 0,

	// Set & unset from `start()` & `stop()`
	server : null
};
