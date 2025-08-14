<?php



function connectDB() {
    // Vérifie si DATABASE_URL est défini (Render ou autre cloud)
    $db_url = getenv("DATABASE_URL");

    if ($db_url) {
        // Render ou autre cloud
        $parts = parse_url($db_url);
        $host = $parts['host'];
        $port = $parts['port'];
        $user = $parts['user'];
        $pass = $parts['pass'];
        $dbname = ltrim($parts['path'], '/');
    } else {
        // Environnement local ou Render sans DATABASE_URL
        $host = "dpg-d2eq2ubipnbc73a9uivg-a"; // Render host
        $port = "5432";
        $dbname = "postdb_p1cz";             // Nom de la base sur Render
        $user = "postdb_p1cz_user";          // Username fourni par Render
        $pass = "wErviSabwVKoi0LLuQQ8S2A4WIcRnT8G"; // Password fourni par Render
    }

    // Connexion PostgreSQL
    $conn_string = "host=$host port=$port dbname=$dbname user=$user password=$pass";
    $conn = pg_connect($conn_string);

    if (!$conn) {
        error_log("❌ Connexion échouée à PostgreSQL sur $host:$port/$dbname avec $user");
        return false;
    }

    return $conn;
}

/***************************** */
/*
function connectDB() {
    $host = "localhost";
    $port = "5433";
    $dbname = "geodb";
    $user = "postgres";
    $password = "root";
    
    $conn_string = "host=$host port=$port dbname=$dbname user=$user password=$password";
    $conn = pg_connect($conn_string);
    
    if (!$conn) {
        error_log("Échec de connexion à PostgreSQL: " . pg_last_error());
        return false;
    }
    
    return $conn;
}*/
?>