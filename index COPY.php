<?php
include('includes/db.php');

$conn = connectDB();
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
pg_close($conn);
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Géovisualisation des données géographiques</title>
    
    <!-- CSS Libraries -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet-draw@1.0.4/dist/leaflet.draw.css" />
    
    <style>
        :root {
            --primary-color: #4361ee;
            --secondary-color: #3f37c9;
            --accent-color: #4895ef;
            --light-color: #f8f9fa;
            --dark-color: #212529;
            --sidebar-width: 380px;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f7fa;
            color: var(--dark-color);
            height: 100vh;
            overflow: hidden;
        }

        #app-container {
            display: flex;
            height: 100vh;
        }

        /* Sidebar */
        #sidebar {
            width: var(--sidebar-width);
            background: white;
            border-right: 1px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            transition: all 0.3s ease;
            box-shadow: 2px 0 10px rgba(0,0,0,0.05);
            z-index: 10;
        }

        .sidebar-header {
            padding: 1.25rem;
            border-bottom: 1px solid #e2e8f0;
            background: var(--primary-color);
            color: white;
        }

        .sidebar-content {
            flex: 1;
            overflow-y: auto;
            padding: 1.25rem;
        }

        /* Main Content */
        #main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* Map Container */
        #map-container {
            flex: 1;
            position: relative;
            background: #e2e8f0;
        }

        #map {
            height: 100%;
            width: 100%;
        }

        /* Table Container */
        #table-container {
            height: 300px;
            border-top: 1px solid #e2e8f0;
            background: white;
            overflow: auto;
            transition: height 0.3s ease;
        }

        #table-container.collapsed {
            height: 40px;
        }

        .table-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1.25rem;
            background: white;
            border-bottom: 1px solid #e2e8f0;
            cursor: pointer;
        }

        /* Cards */
        .card {
            border: none;
            border-radius: 0.5rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            margin-bottom: 1.25rem;
            overflow: hidden;
        }

        .card-header {
            background-color: white;
            padding: 0.75rem 1.25rem;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 600;
        }

        .card-body {
            padding: 1.25rem;
        }

        /* Form Elements */
        .form-control, .form-select {
            border-radius: 0.375rem;
            border: 1px solid #e2e8f0;
            padding: 0.5rem 0.75rem;
            font-size: 0.875rem;
        }

        .form-check-input:checked {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }

        /* Buttons */
        .btn {
            border-radius: 0.375rem;
            font-weight: 500;
            padding: 0.5rem 1rem;
            font-size: 0.875rem;
        }

        .btn-primary {
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }

        .btn-primary:hover {
            background-color: var(--secondary-color);
            border-color: var(--secondary-color);
        }

        /* Map Controls */
        .map-controls {
            position: absolute;
            top: 1rem;
            right: 1rem;
            z-index: 1000;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .control-btn {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
            border-radius: 50%;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            cursor: pointer;
            color: var(--dark-color);
            border: none;
        }

        .control-btn:hover {
            background: #f8f9fa;
        }

        /* Table */
        #geometry-table {
            width: 100%;
            border-collapse: collapse;
        }

        #geometry-table th, #geometry-table td {
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
        }

        #geometry-table th {
            background-color: #f8f9fa;
            font-weight: 600;
            position: sticky;
            top: 0;
        }

        #geometry-table tr:hover {
            background-color: #f8f9fa;
        }

        /* Responsive */
        @media (max-width: 992px) {
            #app-container {
                flex-direction: column;
            }
            
            #sidebar {
                width: 100%;
                height: auto;
                max-height: 50vh;
            }
        }

        /* Custom scrollbar */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        ::-webkit-scrollbar-track {
            background: #f1f1f1;
        }

        ::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
    </style>
</head>

