const fs = require('fs');
const path = require('path');
const syncEach = require('sync-each');

const UtilsMbtiles = require('./utilsMbtiles');
const _f = require('./config');

const hrstart = process.hrtime();

const mbtiles_ori = _f.mbtiles_ori;
const mbtiles_dest = _f.mbtiles_dest;
const pol_cat = _f.pol_cat;
const mbtiles_dest_source = _f.mbtiles_dest_source;

const zoom_levels = _f.zoom_levels;

async function mergeSingleTile(tilezxy, destino_mbt){
	return new Promise(async function(resolve, reject) {
		let tileId = UtilsMbtiles.createTileId(tilezxy.z, tilezxy.x, tilezxy.y);
		const uri_sigleTile = path.join(__dirname, "temp", tileId, tileId+".mbtiles");
		const sigleMbtile = await UtilsMbtiles.getMbtile(uri_sigleTile);
		tileid = await UtilsMbtiles.replaceTile(sigleMbtile, destino_mbt, tilezxy);
		resolve(tileid);
	});
}

async function mergeTiles(origen_mbt, destino_mbt, z_levels){
	z_levels.forEach(async (item) => {	
<<<<<<< HEAD
<<<<<<< ours
=======
		console.info("zomm",item);
>>>>>>> theirs
=======
>>>>>>> d57f7b366e9b7775cb2235da935d63a34342717c
		try{
			const tiles = await UtilsMbtiles.leerJson('tiles'+item+'.geojson');
			syncEach(tiles.features, 
				function(feat, next){
					(async () => {
<<<<<<< HEAD
<<<<<<< ours
=======
						

>>>>>>> theirs
=======
>>>>>>> d57f7b366e9b7775cb2235da935d63a34342717c
						if(!feat.properties.id){
							feat.properties.id = feat.id;
						}
						const tilezxy = UtilsMbtiles.idTile2ZXY(feat.properties.id);
						const isInner = await isInnerTile(tilezxy.z, tilezxy.x, tilezxy.y);
						let tileid = null;
<<<<<<< HEAD
<<<<<<< ours
=======
>>>>>>> d57f7b366e9b7775cb2235da935d63a34342717c
						if(isInner){
							tileid = await UtilsMbtiles.replaceTile(origen_mbt, destino_mbt, tilezxy);
						}else{
							tileid = await mergeSingleTile(tilezxy, destino_mbt);
						}
						next(null,tileid);
<<<<<<< HEAD
=======
						if(item <=14){
									if(isInner){
										tileid = await UtilsMbtiles.replaceTile(origen_mbt, destino_mbt, tilezxy);
									}else{
										tileid = await mergeSingleTile(tilezxy, destino_mbt);
									}
						}else{
									tileid = await UtilsMbtiles.addNewTile(origen_mbt, destino_mbt, tilezxy);
									
								}			
						next(null,tileid);
					
>>>>>>> theirs
=======
>>>>>>> d57f7b366e9b7775cb2235da935d63a34342717c
					})();
				},
				function(err, transformedItems){
					console.log("err0",err);
					console.log(transformedItems);
				}
			);
		}catch(err){
			console.log(err);
		}
	});
}

async function mergeMbtiles(uri_origen, uri_destino, uri_clip, z_levels){
	const origen = await UtilsMbtiles.getMbtile(uri_origen);
	const destino = await UtilsMbtiles.getMbtile(uri_destino);
	mergeTiles(origen, destino, z_levels);
}

async function isInnerTile(z, x, y){
	try{
		const tiles = await UtilsMbtiles.leerJson('tiles'+z+'_inner.geojson');
		return UtilsMbtiles.findTileById(z, x, y, tiles);
	}catch(err){
		return false;
	}
}

async function isEdgeTile(z, x, y){
	const tiles = await UtilsMbtiles.leerJson('tiles'+z+'_edges.geojson');
	return UtilsMbtiles.findTileById(z, x, y, tiles);
}

mergeMbtiles(mbtiles_ori, mbtiles_dest, pol_cat, zoom_levels);
