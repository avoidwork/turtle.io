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
	 * @return {String}     Session id
	 */
	create : function ( req ) {
		var id = $.uuid(true);

		this.cookie.set( this.config.session, id, req.headers.host );
		this.sessions[id] = {};

		return id;
	},

	/**
	 * Destroys a session
	 * 
	 * @method destroy
	 * @param  {Object} res HTTP(S) response Object
	 * @param  {String} id  Session id
	 * @return {Object}     Instance
	 */
	destroy : function ( res, id ) {
		this.cookie.expire( this.config.session, res );
		delete this.sessions[id];

		return this;
	},

	/**
	 * Gets a session Object
	 * 
	 * @param  {String} id  Session id
	 * @return {Object}     Session Object
	 */
	get : function ( id ) {
		return this.sessions[id];
	},

	/**
	 * Sets a session variable
	 * 
	 * @method set
	 * @param  {String} id    Session id
	 * @param  {String} key   Variable key
	 * @param  {Mixed}  value Variable value
	 * @return {Object}       Instance
	 */
	set : function ( id, key, value ) {
		this.sessions[id][key] = value;

		return this;
	}
};
