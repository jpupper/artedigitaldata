@echo off
setlocal enabledelayedexpansion

:: Cargar variables desde .env
if exist "%~dp0..\.env" (
    for /f "usebackq tokens=1,* delims==" %%i in ("%~dp0..\.env") do (
        set "var=%%i"
        if not "!var:~0,1!"=="#" (
            set "%%i=%%j"
        )
    )
)

echo ===================================================
echo Iniciando proceso COMPLETO de Deploy - Arte Digital Data
echo ===================================================

echo.
echo [1/2] DESPLEGANDO EN EL VPS (!VPS_HOST!) POR SSH...
echo Primero actualizamos desde Github y luego corremos el script en el VPS.
echo.
ssh -p !VPS_PORT! !VPS_USER!@!VPS_HOST! "cd artedigitaldata && (git remote get-url origin | tr -d '\r' | xargs git remote set-url origin) && echo 'Bajandocambios al VPS...' && git fetch origin main && git reset --hard origin/main && echo 'Corriendo el deploy de backend...' && bash deploy_scripts/server_update.sh"

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
