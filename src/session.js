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
	 * @return {Object}     Session
	 * @todo set `secure` flag if SSL is enabled
	 * @todo do some crypto on the id + config.session.salt
	 */
	create : function ( req ) {
		var id = $.uuid(true);

		this.cookie.set( this.config.session.id, id, req.headers.host, false, "/" );
		this.sessions.data.set(id, {});

		return this.sessions.data.get(id);
	},

	/**
	 * Destroys a session
	 * 
	 * @method destroy
	 * @param  {Object} res HTTP(S) response Object
	 * @param  {String} id  Session id
	 * @return {Object}     Instance
	 */
	destroy : function ( res ) {
		this.cookie.expire( this.config.session.id, res );
		this.sessions.data.del( id );

		return this;
	},

	/**
	 * Gets a session Object
	 * 
	 * @param  {String} id  Session id
	 * @return {Object}     Session Object
	 */
	get : function ( req ) {
		var id = req.headers[this.config.session.id];

		return this.sessions.data.get( id );
	}
};
