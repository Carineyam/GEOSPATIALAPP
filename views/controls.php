
<div id="map-video-container" style="display: none; flex-direction: column;">

  <div id="video-container" style=" padding: 10px; border-left: 1px solid #ccc; display:none;">
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <h4>Vidéo</h4>
      <button onclick="fermerVideo()" style="margin-left: auto;">✖</button>
    </div>
    <iframe id="video-iframe" width="100%" height="300" src="" frameborder="0" allowfullscreen></iframe>
  </div>
</div>


<div id="controls-container" class="p-3">
  <h2>Contrôles</h2>

  <!-- ✅ Filtres géométrie -->
  <div class="mb-3">
    <label class="form-label">Filtrer par type :</label>
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
      <label class="form-check-label" for="filter-multipolygon">MultiPolygon</label>
    </div>
  </div>

  <!-- 🔍 Recherche -->
  <label for="location-select" class="form-label">Recherchez un lieu :</label>

  <!-- ✅ Groupe de filtres pour le tableau -->
  <div id="table-filters" class="mb-2">
    <label><input type="checkbox" class="filter-table" value="ST_Point"> Point</label>
    <label><input type="checkbox" class="filter-table" value="ST_LineString"> Ligne</label>
    <label><input type="checkbox" class="filter-table" value="ST_Polygon"> Polygone</label>
    <label><input type="checkbox" class="filter-table" value="ST_MultiPolygon"> MultiPolygone</label>
  </div>

  <!-- Barre de recherche (Select2 ou autre) -->
  <div id="search-bar-container" style="display: none;">
    <select id="location-select" class="form-select" style="width: 100%"></select>
  </div>

  <!-- 📊 Tableau de données -->
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

  <!-- 🔄 Bouton de réinitialisation -->
  <button id="reset-map" class="btn btn-secondary w-100 mt-3">Réinitialiser la carte</button>
</div>
