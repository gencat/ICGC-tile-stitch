var fs = require('fs');
var os = require('os');

var fileProp = 'path.properties';
var _platform = os.type();
if (_platform.indexOf('Windows') != -1) {
    fileProp = 'path_windows.properties'
};
var _f = JSON.parse(fs.readFileSync(fileProp, 'utf8'));

_f_origen_comprimid= true;
_f.mbtiles_ori2 = './ctxmaps15-16.mbtiles';
_f.mbtiles_ori3 = '2017-07-03_europe_spain.mbtiles';
_f.mbtiles_ori = './ctxmaps_0_5_0.mbtiles';
//_f.mbtiles_ori = './bt25m_vector_7a14.mbtiles';
//_f.mbtiles_dest = './2017-07-03_europe.mbtiles';
_f.mbtiles_dest = './2017-07-03_europe.mbtiles';
//_f.pol_cat = './Poligon_CAT_limits5M_abril_2018.geojson';
_f.pol_cat = './CAT_plus_box.geojson';
_f.mbtiles_dest_source = './europe_spain_Copy.mbtiles';
_f.mbtiles_planet = './planet.mbtiles';
_f.zoom_levels = [7,8,9,10,11,12,13,14];
//_f.zoom_levels = [15,16];
_f.zoom_levels_extra = [10,11,12,13];
//_f.zoom_levels = [7];

module.exports = _f;
