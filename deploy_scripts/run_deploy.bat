@echo off
setlocal enabledelayedexpansion

:: Limpiar variables previas para evitar conflictos
set GITHUB_TOKEN=
set GITHUB_REPO=

:: Cargar variables desde .env usando PowerShell para evitar problemas de CRLF/espacios
set "ENV_FILE=%~dp0..\.env"
if exist "%ENV_FILE%" (
    for /f "tokens=*" %%a in ('powershell -Command "Get-Content '%ENV_FILE%' | Where-Object { $_ -match '=' -and -not $_.StartsWith('#') } | ForEach-Object { $_.Trim() }"') do (
        set "%%a"
    )
)

echo ===================================================
echo Iniciando proceso COMPLETO de Deploy - Arte Digital Data
echo ===================================================

echo.
echo [1/2] DESPLEGANDO EN EL VPS (!VPS_HOST!) POR SSH...
echo Primero actualizamos desde Github y luego corremos el script en el VPS.
echo.
:: Construir la URL completa para forzarla en el VPS
set "REPO_URL=https://!GITHUB_TOKEN!@github.com/!GITHUB_REPO!"

ssh -p !VPS_PORT! !VPS_USER!@!VPS_HOST! "mkdir -p artedigitaldata && cd artedigitaldata && git remote set-url origin !REPO_URL! 2>/dev/null || (git init && git remote add origin !REPO_URL!) && echo 'Bajando cambios al VPS...' && git fetch origin main && git reset --hard origin/main && echo 'Corriendo el deploy de backend...' && bash deploy_scripts/server_update.sh"

echo.
echo [2/2] SUBIENDO ARCHIVOS DE FRONTEND AL FTP (!FTP_HOST!)...
node "%~dp0upload_ftp.js"
if %ERRORLEVEL% neq 0 (
    echo Error al subir archivos por FTP. Revisa la consola.
    pause
    exit /b
)

echo.
echo ===================================================
echo El proceso de deploy de Arte Digital Data ha finalizado!
echo VPS y FTP estan completamente actualizados.
echo ===================================================
pause
