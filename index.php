<?php
include('includes/db.php');
$conn = connectDB();
if (!$conn) {
    die("Erreur de connexion");
}

pg_close($conn);




/************************************ */

/*$conn = connectDB();
$sort = $_POST['sort'] ?? 'asc';

$query = "
    SELECT 
        *,
        ST_GeometryType(geom) AS type_geometrie,
        ST_X(ST_Centroid(geom)) AS lon,
        ST_Y(ST_Centroid(geom)) AS lat,
        ST_AsGeoJSON(geom) AS geojson
    FROM golfe
    ORDER BY nom $sort
";


$result = pg_query($conn, $query) or die("Erreur lors de la requête : " . pg_last_error());
$lieux = pg_fetch_all($result) ?: [];
pg_close($conn);*/
?>

<!DOCTYPE html>
<html lang="fr">
<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tableau de Bord Moderne</title>
     <!-- Inclure Font Awesome pour les icônes -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.css">
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    
    
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.0/font/bootstrap-icons.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />

    <!-- Leaflet Draw pour dessiner une zone -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet-draw@1.0.4/dist/leaflet.draw.css" />
   

    <style>
       #map { 
  width: 100%; 
  height: 100%; 
}

.legend {
  background: white;
  padding: 10px;
  border-radius: 5px;
  box-shadow: 0 0 15px rgba(0,0,0,0.2);
  font-size: 14px;
}

.legend i {
  width: 18px;
  height: 18px;
  float: left;
  margin-right: 8px;
  opacity: 0.7;
}

.point-control-panel {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 5px;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  margin-bottom: 20px;
}

.point-control-panel h3 {
  margin-top: 0;
  color: #333;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
}

#save-status {
  min-height: 20px;
}

#edit-btn.active {
  background-color: #dc3545;
  border-color: #dc3545;
}

#save-geometry-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

#edit-geometry-btn {
  background-color: #6c757d;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

#edit-geometry-btn:hover {
  background-color: #6c757d;
}

#custom-toolbar {
  position: absolute;
  top: 100px;
  left: 10px;
  z-index: 1000;
  background: white;
  padding: 10px;
  border-radius: 6px;
  box-shadow: 0 0 6px rgba(0,0,0,0.2);
  width: 180px;
}

#radius-select-btn {
  background-color: white;
  border: 1px solid #ccc;
  color: black;
  padding: 6px 10px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
}

.dashboard-card {
  min-height: 400px;
  display: flex;
  flex-direction: column;
}

.dashboard-card .card-body {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.dashboard-card canvas {
  max-width: 100%;
}


#radius-input-container {
  position: absolute;
  top: 160px;
  left: 10px;
  z-index: 1000;
  background: white;
  padding: 10px;
  border-radius: 6px;
  box-shadow: 0 0 6px rgba(0,0,0,0.2);
  width: 180px;
}

#radius-result-list {
  background-color: white;
  padding: 10px 15px;
  border-radius: 6px;
  box-shadow: 0 0 8px rgba(0,0,0,0.15);
  font-size: 13px;
  line-height: 1.4;
  display: none;
}

#radius-result-list ul {
  list-style-type: disc;
  padding-left: 20px;
  margin: 5px 0 0 0;
}

#radius-result-list li {
  margin: 3px 0;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
  margin-top: 5px;
  border: 1px solid #ccc;
}

.result-table th, 
.result-table td {
  border: 1px solid #ccc;
  padding: 8px 12px;
  text-align: left;
}

.result-table th {
  background-color: #2563eb;
  color: white;
  font-weight: normal;
}

.result-table tr:nth-child(even) {
  background-color: #f9f9f9;
}

.result-table tr:hover {
  background-color: #f1f1f1;
}

.result-table td:first-child {
  text-align: center;
  font-weight: bold;
}



.section-label {
  background-color: rgba(255, 255, 255, 0.85);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #444;
  font-size: 12px;
  font-weight: bold;
  color: #333;
  text-align: center;
  box-shadow: 0 0 3px rgba(0,0,0,0.4);
  pointer-events: none;
}

