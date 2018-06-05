"use strict";
const zlib = require('zlib');
const VectorTile = require('@mapbox/vector-tile').VectorTile;
const turf = require('@turf/turf');
const rewind = require('geojson-rewind');
const fs = require('fs');
const { execFile } = require('child_process');
const path = require('path');
const Pbf = require('pbf');

const OpenMapTiles = require('./openMapTiles');
const _f = require('./config');

class UtilsMbtiles {
	
	static findTileById(z, x, y, tiles){
		const idTile = `(${x}, ${y}, ${z})`;
		var found = tiles.features.find(function(element) {
			return element.properties.id === idTile;
		});
		if(found){
			return true;
		}else{
			return false;
		}
	}
	
	static getIdTileMatch(idTile){
		const reg = /\(([0-9]+),\s([0-9]+),\s([0-9]+)\)/g;
		const match = reg.exec(idTile);
		return match;
	}

	static idTile2ZXY(idTile){
		const zxy = {};
		const match = UtilsMbtiles.getIdTileMatch(idTile);
		zxy.z = match[3];
		zxy.x = match[1];
		zxy.y = match[2];
		return zxy;
	}

	static idTile2TileId(idTile){
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
		return {x: x, y: y, z: z};
	}

	static rimraf(dir_path) {
		if (fs.existsSync(dir_path)) {
			fs.readdirSync(dir_path).forEach(function(entry) {
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

	static getMbtile(uri){
		return new Promise(function(resolve, reject) {
			new OpenMapTiles(uri, function(err, mbtiles) {
				if (err) {
					reject(err);
				}else{
					resolve(mbtiles);
				}
			});
		});
	}

	static getTile(z, x, y, mbtiles){
		return new Promise(function(resolve, reject) {
			mbtiles.getTile(z, x, y, function(err, data, headers) {
				if (err) {
					reject(err);
				}
				resolve(data);
			});
		});	
	}

	static updateTile(mbtiles, data, z, x, y){
		return new Promise(async function(resolve, reject) {
			mbtiles.updateTile(z, x, y, data, function(err) {
				// continue onward
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
			}); //end update
		});
	}

	static async replaceTile(origen_mbt, destino_mbt, tile_index){
		return new Promise(async function(resolve, reject) {
			try{
				const tile_origen = await UtilsMbtiles.getTile(tile_index.z, tile_index.x, tile_index.y, origen_mbt);
				await UtilsMbtiles.updateTile(destino_mbt, tile_origen, tile_index.z, tile_index.x, tile_index.y);
				resolve(tile_index);
			}catch(err){
				reject(err);
			}
		});
	}

	static tile2geoJSON(z, x, y, data){
		return new Promise(function(resolve, reject) {
			zlib.unzip(data, function(err, tile) {
				if (err) {
					reject(err);
				}
				var rawTile = new VectorTile(new Pbf(tile));
				var layers = Object.keys(rawTile.layers);
				
				if (!Array.isArray(layers)){
					layers = [layers];
				}
				var collection = {type: 'FeatureCollection', features: []};
				
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

	static async tesela2FileGeoJson(z,x,y,tile_origen,tileId,dir,tipus){
		//archivo con todo el geojson de la tesela
		return new Promise(async function(resolve, reject) {
			const tilejson_origen = await UtilsMbtiles.tile2geoJSON(z,x,y,tile_origen);
			const output_origen_file = await UtilsMbtiles.escribeArchivoJson(path.join(dir, tileId+"_full_"+tipus+".geojson"), tilejson_origen);
			//let hrend = process.hrtime(hrstart);
			//console.log("tesela2FileGeoJson Execution time (hr): %s", prettySeconds(hrend[0]));
			resolve(output_origen_file);
		});
	}

	static unZipTile(tile){
		return new Promise(function(resolve, reject) {
			zlib.unzip(tile, async function(err, data) {
				if (err) {
					reject(err);
				}else{
					var rawTile = new VectorTile(new Pbf(data));
					resolve(rawTile);
				}
			});
		});
	}

	static escribeArchivoJson(file_name, json_data){
		return new Promise(function(resolve, reject) {
			fs.writeFile(file_name, JSON.stringify(json_data), function (err) {
				if (err) {
					reject(err);
				}else{
					resolve(file_name);
				}
			});
		});	
	}

	static leerJson(file){
		return new Promise(function(resolve, reject) {
			fs.readFile(file, 'utf8', (err, data) => {
				if (err) {
					reject(err);
				} else{
					resolve(JSON.parse(data));
				}
			});
		});
	}

	static clipGeoJSON(output_file, input_file, clip_file){
		return new Promise(function(resolve, reject) {
			var arrayParams = [];
			arrayParams.push("-f");
			arrayParams.push("GeoJSON");
			arrayParams.push(output_file);
			arrayParams.push(input_file);
			arrayParams.push("-clipsrc");
			arrayParams.push(clip_file);
			execFile(path.join(_f.gdalPath,_f.org2ogr), arrayParams, function (err, stdout, stderr) {
				if (err) {
					console.log(err);
					reject(err);
				}else{
					resolve(output_file);
				}
			});
		});
	}

	static async fileGeoJsonClip(geojson_path, clip_path, tileId, dir, tipus){
		//archivo con el geojson cortado
		return new Promise(async function(resolve, reject) {
			const output_file_origen = await UtilsMbtiles.clipGeoJSON(path.join(dir, tileId+"_cliped_"+tipus+".geojson"), geojson_path, clip_path);
			//let hrend = process.hrtime(hrstart);
			//console.log("fileGeoJsonClip Execution time (hr): %s", prettySeconds(hrend[0]));
			resolve(output_file_origen);
		});
	}

	static crearArchivosJson(layersKeys, layers, dir){
		return new Promise(async function(resolve, reject) {
			var clockwise = false;
			const keysItems = layersKeys.map(async function(item){
				// geojson = rewind(layers[item], clockwise);
				let geojson = layers[item];
				//let key_file = {};
				let json_file = await UtilsMbtiles.escribeArchivoJson(path.join(dir, item+".geojson"), geojson);
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

	static mergeGeoJson(files, output_file){
		return new Promise(async function(resolve, reject) {
			try {
				var collection = {type: 'FeatureCollection', features: []};
				const features = files.map(async (item) => {
					let json = await UtilsMbtiles.leerJson(item);
					return json.features;
				});
				Promise.all(features).then(async (completed)=>{
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

	static async geojsonToFileLayers(json_file, dir){
		return new Promise(async function(resolve, reject) {
			const geojson = await UtilsMbtiles.leerJson(json_file);
			let layers = {};
			geojson.features.forEach(function(feature){
				let vt_layer = feature.properties.vt_layer;
				if("parks" === vt_layer){
					feature.properties.vt_layer = "park";
					vt_layer = "park";
				}else if("buildings" === vt_layer){
					feature.properties.vt_layer = "building";
					vt_layer = "building";
				}
				if(layers[vt_layer]){
					layers[vt_layer].features.push(feature);
				}else{
					layers[vt_layer] = {type: "FeatureCollection", features:[feature], name: vt_layer};
				}
			});
			var layersKeys = Object.keys(layers);
			var files = await UtilsMbtiles.crearArchivosJson(layersKeys, layers, dir);
			resolve(files);
		});
	}
}

module.exports = UtilsMbtiles;