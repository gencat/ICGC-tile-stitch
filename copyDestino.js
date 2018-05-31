const fs = require('fs');

fs.createReadStream('2017-07-03_europe_spain - Copy.mbtiles').pipe(fs.createWriteStream('2017-07-03_europe_spain.mbtiles'));

/*
function copyDestino(){
	return new Promise(function(resolve, reject) {
		fs.writeFileSync('2017-07-03_europe_spain.mbtiles', fs.readFileSync('2017-07-03_europe_spain - Copy.mbtiles'));
		//fs.createReadStream('2017-07-03_europe_spain - Copy.mbtiles').pipe(fs.createWriteStream('2017-07-03_europe_spain.mbtiles'));
		resolve();
	});
}
*/