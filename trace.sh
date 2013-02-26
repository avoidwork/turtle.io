#!/usr/bin/env bash
sudo dtrace -Z -n 'turtle-io*:::busy{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); }'  \
               -n 'turtle-io*:::connection{ trace(arg0); }'  \
               -n 'turtle-io*:::compress{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); }'  \
               -n 'turtle-io*:::compressed{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(copyinstr(arg3)); }'  \
               -n 'turtle-io*:::error{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(arg2); trace(copyinstr(arg3)); }'  \
               -n 'turtle-io*:::handler{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); }'  \
               -n 'turtle-io*:::proxy{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(copyinstr(arg3)); }'  \
               -n 'turtle-io*:::redirect{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(arg3); }'  \
               -n 'turtle-io*:::register-proxy{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(copyinstr(arg3)); }'  \
               -n 'turtle-io*:::request{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); }'  \
               -n 'turtle-io*:::respond{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(arg3); }'  \
               -n 'turtle-io*:::route-set{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); }'  \
               -n 'turtle-io*:::route-unset{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); }'  \
               -n 'turtle-io*:::status{ trace(arg0); trace(arg1); trace(arg2); trace(arg3); }'  \
               -n 'turtle-io*:::write{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(copyinstr(arg3)); }'