.leaflet-control-custom {
  background: white;
  padding: 5px;
  border-radius: 5px;
  box-shadow: 0 1px 5px rgba(0,0,0,0.4);
}

#geometry-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}

#geometry-table th,
#geometry-table td {
  border: 1px solid #ccc;
  padding: 8px;
  text-align: left;
}

#geometry-table th {
  background-color: #f4f4f4;
  cursor: pointer;
}

#geometry-table tr:hover {
  background-color: #f9f9f9;
}

.dropdown-container {
  position: relative;
  display: inline-block;
  width: 100%;
  max-width: 300px;
}

.dropdown-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.dropdown-btn:hover {
  background-color: #2563eb;
}

.dropdown-btn i {
  margin-right: 8px;
}

.dropdown-content {
  display: none;
  position: absolute;
  width: 100%;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  z-index: 190;
  margin-top: 5px;
  overflow: hidden;
}

.dropdown-container:hover .dropdown-content {
  display: block;
}

.dropdown-option {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
}

.dropdown-option:hover {
  background-color: #f1f5f9;
  color: #1e40af;
}

.dropdown-option i {
  margin-right: 10px;
  width: 20px;
  text-align: center;
  color: #64748b;
}

.dropdown-content input[type="file"] {
  display: none;
}

.dropdown-btn .fa-caret-down {
  transition: transform 0.3s;
}

.dropdown-container:hover .dropdown-btn .fa-caret-down {
  transform: rotate(180deg);
}

#layerAccordion {
  position: absolute;
  top: 200px;
  left: 10px;
  z-index: 1000;
  flex-direction: column;
  width: 200px;
}

:root {
  --primary-color: #4361ee;
  --secondary-color: #3f37c9;
  --accent-color: #4895ef;
  --light-color: #f8f9fa;
  --dark-color: #212529;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 0;
  background-color: var(--light-color);
  color: var(--dark-color);
}

.main-navbar {
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem 2rem;
}

.sub-navbar {
  background-color: #f1f3f5;
  padding: 0.5rem 2rem;
  border-bottom: 1px solid #dee2e6;
}

.navbar-brand {
  font-weight: bold;
  color: var(--primary-color);
}

.navbar-nav .nav-link {
  color: var(--dark-color);
  margin-left: 1rem;
}

.controls {
  background-color: white;
  border-right: 1px solid #dee2e6;
  height: calc(100vh - 100px);
  overflow-y: auto;
  padding: 2rem;
}

.map-area {
  background-color: white;
  height: calc(100vh - 100px);
  overflow-y: auto;
  padding: 2rem;
}

.table-section {
  background-color: white;
  border-top: 1px solid #dee2e6;
  padding: 2rem;
}

.form-check-label {
  margin-left: 0.5rem;
}

.btn-custom {
  background-color: var(--primary-color);
  color: white;
  border: none;
  margin-top: 1rem;
  padding: 0.5rem;
  border-radius: 0.25rem;
}

.btn-custom:hover {
  background-color: var(--secondary-color);
}

.form-control {
  margin-bottom: 1rem;
}

.form-select {
  margin-bottom: 1rem;
}

.card {
  margin-bottom: 1rem;
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.card-header {
  background-color: white;
  border-bottom: 1px solid #dee2e6;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background-color: #f2f2f2;
}

.col-md-6 {
  flex: 0 0 auto;
  width: 100%; 
}

.map-video-wrapper {
  height: 100%; 
  display: flex; 
  flex-direction: column;
}

.map-container {
  flex: 1;
}

#map-video-container {
  display: none; 
  flex-direction: column;
}

#video-container {
  padding: 10px; 
  border-top: 1px solid #ccc; 
  display: none;
}
.nav-link.active {
    color: #0d6efd !important;  /* Bleu Bootstrap */
    font-weight: bold;
  }
    </style>
</head>

