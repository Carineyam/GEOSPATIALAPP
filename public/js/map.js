// Couches de base
var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
});

var arcgisLayer = L.tileLayer('https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles © Esri'
});

var bingLayer = L.tileLayer('https://ecn.t3.tiles.virtualearth.net/tiles/a{q}.jpeg?g=1', {
    attribution: '© Microsoft Bing Maps',
    subdomains: ['t0', 't1', 't2', 't3'],
    tms: false
});

// Initialisation de la carte avec couche de fond par défaut
var map = L.map('map', {   
    layers: [osmLayer]
});

// Activation des outils d'édition 
map.editTools = new L.Editable(map);


// Contrôle des couches
var baseMaps = {
    "OpenStreetMap": osmLayer,
    "Esri World Imagery": arcgisLayer,
    "Bing Maps": bingLayer
};


L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);

L.control.scale({ position: 'bottomleft', metric: true, imperial: false }).addTo(map);

// Création des groupes de couches
// Ne PAS faire : var pointLayer = L.layerGroup().addTo(map);
var pointLayer       = L.layerGroup(); 
var lineLayer        = L.layerGroup();
var polygonLayer     = L.layerGroup();
var multiPolygonLayer= L.layerGroup();

/*var pointLayer = L.layerGroup().addTo(map);
var lineLayer = L.layerGroup().addTo(map);
var polygonLayer = L.layerGroup().addTo(map);
var multiPolygonLayer = L.layerGroup().addTo(map);*/

// Gestion des clics sur les polygones (vérifie que radiusSelectionActive est défini dans ton scope)
polygonLayer.eachLayer(function(layer) {
    layer.on('click', function(e) {
        if (typeof radiusSelectionActive !== 'undefined' && radiusSelectionActive) {
            onMapClickForRadiusSelection(e);
        }
    });
});

// Styles
var pointStyle = {
    radius: 8,
    fillColor: "#ff7800",
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};

var lineStyle = {
    color: "#3388ff",
    weight: 4,
    opacity: 1
};

var polygonStyle = {
    fillColor: "#33cc33",
    color: "#006600",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5
};

var multiPolygonStyle = {
    fillColor: "#cc66ff",
    color: "#9900cc",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.5
};

var orangeIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize:     [25, 41],
    iconAnchor:   [12, 41],
    popupAnchor:  [1, -34],
    shadowSize:   [41, 41]
});

// Ajout des lieux
var lieux = window.lieuxData || [];
var markers = {};

lieux.forEach(lieu => {
    const geometry = JSON.parse(lieu.geojson);
    let layer;

    switch (lieu.type_geometrie) {
        case 'ST_Point':
            layer = L.marker([lieu.lat, lieu.lon], {
                icon: orangeIcon,
                draggable: false
            }).bindPopup(createDefaultPopup(lieu));

            layer.on('dragend', function (e) {
                const newLatLng = e.target.getLatLng();
                lieu.lat = newLatLng.lat;
                lieu.lon = newLatLng.lng;
                console.log(`Nouvelles coordonnées pour ${lieu.nom}: ${lieu.lat}, ${lieu.lon}`);
            });

            pointLayer.addLayer(layer);
            break;

        case 'ST_LineString':
            const lineCoords = geometry.coordinates.map(coord => [coord[1], coord[0]]);
            layer = L.polyline(lineCoords, lineStyle).bindPopup(createDefaultPopup(lieu));
            lineLayer.addLayer(layer);
            break;

        case 'ST_Polygon':
            const polygonCoords = geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            layer = L.polygon(polygonCoords, polygonStyle).bindPopup(createDefaultPopup(lieu));
            polygonLayer.addLayer(layer);
            break;

        case 'ST_MultiPolygon':
            geometry.coordinates.forEach(polygon => {
                const coords = polygon[0].map(coord => [coord[1], coord[0]]);
                const subLayer = L.polygon(coords, multiPolygonStyle).bindPopup(createDefaultPopup(lieu));
                multiPolygonLayer.addLayer(subLayer);
                markers[lieu.id] = subLayer;
            });
            return;
    }

    if (layer && lieu.type_geometrie !== 'ST_MultiPolygon') {
        markers[lieu.id] = layer;
    }
});


// Regroupement de toutes les couches pour ajuster la vue
const allLayers = [];
pointLayer.eachLayer(layer => allLayers.push(layer));
lineLayer.eachLayer(layer => allLayers.push(layer));
polygonLayer.eachLayer(layer => allLayers.push(layer));
multiPolygonLayer.eachLayer(layer => allLayers.push(layer));

const allLayersGroup = L.featureGroup(allLayers);
if (allLayers.length > 0) {
    map.fitBounds(allLayersGroup.getBounds(), {
        padding: [50, 50],
        maxZoom: 17
    });
}

// Légende
var legend = L.control({position: 'bottomright'});
legend.onAdd = function(map) {
    var div = L.DomUtil.create('div', 'legend');
    div.innerHTML = `
        <h6>Légende</h6>
        <div><img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png" 
             style="width:15px;height:25px;vertical-align:middle;"> Points</div>
        <div><i style="background: ${lineStyle.color}; width: 15px; height: 15px; display: inline-block;"></i> Lignes</div>
        <div><i style="background: ${polygonStyle.fillColor}; width: 15px; height: 15px; display: inline-block;"></i> Polygones</div>
        <div><i style="background: ${multiPolygonStyle.fillColor}; border: 1px dashed ${multiPolygonStyle.color}; width: 15px; height: 15px; display: inline-block;"></i> MultiPolygones</div>
    `;
    return div;
};
legend.addTo(map);


function createDefaultPopup(lieu) {
    switch (lieu.type_geometrie) {
        case 'ST_Point':
            return `
                <div>
                    <b>${lieu.nom}</b><br>
                    <b>Type:</b> Point<br>
                    <b>Équipe:</b> ${lieu.nomequipe}<br>
                    <b>Section:</b> ${lieu.section}<br>
                    <b>Terrain:</b> ${lieu.terrain}<br>
                    <b>Propriétaire:</b> ${lieu.nom_proprietaire} ${lieu.prenoms_proprietaire}<br>
                    <b>Téléphone:</b> ${lieu.telephone_proprietaire_local || ''} ${lieu.telephone_proprietaire_etranger || ''}<br>
                    <button onclick="visualiserVideo('${lieu.video_url || 'https://app.speckle.systems/...'}')">🎥 Visualiser</button>
                </div>`;
        case 'ST_LineString':
            return `<b>${lieu.nom}</b><br>Type: Ligne`;
        case 'ST_Polygon':
            return `<b>${lieu.nom}</b><br>Type: Polygone`;
        case 'ST_MultiPolygon':
            return `
                <b>${lieu.nom}</b><br>
                <b>Type:</b> MultiPolygon<br>
                <b>Section:</b> ${lieu.section}<br>
                <b>Contenance:</b> ${lieu.contenance}`;
        default:
            return `<b>${lieu.nom}</b>`;
    }
}


function createEditablePopup(lieu) {
    let content = `<div style="min-width: 250px;">`;

    // Champ commun : Nom
    content += `
        <label><b>Nom:</b></label>
        <input type="text" id="popup-nom-${lieu.id}" value="${lieu.nom}" class="form-control mb-1" />
    `;

    switch (lieu.type_geometrie) {
        case 'ST_Point':
            content += `
                <label><b>Tél. local:</b></label>
                <input type="text" id="popup-tel-local-${lieu.id}" value="${lieu.telephone_proprietaire_local || ''}" class="form-control mb-1" />

                <label><b>Tél. étranger:</b></label>
                <input type="text" id="popup-tel-etranger-${lieu.id}" value="${lieu.telephone_proprietaire_etranger || ''}" class="form-control mb-1" />

                <label><b>Équipe:</b></label>
                <input type="text" id="popup-nomequipe-${lieu.id}" value="${lieu.nomequipe || ''}" class="form-control mb-1" />

                <label><b>Section:</b></label>
                <input type="text" id="popup-section-${lieu.id}" value="${lieu.section || ''}" class="form-control mb-1" />

                <label><b>Terrain:</b></label>
                <input type="text" id="popup-terrain-${lieu.id}" value="${lieu.terrain || ''}" class="form-control mb-1" />

                <label><b>Propriétaire:</b></label>
                <input type="text" id="popup-nom-proprietaire-${lieu.id}" value="${lieu.nom_proprietaire || ''}" class="form-control mb-1" />
                <input type="text" id="popup-prenoms-proprietaire-${lieu.id}" value="${lieu.prenoms_proprietaire || ''}" class="form-control mb-1" />
            `;
            break;

        case 'ST_LineString':
            content += `
                <label><b>Type:</b></label>
                <input type="text" id="popup-type-${lieu.id}" value="Ligne" class="form-control mb-1" readonly />

                <label><b>Section:</b></label>
                <input type="text" id="popup-section-${lieu.id}" value="${lieu.section || ''}" class="form-control mb-1" />
            `;
            break;

        case 'ST_Polygon':
            content += `
                <label><b>Type:</b></label>
                <input type="text" id="popup-type-${lieu.id}" value="Polygone" class="form-control mb-1" readonly />

                <label><b>Section:</b></label>
                <input type="text" id="popup-section-${lieu.id}" value="${lieu.section || ''}" class="form-control mb-1" />
            `;
            break;

        case 'ST_MultiPolygon':
            content += `
                <label><b>Type:</b></label>
                <input type="text" id="popup-type-${lieu.id}" value="MultiPolygone" class="form-control mb-1" readonly />

                <label><b>Section:</b></label>
                <input type="text" id="popup-section-${lieu.id}" value="${lieu.section || ''}" class="form-control mb-1" />

                <label><b>Contenance:</b></label>
                <input type="text" id="popup-contenance-${lieu.id}" value="${lieu.contenance || ''}" class="form-control mb-1" />
            `;
            break;

        default:
            content += `<i>Type de géométrie non pris en charge</i>`;
    }

    content += `
        <button class="btn btn-sm btn-primary w-100 mt-2" onclick="savePopupEdits(${lieu.id})">💾 Enregistrer</button>
        <div id="popup-status-${lieu.id}" class="mt-2 text-center small text-muted"></div>
    </div>`;

    return content;
}



