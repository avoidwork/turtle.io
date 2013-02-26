// Registering probes
dtp.addProbe("busy",           "char *", "char *", "char *", "int", "int");
dtp.addProbe("compress",       "char *", "char *", "char *");
dtp.addProbe("compressed",     "char *", "char *", "char *", "char *");
dtp.addProbe("connection",     "int");
dtp.addProbe("error",          "char *",  "char *", "int", "char *");
dtp.addProbe("handler",        "char *",  "char *");
dtp.addProbe("proxy",          "char *", "char *", "char *", "char *");
dtp.addProbe("register-proxy", "char *", "char *", "char *", "char *");
dtp.addProbe("redirect",       "char *", "char *", "char *", "int");
dtp.addProbe("request",        "char *", "char *");
dtp.addProbe("respond",        "char *", "char *", "char *", "int", "int");
dtp.addProbe("route-set",      "char *", "char *", "char *");
dtp.addProbe("route-unset",    "char *", "char *", "char *");
dtp.addProbe("status",         "int", "int", "int", "int");
dtp.addProbe("write",          "char *", "char *", "char *", "char *");

// Enabling probes
dtp.enable();
