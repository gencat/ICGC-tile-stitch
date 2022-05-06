var fs = require('fs');
var os = require('os');

var fileProp = 'path.properties';
var _platform = os.type();
if (_platform.indexOf('Windows') != -1) {
    fileProp = 'path_windows.properties'
};
var _f = JSON.parse(fs.readFileSync(fileProp, 'utf8'));

_f_origen_comprimid= true;
_f.mbtiles_ori = './data/contextmaps_cat.mbtiles';
_f.mbtiles_dest = './data/europe_spain.mbtiles';
_f.pol_cat = './CAT_plus_box.geojson';
_f.mbtiles_dest_source = './europe_spain_Copy.mbtiles';
_f.mbtiles_planet = './planet14.mbtiles';
_f.zoom_levels = [6,7,8,9,10,11,12,13,14];
_f.zoom_levels_extra = [10,11,12,13];

module.exports = _f;
