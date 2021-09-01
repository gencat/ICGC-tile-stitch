"use strict";
const zlib = require('zlib');
const rewind = require('geojson-rewind');
const VectorTile = require('@mapbox/vector-tile').VectorTile;
const turf = require('@turf/turf');
const fs = require('fs');
const { execFile } = require('child_process');
const path = require('path');
const Pbf = require('pbf');

const OpenMapTiles = require('./openMapTiles');
const _f = require('./config');

class UtilsMbtiles {

	static findTileById(z, x, y, tiles) {
		const idTile = `(${x}, ${y}, ${z})`;
		var found = tiles.features.find(function (element) {
			return element.properties.id === idTile;
		});
		if (found) {
			return true;
		} else {
			return false;
		}
	}

	static getIdTileMatch(idTile) {
		const reg = /\(([0-9]+),\s([0-9]+),\s([0-9]+)\)/g;
		const match = reg.exec(idTile);
		return match;
	}

	static idTile2ZXY(idTile) {
		const zxy = {};
		const match = UtilsMbtiles.getIdTileMatch(idTile);
		zxy.z = match[3];
		zxy.x = match[1];
		zxy.y = match[2];
		return zxy;
	}

	static idTile2TileId(idTile) {
		let tileId = "";
		const xyz = UtilsMbtiles.idTile2ZXY(idTile)
		tileId = UtilsMbtiles.createTileId(xyz.z, xyz.x, xyz.y);
		return tileId;
	}

	static createTileId(z, x, y) {
		return `${z}_${x}_${y}`;
	}

	static createTileIdDB(z, x, y) {
		return `${z}/${x}/${y}`;
	}

	static createTileIdObj(z, x, y) {
		return { x: x, y: y, z: z };
	}

	static rimraf(dir_path) {
		if (fs.existsSync(dir_path)) {
			fs.readdirSync(dir_path).forEach(function (entry) {
				var entry_path = path.join(dir_path, entry);
				if (fs.lstatSync(entry_path).isDirectory()) {
					rimraf(entry_path);
				} else {
					fs.unlinkSync(entry_path);
				}
			});
			fs.rmdirSync(dir_path);
		}
	}

	static getMbtile(uri) {
		return new Promise(function (resolve, reject) {
			new OpenMapTiles(uri, function (err, mbtiles) {
				if (err) {
					reject(err);
				} else {
					resolve(mbtiles);
				}
			});
		});
	}

	static getTile(z, x, y, mbtiles) {
		return new Promise(function (resolve, reject) {
			mbtiles.getTile(z, x, y, function (err, data, headers) {
				if (err) {
					resolve(null);
					//reject(err);
				}
				//check if tile if compressed
				if (headers && headers['Content-Encoding'] && headers['Content-Encoding'] == 'gzip') {
					resolve(data);
				} else {
					zlib.gzip(data, function (err, tile) {
						if (err) {
							reject(err);

						}
						resolve(tile);
					});

				}




			});
		});
	}

	static getTMSy(z, y) {
		return (1 << z) - 1 - y;
	}


	static createTileId2(z, x, y) {
		return `${z}/${x}/${y}`;
	}
	static writeTile(mbtiles, data, z, x, y) {

		//y= this.getTMSy(z, y);
		return new Promise(async function (resolve, reject) {

			zlib.gzip(data, function (err, buffer) {

				var _db = mbtiles._db;
				var tileId = `${z}/${x}/${y}`;
				//14/7746/9935
				//console.log(data.toGeoJSON());
				//console.log(_db);
				//_db.run('PRAGMA synchronous=OFF');
				_db.run('PRAGMA synchronous=OFF');
				
				_db.serialize(function () {
					_db.run('BEGIN');
					_db.run(`INSERT INTO images VALUES(?,?)`, [tileId, buffer], function (err) {
						if (err) {
							console.info(err);
							return reject(err.message);
						}
						// get the last insert id
					//	console.log(buffer);
						console.log(`A row has been images`);
						//_db.run('COMMIT');
					});
					//_db.serialize(function () {
						_db.run(`INSERT INTO map(zoom_level,tile_column,tile_row,tile_id) VALUES(?,?,?,?)`, [z, x, y, tileId], function (err) {
							if (err) {
								console.info(err);
								return reject(err.message);
							}
							// get the last insert id
							console.log(`A row has been map`);
							//_db.run('COMMIT');
						});
					//});
					_db.run('COMMIT');
					
				});
			

				// close the database connection
				//  _db.close();
				return resolve();
				//_db.serialize(function() {
				//	_db.run('BEGIN');

				/*
				mbtiles.startWriting(function(err) {

					console.info("err",err);
				mbtiles.putTile(z, x, y, buffer, function(err) {
					if (err) {
						reject(err);
						//throw err;
					}else{
						mbtiles.stopWriting(function(err) {
							// stop writing to your mbtiles object
							if (err) {
								//throw err;
								reject(err);
							}else{
								//console.log("stopWriting");
								//let hrend = process.hrtime(hrstart);
								//console.log("Execution time (hr): %s", prettySeconds(hrend[0]));
								resolve();
							}
						}); //end stopwrite
					}
				});
			  });
			  */
		});

		});
	}

