<?php
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

require_once __DIR__ . '/includes/db.php';

function convertGeoJsonToWkt($geojson) {
    $data = json_decode($geojson, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception("GeoJSON invalide", 400);
    }

    $type = $data['type'] ?? null;
    $coordinates = $data['coordinates'] ?? null;

    if (!$type || !$coordinates) {
        throw new Exception("Structure GeoJSON invalide", 400);
    }

    switch ($type) {
        case 'Point':
            return 'POINT(' . $coordinates[0] . ' ' . $coordinates[1] . ')';
        case 'Polygon':
            $rings = array_map(function($ring) {
                $points = array_map(fn($c) => "$c[0] $c[1]", $ring);
                if ($ring[0] !== end($ring)) {
                    $points[] = $ring[0][0] . ' ' . $ring[0][1];
                }
                return '(' . implode(', ', $points) . ')';
            }, $coordinates);
            return 'POLYGON(' . implode(', ', $rings) . ')';
        case 'LineString':
            $points = array_map(fn($c) => "$c[0] $c[1]", $coordinates);
            return 'LINESTRING(' . implode(', ', $points) . ')';
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

    if (empty($input['geojson'])) throw new Exception("Géométrie manquante", 400);
    $wkt = convertGeoJsonToWkt($input['geojson']);

    $nom = trim($input['nom'] ?? '');
    if (empty($nom)) throw new Exception("Nom manquant", 400);

    $section = trim($input['section'] ?? '');
    if (empty($section)) throw new Exception("Section manquante", 400);

    $conn = connectDB();
    if (!$conn) throw new Exception("Connexion échouée", 500);

    $query = "
        INSERT INTO golfe (nom, section, geom)
        VALUES ($1, $2, ST_SetSRID(ST_GeomFromText($3), 4326))
        RETURNING id
    ";
    $params = [$nom, $section, $wkt];

    $result = pg_query_params($conn, $query, $params);
    if (!$result) throw new Exception("Erreur SQL: " . pg_last_error($conn), 500);

    $row = pg_fetch_assoc($result);
    echo json_encode(['success' => true, 'message' => 'Enregistrement réussi', 'id' => $row['id']]);

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) pg_close($conn);
}
