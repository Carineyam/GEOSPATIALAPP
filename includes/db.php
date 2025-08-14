<?php



function connectDB() {
    $db_url = getenv("DATABASE_URL");

    if (!$db_url) {
        die("DATABASE_URL non défini.");
    }

    // Parse l'URL
    $dbopts = parse_url($db_url);

    $conn_string = "host=$host port=$port dbname=$dbname user=$user password=$pass";

    $host = $dbopts["host"];
    $port = $dbopts["port"];
    $user = $dbopts["user"];
    $pass = $dbopts["pass"];
    $dbname = ltrim($dbopts["path"], '/'); // retire le / devant le nom de la DB

    $db = pg_connect($conn_string);

    if (!$db) {
        die("Erreur de connexion à la base PostgreSQL");
    }

    return $db;
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