//*******************************************************************iframe video et ajout des couches ************************************************ */

// Références globales aux éléments HTML
const mapContainer = document.getElementById('map');
const mapVideoContainer = document.getElementById('map-video-container');
const videoContainer = document.getElementById('video-container');
const videoIframe = document.getElementById('video-iframe');

// --- Gestion de la vidéo ---
function visualiserVideo(url) {
    if (!mapContainer || !mapVideoContainer || !videoContainer || !videoIframe) {
        console.error('Un ou plusieurs éléments HTML sont introuvables.');
        return;
    }

    videoIframe.src = url;
    mapVideoContainer.style.display = 'flex';
    videoContainer.style.display = 'block';

    // Réduire la carte à 50% de hauteur
    mapContainer.style.flex = '0 0 50%';
}

function fermerVideo() {
    if (!mapContainer || !mapVideoContainer || !videoContainer || !videoIframe) return;

    videoIframe.src = '';
    mapVideoContainer.style.display = 'none';
    videoContainer.style.display = 'none';

    // Rétablir la carte à sa taille normale
    mapContainer.style.flex = '1';
}

// Exemple: bouton de fermeture
const closeVideoBtn = document.getElementById('close-video-btn');
if (closeVideoBtn) closeVideoBtn.addEventListener('click', fermerVideo);

// --- Gestion des couches Leaflet ---
function toggleLayer(layer, shouldAdd) {
    if (!map || !layer) return;
    if (shouldAdd) map.addLayer(layer);
    else map.removeLayer(layer);
}

const layerMap = {
    point: pointLayer,
    line: lineLayer,
    polygon: polygonLayer,
    multipolygon: multiPolygonLayer
};

// Gestion des checkboxes "Ajouter les couches"
document.querySelectorAll('.layer-option-add').forEach(cb => {
    cb.addEventListener('change', () => {
        const layer = layerMap[cb.value];
        if (layer) toggleLayer(layer, cb.checked);
    });
});

// Gestion des checkboxes "Enlever les couches"
document.querySelectorAll('.layer-option-remove').forEach(cb => {
    cb.addEventListener('change', () => {
        const layer = layerMap[cb.value];
        if (layer) toggleLayer(layer, !cb.checked);
    });
});


//*******************************************************************import************************************************ */
document.getElementById('geojson-input').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const geojson = JSON.parse(event.target.result);
        const geojsonLayer = L.geoJSON(geojson, {
            style: function (feature) {
                return { color: "#ff5500", weight: 2 };
            },
            onEachFeature: function (feature, layer) {
                if (feature.properties) {
                    const props = Object.entries(feature.properties)
                        .map(([k, v]) => `<b>${k}:</b> ${v}`)
                        .join('<br>');
                    layer.bindPopup(props);
                }
            }
        }).addTo(map);

        map.fitBounds(geojsonLayer.getBounds());
    };
    reader.readAsText(file);
});

document.getElementById('shapefile-input').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        shp(event.target.result).then(function (geojson) {
            const shapefileLayer = L.geoJSON(geojson, {
                style: { color: "#3399ff", weight: 2 },
                onEachFeature: function (feature, layer) {
                    if (feature.properties) {
                        const props = Object.entries(feature.properties)
                            .map(([k, v]) => `<b>${k}:</b> ${v}`)
                            .join('<br>');
                        layer.bindPopup(props);
                    }
                }
            }).addTo(map);

            map.fitBounds(shapefileLayer.getBounds());
        }).catch(err => {
            console.error("Erreur de lecture du shapefile :", err);
            alert("Erreur lors du chargement du shapefile.");
        });
    };
    reader.readAsArrayBuffer(file);
});

// ✅ Import Excel (.xlsx)
document.getElementById('excel-input').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const features = sheet.map(row => {
            if (!row.lat || !row.lon) return null;

            return {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [parseFloat(row.lon), parseFloat(row.lat)]
                },
                properties: { ...row }
            };
        }).filter(Boolean);

        const layer = L.geoJSON({ type: "FeatureCollection", features }, {
            pointToLayer: (feature, latlng) => L.circleMarker(latlng, { radius: 6, color: "#00aa00" }),
            onEachFeature: (feature, layer) => {
                const props = Object.entries(feature.properties)
                    .map(([k, v]) => `<b>${k}:</b> ${v}`)
                    .join('<br>');
                layer.bindPopup(props);
            }
        }).addTo(map);

        if (features.length > 0) {
            map.fitBounds(layer.getBounds());
        }
    };
    reader.readAsArrayBuffer(file);
});

// ✅ Import KML
document.getElementById('kml-input').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        const kmlText = event.target.result;
        const parser = new DOMParser();
        const kmlDom = parser.parseFromString(kmlText, 'text/xml');
        const geojson = toGeoJSON.kml(kmlDom);

        const layer = L.geoJSON(geojson, {
            style: { color: "#cc33cc", weight: 2 },
            onEachFeature: (feature, layer) => {
                if (feature.properties) {
                    const props = Object.entries(feature.properties)
                        .map(([k, v]) => `<b>${k}:</b> ${v}`)
                        .join('<br>');
                    layer.bindPopup(props);
                }
            }
        }).addTo(map);

        map.fitBounds(layer.getBounds());
    };
    reader.readAsText(file);
});

let rasterLayer;

document.getElementById('raster-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const arrayBuffer = await file.arrayBuffer();

        // parseGeoraster est disponible sur window.georaster
        const georaster = await window.georaster.parseGeoraster(arrayBuffer);

        if (rasterLayer) map.removeLayer(rasterLayer);

        rasterLayer = new GeoRasterLayer({
            georaster,
            opacity: 0.7,
            pixelValuesToColorFn: values => {
                if (values.length === 1) {
                    return `rgb(${values[0]},${values[0]},${values[0]})`;
                } else {
                    return `rgb(${values[0] ?? 0},${values[1] ?? 0},${values[2] ?? 0})`;
                }
            },
            resolution: 256
        });

        rasterLayer.addTo(map);
        map.fitBounds(rasterLayer.getBounds());
    } catch (error) {
        console.error("Erreur lors du chargement du raster:", error);
        alert("Erreur lors du chargement du fichier. Vérifiez qu'il s'agit d'une image géoréférencée valide.");
    }
});


