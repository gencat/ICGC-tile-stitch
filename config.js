var fs = require('fs');
var os = require('os');

var fileProp = 'path.properties';
var _platform = os.type();
if (_platform.indexOf('Windows') != -1) {
    fileProp = 'path_windows.properties'
};
var _f = JSON.parse(fs.readFileSync(fileProp, 'utf8'));

_f.mbtiles_ori = './icgc.mbtiles';
_f.mbtiles_dest = './europe_spain.mbtiles';
//_f.pol_cat = './Poligon_CAT_limits5M_abril_2018.geojson';
_f.pol_cat = './CAT_plus_box.geojson';
_f.mbtiles_dest_source = './europe_spain_Copy.mbtiles';
_f.mbtiles_planet = './planet.mbtiles';
_f.zoom_levels = [7,8,9,10,11,12,13,14];
//_f.zoom_levels = [7];

module.exports = _f;
