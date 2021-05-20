# Tile Stitch
Tile Stitch is a tool aimed at replacing tiles inside a given mbttiles file with tiles from another set of tiles, using a polygon to mask the stitching area and merge if needed contents from both sets of boundary tiles.

## Getting Started


### Prerequisites

This project in based on [NodeJs](https://nodejs.org/en/)

This project use [Tippecanoe](https://github.com/mapbox/tippecanoe) and [GDAL](https://gdal.org/) 

### Installation

```
    git clone https://github.com/gencat/ICGC-tile-stitch.git
    cd ICGC-tile-stitch
    npm install

```


### Configuration

Edit *config.js*   

```
f.mbtiles_ori = './icgc.mbtiles'; // your local tiles
_f.mbtiles_dest = './europe_spain.mbtiles'; // Country Mbtiles from OpenMaptiles
_f.pol_cat = './CAT_plus_box.geojson'; //clipping polygon
_f.mbtiles_planet = './planet.mbtiles'; //full planet from OpenMaptiles
_f.zoom_levels = [7,8,9,10,11,12,13,14]; //replace zoom levels
```


### Running

#### To create stitched tiles

```

        ./stitch.sh

```


#### To replace your local stitched tiles into country tiles


```

        node mergeMbtiles.js

```


        
#### To replace your country tiles into planet tiles


```

       node mergePlanet.js

```


### if your local mbtiles has levels higher than 14 and diferents data models local.mbtiles -> planet.mbtiles

#### Option A  local.mbtiles -> planet.mbtiles

```
    node addExtraLevelsToPlanet.js
```
#### Option B  planet.mbtiles -> local.mbtiles  tile-join -Z 15 -o ctxmaps15-16.mbtiles ctxmaps_0_5_0.mbtiles
```
        #extract higher levels

        tile-join -Z 15  -o newlocal15-16.mbtiles  local.mbtiles

        #insert planet14 into newlocal15-16.mbtiles
        
        sqlite3
        ATTACH "planet14.mbtiles" AS db1;
        ATTACH "newlocal15-16.mbtiles" AS db2;
        INSERT INTO db2.tiles SELECT * FROM db1.tiles;

```


## Authors

* [Institut Cartogràfic i Geològic de Catalunya](https://www.icgc.cat/)


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details