	static updateTile(mbtiles, data, z, x, y) {
		return new Promise(async function (resolve, reject) {
			mbtiles.updateTile(z, x, y, data, function (err) {
				// continue onward
				if (err) {
					reject(err);
					//throw err;
				} else {
					mbtiles.stopWriting(function (err) {
						// stop writing to your mbtiles object
						if (err) {
							//throw err;
							reject(err);
						} else {
							//console.log("stopWriting");
							//let hrend = process.hrtime(hrstart);
							//console.log("Execution time (hr): %s", prettySeconds(hrend[0]));
							resolve();
						}
					}); //end stopwrite
				}
			}); //end update
		});
	}

	static updateTilePlanet(mbtiles, data, z, x, y) {
		return new Promise(async function (resolve, reject) {

			mbtiles.updateTilePlanet(z, x, y, data, function (err) {
				try {
					// continue onward
					if (err) {
						
						reject(err);
						//throw err;
					} else {
						mbtiles.stopWriting(function (err) {
							// stop writing to your mbtiles object
							if (err) {
								//throw err;
							
								reject(err);
							} else {
							
								//let hrend = process.hrtime(hrstart);
								//console.log("Execution time (hr): %s", prettySeconds(hrend[0]));
								resolve();
							}
						}); //end stopwrite
					}
				} catch (err) {

				}


			}); //end update
		});
	}


	static async addNewTile(origen_mbt, destino_mbt, tile_index) {
		return new Promise(async function (resolve, reject) {
			try {
				const tile_origen = await UtilsMbtiles.getTile(tile_index.z, tile_index.x, tile_index.y, origen_mbt);

				//console.info("gettile",tile_origen);
				if (tile_origen) {
					await UtilsMbtiles.writeTile(destino_mbt, tile_origen, tile_index.z, tile_index.x, tile_index.y);
					//console.info("he actalitzat tiles");
					resolve(tile_index);
				} else {
					resolve();
				}
			} catch (err) {
				console.info("No trobo tile", err);
				//reject(err);
				resolve()
			}
		});
	}

	static async replaceTile(origen_mbt, destino_mbt, tile_index) {
		return new Promise(async function (resolve, reject) {
			try {
				const tile_origen = await UtilsMbtiles.getTile(tile_index.z, tile_index.x, tile_index.y, origen_mbt);

				//console.info("gettile",tile_origen);

				await UtilsMbtiles.updateTile(destino_mbt, tile_origen, tile_index.z, tile_index.x, tile_index.y);
				//console.info("he actalitzat tiles");
				resolve(tile_index);
			} catch (err) {
				console,info("hi ha error",err);
				resolve();
				//reject(err);
			}
		});
	}

	static async replaceTilePlanet(origen_mbt, destino_mbt, tile_index) {
		return new Promise(async function (resolve, reject) {
			try {
				const tile_origen = await UtilsMbtiles.getTile(tile_index.z, tile_index.x, tile_index.y, origen_mbt);
				if(tile_origen){
				await UtilsMbtiles.updateTilePlanet(destino_mbt, tile_origen, tile_index.z, tile_index.x, tile_index.y);
				resolve(tile_index);
				}else{
					console.info("Paso pero no tile_origen",tile_origen);
					resolve(tile_index);
				}
			} catch (err) {
				console.info("Error");
				reject(err);
			}
		});
	}

	static tile2geoJSON(z, x, y, data) {
		return new Promise(function (resolve, reject) {
			zlib.unzip(data, function (err, tile) {
				if (err) {
					reject(err);
					//tile= data;
				}
				var rawTile = new VectorTile(new Pbf(tile));
				var layers = Object.keys(rawTile.layers);

				if (!Array.isArray(layers)) {
					layers = [layers];
				}
				var collection = { type: 'FeatureCollection', features: [] };

				layers.forEach(function (layerID) {
					var layer = rawTile.layers[layerID];
					if (layer) {
						for (var i = 0; i < layer.length; i++) {
							var feature = layer.feature(i).toGeoJSON(x, y, z);
							if (layers.length > 1) feature.properties.vt_layer = layerID;
							collection.features.push(feature);
						}
					}
				});
				//const clockwise = false;
				//const flatten = turf.flatten(collection);
				//collection = rewind(flatten, clockwise);

				resolve(collection);
			});
		});
	}

	static async tesela2FileGeoJson(z, x, y, tile_origen, tileId, dir, tipus) {
		//archivo con todo el geojson de la tesela
		return new Promise(async function (resolve, reject) {
			const tilejson_origen = await UtilsMbtiles.tile2geoJSON(z, x, y, tile_origen);
			const output_origen_file = await UtilsMbtiles.escribeArchivoJson(path.join(dir, tileId + "_full_" + tipus + ".geojson"), tilejson_origen);
			//let hrend = process.hrtime(hrstart);
			//console.log("tesela2FileGeoJson Execution time (hr): %s", prettySeconds(hrend[0]));
			resolve(output_origen_file);
		});
	}

