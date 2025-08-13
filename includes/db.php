<?php



function connectDB() {
    $db_url = getenv("DATABASE_URL");

    if ($db_url) {
        $parts = parse_url($db_url);
        $host = $parts['host'];
        $port = $parts['port'];
        $user = $parts['user'];
        $pass = $parts['pass'];
        $dbname = ltrim($parts['path'], '/');
    } else {
        $host = "localhost";
        $port = "5433";
        $dbname = "geodb";
        $user = "postgres";
        $pass = "root";
    }

    $conn_string = "host=$host port=$port dbname=$dbname user=$user password=$pass";
    $conn = pg_connect($conn_string);

    if (!$conn) {
        error_log("Connexion échouée : " . pg_last_error());
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