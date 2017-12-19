# OSMTiles2Postgis

Programa que leer un json con teselas y hace la llamada a la API de Overpass de OSM para extraer toda la información de esa tesela. Luego cargar esa información en un BD de Postgis.

Para descargar las dependencias

        npm install

Para ejecutar el programa

        node index.js

En este caso se utilizan las tiles del nivel 14 que intersectan con el límite de full 5M, esta están en el archivo tiles14_edges.geojson