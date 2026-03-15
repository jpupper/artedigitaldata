#!/bin/bash

# 1. LIMPIEZA DE CARACTERES ESPECIALES (CRLF) - Crucial para que no se rompa la URL de Git
sed -i 's/\r$//' .env 2>/dev/null
sed -i 's/\r$//' deploy_scripts/server_update.sh 2>/dev/null

# 2. CARGAR VARIABLES DESDE .ENV
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

# Configuracion
TOKEN=${GITHUB_TOKEN:-""}
REPO=${GITHUB_REPO:-"jpupper/artedigitaldata"}
# Limpiar posibles saltos de linea en las variables
TOKEN=$(echo $TOKEN | tr -d '\r')
REPO=$(echo $REPO | tr -d '\r')

REPO_URL="https://$TOKEN@github.com/$REPO"
APP_NAME="artedigitaldata"

echo "------------------------------------------------"
echo "INICIANDO DEPLOY INTEGRAL: $APP_NAME"
echo "------------------------------------------------"

# 3. ACTUALIZACION DE GIT
if [ ! -d ".git" ]; then
    echo "No se detecto Git. Inicializando..."
    git init
    git remote add origin "$REPO_URL"
    git fetch origin main
    git checkout -f main
    git branch --set-upstream-to=origin/main main
else
    echo "Repositorio detectado. Actualizando..."
    git remote set-url origin "$REPO_URL"
    git fetch origin main
    git reset --hard origin/main
fi

# 4. INSTALACION DE DEPENDENCIAS (Incluyendo devDeps para compilar)
echo "npm install..."
npm install

# 5. COMPILAR PROYECTO
echo "Compilando TypeScript..."
npm run build

# 6. REINICIO O INICIO DE PM2
echo "Gestionando PM2..."
# Intentamos reiniciar, si falla, iniciamos de cero
pm2 restart "$APP_NAME" || pm2 start server.js --name "$APP_NAME"
pm2 save

echo "------------------------------------------------"
echo "DEPLOY FINALIZADO CON EXITO EN EL VPS"
echo "------------------------------------------------"
pm2 list
echo "------------------------------------------------"