<body>


    <!-- Barre de navigation principale -->
    <nav class="navbar navbar-expand-lg navbar-light main-navbar">
        <div class="container-fluid">
            <a class="navbar-brand" href="#">Logo</a>
            <div class="d-flex">
                <ul class="navbar-nav">
                    <li class="nav-item">
                        <a class="nav-link" href="#"><i class="fa fa-bell"></i></a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="#"><i class="fa fa-user"></i></a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>


<!-- Barre d'onglets -->
<nav class="navbar navbar-expand-lg navbar-light sub-navbar">
  <div class="container-fluid">
    <ul class="navbar-nav me-auto" role="tablist">
      <li class="nav-item">
        <a class="nav-link active " data-bs-toggle="tab" href="#tab-controles">Contrôles</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-bs-toggle="tab" href="#tab-dashboard">Tableau de Bord</a>
      </li>
      <li class="nav-item">
        <a class="nav-link" data-bs-toggle="tab" href="#tab-import">Outils</a>
      </li>
      
    </ul>
  </div>
</nav>

<!-- Contenu principal -->
<div class="container-fluid">
  <div class="row">
    <!-- Colonne gauche : contenu des onglets -->
    <div class="col-md-4 controls p-4 bg-light">
      <div class="tab-content">
        <div class="tab-pane fade show active" id="tab-controles">
          <!-- Ton contenu Contrôles ici -->

           <h2 class="mb-4">🛠️ Contrôles</h2>

        <!-- Filtres par type -->
        <div class="card mb-4 shadow-sm">
          <div class="card-header bg-primary text-white">
            <strong>Filtrer par type de géométrie</strong>
          </div>
          <div class="card-body">
            <!-- Checkboxes -->
            <div class="form-check form-check-inline">
              <input class="form-check-input filter-type" type="checkbox" id="filter-point" value="ST_Point">
              <label class="form-check-label" for="filter-point">Points</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input filter-type" type="checkbox" id="filter-line" value="ST_LineString">
              <label class="form-check-label" for="filter-line">Lignes</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input filter-type" type="checkbox" id="filter-polygon" value="ST_Polygon">
              <label class="form-check-label" for="filter-polygon">Polygones</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input filter-type" type="checkbox" id="filter-multipolygon" value="ST_MultiPolygon">
              <label class="form-check-label" for="filter-multipolygon">MultiPolygones</label>
            </div>
          </div>
        </div>

        <!-- Modification -->
        <div class="card mb-4 shadow-sm">
          <div class="card-header bg-primary text-white">
            <strong>Modifier un élément</strong>
          </div>
          <div class="card-body">
            <div class="mb-3">
              <label for="feature-select" class="form-label">Élément à modifier :</label>
              <select id="feature-select" class="form-select">
                <option value="">-- Veuillez sélectionner --</option>
              </select>
            </div>

            <div class="mb-3">
              <label for="feature-name" class="form-label">Nom de l'élément :</label>
              <input type="text" id="feature-name" class="form-control" placeholder="Entrez le nouveau nom" disabled>
            </div>

            <div class="mb-3" id="point-coords-container" style="display: none;">
              <label class="form-label">Coordonnées du point :</label>
              <div id="point-coords" class="form-control bg-light text-muted">Non sélectionné</div>
            </div>

            <button id="edit-geometry-btn" class="btn btn-outline-warning w-100 mb-2" style="display:none;">
              <i class="fa fa-edit"></i> Modifier la forme
            </button>

            <button id="save-feature-btn" class="btn btn-secondary w-100" disabled>
              <i class="fa fa-save me-2"></i> Enregistrer les modifications
            </button>

            <div id="save-status" class="mt-3 text-center text-info small"></div>
          </div>
        </div>

        <!-- Recherche -->
        <div class="card mb-4 shadow-sm">
          <div class="card-header bg-primary text-white">
            <strong>🔍 Rechercher un lieu</strong>
          </div>
          <div class="card-body">
            <label for="location-select" class="form-label">Sélectionnez un lieu :</label>

            <div id="table-filters" class="mb-2">
              <label class="me-2"><input type="checkbox" class="filter-table" value="ST_Point"> Point</label>
              <label class="me-2"><input type="checkbox" class="filter-table" value="ST_LineString"> Ligne</label>
              <label class="me-2"><input type="checkbox" class="filter-table" value="ST_Polygon"> Polygone</label>
              <label><input type="checkbox" class="filter-table" value="ST_MultiPolygon"> MultiPolygone</label>
            </div>

            <div id="search-bar-container" style="display: none;">
              <select id="location-select" class="form-select" style="width: 100%"></select>
            </div>


            <button id="reset-map" class="btn btn-secondary w-100">
              <i class="fa fa-undo"></i> Réinitialiser la carte
            </button>
          </div>
        </div>
        </div>
        <div class="tab-pane fade" id="tab-dashboard">
          <!-- Ton contenu Tableau de bord ici -->
           <div class="container mt-4" id="dashboard">

                    <!-- Ligne 1 : Camembert par section -->
                    <div class="row mb-4">
                        <div class="col-md-12">
                        <div class="card dashboard-card shadow-sm">
                            <div class="card-header bg-primary text-white">
                            Répartition % par section
                            </div>
                            <div class="card-body">
                            <canvas id="sectionPie"></canvas>
                            </div>
                        </div>
                        </div>
                    </div>

                    <!-- Ligne 2 : Filtres + Camembert par équipe -->
                    <div class="row mb-4">
                        <div class="col-md-12">
                        <div class="card dashboard-card shadow-sm">
                            <div class="card-header bg-primary text-white">
                            Répartition des équipes par section sélectionnée
                            </div>
                            <div class="card-body">
                            <div class="row w-100">
                                <!-- Filtres par section -->
                                <div class="col-md-6">
                                <h6>Sections à inclure</h6>
                                <div id="sectionCheckboxes" style="max-height: 200px; overflow-y: auto;"></div>
                                </div>
                                <!-- Camembert par équipe -->
                                <div class="col-md-6 text-center">
                                <canvas id="pointsPieChart" ></canvas>
                                </div>
                            </div>
                            </div>
                        </div>
                        </div>
                    </div>

                    <!-- Ligne 3 : Histogramme superficie -->
                    <div class="row mb-4">
                        <div class="col-md-12"> 
                        <div class="card dashboard-card shadow-sm">
                            <div class="card-header bg-primary text-white">
                            Superficie totale par section (MultiPolygones)
                            </div>
                            <div class="card-body">
                            <canvas id="areaBarChart"></canvas>
                            </div>
                        </div>
                        </div>
                    </div>

        </div>


        </div>
        <div class="tab-pane fade" id="tab-import">
          <!-- Ton contenu Import ici -->
          <div class="card">
                    <div class="card-header d-flex align-items-center">
                        <i class="fa fa-tools me-2"></i>
                        <span>Outils</span>
                        
                    </div>
                    <div class="card-body">
                        <div class="d-grid gap-2">
                              
                             <button id="draw-select-btn" class="btn btn-outline-secondary">
                                <i class="fa fa-pencil mr-1"></i> Sélection (cercle / polygone)
                              </button>
                             <button class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#import-modal">
                            <i class="fa fa-download mr-1"></i> Importer les données
                          </button>

                        </div>
                    </div>
                </div>
          
           
        </div>
      <div class="card">

        <div id="results-container">
          <div id="radius-result-list"></div>

          
        </div>

  </div>
    

