var queryOverpass = require("query-overpass");
var bbox = require('geojson-bbox');
var fs = require('fs');
const path = require('path');
var contents = fs.readFileSync("tiles14_edges.geojson");
var jsonTiles = JSON.parse(contents);
var exec = require('child_process').execFile;
const JSONToFileSync = (obj, filename, callback) => fs.writeFileSync(`${filename}.geojson`, JSON.stringify(obj, null, 2));
const JSONToFile = (obj, filename, callback) => fs.writeFile(`${filename}.geojson`, JSON.stringify(obj, null, 2), callback);

console.log(jsonTiles.features.length);

var insertTile = function(data, callback){
    getOSMDataByTile(data, callback)
}

var insertAll = function(coll, callback){
    var queue = coll.slice(0),
    elem;
    (function iterate(){
        if(queue.length === 0){
            callback();
            return;
        }
        elem = queue.splice(0,1)[0];
        var id_tmp = elem.id.replace("(","").replace(")","").split(", ").join("_");
        insertTile(elem, function(err, _elem){
            if (err) { throw err;}
            //iterate();
            //setTimeout(iterate, 0);
            process.nextTick(iterate);
        });
    })()
}

//var features = jsonTiles.features.slice(0,5);
var features = jsonTiles.features;

insertAll(features,function(){
    console.log("all inserted");
});


function getOSMDataByTile(feature, callback){
    var id_tmp = feature.id.replace("(","").replace(")","").split(", ").join("_");
    console.log(id_tmp);
    var extent = bbox(feature);
    var extent_b = [extent[1],extent[0],extent[3],extent[2]]; 
    var query = "(node("+extent_b.join(',')+");<);out;";
    queryOverpass(query, function(err, data){
        if (err) {
            console.log(err);
            callback(err, null);
        }else{
            JSONToFileSync(data, id_tmp);
            var _file =  path.join(__dirname, id_tmp+'.geojson');
            geojson2Postgis(_file, callback);
        }
    }, {flatProperties: true});
}

function geojson2Postgis(_fileIN, callback){
    var _f = {
        "gdalPath":"C:/Program Files/QGIS 2.18/bin/",
        "org2ogr":"ogr2ogr.exe",
        "database": {
            "host": "172.17.28.81",
            "port": 5432,
            "user": "postgres",
            "password": "postgres",
            "database": "bt5m"
        }
    };

    var arrayParams4326 = [];
    arrayParams4326.push('-f');
    arrayParams4326.push('PostgreSQL');
    arrayParams4326.push('-append');
    arrayParams4326.push('-s_srs');
    arrayParams4326.push('EPSG:4326');
    arrayParams4326.push('-t_srs');
    arrayParams4326.push('EPSG:3857');
    arrayParams4326.push('PG:host=' + _f.database.host + ' user=' + _f.database.user + ' password=' + _f.database.password + ' dbname=' + _f.database.database);
    arrayParams4326.push('-nln');
    arrayParams4326.push('test_osm');
    arrayParams4326.push(_fileIN);
    arrayParams4326.push('-skipfailures');
    exec(_f.gdalPath + _f.org2ogr, arrayParams4326, function (err, data) {
        if(err==null){
            fs.unlinkSync(_fileIN);
            callback(null, data);
        }else{
            console.log(err);
            callback(err, null);
        }
    });
}