//*******************************************************************export************************************************ */
var downloadVisibleControl = L.Control.extend({
  options: { position: 'topright' },

  onAdd: function (map) {
    var container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');

    container.style.position = 'relative';
    container.style.width = '34px';
    container.style.height = '34px';
    container.style.cursor = 'pointer';
    container.title = "Télécharger toutes les entités visibles";
    container.style.zIndex = 10000;

    var icon = L.DomUtil.create('div', '', container);
    icon.style.backgroundImage = "url('https://img.icons8.com/ios-filled/24/download.png')";
    icon.style.backgroundSize = "20px 20px";
    icon.style.backgroundRepeat = "no-repeat";
    icon.style.backgroundPosition = "center";
    icon.style.width = '100%';
    icon.style.height = '100%';
    icon.style.backgroundColor = 'white';

    var menu = L.DomUtil.create('div', '', container);
    menu.id = 'download-visible-menu';
    menu.style.display = 'none';
    menu.style.position = 'absolute';
    menu.style.top = '36px';
    menu.style.right = '0px';
    menu.style.background = 'white';
    menu.style.border = '1px solid #ccc';
    menu.style.padding = '5px';
    menu.style.boxShadow = '0px 2px 6px rgba(0,0,0,0.2)';
    menu.style.zIndex = 10001;
    menu.innerHTML = `
      <button style="width:100%;" onclick="downloadAllVisibleGeoJSON()">GeoJSON</button><br>
      <button style="width:100%;" onclick="downloadAllVisibleKML()">KML</button><br>
      <button style="width:100%;" onclick="downloadAllVisibleShapefile()">SHP</button><br>
      <button style="width:100%;" onclick="downloadAllVisibleExcel()">Excel</button>
    `;

    icon.onclick = function (e) {
      e.stopPropagation();
      menu.style.display = (menu.style.display === 'none') ? 'block' : 'none';
    };

    document.addEventListener('click', function (e) {
      if (!container.contains(e.target)) {
        menu.style.display = 'none';
      }
    });

    return container;
  }
});

map.addControl(new downloadVisibleControl());

function getAllVisibleGeoJSON() {
  const features = [];

  [pointLayer, lineLayer, polygonLayer, multiPolygonLayer].forEach(group => {
    group.eachLayer(layer => {
      if (map.hasLayer(layer)) {
        const geoJSON = layer.toGeoJSON();

        for (const lieu of lieux) {
          if (markers[lieu.id] === layer) {
            geoJSON.properties = { ...lieu }; // ✅ Inclut tous les attributs
            break;
          }
        }

        features.push(geoJSON);
      }
    });
  });

  return { type: "FeatureCollection", features };
}
function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


function downloadAllVisibleGeoJSON() {
  const geojson = (highlighted.size > 0) ? getSelectedGeoJSON() : getAllVisibleGeoJSON();
  downloadBlob(JSON.stringify(geojson, null, 2), (highlighted.size > 0 ? 'selection.geojson' : 'all_visible.geojson'), 'application/json');
}

function downloadAllVisibleExcel() {
  const geojson = (highlighted.size > 0) ? getSelectedGeoJSON() : getAllVisibleGeoJSON();

  const rows = geojson.features.map(f => {
    const row = { ...f.properties };
    row.Type_Géométrie = f.geometry.type;
    row.Coordonnées = JSON.stringify(f.geometry.coordinates);
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Données");
  XLSX.writeFile(workbook, highlighted.size > 0 ? "selection.xlsx" : "all_visible.xlsx");
}


function downloadAllVisibleKML() {
  const geojson = (highlighted.size > 0) ? getSelectedGeoJSON() : getAllVisibleGeoJSON();

  const kml = tokml(geojson, {
    name: 'nom',
    description: (props) => {
      return Object.entries(props)
        .map(([k, v]) => `<strong>${k}</strong>: ${v}`)
        .join('<br>');
    }
  });

  downloadBlob(kml, highlighted.size > 0 ? 'selection.kml' : 'all_visible.kml', 'application/vnd.google-earth.kml+xml');
}


function downloadAllVisibleShapefile() {
  const geojson = (highlighted.size > 0) ? getSelectedGeoJSON() : getAllVisibleGeoJSON();

  shpwrite.download(geojson, {
    folder: 'shapes',
    types: {
      point: 'points',
      polygon: 'polygons',
      line: 'lines'
    }
  });
}




//************** */********************************************************************************************************************* */
let selectedSectionLayer;

function isLieuVisible(lieu) {
    if (lieu.lat == null || lieu.lon == null) return false;
    const latlng = L.latLng(lieu.lat, lieu.lon);
    return map.getBounds().contains(latlng);
}


// 🔧 Utils
function getSelectedSections() {
    return Array.from(document.querySelectorAll(".section-filter:checked"))
        .map(input => input.value.toLowerCase().trim());
}

// 🗺️ Mise en surbrillance d'une section sur la carte
function highlightSectionOnMap(sectionName, color) {
    if (selectedSectionLayer) map.removeLayer(selectedSectionLayer);

    const geojsonFeatures = lieux
        .filter(lieu => lieu.type_geometrie === 'ST_MultiPolygon' && lieu.section.toLowerCase() === sectionName.toLowerCase())
        .map(lieu => ({
            type: "Feature",
            properties: { nom: lieu.nom },
            geometry: JSON.parse(lieu.geojson)
        }));

    if (geojsonFeatures.length === 0) return;

    selectedSectionLayer = L.geoJSON({ type: "FeatureCollection", features: geojsonFeatures }, {
        style: {
            color,
            fillColor: color,
            weight: 2,
            fillOpacity: 0.3
        }
    }).addTo(map);

    map.fitBounds(selectedSectionLayer.getBounds());
}

// 📊 Graphique en camembert par section MultiPolygone
function createSectionPieChart() {
    const sectionCounts = {};
    lieux.forEach(lieu => {
        if (lieu.type_geometrie === 'ST_MultiPolygon') {
            const sec = lieu.section.toLowerCase();
            sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
        }
    });

    const total = Object.values(sectionCounts).reduce((a, b) => a + b, 0);
    const labels = Object.keys(sectionCounts);
    const values = labels.map(k => ((sectionCounts[k] / total) * 100).toFixed(2));
    const colors = labels.map((_, i) => `hsl(${i * 360 / labels.length}, 70%, 60%)`);

    const ctx = document.getElementById('sectionPie').getContext('2d');
    window.sectionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map(l => `${l} (${sectionCounts[l]})`),
            datasets: [{ data: values, backgroundColor: colors }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (event, elements) => {
                if (!elements.length) return;
                const i = elements[0].index;
                const sectionName = labels[i];
                const color = colors[i];
                highlightSectionOnMap(sectionName, color);
                updateEquipeChart([sectionName]);
                updateBarChart([sectionName]);
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Répartition % par section (MultiPolygones)',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${ctx.parsed}%`
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, padding: 10 }
                }
            }
        }
    });
}

// 🔄 Mise à jour du camembert des sections visibles
function updateVisibleSectionPieChart() {
    const bounds = map.getBounds();
    const selected = getSelectedSections();

    const visibleCounts = {};
    let totalVisible = 0;

    lieux.forEach(lieu => {
        if (lieu.type_geometrie === 'ST_MultiPolygon') {
            const section = lieu.section.toLowerCase().trim();
            if (!selected.includes(section)) return;

            const latlng = L.latLng(lieu.lat, lieu.lon);
            if (bounds.contains(latlng)) {
                visibleCounts[section] = (visibleCounts[section] || 0) + 1;
                totalVisible++;
            }
        }
    });

    if (totalVisible === 0) return;

    const labels = Object.keys(visibleCounts);
    const values = labels.map(sec => ((visibleCounts[sec] / totalVisible) * 100).toFixed(2));
    const colors = labels.map((_, i) => `hsl(${i * 360 / labels.length}, 70%, 60%)`);

    const chartData = {
        labels: labels.map(sec => `${sec} (${visibleCounts[sec]})`),
        datasets: [{ data: values, backgroundColor: colors }]
    };

    if (window.sectionChart) {
        window.sectionChart.data = chartData;
        window.sectionChart.options.plugins.title.text = 'Sections visibles filtrées (%)';
        window.sectionChart.update();
    }
}

