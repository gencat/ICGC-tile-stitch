const fs = require('fs');
const path = require('path');
const syncEach = require('sync-each');

const UtilsMbtiles = require('./utilsMbtiles');
const _f = require('./config');

const hrstart = process.hrtime();

const mbtiles_ori = _f.mbtiles_dest;
const mbtiles_dest = _f.mbtiles_planet;
const zoom_levels = _f.zoom_levels;

async function mergeTiles(origen_mbt, destino_mbt, z_levels){
	z_levels.forEach(async (item) => {	
		try{
			const tiles = await UtilsMbtiles.leerJson('tiles'+item+'.geojson');
			syncEach(tiles.features, 
				function(feat, next){
					(async () => {
						if(!feat.properties.id){
							feat.properties.id = feat.id;
						}
						const tilezxy = UtilsMbtiles.idTile2ZXY(feat.properties.id);
						const tileid = await UtilsMbtiles.replaceTilePlanet(origen_mbt, destino_mbt, tilezxy);
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

async function mergeMbtiles(uri_origen, uri_destino, z_levels){
	console.log(uri_origen);
	console.log(uri_destino);
	const origen = await UtilsMbtiles.getMbtile(uri_origen);
	const destino = await UtilsMbtiles.getMbtile(uri_destino);
	mergeTiles(origen, destino, z_levels);
}

mergeMbtiles(mbtiles_ori, mbtiles_dest, zoom_levels);
