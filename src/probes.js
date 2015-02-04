/**
 * Registers dtrace probes
 *
 * @method probes
 * @return {Object} TurtleIO instance
 */
probes () {
	this.dtp.addProbe( "allowed", "char *", "char *", "char *", "int" );
	this.dtp.addProbe( "allows", "char *", "char *", "int" );
	this.dtp.addProbe( "compress", "char *", "char *", "int" );
	this.dtp.addProbe( "compression", "char *", "int" );
	this.dtp.addProbe( "error", "char *", "char *", "int", "char *", "int" );
	this.dtp.addProbe( "headers", "int", "int" );
	this.dtp.addProbe( "log", "char *", "int", "int", "int" );
	this.dtp.addProbe( "proxy", "char *", "char *", "char *", "char *", "int" );
	this.dtp.addProbe( "middleware", "char *", "char *", "int" );
	this.dtp.addProbe( "request", "char *", "int" );
	this.dtp.addProbe( "respond", "char *", "char *", "char *", "int", "int" );
	this.dtp.addProbe( "status", "int", "int", "int", "int", "int" );
	this.dtp.addProbe( "write", "char *", "char *", "char *", "char *", "int" );
	this.dtp.enable();
}
