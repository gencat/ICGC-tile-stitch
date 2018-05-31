const OpenMapTiles = require('./openMapTiles');
const VectorTile = require('@mapbox/vector-tile').VectorTile;
const tilebelt = require('@mapbox/tilebelt');
const Pbf = require('pbf');
const zlib = require('zlib');
const turf = require('@turf/turf');
const fs = require('fs');
const _f = require('./config');
const path = require('path');
const geobuf = require('geobuf');
const vtpbf = require('vt-pbf');
const geojsonVt = require('geojson-vt');
const geojsonMerge = require('@mapbox/geojson-merge');
const rewind = require('geojson-rewind');
const earcut = require('earcut');
const { execFile } = require('child_process');
const { exec } = require('child_process');
const prettySeconds = require('pretty-seconds');
const delay = require('delay');
const syncEach = require('sync-each');
const argv = require('argv');

const hrstart = process.hrtime();

const mbtiles_ori = _f.mbtiles_ori;
const mbtiles_dest = _f.mbtiles_dest;
const pol_cat = _f.pol_cat;
const mbtiles_dest_source = _f.mbtiles_dest_source;

const zoom_levels = _f.zoom_levels;

argv.option([
	{
		name: "z",
		type: "int"
	},
	{
		name: "x",
		type: "int"
	},
	{
		name: "y",
		type: "int"
	}
]);
const args = argv.run();
console.log(args.options);

function getIdTileMatch(idTile){
	const reg = /\(([0-9]+),\s([0-9]+),\s([0-9]+)\)/g;
	let match = reg.exec(idTile);
	return match;
}

function idTile2ZXY(idTile){
	let zxy = {};
	match = getIdTileMatch(idTile)
	zxy.z = match[3];
	zxy.x = match[1];
	zxy.y = match[2];
	return zxy;
}

function idTile2TileId(idTile){
	let tileId = "";
	const xyz = idTile2ZXY(idTile)
	tileId = createTileId(xyz.z, xyz.x, xyz.y);
	return tileId;
}

function createTileId(z, x, y) {
	return `${z}_${x}_${y}`;
}

function createTileIdDB(z, x, y) {
	return `${z}/${x}/${y}`;
}

function getMbtile(uri){
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

function getTile(z, x, y, mbtiles){
	return new Promise(function(resolve, reject) {
		mbtiles.getTile(z, x, y, function(err, data, headers) {
			if (err) {
				reject(err);
			}
			resolve(data);
		});
	});	
}

function tile2geoJSON(z, x, y, data){
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
			resolve(collection);
		});
	});	
}

