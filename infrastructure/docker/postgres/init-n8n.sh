#!/bin/sh
set -eu

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 <<'SQL'
\getenv n8n_user N8N_DB_USER
\getenv n8n_password N8N_DB_PASSWORD
\getenv n8n_database N8N_DB_NAME
SET log_statement = 'none';
SET log_min_error_statement = 'panic';
CREATE ROLE :"n8n_user" LOGIN PASSWORD :'n8n_password';
CREATE DATABASE :"n8n_database" OWNER :"n8n_user";
SQL