<body>
    <div id="app-container">
        <!-- Sidebar -->
        <div id="sidebar">
            <div class="sidebar-header">
                <h5 class="mb-0"><i class="fas fa-map-marked-alt me-2"></i>Géovisualisation</h5>
            </div>
            
            <div class="sidebar-content">
                <!-- Filtres -->
                <div class="card">
                    <div class="card-header d-flex align-items-center">
                        <i class="fas fa-filter me-2"></i>
                        <span>Filtres</span>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label class="form-label">Type de géométrie</label>
                            <div class="d-flex flex-wrap gap-2">
                                <div class="form-check">
                                    <input class="form-check-input filter-type" type="checkbox" id="filter-point" value="ST_Point">
                                    <label class="form-check-label" for="filter-point">Points</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input filter-type" type="checkbox" id="filter-line" value="ST_LineString">
                                    <label class="form-check-label" for="filter-line">Lignes</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input filter-type" type="checkbox" id="filter-polygon" value="ST_Polygon">
                                    <label class="form-check-label" for="filter-polygon">Polygones</label>
                                </div>
                                <div class="form-check">
                                    <input class="form-check-input filter-type" type="checkbox" id="filter-multipolygon" value="ST_MultiPolygon">
                                    <label class="form-check-label" for="filter-multipolygon">MultiPolygones</label>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-3">
                            <label for="location-search" class="form-label">Rechercher un lieu</label>
                            <div class="input-group">
                                <input type="text" id="location-search" class="form-control" placeholder="Nom du lieu...">
                                <button class="btn btn-outline-secondary" type="button">
                                    <i class="fas fa-search"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Édition -->
                <div class="card">
                    <div class="card-header d-flex align-items-center">
                        <i class="fas fa-edit me-2"></i>
                        <span>Édition</span>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <label for="feature-select" class="form-label">Élément sélectionné</label>
                            <select id="feature-select" class="form-select">
                                <option value="">-- Sélectionnez un élément --</option>
                            </select>
                        </div>
                        
                        <div class="mb-3">
                            <label for="feature-name" class="form-label">Nom</label>
                            <input type="text" id="feature-name" class="form-control" placeholder="Nom de l'élément" disabled>
                        </div>
                        
                        <div class="d-grid gap-2">
                            <button id="edit-geometry-btn" class="btn btn-warning" disabled>
                                <i class="fas fa-edit me-1"></i> Modifier la géométrie
                            </button>
                            <button id="save-feature-btn" class="btn btn-success" disabled>
                                <i class="fas fa-save me-1"></i> Enregistrer
                            </button>
                        </div>
                        
                        <div id="save-status" class="mt-2 text-center small text-muted"></div>
                    </div>
                </div>
                
                <!-- Outils -->
                <div class="card">
                    <div class="card-header d-flex align-items-center">
                        <i class="fas fa-tools me-2"></i>
                        <span>Outils</span>
                    </div>
                    <div class="card-body">
                        <div class="d-grid gap-2">
                            <button id="reset-map" class="btn btn-outline-secondary">
                                <i class="fas fa-sync-alt me-1"></i> Réinitialiser la vue
                            </button>
                            <button class="btn btn-outline-primary" data-bs-toggle="modal" data-bs-target="#export-modal">
                                <i class="fas fa-download me-1"></i> Exporter les données
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Main Content -->
        <div id="main-content">
            <!-- Map -->
            <div id="map-container">
                <div id="map"></div>
                
                <!-- Map Controls -->
                <div class="map-controls">
                    <button class="control-btn" title="Plein écran" id="fullscreen-btn">
                        <i class="fas fa-expand"></i>
                    </button>
                    <button class="control-btn" title="Localisation" id="locate-btn">
                        <i class="fas fa-location-arrow"></i>
                    </button>
                    <button class="control-btn" title="Mesure" id="measure-btn">
                        <i class="fas fa-ruler"></i>
                    </button>
                </div>
            </div>
            
            <!-- Table -->
            <div id="table-container">
                <div class="table-toggle" id="table-toggle">
                    <span><i class="fas fa-table me-2"></i>Tableau des éléments</span>
                    <i class="fas fa-chevron-up"></i>
                </div>
                
                <div class="p-3">
                    <table id="geometry-table" class="w-100">
                        <thead>
                            <tr>
                                <th data-sort="nom">Nom</th>
                                <th data-sort="type">Type</th>
                                <th>Coordonnées</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Export Modal -->
    <div class="modal fade" id="export-modal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="fas fa-download me-2"></i>Exporter les données</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-3">
                        <label class="form-label">Format d'export</label>
                        <select class="form-select" id="export-format">
                            <option value="geojson">GeoJSON</option>
                            <option value="kml">KML</option>
                            <option value="shp">Shapefile</option>
                            <option value="csv">CSV</option>
                            <option value="excel">Excel</option>
                        </select>
                    </div>
                    
                    <div class="mb-3">
                        <label class="form-label">Étendue</label>
                        <select class="form-select" id="export-extent">
                            <option value="all">Tous les éléments</option>
                            <option value="visible">Éléments visibles</option>
                            <option value="selected">Élément sélectionné</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuler</button>
                    <button type="button" class="btn btn-primary" id="export-btn">Exporter</button>
                </div>
            </div>
        </div>
    </div>

    <!-- JavaScript Libraries -->
    <script>
        window.lieuxData = <?= json_encode($lieux) ?>;
    </script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet-editable@1.2.0/src/Leaflet.Editable.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/leaflet-draw@1.0.4/dist/leaflet.draw.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mapbox/togeojson@0.16.2/togeojson.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/shp-write-update@2.0.1/shpwrite.min.js"></script>
    <script src="https://unpkg.com/shpjs@latest/dist/shp.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/tokml/tokml.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- Main JS -->
    <script src="js/map.js"></script>
    
    <script>
        // Toggle table visibility
        document.getElementById('table-toggle').addEventListener('click', function() {
            const tableContainer = document.getElementById('table-container');
            const icon = this.querySelector('i.fa-chevron-up');
            
            tableContainer.classList.toggle('collapsed');
            icon.classList.toggle('fa-chevron-up');
            icon.classList.toggle('fa-chevron-down');
        });
        
        // Fullscreen functionality
        document.getElementById('fullscreen-btn').addEventListener('click', function() {
            const elem = document.getElementById('map-container');
            
            if (!document.fullscreenElement) {
                elem.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                });
            } else {
                document.exitFullscreen();
            }
        });
    </script>
</body>
</html>