// 🧾 Camembert des équipes par section
function updateEquipeChart(sections = null) {
    const selectedSections = sections || getSelectedSections();
    const equipeCounts = {};

    lieux.forEach(lieu => {
        if (lieu.type_geometrie === 'ST_Point') {
            const section = lieu.section.toLowerCase().trim();
            const equipe = lieu.nomequipe?.trim() || 'Inconnue';

            if (
                selectedSections.includes(section) &&
                isLieuVisible(lieu)
            ) {
                equipeCounts[equipe] = (equipeCounts[equipe] || 0) + 1;
            }
        }
    });

    const labels = Object.keys(equipeCounts);
    const values = labels.map(equipe => equipeCounts[equipe]);
    const colors = labels.map((_, i) => `hsl(${i * 360 / labels.length}, 65%, 60%)`);

    const ctx = document.getElementById('pointsPieChart').getContext('2d');
    if (window.pointsChartInstance) window.pointsChartInstance.destroy();

    window.pointsChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map(l => `${l} (${equipeCounts[l]})`),
            datasets: [{ data: values, backgroundColor: colors }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Répartition des enquêtes par équipe (sections visibles)`
                },
                legend: { position: 'bottom' }
            }
        }
    });
}


// 📊 Histogramme des superficies
function updateBarChart(sections = null) {
    const selectedSections = sections || getSelectedSections();
    const areaBySection = {};

    lieux.forEach(lieu => {
        if (lieu.type_geometrie === 'ST_MultiPolygon') {
            const section = lieu.section?.toLowerCase().trim();
            const surface = parseFloat(lieu.shape_area);

            if (
                !isNaN(surface) &&
                selectedSections.includes(section) &&
                isLieuVisible(lieu)
            ) {
                areaBySection[section] = (areaBySection[section] || 0) + surface;
            }
        }
    });

    const labels = Object.keys(areaBySection);
    const data = labels.map(s => areaBySection[s]);
    const colors = labels.map((_, i) => `hsl(${i * 360 / labels.length}, 60%, 60%)`);

    const ctx = document.getElementById('areaBarChart').getContext('2d');
    if (window.areaChartInstance) window.areaChartInstance.destroy();

    window.areaChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.map(sec => sec.charAt(0).toUpperCase() + sec.slice(1)),
            datasets: [{ label: 'Superficie totale (m²)', data, backgroundColor: colors }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            plugins: {
                title: {
                    display: true,
                    text: 'Superficie par section (visibles)'
                },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.parsed.x.toLocaleString()} m²`
                    }
                },
                legend: { display: false }
            },
            scales: {
                x: { title: { display: true, text: 'Superficie en m²' } },
                y: { title: { display: true, text: 'Section' } }
            }
        }
    });
}

// 🟨 Génération dynamique des cases à cocher section
function generateSectionCheckboxes() {
    const sectionContainer = document.getElementById("sectionCheckboxes");
    const uniqueSections = [...new Set(
        lieux.filter(l => l.type_geometrie === 'ST_Point')
             .map(l => l.section.toLowerCase().trim())
    )];

    uniqueSections.forEach(section => {
        const div = document.createElement("div");
        div.innerHTML = `
            <label>
                <input type="checkbox" class="section-filter" value="${section}" checked>
                ${section}
            </label>
        `;
        sectionContainer.appendChild(div);
    });

    document.querySelectorAll(".section-filter").forEach(cb =>
        cb.addEventListener("change", updateAllCharts)
    );
}

function filterLayersBySection() {
    const selectedSections = getSelectedSections();
    const bounds = map.getBounds();

    // Cache tous les layers d'abord
    pointLayer.eachLayer(layer => map.removeLayer(layer));
    lineLayer.eachLayer(layer => map.removeLayer(layer));
    polygonLayer.eachLayer(layer => map.removeLayer(layer));
    multiPolygonLayer.eachLayer(layer => map.removeLayer(layer));

    lieux.forEach(lieu => {
        const section = lieu.section?.toLowerCase().trim();
        if (!selectedSections.includes(section)) return;
        if (!isLieuVisible(lieu)) return;

        const marker = markers[lieu.id];
        if (!marker) return;

        // Ajoute l'entité dans le bon layerGroup
        switch (lieu.type_geometrie) {
            case 'ST_Point':
                pointLayer.addLayer(marker);
                break;
            case 'ST_LineString':
                lineLayer.addLayer(marker);
                break;
            case 'ST_Polygon':
                polygonLayer.addLayer(marker);
                break;
            case 'ST_MultiPolygon':
                multiPolygonLayer.addLayer(marker);
                break;
        }
    });
}


// 🔁 Mise à jour globale
function updateAllCharts() {
    updateVisibleSectionPieChart();
    updateEquipeChart();
    updateBarChart();
    filterLayersBySection();

}

// 🚀 Initialisation
generateSectionCheckboxes();
createSectionPieChart();
updateAllCharts();
map.on("moveend", updateAllCharts);



// ***********************Controls *************************************************


document.querySelectorAll('.filter-type').forEach(checkbox => {
    checkbox.addEventListener('change', function () {
       const pointChecked = document.getElementById('filter-point').checked;
        const lineChecked = document.getElementById('filter-line').checked;
        const polygonChecked = document.getElementById('filter-polygon').checked;
        const multiPolygonChecked = document.getElementById('filter-multipolygon').checked;

        if (!pointChecked && !lineChecked && !polygonChecked && !multiPolygonChecked) {
            pointLayer.addTo(map);
            lineLayer.addTo(map);
            polygonLayer.addTo(map);
            multiPolygonLayer.addTo(map);
        } else {
            pointChecked ? pointLayer.addTo(map) : pointLayer.remove();
            lineChecked ? lineLayer.addTo(map) : lineLayer.remove();
            polygonChecked ? polygonLayer.addTo(map) : polygonLayer.remove();
            multiPolygonChecked ? multiPolygonLayer.addTo(map) : multiPolygonLayer.remove();
        }
    });
});

let currentSort = { key: null, asc: true };
let lieuxFiltres = [];

// ✅ Récupère les types cochés pour le tableau
function getCheckedTableTypes() {
    return Array.from(document.querySelectorAll('.filter-table:checked')).map(cb => cb.value);
}

function handleTableFilterChange() {
    const checkedTypes = getCheckedTableTypes();
    const searchBar = document.getElementById('search-bar-container');
    const tableContainer = document.getElementById('geometry-table-container');
    const tableBody = document.querySelector('#geometry-table tbody');

    if (checkedTypes.length === 0) {
        searchBar.style.display = 'none';
        tableContainer.style.display = 'none';
        tableBody.innerHTML = '';
        lieuxFiltres = [];
        return;
    }

    searchBar.style.display = '';
    tableContainer.style.display = '';

    lieuxFiltres = lieux.filter(lieu => checkedTypes.includes(lieu.type_geometrie));

    applySorting();
    updateSelect2Options();
    $('#location-select').val(null).trigger('change');
}

// ✅ Met à jour le tableau et le Select2 selon le groupe .filter-table
document.querySelectorAll('.filter-table').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        handleTableFilterChange();
    });
});

function getCheckedTableTypes() {
    return Array.from(document.querySelectorAll('.filter-table:checked')).map(cb => cb.value);
}

