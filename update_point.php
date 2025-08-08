<?php
header('Content-Type: application/json');
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Chemin absolu garanti
$db_file = __DIR__ . '/includes/db.php';

if (!file_exists($db_file)) {
    echo json_encode([
        'success' => false,
        'message' => 'Fichier de configuration DB introuvable'
    ]);
    exit;
}

require_once $db_file;

try {
    // Vérification méthode POST
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception("Méthode non autorisée", 405);
    }

    // Validation des données
    $id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
    $nom = trim($_POST['nom'] ?? '');
    $lat = filter_input(INPUT_POST, 'lat', FILTER_VALIDATE_FLOAT);
    $lon = filter_input(INPUT_POST, 'lon', FILTER_VALIDATE_FLOAT);

    if (!$id || empty($nom) || $lat === false || $lon === false) {
        throw new Exception("Données invalides", 400);
    }

    // Connexion DB
    $conn = connectDB();
    if (!$conn) {
        throw new Exception("Connexion DB impossible");
    }

    // Requête sécurisée — mise à jour sur la table golfe
    $query = "UPDATE golfe SET nom = $1, geom = ST_SetSRID(ST_MakePoint($2, $3), 4326) WHERE id = $4";
    $result = pg_query_params($conn, $query, [$nom, $lon, $lat, $id]);

    if (!$result) {
        throw new Exception(pg_last_error($conn));
    }

    echo json_encode(['success' => true, 'message' => 'Mise à jour réussie']);

} catch (Exception $e) {
    http_response_code($e->getCode() ?: 500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn)) pg_close($conn);
}
?>
