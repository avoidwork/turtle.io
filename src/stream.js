/**
 * Streams a proxy request / response to the Client
 * 
 * @method stream
 * @param  {Object} res   HTTP(S) response Object
 * @param  {Object} req   HTTP(S) request Object
 * @param  {Object} timer [Optional] Date instance
 * @return {Objet}        Instance
 */
factory.prototype.stream = function ( res, req, timer ) {
	return this;
};