<!-- Modale Bootstrap contenant les inputs -->
<div class="modal fade" id="import-modal" tabindex="-1" aria-labelledby="importModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
    
      <div class="modal-header">
        <h5 class="modal-title" id="importModalLabel">
          <i class="fa fa-file-upload me-2"></i> Importer des données
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fermer"></button>
      </div>
      
      <div class="modal-body">
        <div class="mb-3">
          <label for="geojson-input" class="form-label">
            <i class="fa fa-file-code-o me-1"></i> GeoJSON (.geojson)
          </label>
          <input type="file" class="form-control" id="geojson-input" accept=".geojson,.json">
        </div>

        <div class="mb-3">
          <label for="shapefile-input" class="form-label">
            <i class="fa fa-file-archive-o me-1"></i> Shapefile (.zip)
          </label>
          <input type="file" class="form-control" id="shapefile-input" accept=".zip">
        </div>

        <div class="mb-3">
          <label for="excel-input" class="form-label">
            <i class="fa fa-file-excel-o me-1"></i> Excel (.xlsx)
          </label>
          <input type="file" class="form-control" id="excel-input" accept=".xlsx,.xls">
        </div>

        <div class="mb-3">
          <label for="kml-input" class="form-label">
            <i class="fa fa-globe me-1"></i> KML (.kml)
          </label>
          <input type="file" class="form-control" id="kml-input" accept=".kml">
        </div>

        <div class="mb-3">
          <label for="raster-input" class="form-label">
            <i class="fa fa-picture-o me-1"></i> Image Raster (.jpg, .png)
          </label>
          <input type="file" class="form-control" id="raster-input" accept=".jpg,.jpeg,.png,.tif,.geotiff">
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fermer</button>
      </div>

    </div>
  </div>