function escribeArchivoJson(file_name, json_data){
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

function leerJson(file){
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

function clipGeoJSON(output_file, input_file, clip_file){
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

function unZipTile(tile){
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

async function geojsonToFileLayers(json_file, dir){
	return new Promise(async function(resolve, reject) {
		const geojson = await leerJson(json_file);
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
		var files = await crearArchivosJson(layersKeys, layers, dir);
		resolve(files);
	});
}

async function geojsonToVectorTileLayers(json_file, z, x, y){
	return new Promise(async function(resolve, reject) {
		var geojson = await leerJson(json_file);

		var flatten = turf.flatten(geojson);

		var layers = {};
		var vt_layers = {};
		flatten.features.forEach(function(feature){
			//if("GeometryCollection" !== feature.geometry.type){
				var vt_layer = feature.properties.vt_layer;
				if("parks" === vt_layer){
					feature.properties.vt_layer = "park";
					vt_layer = "park";
				}else if("buildings" === vt_layer){
					feature.properties.vt_layer = "building";
					vt_layer = "building";
				}
				
				if(layers[vt_layer]){
					/*
					var special = "landcover";
					if(vt_layer !== special || (vt_layer === special && layers[vt_layer].features.length <= 1500)){
						if(vt_layer === special){
							 console.log(feature.geometry.coordinates.length);
							 if(feature.geometry.coordinates.length > 1){
								console.log(JSON.stringify(feature));
								var data = earcut.flatten(feature.geometry.coordinates);
								var triangles = earcut(data.vertices, data.holes, data.dimensions);
								var deviation = earcut.deviation(data.vertices, data.holes, data.dimensions, triangles);
								console.log(deviation);
								console.log(triangles);
								console.log(triangles.length/3);
								const verts = [];
								const vertices = data.vertices;
								for (let j = 0; j < triangles.length; j += 3) {
									const a = triangles[j];
									const b = triangles[j + 1];
									const c = triangles[j + 2];
									verts.push([
										[vertices[a * 2], vertices[a * 2 + 1]],
										[vertices[b * 2], vertices[b * 2 + 1]],
										[vertices[c * 2], vertices[c * 2 + 1]],
										[vertices[a * 2], vertices[a * 2 + 1]]
									]);
								}
								verts.forEach(function(item, index){
									let feat = {
										"type": "Feature",
										"properties": feature.properties,
										"geometry": {
											"type": "Polygon",
											"coordinates": [item]
										}
									};

									layers[vt_layer].features.push(feat);
								});
								

								
							}else{
								layers[vt_layer].features.push(feature);
							}
						}else{
							layers[vt_layer].features.push(feature);
						}
					}
					*/
					layers[vt_layer].features.push(feature);
				}else{
					layers[vt_layer] = {type: "FeatureCollection", features:[feature], name: vt_layer};
				}
			//}else{
			//	console.log(feature);
			//}
		});
	
		var layersKeys =  Object.keys(layers);
		
		//crearArchivosJson(layersKeys, layers);
		var clockwise = false;
		layersKeys.forEach(async function(item){
			var geojson = rewind(layers[item], clockwise);
			//var geojson = layers[item];
			var tileindex = geojsonVt(geojson);
			var tile = tileindex.getTile(z, x, y);
			var jsObj = {};
			jsObj[item] = tile;
			var buffer = vtpbf.fromGeojsonVt(jsObj);
			vt_layers[item] = new VectorTile(new Pbf(buffer));
		});
		resolve(vt_layers);
	});
}

function crearArchivosJson(layersKeys, layers, dir){
	return new Promise(async function(resolve, reject) {
		var clockwise = false;
		const keysItems = layersKeys.map(async function(item){
			// geojson = rewind(layers[item], clockwise);
			let geojson = layers[item];
			//let key_file = {};
			let json_file = await escribeArchivoJson(path.join(dir, item+".geojson"), geojson);
			let hrend = process.hrtime(hrstart);
			//key_file[item] = json_file;
			console.log("crearArchivosJson %s Execution time (hr): %s", item, prettySeconds(hrend[0]));
			return [item, json_file];
		});
		Promise.all(keysItems).then((completed) => {
			let hrend = process.hrtime(hrstart);
			console.log("crearArchivosJson Execution time (hr): %s", prettySeconds(hrend[0]));
			resolve(completed);
		});
	});
}

function mergeGeoJson(files, output_file){
	return new Promise(async function(resolve, reject) {
		try {
			var collection = {type: 'FeatureCollection', features: []};
			const features = files.map(async (item) => {
				let json = await leerJson(item);
				return json.features;
			});
			Promise.all(features).then(async (completed)=>{
				completed.forEach((item) => {
					collection.features = collection.features.concat(item);
				});
				const merged_file = await escribeArchivoJson(output_file, collection);
				resolve(merged_file);
			});
		} catch (error) {
			reject(error);
		}
	});
}

function updateTile(mbtiles, data, z, x, y){
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
						console.log("stopWriting");
						let hrend = process.hrtime(hrstart);
						console.log("Execution time (hr): %s", prettySeconds(hrend[0]));
						resolve();
					}
				}); //end stopwrite
			}
		}); //end update
	});
}

async function mergeInnerTiles(origen_mbt, destino_mbt, z_levels){
	z_levels.forEach(async (item) => {	
		try{
			const tiles = await leerJson('tiles'+item+'_inner.geojson');
			syncEach(tiles.features, 
				function(feat, next){
					(async () => {
						if(!feat.properties.id){
							feat.properties.id = feat.id;
						}
						let tilezxy = idTile2ZXY(feat.properties.id);
						console.debug("antes" + JSON.stringify(tilezxy));
						let tileid = await replaceTile(origen_mbt, destino_mbt, tilezxy);
						console.debug("despues" + JSON.stringify(tilezxy));
						next(null,tileid);
					})();
				},
				function(err, transformedItems){
					console.log(transformedItems);
				}
			);
		}catch(err){
			console.log(err);
		}
	});
}

async function replaceTile(origen_mbt, destino_mbt, tile_index){
	return new Promise(async function(resolve, reject) {
		try{
			const tile_origen = await getTile(tile_index.z, tile_index.x, tile_index.y, origen_mbt);
			await updateTile(destino_mbt, tile_origen, tile_index.z, tile_index.x, tile_index.y);
			resolve(tile_index);
		}catch(err){
			reject(err);
		}
	});
}

