<?php
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

$db_file = __DIR__ . '/includes/db.php';
if (!file_exists($db_file)) {
    echo json_encode(['success' => false, 'message' => 'Fichier de configuration DB introuvable']);
    exit;
}

require_once $db_file;

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
        case 'LineString':
            if (count($coordinates) < 2) {
                throw new Exception("LineString requiert au moins 2 points", 400);
            }
            $points = array_map(function($coord) {
                if (count($coord) < 2) {
                    throw new Exception("Coordonnées invalides", 400);
                }
                return $coord[0] . ' ' . $coord[1]; // lon lat
            }, $coordinates);
            return 'LINESTRING(' . implode(', ', $points) . ')';

        case 'Polygon':
            if (count($coordinates) === 0 || count($coordinates[0]) < 4) {
                throw new Exception("Polygon requiert au moins 4 points", 400);
            }
            $rings = [];
            foreach ($coordinates as $ring) {
                $points = array_map(function($coord) {
                    if (count($coord) < 2) {
                        throw new Exception("Coordonnées invalides", 400);
                    }
                    return $coord[0] . ' ' . $coord[1]; // lon lat
                }, $ring);
                // Fermer la boucle du polygone si nécessaire
                if ($ring[0] !== end($ring)) {
                    $points[] = $ring[0][0] . ' ' . $ring[0][1];
                }
                $rings[] = '(' . implode(', ', $points) . ')';
            }
            return 'POLYGON(' . implode(', ', $rings) . ')';

        default:
            throw new Exception("Type de géométrie non supporté: $type", 400);
    }
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Méthode non autorisée", 405);
    }

    // Récupération des données
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        $data = $_POST;
    }

    $id = filter_var($data['id'] ?? null, FILTER_VALIDATE_INT);
    $nom = trim($data['nom'] ?? '');
    $geojson = $data['geojson'] ?? '';

    // Validation
    if (!$id || $id <= 0) throw new Exception("ID invalide", 400);
    if (empty($nom)) throw new Exception("Nom requis", 400);
    if (empty($geojson)) throw new Exception("GeoJSON requis", 400);

    // Conversion GeoJSON vers WKT avec validation robuste
    $wkt = convertGeoJsonToWkt($geojson);

    // Connexion à la base de données
    $conn = connectDB();
    if (!$conn) {
        throw new Exception("Connexion DB échouée", 500);
    }

    // Requête SQL : ici on cible la table golfe
    $query = "UPDATE golfe 
              SET nom = $1, 
                  geom = ST_SetSRID(ST_GeomFromText($2), 4326)
              WHERE id = $3
              RETURNING id";

    $params = [$nom, $wkt, $id];
    $result = pg_query_params($conn, $query, $params);

    if (!$result) {
        throw new Exception("Erreur SQL: " . pg_last_error($conn), 500);
    }

    if (pg_num_rows($result) === 0) {
        throw new Exception("Aucun enregistrement mis à jour - ID $id non trouvé", 404);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Géométrie mise à jour avec succès',
        'wkt' => $wkt // Pour debug éventuel
    ]);

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'error_code' => $e->getCode()
    ]);
} finally {
    if (isset($conn)) pg_close($conn);
}