// Retourne la liste filtrée ET triée selon currentSort, ou la liste initiale triée si pas de filtre
function getSortedFilteredLieux() {
    // Liste de base : soit lieuxFiltres (filtré au préalable), soit lieux filtré par types cochés
    let lieuxToDisplay;

    if (Array.isArray(lieuxFiltres) && lieuxFiltres.length > 0) {
        lieuxToDisplay = lieuxFiltres;
    } else {
        const checkedTypes = getCheckedTableTypes();
        if (checkedTypes.length === 0) {
            lieuxToDisplay = lieux;
        } else {
            lieuxToDisplay = lieux.filter(lieu => checkedTypes.includes(lieu.type_geometrie));
        }
    }

    // Trie selon currentSort (clé + ordre)
    const sorted = [...lieuxToDisplay].sort((a, b) => {
        if (!currentSort.key) return 0;
        const valA = (a[currentSort.key] ?? '').toString().toLowerCase();
        const valB = (b[currentSort.key] ?? '').toString().toLowerCase();
        return currentSort.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    return sorted;
}


// ✅ Trie et affiche les lieux filtrés
function applySorting() {
    const tableBody = document.querySelector('#geometry-table tbody');
    tableBody.innerHTML = '';

    const sorted = getSortedFilteredLieux();

    // Mets à jour lieuxFiltres avec cette liste triée (optionnel, utile si tu l'utilises ailleurs)
    lieuxFiltres = sorted;

    sorted.forEach(lieu => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${lieu.nom ?? ''}</td>
            <td>${lieu.type_geometrie.replace('ST_', '')}</td>
            <td>${lieu.section ?? ''}</td>
        `;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => zoomToLieu(lieu));
        tableBody.appendChild(row);
    });
}


// ✅ Zoom sur un lieu
function zoomToLieu(lieu) {
    const layer = markers[lieu.id?.toString()];
    if (!layer) {
        if (lieu.lat && lieu.lon) map.setView([lieu.lat, lieu.lon], 15);
        return;
    }

    if (lieu.lat && lieu.lon) {
        map.setView([lieu.lat, lieu.lon], 15);
    } else if (layer.getBounds) {
        map.fitBounds(layer.getBounds(), { padding: [50, 50], maxZoom: 18 });
    }

    setTimeout(() => {
        if (layer.getPopup()) layer.openPopup();
    }, 300);
}

// ✅ Zoom sur tous les lieux filtrés
function zoomToLieuxFiltres() {
    const layers = lieuxFiltres.map(lieu => markers[lieu.id?.toString()]).filter(l => l);
    if (layers.length === 0) return;

    if (layers.length === 1) {
        zoomToLieu(lieuxFiltres[0]);
        return;
    }

    const group = L.featureGroup(layers);
    map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 18 });
}

// ✅ Mise à jour Select2
function updateSelect2Options() {
    const checkedTypes = getCheckedTableTypes();
    const lieuxFiltrés = lieux.filter(lieu => checkedTypes.includes(lieu.type_geometrie));

    const allValues = [
        ...lieuxFiltrés.map(lieu => lieu.nom),
        ...lieuxFiltrés.map(lieu => lieu.nomequipe),
        ...lieuxFiltrés.map(lieu => lieu.section)
    ];

    const uniqueValues = [...new Set(allValues.filter(v => v && v.trim() !== ''))];

    const selectOptions = uniqueValues.map(val => ({
        id: val,
        text: val
    }));

    $('#location-select').empty().select2({
        data: selectOptions,
        placeholder: 'Rechercher un nom, une équipe ou une section...',
        allowClear: true,
        width: '100%',
        minimumInputLength: 1,
        matcher: function (params, data) {
            if ($.trim(params.term) === '') return null;
            const term = params.term.toLowerCase();
            const text = data.text.toLowerCase();
            return text.startsWith(term) ? data : null;
        }
    });
}

// ✅ Initialisation Select2
function initSelect2() {
    updateSelect2Options();

    $('#location-select').on('select2:select', function (e) {
        const term = e.params.data.text.toLowerCase();

        lieuxFiltres = lieux.filter(lieu =>
            (lieu.nom && lieu.nom.toLowerCase().startsWith(term)) ||
            (lieu.nomequipe && lieu.nomequipe.toLowerCase().startsWith(term)) ||
            (lieu.section && lieu.section.toLowerCase().startsWith(term))
        );

        applySorting();
        updateMapMarkers();    
        
    });

    $('#location-select').on('select2:clear', function () {
        lieuxFiltres = lieux.filter(lieu => getCheckedTableTypes().includes(lieu.type_geometrie));
        applySorting();
    });
}

// ✅ Initialisation
document.addEventListener('DOMContentLoaded', () => {
    initSelect2();
    handleTableFilterChange();
});


// --- Met à jour les couches Leaflet pour n'afficher que les lieux filtrés ---
function updateMapMarkers() {
    // Vider toutes les couches
    pointLayer.clearLayers();
    lineLayer.clearLayers();
    polygonLayer.clearLayers();
    multiPolygonLayer.clearLayers();

    lieuxFiltres.forEach(lieu => {
        const marker = markers[lieu.id?.toString()];
        if (!marker) return;

        switch (lieu.type_geometrie) {
            case 'ST_Point':
                pointLayer.addLayer(marker);
                break;
            case 'ST_LineString':
                lineLayer.addLayer(marker);
                break;
            case 'ST_Polygon':
                polygonLayer.addLayer(marker);
                break;
            case 'ST_MultiPolygon':
                multiPolygonLayer.addLayer(marker);
                break;
        }
    });
}


document.getElementById('reset-map').addEventListener('click', () => {
    // 1. Réinitialise tous les filtres cochés
    document.querySelectorAll('.filter-table:checked').forEach(cb => cb.checked = false);

    // 2. Vide le Select2
    $('#location-select').val(null).trigger('change');

    // 3. Réinitialise lieuxFiltres à vide
    lieuxFiltres = [];

    // 4. Réinitialise currentSort
    currentSort = { key: null, asc: true };

    // 5. Vide le tableau
    document.querySelector('#geometry-table tbody').innerHTML = '';
    document.getElementById('search-bar-container').style.display = 'none';
    document.getElementById('geometry-table-container').style.display = 'none';

    // 6. Réinitialise les options de Select2
    updateSelect2Options();

    // 7. Affiche tous les lieux sur la carte
    pointLayer.clearLayers();
    lineLayer.clearLayers();
    polygonLayer.clearLayers();
    multiPolygonLayer.clearLayers();

    lieux.forEach(lieu => {
        const marker = markers[lieu.id?.toString()];
        if (!marker) return;

        switch (lieu.type_geometrie) {
            case 'ST_Point':
                pointLayer.addLayer(marker);
                break;
            case 'ST_LineString':
                lineLayer.addLayer(marker);
                break;
            case 'ST_Polygon':
                polygonLayer.addLayer(marker);
                break;
            case 'ST_MultiPolygon':
                multiPolygonLayer.addLayer(marker);
                break;
        }
    });

    // 8. Zoom général sur tous les lieux
    const allLayers = Object.values(markers).filter(m => m);
    if (allLayers.length > 0) {
        const group = L.featureGroup(allLayers);
        map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 16 });
    }
});




// *********************** Modification des geometries  *************************************************
// (Le code précédent reste inchangé jusqu'à la partie des marqueurs)

// Ajout des éléments à la carte

// Après la création des marqueurs...

// Variables globales
var selectedFeatureId = null;
var originalPositions = {};

// Initialiser le panneau de contrôle
function initFeatureControls() {
    const featureSelect = document.getElementById('feature-select');

    // Vider et remplir le select
    featureSelect.innerHTML = '<option value="">-- Choisir un élément --</option>';

    lieux.forEach(lieu => {
        const option = document.createElement('option');
        option.value = lieu.id;
        option.textContent = lieu.nom;

        if (lieu.type_geometrie === 'ST_Point') {
            option.dataset.lat = lieu.lat;
            option.dataset.lon = lieu.lon;

            originalPositions[lieu.id] = {
                lat: lieu.lat,
                lon: lieu.lon,
                nom: lieu.nom
            };
        }

        featureSelect.appendChild(option);
    });

    // Gestion du changement de sélection
   featureSelect.addEventListener('change', function () {
    const featureId = this.value;
    selectedFeatureId = featureId;

    const coordsContainer = document.getElementById('point-coords-container');
    const nameInput = document.getElementById('feature-name');
    const saveBtn = document.getElementById('save-feature-btn');
    const editBtn = document.getElementById('edit-geometry-btn');

    // Réinitialiser tous les marqueurs
    Object.entries(markers).forEach(([id, marker]) => {
        if (marker.dragging) {
            marker.dragging.disable();
            highlightFeature(marker, false);
            marker.off('dragend', updateFeatureCoords);
        }
    });

    // Réinitialiser les éléments
    coordsContainer.style.display = 'none';
    editBtn.style.display = 'none';
    saveBtn.style.display = 'none';
    nameInput.disabled = true;

    if (featureId) {
        const lieu = lieux.find(l => l.id == featureId);
        if (!lieu) return;

        const isPoint = lieu.type_geometrie === 'ST_Point';
        const isLine = lieu.type_geometrie === 'ST_LineString';
        const isPolygon = lieu.type_geometrie === 'ST_Polygon';

        nameInput.disabled = false;
        nameInput.value = lieu.nom;

        if (isPoint) {
            // Activer et afficher le bouton "Enregistrer"
            saveBtn.disabled = false;
            saveBtn.style.display = 'inline-block';

            coordsContainer.style.display = 'block';
            document.getElementById('point-coords').textContent =
                `Lat: ${parseFloat(lieu.lat).toFixed(6)}, Lng: ${parseFloat(lieu.lon).toFixed(6)}`;

            map.setView([lieu.lat, lieu.lon], 15);
            highlightFeature(markers[featureId], true);

            if (markers[featureId] && markers[featureId].dragging) {
                markers[featureId].dragging.enable();
                markers[featureId].on('dragend', updateFeatureCoords);
            }
        }

        if (isLine || isPolygon) {
            editBtn.style.display = 'inline-block';
            saveBtn.disabled = false;
            const layer = markers[featureId];

            if (layer && typeof layer.getBounds === 'function') {
                map.fitBounds(layer.getBounds());
            }

            highlightFeature(layer, true);

            // Bouton "Modifier" active l'édition
            
        }

        if (markers[featureId]) {
        markers[featureId].setPopupContent(createEditablePopup(lieu));
        markers[featureId].openPopup();
    }

    } else {
        resetFeatureControls();
    }
});


function enableGeometryEditing(layer) {
    if (!layer) return;

    const editBtn = document.getElementById('edit-geometry-btn');

    if (layer.editEnabled && layer.editEnabled()) {
        // Terminer édition
        layer.disableEdit();
        editBtn.textContent = 'Modifier';

        saveGeometryChanges(layer)
            .then(() => {
                resetFeatureControls();
            })
            .catch(err => {
                console.error('Erreur lors de la sauvegarde:', err);
                // Tu peux décider de reset quand même ou pas
            });
    } else {
        // Activer édition
        if (layer.enableEdit) {
            layer.enableEdit();
            editBtn.textContent = 'Terminer la modification';

            if (typeof layer.getBounds === 'function') {
                map.fitBounds(layer.getBounds().pad(0.5));
            }

            alert("Mode édition activé. Modifiez la forme puis cliquez sur 'Terminer la modification' pour enregistrer.");
        } else {
            console.warn("Ce layer ne supporte pas l'édition.");
        }
    }
}

function saveGeometryChanges(layer) {
    return new Promise((resolve, reject) => {
        if (!selectedFeatureId) {
            reject(new Error("Aucun élément sélectionné"));
            return;
        }
    
        const lieu = lieux.find(l => l.id == selectedFeatureId);
        if (!lieu) {
            reject(new Error("Lieu non trouvé"));
            return;
        }
    
        let geojson;

        
    
        if (layer instanceof L.Polygon) {
            const coords = layer.getLatLngs()[0].map(ll => [ll.lng, ll.lat]);
            if (coords.length < 3) {
                showStatus('Un polygone doit avoir au moins 3 points.', 'error');
                reject(new Error("Polygone invalide"));
                return;
            }
            coords.push(coords[0]);
            geojson = {
                type: "Polygon",
                coordinates: [coords]
            };
        } else if (layer instanceof L.Polyline) {
            const coords = layer.getLatLngs().map(ll => [ll.lng, ll.lat]);
            if (coords.length < 2) {
                showStatus('Une ligne doit avoir au moins 2 points.', 'error');
                reject(new Error("Ligne invalide"));
                return;
            }
            geojson = {
                type: "LineString",
                coordinates: coords
            };
        }
    
        const newName = document.getElementById('feature-name').value.trim();
    
        showStatus('Enregistrement en cours...', 'loading');
    
        const formData = new FormData();
        formData.append('id', selectedFeatureId);
        formData.append('nom', newName);
        formData.append('geojson', JSON.stringify(geojson));
    
        fetch('update_geometry.php', {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Mise à jour locale
                lieu.nom = newName;
                lieu.geojson = JSON.stringify(geojson);
                const type = lieu.type_geometrie.replace('ST_', '');
                layer.setPopupContent(`<b>${newName}</b><br>Type: ${type}`);
                showStatus('Modifications enregistrées!', 'success');
                resolve(data);
            } else {
                showStatus(`Échec: ${data.message}`, 'error');
                reject(new Error(data.message || 'Erreur lors de l\'enregistrement'));
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            showStatus(`Échec: ${error.message}`, 'error');
            reject(error);
        });
    });
}


 // Gestion du bouton modifier
 document.getElementById('edit-geometry-btn').addEventListener('click', function () {
    if (selectedFeatureId && markers[selectedFeatureId]) {
        enableGeometryEditing(markers[selectedFeatureId]);
    } else {
        console.warn("Aucun élément sélectionné pour l'édition.");
    }
});
    // Gestion du bouton enregistrer
    document.getElementById('save-feature-btn').addEventListener('click', saveFeatureChanges);

    // Mise à jour du popup si nom modifié
    document.getElementById('feature-name').addEventListener('input', function () {
        if (selectedFeatureId) {
            const lieu = lieux.find(l => l.id == selectedFeatureId);
            const type = lieu.type_geometrie.replace('ST_', '');
            markers[selectedFeatureId].setPopupContent(`<b>${this.value}</b><br>Type: ${type}`);
        }
    });
}

// Mise à jour des coordonnées
function updateFeatureCoords(e) {
    if (!selectedFeatureId) return;

    const newLatLng = e.target.getLatLng();
    document.getElementById('point-coords').textContent =
        `Lat: ${newLatLng.lat.toFixed(6)}, Lng: ${newLatLng.lng.toFixed(6)}`;
}



// Réinitialiser
function resetFeatureControls() {
    if (selectedFeatureId && markers[selectedFeatureId]) {
        if (markers[selectedFeatureId].dragging) {
            markers[selectedFeatureId].dragging.disable();
            markers[selectedFeatureId].off('dragend', updateFeatureCoords);
        }
        highlightFeature(markers[selectedFeatureId], false);
    }

    selectedFeatureId = null;
    document.getElementById('feature-name').value = '';
    document.getElementById('feature-name').disabled = true;
    document.getElementById('point-coords').textContent = 'Non sélectionné';
    document.getElementById('point-coords-container').style.display = 'none';
    document.getElementById('save-feature-btn').disabled = true;
    document.getElementById('save-status').textContent = '';


   // AJOUTER CETTE LIGNE POUR RESET LE SELECT
    const featureSelect = document.getElementById('feature-select');
    if (featureSelect) {
        featureSelect.value = '';  // remet la sélection à l'option par défaut
    }
}

// Enregistrer les modifications
function saveFeatureChanges() {
    if (!selectedFeatureId) return;

    const marker = markers[selectedFeatureId];
    const lieu = lieux.find(l => l.id == selectedFeatureId);
    const isPoint = lieu.type_geometrie === 'ST_Point';
    const newName = document.getElementById('feature-name').value.trim();
    let lat = null, lon = null;

    if (isPoint) {
        const pos = marker.getLatLng();
        lat = pos.lat;
        lon = pos.lng;
        if (isNaN(lat) || isNaN(lon)) {
            showStatus('Coordonnées invalides', 'error');
            return;
        }
    }

    if (!newName || newName.length > 100) {
        showStatus('Nom invalide (1-100 caractères)', 'error');
        return;
    }

    showStatus('Enregistrement en cours...', 'loading');

    const formData = new FormData();
    formData.append('id', selectedFeatureId);
    formData.append('nom', newName);
    if (isPoint) {
        formData.append('lat', lat.toString());
        formData.append('lon', lon.toString());
    }

    fetch('update_point.php', {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    })
        .then(response => {
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Réponse non-JSON du serveur');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                updateLocalData(selectedFeatureId, newName, lat, lon);
                showStatus('Enregistré avec succès!', 'success');
                setTimeout(resetFeatureControls, 2000);
            } else {
                throw new Error(data.message || 'Erreur inconnue');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            showStatus(`Échec: ${error.message}`, 'error');
        });
}

// Statut
function showStatus(message, type) {
    const statusEl = document.getElementById('save-status');
    statusEl.innerHTML = type === 'loading'
        ? `<i class="fa fa-spinner fa-spin"></i> ${message}`
        : `<span class="text-${type === 'success' ? 'success' : 'danger'}">${message}</span>`;
}

// Mettre à jour les données locales
function updateLocalData(id, name, lat, lon) {
    const lieu = lieux.find(l => l.id == id);
    if (lieu) {
        lieu.nom = name;
        if (lat !== null && lon !== null) {
            lieu.lat = lat;
            lieu.lon = lon;
        }
    }

    const marker = markers[id];
    if (marker) {
        const type = lieu.type_geometrie.replace('ST_', '');
        marker.setPopupContent(`<b>${name}</b><br>Type: ${type}`);
    }

    const option = document.querySelector(`#feature-select option[value="${id}"]`);
    if (option) {
        option.textContent = name;
        if (lat !== null && lon !== null) {
            option.dataset.lat = lat;
            option.dataset.lon = lon;
        }
    }
}
initFeatureControls();

function savePopupEdits(id) {
    const lieu = lieux.find(l => l.id == id);
    if (!lieu) return;

    // Construction minimale du GeoJSON pour l'exemple (adapter selon ton cas réel)
    // Ici on suppose que tu as le GeoJSON dans lieu.geojson déjà
    let geojson = lieu.geojson || null;
if (typeof geojson === 'string') {
    try {
        geojson = JSON.parse(geojson);
    } catch(e) {
        alert("Erreur: géométrie JSON invalide");
        return;
    }
}
if (geojson && geojson.type === 'Feature') {
    geojson = geojson.geometry;
}

    // Données à envoyer
    const data = {
        id: lieu.id,
        nom: document.getElementById(`popup-nom-${id}`)?.value || '',
        section: document.getElementById(`popup-section-${id}`)?.value || '',
        geojson: geojson,
    };

    // Compléter selon type géométrie
    switch (lieu.type_geometrie) {
        case 'ST_Point':
            data.telephone_proprietaire_local = document.getElementById(`popup-tel-local-${id}`)?.value || '';
            data.telephone_proprietaire_etranger = document.getElementById(`popup-tel-etranger-${id}`)?.value || '';
            data.nomequipe = document.getElementById(`popup-nomequipe-${id}`)?.value || '';
            data.terrain = document.getElementById(`popup-terrain-${id}`)?.value || '';
            data.nom_proprietaire = document.getElementById(`popup-nom-proprietaire-${id}`)?.value || '';
            data.prenoms_proprietaire = document.getElementById(`popup-prenoms-proprietaire-${id}`)?.value || '';
            break;

        case 'ST_LineString':
            data.info = document.getElementById(`popup-info-ligne-${id}`)?.value || '';
            break;

        case 'ST_Polygon':
            data.surface = document.getElementById(`popup-surface-${id}`)?.value || '';
            break;

        case 'ST_MultiPolygon':
            data.contenance = document.getElementById(`popup-contenance-${id}`)?.value || '';
            break;
    }

    const statusDiv = document.getElementById(`popup-status-${id}`);
    if (statusDiv) {
        statusDiv.textContent = '⏳ Enregistrement en cours...';
    }

    fetch('save_popup.php', {  // <-- Mets ici le chemin vers ton script PHP
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            //'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            if (statusDiv) statusDiv.textContent = '✅ Enregistré avec succès.';
        } else {
            if (statusDiv) statusDiv.textContent = '❌ Erreur: ' + (result.message || 'Erreur lors de l’enregistrement.');
        }
    })
    .catch(err => {
        console.error('Erreur:', err);
        if (statusDiv) statusDiv.textContent = '❌ Erreur réseau.';
    });
}



// ***********************Selection par rayon ou par polygone *************************************************
// Ajouter un bouton dans votre interface HTML
// Groupe qui accueillera les dessins Leaflet Draw
const drawnItems = new L.FeatureGroup().addTo(map);

// ────────────────────────────────
// 2. Bouton pour activer / désactiver Leaflet Draw
// ────────────────────────────────
let drawControl = null;
let drawModeActive = false;

document.getElementById('draw-select-btn').addEventListener('click', () => {
  drawModeActive = !drawModeActive;
  const btn = document.getElementById('draw-select-btn');
  
  if (drawModeActive) {
    btn.classList.add('active');
    
    drawControl = new L.Control.Draw({
      draw: {
        polygon  : true,
        rectangle: true,
        circle   : true,   // ✅ cercle de sélection
        polyline : false,
        marker   : false
      },
      edit: {
        featureGroup: drawnItems,
        edit  : false,
        remove: false
      }
    });
    map.addControl(drawControl);
    
  } else {
    btn.classList.remove('active');
    if (drawControl) {
      map.removeControl(drawControl);
      drawControl = null;
    }
    drawnItems.clearLayers();
    resetHighlightedFeatures();
    document.getElementById('radius-result-list').style.display = 'none';
    
  }
});

// ────────────────────────────────
// 3. Gestion du dessin terminé
// ────────────────────────────────
map.on(L.Draw.Event.CREATED, ev => {
  
  if (!drawModeActive) return;   // sécurité

  const layer = ev.layer;
  drawnItems.clearLayers();      // on garde un seul dessin à la fois
  drawnItems.addLayer(layer);
  
  // Déterminer la zone sélectionnée (GeoJSON)
  let selectionArea;
  if (layer instanceof L.Circle) {
    const center = [layer.getLatLng().lng, layer.getLatLng().lat];
    const radius = layer.getRadius() / 1000;           // => km
    selectionArea = turf.circle(center, radius, { units:'kilometers', steps:64 });
  } else {
    selectionArea = layer.toGeoJSON();
  }
  
  // Parcourir les couches métiers et collecter les entités intersectées
  const selected = [];
  [pointLayer, lineLayer, polygonLayer, multiPolygonLayer].forEach(group => {
    group.eachLayer(f => {
      if (turf.booleanIntersects(selectionArea, f.toGeoJSON())) {
        highlightFeature(f, true);
        selected.push(f);
       

        
      }
    });
  });
  
  updateResultTable(selected);
});

// ────────────────────────────────
// 4. Utilitaires : surbrillance & tableau
// ────────────────────────────────
const highlighted = new Set();

function highlightFeature(feat, on) {
  if (on) {
    if (highlighted.has(feat)) return;
    highlighted.add(feat);
  } else {
    if (!highlighted.has(feat)) return;
    highlighted.delete(feat);
  }

  // sauvegarder le style original si nécessaire
  if (!feat._origStyle) {
    if (feat instanceof L.Marker && feat.options.icon) {
      feat._origStyle = { icon: feat.options.icon };
    } else if (feat.setStyle) {
      feat._origStyle = {
        color     : feat.options.color     || '#3388ff',
        fillColor : feat.options.fillColor || '#3388ff',
        weight    : feat.options.weight    || 3
      };
    }
  }

  // appliquer / enlever le style surligné
  if (feat instanceof L.Marker) {
    feat.setIcon(on
      ? L.icon({
          iconUrl   : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          shadowUrl : 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize  : [25,41],
          iconAnchor: [12,41],
          popupAnchor:[1,-34],
          shadowSize:[41,41]
        })
      : feat._origStyle.icon
    );
  } else if (feat instanceof L.Polygon || feat instanceof L.Polyline) {
    feat.setStyle(on
      ? { color:'#ff0000', fillColor:'#ff0000', weight: (feat instanceof L.Polyline ? 6 : feat.options.weight) }
      : feat._origStyle
    );
  }
}

function resetHighlightedFeatures() {
  [...highlighted].forEach(f => highlightFeature(f, false));
  highlighted.clear();
}

function updateResultTable(features) {
  const box = document.getElementById('radius-result-list');
  

  box.style.display = 'block';

  if (features.length === 0) {
    box.innerHTML = '<em>Aucune géométrie trouvée.</em>';

    return;
  }

  const rows = features.map(f => {
    let nom = 'N/A';
    let type = 'Inconnu';

    for (const lieu of lieux) {
      const marker = markers[lieu.id];
      if (!marker) continue;

      // Cas exact : f est le layer enregistré
      if (marker === f) {
        nom = lieu.nom;
        type = typeFromGeom(lieu.type_geometrie);
        break;
      }

      // Cas MultiPolygon : f est un des sous-polygones
      if (marker instanceof L.LayerGroup) {
        const found = marker.getLayers().some(l => l === f);
        if (found) {
          nom = lieu.nom;
          type = 'MultiPolygone';
          break;
        }
      }
    }

    return `<tr><td>${nom}</td><td>${type}</td></tr>`;
  }).join('');

  box.innerHTML = `
    <strong style="font-size:13px;">Géométries trouvées :</strong>
    <div style="overflow-x:auto; margin-top:6px;">
      <table class="result-table">
        <thead><tr><th>Nom</th><th>Type</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  
}

// Utilitaire pour convertir type_geometrie en nom lisible
function typeFromGeom(type) {
  switch (type) {
    case 'ST_Point': return 'Point';
    case 'ST_LineString': return 'Ligne';
    case 'ST_Polygon': return 'Polygone';
    case 'ST_MultiPolygon': return 'MultiPolygone';
    default: return 'Inconnu';
  }
}


function getSelectedGeoJSON() {
  const features = [];
  highlighted.forEach(f => {
    const geoJSON = f.toGeoJSON();
    // Trouver le lieu correspondant dans votre tableau lieux
    for (const lieu of lieux) {
      if (markers[lieu.id] === f) {
        geoJSON.properties = {
          nom: lieu.nom,
          type: lieu.type_geometrie.replace('ST_', '')
        };
        break;
      }
    }
    features.push(geoJSON);
  });
  return { type: "FeatureCollection", features };
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function downloadGeoJSON() {
  const geojson = getSelectedGeoJSON();
  downloadBlob(JSON.stringify(geojson, null, 2), 'selection.geojson', 'application/json');
}

function downloadKML() {
  const geojson = getSelectedGeoJSON();
  const kml = tokml(geojson);  // nécessite la lib tokml.js
  downloadBlob(kml, 'selection.kml', 'application/vnd.google-earth.kml+xml');
}

function downloadShapefile() {
  const geojson = getSelectedGeoJSON();
  shpwrite.download(geojson, { folder: 'shapes', types: { point: 'points', polygon: 'polygons', line: 'lines' } });
  // nécessite shpwrite.js (https://github.com/mapbox/shp-write)
}

function downloadExcel() {
  const geojson = getSelectedGeoJSON();
  const rows = geojson.features.map(f => ({
    Nom: f.properties.nom || "N/A",
    Type: f.geometry.type,
    Coordonnées: JSON.stringify(f.geometry.coordinates)
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Données");
  XLSX.writeFile(workbook, "selection.xlsx");
}

// ***********************Ajout des geometries   *************************************************


// Variables locales pour les fonctionnalités de dessin
const drawingManager = {
    drawControl: null,
    currentDrawingMode: null,
    temporaryItems: new L.FeatureGroup(),

    init: function() {
        // Ajouter le groupe temporaire à la carte
        map.addLayer(this.temporaryItems);
        
        // Initialiser les contrôles de dessin
        this.setupDrawControls();
        
        // Ajouter les boutons personnalisés
        this.addCustomDrawingButtons();
    },

    setupDrawControls: function() {
        this.drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                polygon: {
                    shapeOptions: polygonStyle,
                    showArea: true,
                    metric: true
                },
                polyline: {
                    shapeOptions: lineStyle
                },
                circle: false,
                rectangle: false,
                circlemarker: false,
                marker: {
                    icon: orangeIcon
                }
            },
            edit: {
                featureGroup: this.temporaryItems
            }
        });
        
        map.addControl(this.drawControl);
        
        // Gestion des événements
        map.on(L.Draw.Event.CREATED, this.handleDrawCreated.bind(this));
        map.on(L.Draw.Event.DRAWSTOP, this.handleDrawStop.bind(this));
    },

    handleDrawCreated: function(e) {
        if (drawModeActive) return;

        const newLayer = e.layer;
        const layerType = e.layerType;

        this.temporaryItems.addLayer(newLayer);
        this.showSaveDialog(newLayer, layerType);
    },

    handleDrawStop: function() {
        this.currentDrawingMode = null;
    },

    showSaveDialog: function(layer, type) {
        const dialogContent = document.createElement('div');
        dialogContent.innerHTML = `
            <div class="form-group">
                <label for="drawing-feature-name">Nom de l'élément</label>
                <input type="text" id="drawing-feature-name" class="form-control" placeholder="Entrez un nom">
            </div>
            <div class="form-group">
                <label for="drawing-feature-section">Section</label>
                <input type="text" id="drawing-feature-section" class="form-control" placeholder="Entrez une section">
            </div>
            <button id="drawing-save-btn" class="btn btn-primary">Enregistrer</button>
            <button id="drawing-cancel-btn" class="btn btn-secondary">Annuler</button>
            <div id="drawing-status-msg"></div>
        `;
        
        layer.bindPopup(dialogContent, {
            maxWidth: 300,
            closeOnClick: false,
            autoClose: false
        }).openPopup();
        
        document.getElementById('drawing-save-btn').addEventListener('click', () => {
            this.saveDrawing(layer, type);
        });
        
        document.getElementById('drawing-cancel-btn').addEventListener('click', () => {
            this.cancelDrawing(layer);
        });
    },

    saveDrawing: function(layer, type) {
        const featureName = document.getElementById('drawing-feature-name').value.trim();
        const featureSection = document.getElementById('drawing-feature-section').value.trim();

        if (!featureName || featureName.length > 100) {
            this.showDrawingStatus('Nom invalide (1-100 caractères)', 'error');
            return;
        }
        if (!featureSection) {
            this.showDrawingStatus('La section est obligatoire', 'error');
            return;
        }
        
        const geometryData = this.convertToGeoJSON(layer, type);
        if (!geometryData.valid) {
            this.showDrawingStatus(geometryData.message, 'error');
            return;
        }
        
        this.showDrawingStatus('Enregistrement en cours...', 'loading');
        
        fetch('save_geometry.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nom: featureName,
                section: featureSection,
                type_geometrie: geometryData.type,
                geojson: JSON.stringify(geometryData.geojson)
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                this.finalizeDrawing(layer, featureName, geometryData, data.id, featureSection);
            } else {
                throw new Error(data.message || 'Erreur lors de l\'enregistrement');
            }
        })
        .catch(error => {
            console.error('Erreur:', error);
            this.showDrawingStatus(`Échec: ${error.message}`, 'error');
        });
    },

    convertToGeoJSON: function(layer, type) {
        let result = { valid: false };
        
        if (layer instanceof L.Marker) {
            const latLng = layer.getLatLng();
            result = {
                valid: true,
                type: 'ST_Point',
                geojson: {
                    type: "Point",
                    coordinates: [latLng.lng, latLng.lat]
                }
            };
        
        } else if (layer instanceof L.Polygon)  {
            const coords = layer.getLatLngs()[0].map(ll => [ll.lng, ll.lat]);
            if (coords.length < 3) {
                return { valid: false, message: 'Un polygone doit avoir au moins 3 points' };
            }
            coords.push(coords[0]); // Fermer le polygone
            result = {
                valid: true,
                type: 'ST_Polygon',
                geojson: {
                    type: "Polygon",
                    coordinates: [coords]
                }
            };
        } else if (layer instanceof L.Polyline) {
            const coords = layer.getLatLngs().map(ll => [ll.lng, ll.lat]);
            if (coords.length < 2) {
                return { valid: false, message: 'Une ligne doit avoir au moins 2 points' };
            }
            result = {
                valid: true,
                type: 'ST_LineString',
                geojson: {
                    type: "LineString",
                    coordinates: coords
                }
            };
        }
        
        return result;
    },

    finalizeDrawing: function(layer, name, geometryData, id, section) {
        this.showDrawingStatus('Enregistré avec succès!', 'success');
        
        // Créer l'objet du nouveau lieu
        const newFeature = {
            id: id,
            nom: name,
            section: section,
            type_geometrie: geometryData.type,
            geojson: JSON.stringify(geometryData.geojson),
            lat: geometryData.type === 'ST_Point' ? geometryData.geojson.coordinates[1] : null,
            lon: geometryData.type === 'ST_Point' ? geometryData.geojson.coordinates[0] : null
        };
        
        // Ajouter à la liste des lieux
        lieux.push(newFeature);
        
        // Créer et ajouter le layer définitif
        this.createPermanentLayer(newFeature);
        
        // Nettoyer
        this.temporaryItems.removeLayer(layer);
        setTimeout(() => layer.closePopup(), 2000);
        
        // Mettre à jour l'interface
        handleTableFilterChange();
    },

    createPermanentLayer: function(feature) {
        let definitiveLayer;
        const geometry = JSON.parse(feature.geojson);
        
        switch(feature.type_geometrie) {
            case 'ST_Point':
                definitiveLayer = L.marker(
                    [geometry.coordinates[1], geometry.coordinates[0]], 
                    { icon: orangeIcon, draggable: false }
                ).bindPopup(`<b>${feature.nom}</b><br>Type: Point<br>Section: ${feature.section}`);
                pointLayer.addLayer(definitiveLayer);
                break;
                
            case 'ST_LineString':
                const lineCoords = geometry.coordinates.map(coord => [coord[1], coord[0]]);
                definitiveLayer = L.polyline(lineCoords, lineStyle)
                    .bindPopup(`<b>${feature.nom}</b><br>Type: Ligne<br>Section: ${feature.section}`);
                lineLayer.addLayer(definitiveLayer);
                break;
                
            case 'ST_Polygon':
                const polyCoords = geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
                definitiveLayer = L.polygon(polyCoords, polygonStyle)
                    .bindPopup(`<b>${feature.nom}</b><br>Type: Polygone<br>Section: ${feature.section}`);
                polygonLayer.addLayer(definitiveLayer);
                break;
        }
        
        // Ajouter au dictionnaire des markers
        markers[feature.id] = definitiveLayer;
    },

    cancelDrawing: function(layer) {
        this.temporaryItems.removeLayer(layer);
        layer.closePopup();
    },

    showDrawingStatus: function(message, type) {
        const statusEl = document.getElementById('drawing-status-msg');
        statusEl.innerHTML = type === 'loading' 
            ? `<i class="fa fa-spinner fa-spin"></i> ${message}`
            : `<span class="text-${type === 'success' ? 'success' : 'danger'}">${message}</span>`;
    },

    addCustomDrawingButtons: function() {
        const container = document.createElement('div');
        container.className = 'leaflet-control leaflet-bar drawing-controls-container';
        
        const buttons = [
            { 
                type: 'marker', 
                title: 'Ajouter un point', 
                icon: '<i class="fa fa-map-marker"></i>',
                handler: () => {
                    this.currentDrawingMode = 'marker';
                    new L.Draw.Marker(map, this.drawControl.options.draw.marker).enable();
                }
            },
            { 
                type: 'line', 
                title: 'Ajouter une ligne', 
                icon: '<i class="fa fa-minus"></i>',
                handler: () => {
                    this.currentDrawingMode = 'polyline';
                    new L.Draw.Polyline(map, this.drawControl.options.draw.polyline).enable();
                }
            },
            { 
                type: 'polygon', 
                title: 'Ajouter un polygone', 
                icon: '<i class="fa fa-square-o"></i>',
                handler: () => {
                    this.currentDrawingMode = 'polygon';
                    new L.Draw.Polygon(map, this.drawControl.options.draw.polygon).enable();
                }
            }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('a');
            button.href = '#';
            button.title = btn.title;
            button.innerHTML = btn.icon;
            button.onclick = function(e) {
                e.preventDefault();
                btn.handler();
            };
            container.appendChild(button);
        });
        
        map.addControl({
            onAdd: function() {
                return container;
            },
            position: 'topright'
        });
    }
};


// Initialiser le gestionnaire de dessin
drawingManager.init();