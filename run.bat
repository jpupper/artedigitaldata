@echo off
set PORT=2495
echo ===================================================
echo Iniciando Arte Digital Data (modo desarrollo)...
echo ===================================================

:: Primero intentamos cerrar procesos en el puerto con un metodo mas agresivo
echo Verificando puerto %PORT%...
powershell -Command "$pids = Get-NetTCPConnection -LocalPort %PORT% -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess; if ($pids) { foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host \"Proceso $p cerrado en puerto %PORT%\" } } else { Write-Host \"No se encontraron procesos activos en el puerto %PORT%\" }"

:: Un pequeño delay para que Windows libere el puerto realmente
timeout /t 2 /nobreak > nul

echo.
echo Servidor: http://localhost:%PORT%/artedigitaldata/
echo.

:: Ejecutar nodemon
npx nodemon --exec "npx ts-node --transpile-only" server.ts --ext ts
pause
