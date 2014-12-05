#!/usr/bin/env bash

sudo dtrace -Z -n 'turtle_io*:::allowed{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(arg3); }'  \
               -n 'turtle_io*:::allows{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(arg2); }'  \
               -n 'turtle_io*:::compress{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(arg2); }'  \
               -n 'turtle_io*:::compression{ trace(copyinstr(arg0)); trace(arg1); }'  \
               -n 'turtle_io*:::error{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(arg2); trace(copyinstr(arg3)); trace(arg4); }'  \
               -n 'turtle_io*:::headers{ trace(arg0); trace(arg1); }'  \
               -n 'turtle_io*:::log{ trace(copyinstr(arg0)); trace(arg1); trace(arg2); trace(arg3); }'  \
               -n 'turtle_io*:::proxy{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(copyinstr(arg3)); trace(arg4); }'  \
               -n 'turtle_io*:::middleware{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(arg2); }'  \
               -n 'turtle_io*:::request{ trace(copyinstr(arg0)); trace(arg1); }'  \
               -n 'turtle_io*:::respond{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(arg3); trace(arg4); }'  \
               -n 'turtle_io*:::status{ trace(arg0); trace(arg1); trace(arg2); trace(arg3); trace(arg4); }'  \
               -n 'turtle_io*:::write{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(copyinstr(arg3)); trace(arg4); }'
