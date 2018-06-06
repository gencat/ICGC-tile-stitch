"use strict";

const MbTiles = require('@mapbox/mbtiles');

function getTMSy(z, y){
	return  (1 << z) - 1 - y;
}

function createTileId(z, x, y) {
	return `${z}/${x}/${y}`;
}

class OpenMapTiles extends MbTiles{

	updateTile(z, x, y, data, callback) {
		if (typeof callback !== 'function') throw new Error('Callback needed');
		if (!this.open) return callback(new Error('MBTiles not yet loaded'));
		if (!Buffer.isBuffer(data)) return callback(new Error('Image needs to be a Buffer'));
		var mbtiles = this;
		var _db = mbtiles._db;
		//console.log(mbtiles);
		//console.log(_db);
		_db.run('PRAGMA synchronous=OFF');

		_db.serialize(function() {
			_db.run('BEGIN');
			// Flip Y coordinate because MBTiles files are TMS.
			y = getTMSy(z, y);
			//console.log(y);
			var coords = createTileId(z, x, y);
			console.log(coords);
			//console.log(data);
			var images = _db.prepare('UPDATE images SET tile_data = ? WHERE tile_id = ?');
			images.run(data, coords);
			images.finalize();
			/*
			var images = _db.prepare('SELECT * FROM images WHERE tile_id = ?');
			images.run(coords);
			images.finalize();
			*/
			_db.run('COMMIT', callback);
		});
	}

	updateTilePlanet(z, x, y, data, callback) {
		if (typeof callback !== 'function') throw new Error('Callback needed');
		if (!this.open) return callback(new Error('MBTiles not yet loaded'));
		if (!Buffer.isBuffer(data)) return callback(new Error('Image needs to be a Buffer'));
		var mbtiles = this;
		var _db = mbtiles._db;
		//console.log(mbtiles);
		//console.log(_db);
		_db.run('PRAGMA synchronous=OFF');

		_db.serialize(function() {
			_db.run('BEGIN');
			// Flip Y coordinate because MBTiles files are TMS.
			y = getTMSy(z, y);
			//console.log(y);
			var coords = createTileId(z, x, y);
			console.log(coords);
			//console.log(data);
			var images = _db.prepare('UPDATE images SET tile_data = ? WHERE tile_id = (SELECT tile_id FROM map WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?)');
			images.run(data, z, x, y);
			images.finalize();
			/*
			var images = _db.prepare('SELECT * FROM images WHERE tile_id = ?');
			images.run(coords);
			images.finalize();
			*/
			_db.run('COMMIT', callback);
		});
	}
}

module.exports = OpenMapTiles;
