#!/bin/bash

# 1. CARGAR VARIABLES DESDE .ENV
if [ -f .env ]; then
    # Lee el archivo .env, ignora comentarios y lineas vacias, y exporta las variables
    export $(grep -v '^#' .env | xargs)
fi

# 2. SOLUCION AL ERROR DE WINDOWS (CRLF to LF)
sed -i 's/\r$//' deploy_scripts/server_update.sh 2>/dev/null

# Configuracion
# Si no estan en .env, usara estos por defecto (aunque lo ideal es que esten en .env)
TOKEN=${GITHUB_TOKEN:-""}
REPO=${GITHUB_REPO:-"jpupper/artedigital"}
REPO_URL="https://$TOKEN@github.com/$REPO"
APP_NAME="artedigital"

echo "------------------------------------------------"
echo "INICIANDO DEPLOY INTEGRAL: $APP_NAME"
echo "------------------------------------------------"

# 2. INICIALIZACION O ACTUALIZACION DE GIT
if [ ! -d ".git" ]; then
    echo "No se detecto Git. Inicializando repositorio..."
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

# 3. INSTALACION DE DEPENDENCIAS
echo "npm install..."
npm install --production

# 4. COMPILAR TYPESCRIPT
echo "Compilando TypeScript..."
npx tsc

# 5. REINICIO DE PM2
echo "Reiniciando PM2..."
pm2 restart "$APP_NAME" || pm2 start server.js --name "$APP_NAME"
pm2 save

echo "------------------------------------------------"
echo "DEPLOY FINALIZADO CON EXITO EN EL VPS"
echo "------------------------------------------------"
echo "ESTADO DE LAS APLICACIONES PM2:"
pm2 list
echo "------------------------------------------------"