	static unZipTile(tile) {
		return new Promise(function (resolve, reject) {
			zlib.unzip(tile, async function (err, data) {
				if (err) {
					reject(err);
				} else {
					var rawTile = new VectorTile(new Pbf(data));
					resolve(rawTile);
				}
			});
		});
	}

	static escribeArchivoJson(file_name, json_data) {
		return new Promise(function (resolve, reject) {
			fs.writeFile(file_name, JSON.stringify(json_data), function (err) {
				if (err) {
					reject(err);
				} else {
					resolve(file_name);
				}
			});
		});
	}

	static leerJson(file) {
		return new Promise(function (resolve, reject) {
			fs.readFile(file, 'utf8', (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(JSON.parse(data));
				}
			});
		});
	}

	static clipGeoJSON(output_file, input_file, clip_file) {
		return new Promise(function (resolve, reject) {
			var arrayParams = [];
			arrayParams.push("-f");
			arrayParams.push("GeoJSON");
			arrayParams.push(output_file);
			arrayParams.push(input_file);
			arrayParams.push("-clipsrc");
			arrayParams.push(clip_file);
			execFile(path.join(_f.gdalPath, _f.org2ogr), arrayParams, function (err, stdout, stderr) {
				if (err) {
					console.log(err);
					reject(err);
				} else {
					resolve(output_file);
				}
			});
		});
	}

	static async fileGeoJsonClip(geojson_path, clip_path, tileId, dir, tipus) {
		//archivo con el geojson cortado
		return new Promise(async function (resolve, reject) {
			if (tipus !== 'origen') {
				const output_file_origen = await UtilsMbtiles.clipGeoJSON(path.join(dir, tileId + "_cliped_" + tipus + ".geojson"), geojson_path, clip_path);
				//let hrend = process.hrtime(hrstart);
				//console.log("fileGeoJsonClip Execution time (hr): %s", prettySeconds(hrend[0]));
				resolve(output_file_origen);
			} else {
				const output_file_origen = path.join(dir, tileId + "_cliped_" + tipus + ".geojson");
				execFile(_f.copy, [geojson_path, output_file_origen], function (err, stdout, stderr) {
					if (err) {
						console.log(err);
						reject(err);
					} else {
						resolve(output_file_origen);
					}
				});
			}
		});
	}

	static crearArchivosJson(layersKeys, layers, dir) {
		return new Promise(async function (resolve, reject) {
			var clockwise = false;
			const keysItems = layersKeys.map(async function (item) {
				//let geojson = rewind(layers[item], clockwise);
				let geojson = layers[item];
				//let key_file = {};
				let json_file = await UtilsMbtiles.escribeArchivoJson(path.join(dir, item + ".geojson"), geojson);
				//let hrend = process.hrtime(hrstart);
				//key_file[item] = json_file;
				//console.log("crearArchivosJson %s Execution time (hr): %s", item, prettySeconds(hrend[0]));
				return [item, json_file];
			});
			Promise.all(keysItems).then((completed) => {
				//let hrend = process.hrtime(hrstart);
				//console.log("crearArchivosJson Execution time (hr): %s", prettySeconds(hrend[0]));
				resolve(completed);
			});
		});
	}

	static mergeGeoJson(files, output_file) {
		return new Promise(async function (resolve, reject) {
			try {
				var collection = { type: 'FeatureCollection', features: [] };
				const features = files.map(async (item) => {
					let json = await UtilsMbtiles.leerJson(item);
					return json.features;
				});
				Promise.all(features).then(async (completed) => {
					completed.forEach((item) => {
						collection.features = collection.features.concat(item);
					});
					const merged_file = await UtilsMbtiles.escribeArchivoJson(output_file, collection);
					resolve(merged_file);
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	static async geojsonToFileLayers(json_file, dir) {
		return new Promise(async function (resolve, reject) {
			const geojson = await UtilsMbtiles.leerJson(json_file);
			let layers = {};
			geojson.features.forEach(function (feature) {
				let vt_layer = feature.properties.vt_layer;
				if ("parks" === vt_layer) {
					feature.properties.vt_layer = "park";
					vt_layer = "park";
				} else if ("buildings" === vt_layer) {
					feature.properties.vt_layer = "building";
					vt_layer = "building";
				}
				if (layers[vt_layer]) {
					layers[vt_layer].features.push(feature);
				} else {
					layers[vt_layer] = { type: "FeatureCollection", features: [feature], name: vt_layer };
				}
			});
			var layersKeys = Object.keys(layers);
			var files = await UtilsMbtiles.crearArchivosJson(layersKeys, layers, dir);
			resolve(files);
		});
	}
}

module.exports = UtilsMbtiles;
