var exec = require('child_process').exec;

var commando = 'tippecanoe -o 12_2055_1508.mbtiles --one-tile=12/2055/1508 -L landcover:landcover.geojson -L park:park.geojson -L landuse:landuse.geojson -L building:building.geojson -L waterway:waterway.geojson -L transportation:transportation.geojson -L boundary:boundary.geojson -L mountain_peak:mountain_peak.geojson -L place:place.geojson';

//var commando = 'c:/cygwin64/bin/bash.exe -c "c:/cygwin64/home/al_wladimir/tippecanoe/tippecanoe.exe"';

exec(commando, (err, stdout, stderr) => {
	if (err) {
	  console.error(err);
	  return;
	}
	console.log(stdout);
});