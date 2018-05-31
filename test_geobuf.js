var MBTiles = require('@mapbox/mbtiles');
var VectorTile = require('@mapbox/vector-tile').VectorTile;
var Pbf = require('pbf');
var zlib = require('zlib');
/*
var z = 14;
var x = 8278;
var y = 6127;
*/
/*
var z = 12;
var x = 2071;
var y = 1529;
*/
var z = 14;
var x = 8292;
var y = 6115;

function hash(z, x, y) {
    return `${z}/${x}/${y}`;
}

function getTMSy(z, y){
	return  (1 << z) - 1 - y;
}

function updateTile(mbtiles, data, callback){
	let _db = mbtiles._db;
	_db.run('PRAGMA synchronous=OFF', this);

	_db.serialize(function() {
		_db.run('BEGIN');
		// Flip Y coordinate because MBTiles files are TMS.
		y = getTMSy(z, y);
		console.log(y);
		var coords = hash(z, x, y);
		console.log(coords);
		/*
		var images = _db.prepare('DELETE FROM images WHERE tile_id = ?');
		images.run(coords);
		images.finalize();
		images = _db.prepare('REPLACE INTO images (tile_id, tile_data) VALUES (?, ?)');
		images.run(coords, data);
		images.finalize();
		*/
		var images = _db.prepare('UPDATE images SET tile_data = ? WHERE tile_id = ?');
		images.run(data, coords);
		images.finalize();
		_db.run('COMMIT', callback);
	});
}
/*
function getTiles(mbtiles, callback){
	let _db = mbtiles._db;

	// Flip Y coordinate because MBTiles files are TMS.
    y = getTMSy(z, y);

	_db.all('SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles', function(err, rows) {
        if (err && err.errno !== 1) return callback(err);
        if (rows) rows.forEach(function(row) {
            console.log(row);
        });
	});
}
*/

/*
new MBTiles('./osm_icgc_perry.mbtiles', function(err, mbtiles) {
	//console.log(mbtiles) // mbtiles object with methods listed below
	getTiles(mbtiles, function(err){
		console.log(err);
	});
});
*/
/*
new MBTiles('./osm_icgc_perry.mbtiles', function(err, mbtiles) {
  //console.log(mbtiles) // mbtiles object with methods listed below

  //getTiles(mbtiles);

  mbtiles.getTile(z, x, y, function(err, data, headers) {
	console.log(data);  
	// `data` is your gzipped buffer - use zlib to gunzip or inflate
	if (err) {
      throw err;
	}
	
	mbtiles.getInfo(function(err, info) {
		console.log(info); // info
	}); //end put info

	zlib.unzip(data, function(err, tile) {
		if (!err) {
						
			//water.feature = [];
			new MBTiles('./barcelona2.mbtiles', function(err, mbtiles2) {
				if (err) {
					throw err;
				}

				//mbtiles.getInfo(function(err, info) {
					//console.log(info); // info
					mbtiles2.startWriting(function(err) {
						console.log("startWriting");
						if (err) {
							throw err;
						}
						console.log("mbtiles2._isWritable:"+mbtiles2._isWritable);
						//mbtiles2.putInfo(info, function(err) {
							// continue onward
							//zlib.gzip(rawTile, function(err, buffer) {
								// start writing with mbtiles methods (putTile, putInfo, etc)
								mbtiles2.putTile(z, x, y, tile, function(err) {
									// continue onward
									console.log("putTile");
									if (err) {
										throw err;
									}
									mbtiles2.stopWriting(function(err) {
										// stop writing to your mbtiles object
										console.log("stopWriting");
										if (err) {
											throw err;
										}
									}); //end stopwrite
								}); //end update
							//}); //end zib
						//}); //end put info
					}); //end startwrite
				//}); //end getinfo
			});	 //end mbtiles
		}
	});
  });
});


/*
			var rawTile = new VectorTile(new Pbf(tile));
			console.log(rawTile);
			
			var water = rawTile.layers.waterway;
			console.log(water);
			var feat = water.feature(0);
			console.log(feat);
			var geojson = feat.toGeoJSON(x, y, z);
			console.log(JSON.stringify(geojson));
			*/

var mbtiles_dest = './2017-07-03_europe_spain.mbtiles';
//mbtiles_dest = './barcelona2.mbtiles';

new MBTiles('./osm_icgc_perry.mbtiles', function(err, mbtiles) {
  //console.log(mbtiles) // mbtiles object with methods listed below

  //getTiles(mbtiles);

  mbtiles.getTile(z, x, y, function(err, data, headers) {
	console.log(data);  
	// `data` is your gzipped buffer - use zlib to gunzip or inflate
	if (err) {
      throw err;
	}
	new MBTiles(mbtiles_dest, function(err, mbtiles2) {
		if (err) {
			throw err;
		}

		updateTile(mbtiles2, data, function(err){
			mbtiles2.stopWriting(function(err) {
				// stop writing to your mbtiles object
				console.log("stopWriting");
				if (err) {
					throw err;
				}
			}); //end stopwrite
		});
		
	});
});
});	


/*
new MBTiles('./2017-07-03_spain_barcelona.mbtiles', function(err, mbtiles) {
  console.log(mbtiles); // mbtiles object with methods listed below
  mbtiles.getTile(z, x, y, function(err, data, headers) {
	// `data` is your gzipped buffer - use zlib to gunzip or inflate
	if (err) {
      throw err;
    }
	zlib.unzip(data, function(err, tile) {
		if (!err) {
			var rawTile = new VectorTile(new Pbf(tile));
			console.log(rawTile);
			var water = rawTile.layers.water
			console.log(water);
			var feat = water.feature(0);
			console.log(feat);
			var geojson = feat.toGeoJSON(x, y, z);
			console.log(JSON.stringify(geojson));
		}
	});
  });
});
*/





