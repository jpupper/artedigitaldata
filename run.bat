@echo off
echo ===================================================
echo Iniciando Arte Digital Data (modo desarrollo)...
echo ===================================================
echo.
echo Servidor: http://localhost:2495/artedigital/
echo.
npx nodemon --exec "npx ts-node" server.ts --ext ts
pause