</div>



        
      </div>
    </div>

    <!-- Colonne droite : carte toujours visible -->
      <div class="col-md-8 map-area p-4">
          <div class="map-video-wrapper" style="height: 100%; display: flex; flex-direction: column;">
            <div id="map" class="map-container" style="flex: 1;"></div>

            <div id="map-video-container" style="display: none; flex-direction: column;">
              <div id="video-container" style="padding: 10px; border-top: 1px solid #ccc; display: none;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h4>Vidéo</h4>
                  <button onclick="fermerVideo()" style="margin-left: auto;">✖</button>
                </div>
                <iframe id="video-iframe" width="100%" height="300" src="" frameborder="0" allowfullscreen></iframe>
              </div>
            </div>
          </div>
      </div>


  </div>

  <!-- Tableau (peut aussi être déplacé dans un onglet si besoin) -->
  <div class="table-section p-4">
  
    <div id="geometry-table-container" style="display: none;">
      <table id="geometry-table" class="table">
        <thead>
          <tr>
            <th data-sort="nom">Nom</th>
            <th data-sort="type">Type</th>
            <th>Section</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </div>
</div>


 


  
<script>
window.lieuxData = <?= json_encode($lieux) ?>;

</script>
<script defer src="https://unpkg.com/leaflet/dist/leaflet.js">
   

</script>
<script src="https://unpkg.com/leaflet-editable@1.2.0/src/Leaflet.Editable.js"></script>
<!-- À la fin du body -->
<script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>

<script src="https://cdn.jsdelivr.net/npm/leaflet-draw@1.0.4/dist/leaflet.draw.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<!-- Ajoutez ces scripts dans votre head -->
 <!-- 1. Librairie JSZip version 2.6.1 (compatible avec shpwrite) -->
<!-- Dans le <head> ou avant votre script principal -->
<!-- Dans l'en-tête -->
<script src="https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.2/togeojson.min.js"></script>

<script src="
https://cdn.jsdelivr.net/npm/shp-write-update@2.0.1/shpwrite.min.js
"></script>
<script src="https://unpkg.com/shpjs@latest/dist/shp.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tokml/tokml.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<!-- Ajoute SheetJS et togeojson pour le support Excel et KML -->



<!-- Dans le <head> ou avant votre script principal -->
<script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

    <script>




</script>
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

<script src="https://d3js.org/d3.v7.min.js"></script>


<!-- GeoTIFF support -->
<script src="https://cdn.jsdelivr.net/npm/geotiff@2.0.4/dist-browser/geotiff.browser.min.js"></script>


<script src="https://unpkg.com/georaster-layer-for-leaflet/dist/georaster-layer-for-leaflet.min.js"></script>


<script src="js/map.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
