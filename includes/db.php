<?php
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
}
?>