function rimraf(dir_path) {
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

async function createOrigenTempFiles(z,x,y,tile_origen,tileId,dir,url_clip){
	return new Promise(async function(resolve, reject) {
		const tipus = "origen";
		const geojson_file = await tesela2FileGeoJson(z,x,y,tile_origen,tileId,dir,tipus);
		const tiles_geojson = await leerJson(geojson_file);
		//bbox de la tesela
		const tile_bbox = turf.bbox(tiles_geojson);
		const bbox_tile_pol = turf.bboxPolygon(tile_bbox);
		const bbox_tile_pol_file_path = path.join(dir, tileId+"_bbox_tile_pol_"+tipus+".geojson");
		const bbox_tile_pol_file = await escribeArchivoJson(bbox_tile_pol_file_path, bbox_tile_pol);
		//clip poligon
		const clip_file = await clipGeoJSON(path.join(dir, tileId+"_clip_"+tipus+".geojson"), bbox_tile_pol_file_path, url_clip);
		//console.log(clip_file);
		const geojson_cliped = await fileGeoJsonClip(geojson_file, clip_file, tileId, dir, tipus);
		resolve(geojson_cliped);
	});
}

async function createDestinoTempFiles(z,x,y,tile_origen,tileId,dir,url_clip){
	return new Promise(async function(resolve, reject) {
		const tipus = "destino";
		const geojson_file = await tesela2FileGeoJson(z,x,y,tile_origen,tileId,dir,tipus);
		const tiles_geojson = await leerJson(geojson_file);
		//bbox de la tesela
		const tile_bbox = turf.bbox(tiles_geojson);
		const bbox_tile_pol = turf.bboxPolygon(tile_bbox);
		const bbox_tile_pol_file_path = path.join(dir, tileId+"_bbox_tile_pol_"+tipus+".geojson");
		const bbox_tile_pol_file = await escribeArchivoJson(bbox_tile_pol_file_path, bbox_tile_pol);


		//archivo con el poligono de corte de la tesela
		const clip_file = await clipGeoJSON(path.join(dir, tileId+"_clip_"+tipus+".geojson"), bbox_tile_pol_file_path, url_clip);
		const clip_pol = await leerJson(clip_file);
		const pol_clip_destino = turf.difference(bbox_tile_pol, clip_pol.features[0]);
		const output_clip_file = await escribeArchivoJson(path.join(dir, tileId+"_clip_"+tipus+".geojson"), pol_clip_destino);
		
		const geojson_cliped = await fileGeoJsonClip(geojson_file, output_clip_file, tileId, dir, tipus);
		resolve(geojson_cliped);
	});
}

async function tesela2FileGeoJson(z,x,y,tile_origen,tileId,dir,tipus){
	//archivo con todo el geojson de la tesela
	return new Promise(async function(resolve, reject) {
		const tilejson_origen = await tile2geoJSON(z,x,y,tile_origen);
		const output_origen_file = await escribeArchivoJson(path.join(dir, tileId+"_full_"+tipus+".geojson"), tilejson_origen);
		let hrend = process.hrtime(hrstart);
		console.log("tesela2FileGeoJson Execution time (hr): %s", prettySeconds(hrend[0]));
		resolve(output_origen_file);
	});
}

async function fileGeoJsonClip(geojson_path, clip_path, tileId, dir, tipus){
	//archivo con el geojson cortado
	return new Promise(async function(resolve, reject) {
		const output_file_origen = await clipGeoJSON(path.join(dir, tileId+"_cliped_"+tipus+".geojson"), geojson_path, clip_path);
		let hrend = process.hrtime(hrstart);
		console.log("fileGeoJsonClip Execution time (hr): %s", prettySeconds(hrend[0]));
		resolve(output_file_origen);
	});
}

async function createTileTippecanoe(tileId, tileIdDB, layers, dir){
	return new Promise(async function(resolve, reject) {
		var tileMB = path.join(dir, tileId+".mbtiles");
		var commando = "tippecanoe -o "+tileMB+" --one-tile="+tileIdDB;
		layers.forEach((item) => {
			commando += " -L "+ item[0] + ":" + item[1];
		});
		
		exec(commando, (err, stdout, stderr) => {
			if (err) {
				console.error(err);
				reject(err);
			}else{
				let hrend = process.hrtime(hrstart);
				console.log("createTileTippecanoe Execution time (hr): %s", prettySeconds(hrend[0]));
				resolve(tileMB);
			}
		});
	});
}

async function mergeTile(origen_mbt, destino_mbt, uri_clip, tile_index){
	return new Promise(async function(resolve, reject) {
		const z = tile_index.z;
		const x = tile_index.x;
		const y = tile_index.y;
		const tileId = createTileId(z,x,y);
		const tileIdDB = createTileIdDB(z,x,y);
		const tile_origen = await getTile(z, x, y, origen_mbt);
		const tile_destino = await getTile(z, x, y, destino_mbt);
		
		//creamos la carpeta temporal de la tesela
		const dir = path.join(__dirname, "temp", tileId);
		
		//rimraf(dir);
		try {
			fs.statSync(dir);
		} catch(e) {
			fs.mkdirSync(dir);
		}

		//origen
		const origen_json = await createOrigenTempFiles(z,x,y,tile_origen,tileId,dir,uri_clip);
		
		const cliped_destino_file = path.join(__dirname, "temp", tileId, tileId+"_cliped_destino.geojson"); 
		let destino_json = null;
		try {
			fs.statSync(cliped_destino_file);
			//leer el json de destino
			destino_json = cliped_destino_file;
		} catch(e) {
			//destino
			destino_json = await createDestinoTempFiles(z,x,y,tile_destino,tileId,dir,uri_clip);
		}
		
		const geojson_merged = await mergeGeoJson([origen_json, destino_json], path.join(dir, tileId+"_merged.geojson"));
		
		const layers = await geojsonToFileLayers(geojson_merged, dir);
		
		const tileMb = await createTileTippecanoe(tileId, tileIdDB, layers, dir);
		//console.log(tileMb);
		
		let hrend = process.hrtime(hrstart);
		console.log("mergeTile Execution time (hr): %s", prettySeconds(hrend[0]));
		
		resolve(tileId);
		/*
		//const tileMb = path.join(dir, tileId+".mbtiles");
		//console.log(tileMb);
		try{
			const tile_mbt = await getMbtile(tileMb);
			const tileindex = await replaceTile(tile_mbt, destino_mbt, tile_index);
			let hrend = process.hrtime(hrstart);
			console.log("mergeTile Execution time (hr): %s", prettySeconds(hrend[0]));
			resolve(tileId);
		}catch(err){
			console.log("**********************************************");
			console.log(tileMb);
			reject(err);
		}
		*/
	});
}

async function mergeEdgesTiles(origen_mbt, destino_mbt, uri_clip, z_levels){
	z_levels.forEach(async (item) => {	
		try{
			let tiles = await leerJson('tiles'+item+'_edges.geojson');
			//let feat = tiles.features[0];
			syncEach(tiles.features, 
				function(feat, next){
					(async () => {
						if(!feat.properties.id){
							feat.properties.id = feat.id;
						}
						let tilezxy = idTile2ZXY(feat.properties.id);
						console.debug("antes" + JSON.stringify(tilezxy));
						let tileid = tilezxy;
						//if(tilezxy.z ===  '12' &&  (tilezxy.x === '2081' && tilezxy.y ==='1524') || (tilezxy.x === '2080' && (tilezxy.y ==='1524' || tilezxy.y ==='1525'))){
							tileid = await mergeTile(origen_mbt, destino_mbt, uri_clip, tilezxy);
						//}
						console.debug("despues" + JSON.stringify(tilezxy));
						next(null,tileid);
					})();
				},
				function(err, transformedItems){
					console.log(transformedItems);
				}
			);
		}catch(err){
			console.log(err);
		}
	});
}

async function mergeMbtiles(uri_origen, uri_destino, uri_clip, z_levels){

	var origen = await getMbtile(uri_origen);
	var destino = await getMbtile(uri_destino);

	//mergeInnerTiles(origen, destino, z_levels);

	mergeEdgesTiles(origen, destino, uri_clip, z_levels);
}

async function isInnerTile(z, x, y){
	const tiles = await leerJson('tiles'+z+'_inner.geojson');
	return findTileById(z, x, y, tiles);
}

async function isEdgeTile(z, x, y){
	const tiles = await leerJson('tiles'+z+'_edges.geojson');
	return findTileById(z, x, y, tiles);
}

function findTileById(z, x, y, tiles){
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

async function createMbtileSingleTile(uri_origen, uri_destino, uri_clip, z, x, y){
	var origen_mbt = await getMbtile(uri_origen);
	var destino_mbt = await getMbtile(uri_destino);

	var tilezxy = {x: x, y: y, z: z};
	var isInner = await isInnerTile(z, x, y);
	//console.log(isInner);
	
	if(isInner){
		//let tileid = await replaceTile(origen_mbt, destino_mbt, tilezxy);
		//return tileid;
	}else{

		var isEdge = await isEdgeTile(z, x, y);
		//console.log(isEdge);
		if (isEdge){
			let tileid = await mergeTile(origen_mbt, destino_mbt, uri_clip, tilezxy);
			return tileid;
		}else{
			return null;
		}
	}
	return null;
}



createMbtileSingleTile(mbtiles_ori, mbtiles_dest, pol_cat, args.options.z,args.options.x,args.options.y);

//mergeMbtiles(mbtiles_ori, mbtiles_dest, pol_cat, zoom_levels);
