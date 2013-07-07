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
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     Session
	 */
	create : function ( req, res ) {
		var instance = this.server,
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    id       = $.uuid( true ),
		    sid      = instance.cipher( id, true, salt ),
		    sesh;

		// Setting cookie
		instance.cookie.set( res, instance.config.session.id, sid, this.expires, domain, secure, "/" );

		// Creating session instance & announcing it
		sesh = instance.sessions[id] = new Session( id, instance );
		sesh.save();

		return sesh;
	},

	/**
	 * Destroys a session
	 *
	 * @method destroy
	 * @param  {Object} req HTTP(S) request Object
	 * @param  {Object} res HTTP(S) response Object
	 * @return {Object}     Instance
	 */
	destroy : function ( req, res ) {
		var instance = this.server,
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    salt     = req.connection.remoteAddress + "-" + instance.config.session.salt,
		    sid      = instance.cookie.get( req, instance.config.session.id ),
		    id       = instance.cipher( sid, false, salt );

		if ( id !== undefined ) {
			// Expiring cookie
			instance.cookie.expire( res, instance.config.session.id, domain, secure, "/" );

			// Deleting sesssion
			delete instance.sessions[id];

			// Announcing deletion of session
			instance.sendMessage( MSG_SES_DEL, id, true );
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
		    parsed   = $.parse( instance.url( req ) ),
		    domain   = parsed.host.isDomain() && !parsed.host.isIP() ? parsed.host : undefined,
		    secure   = ( parsed.protocol === "https:" ),
		    sid      = instance.cookie.get( req, instance.config.session.id ),
		    id, salt, sesh;

		if ( sid !== undefined ) {
			salt = req.connection.remoteAddress + "-" + instance.config.session.salt;
			id   = instance.cipher( sid, false, salt );
			sesh = instance.sessions[id];

			if ( sesh !== undefined ) {
				if ( sesh._timestamp.diff( moment().utc().unix() ) > 1 ) {
					instance.cookie.set( res, instance.config.session.id, sid, this.expires, domain, secure, "/" );
					sesh.save();
				}
			}
			else {
				this.destroy( req, res );
			}
		}

		return sesh;
	},

	/**
	 * Sets a session (cluster normalization)
	 *
	 * @method set
	 * @param  {Object} arg Message argument from Master
	 * @return {Object}     Instance
	 */
	set : function ( arg ) {
		if ( this.sessions[arg.id] === undefined ) {
			this.sessions[arg.id] = new Session( arg.id, this );
		}

		$.merge( this.sessions[arg.id], arg.session );

		return this;
	},

	// Transformed `config.session.valid` for $.cookie{}
	expires : "",

	// Determines if a session has expired
	maxDiff : 0,

	// Set & unset from `start()` & `stop()`
	server : null
};

/**
 * Session factory
 *
 * @method Session
 * @param {String} id     Session ID
 * @param {Object} server Server instance
 */
function Session ( id, server ) {
	this._id        = id;
	this._server    = server;
	this._timestamp = 0;
}

/**
 * Saves session across cluster
 *
 * @method save
 * @return {Undefined} undefined
 */
Session.prototype.save = function () {
	var body = {};

	this._timestamp = moment().utc().unix();

	$.iterate( this, function ( v, k ) {
		if ( !REGEX_SERVER.test( k ) ) {
			body[k] = v;
		}
	});

	// Announcing session shape
	this._server.sendMessage( MSG_SES_SET, {id: this._id, session: body}, true );
};

/**
 * Expires session across cluster
 *
 * @method expire
 * @return {Undefined} undefined
 */
Session.prototype.expire = function () {
	delete this._server.sessions[this._id];
	this._server.sendMessage( MSG_SES_DEL, this._id, true );
};
