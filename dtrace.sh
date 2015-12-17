#!/usr/bin/env bash

sudo dtrace -Z -n 'turtleio*:::allows{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(arg2); }'  \
               -n 'turtleio*:::compress{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(arg2); }'  \
               -n 'turtleio*:::compression{ trace(copyinstr(arg0)); trace(arg1); }'  \
               -n 'turtleio*:::error{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(arg2); trace(copyinstr(arg3)); trace(arg4); }'  \
               -n 'turtleio*:::headers{ trace(arg0); trace(arg1); }'  \
               -n 'turtleio*:::log{ trace(copyinstr(arg0)); trace(arg1); trace(arg2); trace(arg3); }'  \
               -n 'turtleio*:::proxy{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(copyinstr(arg3)); trace(arg4); }'  \
               -n 'turtleio*:::middleware{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(arg2); }'  \
               -n 'turtleio*:::request{ trace(copyinstr(arg0)); trace(arg1); }'  \
               -n 'turtleio*:::respond{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(arg3); trace(arg4); }'  \
               -n 'turtleio*:::status{ trace(arg0); trace(arg1); trace(arg2); trace(arg3); trace(arg4); }'  \
               -n 'turtleio*:::write{ trace(copyinstr(arg0)); trace(copyinstr(arg1)); trace(copyinstr(arg2)); trace(copyinstr(arg3)); trace(arg4); }'
