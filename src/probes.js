/**
 * Registers dtrace probes
 *
 * @method probes
 * @return {Object} TurtleIO instance
 */
TurtleIO.prototype.probes = function () {
	this.dtp.addProbe("allowed",        "char *", "char *", "char *", "int");
	this.dtp.addProbe("allows",         "char *", "char *", "int");
	this.dtp.addProbe("compress",       "char *", "char *", "int");
	this.dtp.addProbe("compression",    "char *", "int");
	this.dtp.addProbe("error",          "char *",  "char *", "int", "char *", "int");
	this.dtp.addProbe("handler",        "char *",  "char *", "int");
	this.dtp.addProbe("proxy",          "char *", "char *", "char *", "char *", "int");
	this.dtp.addProbe("proxy-set",      "char *", "char *", "char *", "char *", "int");
	this.dtp.addProbe("redirect-set",   "char *", "char *", "char *", "int", "int");
	this.dtp.addProbe("request",        "char *", "char *", "int");
	this.dtp.addProbe("respond",        "char *", "char *", "char *", "int", "int");
	this.dtp.addProbe("route-set",      "char *", "char *", "char *", "int");
	this.dtp.addProbe("route-unset",    "char *", "char *", "char *", "int");
	this.dtp.addProbe("status",         "int", "int", "int", "int");
	this.dtp.addProbe("write",          "char *", "char *", "char *", "char *", "int");
	this.dtp.enable();
};

