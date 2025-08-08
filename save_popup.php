<?php
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/includes/db.php'; // Adapter ce chemin selon ton projet
file_put_contents(__DIR__.'/debug_geojson.json', file_get_contents('php://input'));


function convertGeoJsonToWkt($geojson) {
    $data = json_decode($geojson, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("GeoJSON invalide", 400);
    }

    // Si c'est un Feature GeoJSON, extraire la géométrie
    if (isset($data['type']) && $data['type'] === 'Feature' && isset($data['geometry'])) {
        $data = $data['geometry'];
    }

    $type = $data['type'] ?? null;
    $coordinates = $data['coordinates'] ?? null;

    if (!$type || !$coordinates) {
        throw new Exception("Structure GeoJSON invalide", 400);
    }

    switch ($type) {
        case 'Point':
            return 'POINT(' . $coordinates[0] . ' ' . $coordinates[1] . ')';
        case 'LineString':
            $points = array_map(fn($c) => $c[0] . ' ' . $c[1], $coordinates);
            return 'LINESTRING(' . implode(', ', $points) . ')';
        case 'Polygon':
            $rings = array_map(function($ring) {
                $points = array_map(fn($c) => $c[0] . ' ' . $c[1], $ring);
                // Fermer l'anneau si ce n'est pas déjà fait
                if ($ring[0] !== end($ring)) {
                    $points[] = $ring[0][0] . ' ' . $ring[0][1];
                }
                return '(' . implode(', ', $points) . ')';
            }, $coordinates);
            return 'POLYGON(' . implode(', ', $rings) . ')';
        default:
            throw new Exception("Type de géométrie non supporté: $type", 400);
    }
}


try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Méthode non autorisée", 405);
    }

    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) throw new Exception("JSON invalide", 400);

    // Champs obligatoires
    if (empty($input['geojson'])) throw new Exception("Géométrie manquante", 400);
    if (empty($input['nom'])) throw new Exception("Nom manquant", 400);
    if (empty($input['section'])) throw new Exception("Section manquante", 400);

    $wkt = convertGeoJsonToWkt(json_encode($input['geojson'])); // convertGeoJsonToWkt attend une string JSON

    // Connexion à la base
    $conn = connectDB();
    if (!$conn) throw new Exception("Connexion échouée", 500);

    // Préparer la requête UPDATE si id existe, sinon INSERT (adapté selon ta logique)
    if (!empty($input['id'])) {
        // UPDATE
        $query = "
            UPDATE golfe SET
                nom = $1,
                section = $2,
                geom = ST_SetSRID(ST_GeomFromText($3), 4326)
            WHERE id = $4
            RETURNING id
        ";
        $params = [
            trim($input['nom']),
            trim($input['section']),
            $wkt,
            intval($input['id'])
        ];
    } else {
        // INSERT
        $query = "
            INSERT INTO golfe (nom, section, geom)
            VALUES ($1, $2, ST_SetSRID(ST_GeomFromText($3), 4326))
            RETURNING id
        ";
        $params = [
            trim($input['nom']),
            trim($input['section']),
            $wkt
        ];
    }

    $result = pg_query_params($conn, $query, $params);
    if (!$result) {
        throw new Exception("Erreur SQL: " . pg_last_error($conn), 500);
    }

    $row = pg_fetch_assoc($result);
    echo json_encode([
        'success' => true,
        'message' => 'Enregistrement réussi',
        'id' => $row['id']
    ]);

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) pg_close($conn);
}
