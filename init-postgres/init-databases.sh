#!/bin/bash
set -e

echo "Creating additional PostgreSQL databases..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE auth_db;
    CREATE DATABASE search_db;
    CREATE DATABASE order_db;
    CREATE DATABASE payment_db;
    CREATE DATABASE wallet_db;
EOSQL

echo "All databases created successfully!"
