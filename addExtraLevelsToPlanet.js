const fs = require('fs');
const path = require('path');
const syncEach = require('sync-each');

const UtilsMbtiles = require('./utilsMbtiles');
const _f = require('./config');

const hrstart = process.hrtime();

const mbtiles_ori = _f.mbtiles_ori;
const mbtiles_dest = _f.mbtiles_dest;
const zoom_levels = _f.zoom_levels_extra;

async function writeAddTiles(origen_mbt, destino_mbt, z_levels){
	z_levels.forEach(async (item) => {	
		try{
			const tiles = await UtilsMbtiles.leerJson('tiles'+item+'.geojson');
			console.info(tiles.features.length);
			let i=0;
			syncEach(tiles.features, 
				function(feat, next){
					(async () => {
						if(!feat.properties.id){
							feat.properties.id = feat.id;
						}
						const tilezxy = UtilsMbtiles.idTile2ZXY(feat.properties.id);
						let tileid;
						
							tileid = await UtilsMbtiles.addNewTile(origen_mbt, destino_mbt, tilezxy);
							i=i+1;
							console.info(i + " de " +tiles.features.length);
							tileid = await UtilsMbtiles.replaceTilePlanet(origen_mbt, destino_mbt, tilezxy);
						
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

async function writeMbTiles(uri_origen, uri_destino, z_levels){
	console.log(uri_origen);
	console.log(uri_destino);
    try{
	const origen = await UtilsMbtiles.getMbtile(uri_origen);
	const destino = await UtilsMbtiles.getMbtile(uri_destino);
	writeAddTiles(origen, destino, z_levels);
    }catch(err){
        console.log(err);
    }
}

writeMbTiles(mbtiles_ori, mbtiles_dest, zoom_levels);
