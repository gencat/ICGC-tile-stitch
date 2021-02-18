const fs = require('fs');
const path = require('path');
const argv = require('argv');
const turf = require('@turf/turf');
const { exec } = require('child_process');

const UtilsMbtiles = require('./utilsMbtiles');
const _f = require('./config');

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

async function borrarOrigenTempFiles(dir){
	if (fs.existsSync(dir)) {
		fs.readdirSync(dir).forEach(function(entry) {
			var entry_path = path.join(dir, entry);
			if(!entry_path.includes('_destino')){
				fs.unlinkSync(entry_path);
			}
		});
	}
}

async function createOrigenTempFiles(z,x,y,tile_origen,tileId,dir,url_clip){
	return new Promise(async function(resolve, reject) {
		const tipus = "origen";
		await borrarOrigenTempFiles(dir);
		const geojson_file = await UtilsMbtiles.tesela2FileGeoJson(z,x,y,tile_origen,tileId,dir,tipus);
		const tiles_geojson = await UtilsMbtiles.leerJson(geojson_file);
		//bbox de la tesela
		const tile_bbox = turf.bbox(tiles_geojson);
		const bbox_tile_pol = turf.bboxPolygon(tile_bbox);
		const bbox_tile_pol_file_path = path.join(dir, tileId+"_bbox_tile_pol_"+tipus+".geojson");
		const bbox_tile_pol_file = await UtilsMbtiles.escribeArchivoJson(bbox_tile_pol_file_path, bbox_tile_pol);
		//clip poligon
		const clip_file = await UtilsMbtiles.clipGeoJSON(path.join(dir, tileId+"_clip_"+tipus+".geojson"), bbox_tile_pol_file_path, url_clip);
		//console.log(clip_file);
		const geojson_cliped = await UtilsMbtiles.fileGeoJsonClip(geojson_file, clip_file, tileId, dir, tipus);
		resolve(geojson_cliped);
	});
}

async function createDestinoTempFiles(z,x,y,tile_origen,tileId,dir,url_clip){
	return new Promise(async function(resolve, reject) {
		const tipus = "destino";
		const geojson_file = await UtilsMbtiles.tesela2FileGeoJson(z,x,y,tile_origen,tileId,dir,tipus);
		const tiles_geojson = await UtilsMbtiles.leerJson(geojson_file);
		//bbox de la tesela
		const tile_bbox = turf.bbox(tiles_geojson);
		const bbox_tile_pol = turf.bboxPolygon(tile_bbox);
		const bbox_tile_pol_file_path = path.join(dir, tileId+"_bbox_tile_pol_"+tipus+".geojson");
		const bbox_tile_pol_file = await UtilsMbtiles.escribeArchivoJson(bbox_tile_pol_file_path, bbox_tile_pol);

		//archivo con el poligono de corte de la tesela
		const clip_file = await UtilsMbtiles.clipGeoJSON(path.join(dir, tileId+"_clip_"+tipus+".geojson"), bbox_tile_pol_file_path, url_clip);
		const clip_pol = await UtilsMbtiles.leerJson(clip_file);
		const pol_clip_destino = turf.difference(bbox_tile_pol, clip_pol.features[0]);
		const output_clip_file = await UtilsMbtiles.escribeArchivoJson(path.join(dir, tileId+"_clip_"+tipus+".geojson"), pol_clip_destino);
		
		const geojson_cliped = await UtilsMbtiles.fileGeoJsonClip(geojson_file, output_clip_file, tileId, dir, tipus);
		resolve(geojson_cliped);
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
				//let hrend = process.hrtime(hrstart);
				//console.log("createTileTippecanoe Execution time (hr): %s", prettySeconds(hrend[0]));
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
		const tileId =  UtilsMbtiles.createTileId(z,x,y);
		const tileIdDB =  UtilsMbtiles.createTileIdDB(z,x,y);
		
		const tile_origen = await UtilsMbtiles.getTile(z, x, y, origen_mbt);
		const tile_destino = await UtilsMbtiles.getTile(z, x, y, destino_mbt);
		
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
		
		const geojson_merged = await UtilsMbtiles.mergeGeoJson([origen_json, destino_json], path.join(dir, tileId+"_merged.geojson"));
		
		const layers = await UtilsMbtiles.geojsonToFileLayers(geojson_merged, dir);
		
		//create tippecaoe mbtiles
		const tileMb = await createTileTippecanoe(tileId, tileIdDB, layers, dir);
		
		//let hrend = process.hrtime(hrstart);
		//console.log("mergeTile Execution time (hr): %s", prettySeconds(hrend[0]));
		
		resolve(tileId);
	});
}

async function createMbtileSingleTile(uri_origen, uri_destino, uri_clip, z, x, y){
	var origen_mbt = await UtilsMbtiles.getMbtile(uri_origen);
	var destino_mbt = await UtilsMbtiles.getMbtile(uri_destino);
	var tilezxy = UtilsMbtiles.createTileIdObj(z, x, y);

	let tileid = await mergeTile(origen_mbt, destino_mbt, uri_clip, tilezxy);
	return tileid;
}

createMbtileSingleTile(mbtiles_ori, mbtiles_dest, pol_cat, args.options.z,args.options.x,args.options.y);
