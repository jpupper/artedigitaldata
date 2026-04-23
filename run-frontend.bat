@echo off
echo ===================================================
echo  Arte Digital Data - Frontend (back remoto VPS)
echo ===================================================
echo.
echo Los datos se cargan desde: https://vps-4455523-x.dattaweb.com
echo.

where npx >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado. Descargalo en https://nodejs.org
    pause
    exit /b 1
)

echo Sirviendo carpeta public en http://localhost:3000/
echo Presiona Ctrl+C para detener.
echo.
npx serve public -p 3000
pause
