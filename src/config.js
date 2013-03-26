/**
 * Loads & applies the configuration file
 * 
 * @method config
 * @param  {Object} args [Optional] Overrides or optional properties to set
 * @return {Object}      Instance
 */
var config = function ( args ) {
	if ( !( args instanceof Object ) ) args = {};

	var config = require( __dirname + "/../config.json" ),
	    id     = this.id || (args.id || ( config.id || $.genId() ) );

	// Merging args into config
	$.iterate( args, function ( value, key ) {
		if ( value instanceof Object ) {
			if ( config[key] === undefined ) {
				config[key] = {};
			}

			$.merge( config[key], value );
		}
		else {
			config[key] = value;
		}
	});

	delete config.id;

	// Loading if first execution or config has changed
	if ( this.id !== id || $.encode( this.config ) !== $.encode( config ) ) {
		this.id     = id;
		this.config = config;
	}

	return this;
};
