/**
 * Signals a probe
 *
 * @method signal
 * @param  {String}   name Name of probe
 * @param  {Function} fn   DTP handler
 * @return {Object}        TurtleIO instance
 */
signal ( name, fn ) {
	if ( this.config.logs.dtrace ) {
		this.dtp.fire( name, fn );
	}

	return this;
}
