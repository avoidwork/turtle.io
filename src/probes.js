/**
 * Registers dtrace probes
 *
 * @return {Undefined} undefined
 */
var probes = function () {
	// Registering probes
	dtp.addProbe("allowed",        "char *", "char *", "char *", "int");
	dtp.addProbe("allows",         "char *", "char *", "int");
	dtp.addProbe("busy",           "char *", "char *", "char *", "int", "int");
	dtp.addProbe("compress",       "char *", "char *", "char *", "int");
	dtp.addProbe("compressed",     "char *", "char *", "char *", "char *", "int");
	dtp.addProbe("connection",     "int");
	dtp.addProbe("error",          "char *",  "char *", "int", "char *", "int");
	dtp.addProbe("handler",        "char *",  "char *", "int");
	dtp.addProbe("proxy",          "char *", "char *", "char *", "char *", "int");
	dtp.addProbe("proxy-set",      "char *", "char *", "char *", "char *", "int");
	dtp.addProbe("redirect-set",   "char *", "char *", "char *", "int", "int");
	dtp.addProbe("request",        "char *", "char *", "int");
	dtp.addProbe("respond",        "char *", "char *", "char *", "int", "int");
	dtp.addProbe("route-set",      "char *", "char *", "char *", "int");
	dtp.addProbe("route-unset",    "char *", "char *", "char *", "int");
	dtp.addProbe("status",         "int", "int", "int", "int");
	dtp.addProbe("write",          "char *", "char *", "char *", "char *", "int");

	// Enabling probes
	dtp.enable();
};
