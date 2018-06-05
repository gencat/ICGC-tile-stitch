# Tile Stitch

Para descargar las dependencias

        npm install

## Descarga datos de OSM vía Overpass API

Programa que leer un json con teselas y hace la llamada a la API de Overpass de OSM para extraer toda la información de esa tesela. Luego cargar esa información en un BD de Postgis.

Para ejecutar el programa

        node index.js

En este caso se utilizan las tiles del nivel 14 que intersectan con el límite de full 5M, esta están en el archivo tiles14_edges.geojson

## Crear el "stitch" de las teselas del límite del área de trabajo

Dados2 mbtiles diferentes, combina la información de las teselas de límite y crear un archivo mbtiles por tesela con la información combinada  

Para ejecutar el programa

        ./stitch.sh

## Crear el mbtiles remplazando las teselas que están en el área de trabajo

Para ejecutar el programa

        node mergeMbtiles.js

## Remplazar la teselas del área de trabajo en el planet

Para ejecutar el programa

        node mergePlanet.js
