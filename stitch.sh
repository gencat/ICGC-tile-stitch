#!/usr/bin/env bash
rm temp/**/*mbtiles
rm temp/**/*_origen*
sort -rn tiles_edges.txt | awk -F' ' '{print "--z=" $1 " --x=" $2 " --y="$3}' | xargs -n 3 -P 32 node mergeMbtiles.js 2>&1 | tee mergeMbtiles.log
#node mergeMbtiles.js --x=4103 --y=3065 --z=13
