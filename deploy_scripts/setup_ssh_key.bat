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
echo [1/2] CONFIGURACION DE CLAVE SSH (Solo 1 vez en la vida)
echo ===================================================
echo.
echo Vamos a generar una llave de seguridad para que nunca mas
echo tengas que poner contrasena al VPS.
echo.

if not exist "%USERPROFILE%\.ssh\id_rsa" (
    echo Generando una nueva llave SSH en tu PC...
    ssh-keygen -t rsa -b 4096 -N "" -f "%USERPROFILE%\.ssh\id_rsa"
) else (
    echo Ya existe una llave SSH generada en tu sistema!
)

echo.
echo ===================================================
echo [2/2] PASANDO LA LLAVE AL VPS
echo ===================================================
echo ATENCION: Por ultima vez, la consola te pedira la contrasena del VPS.
echo.
if not "!VPS_PASS!"=="" (
    echo Copia esta clave para pegarla abajo: !VPS_PASS!
) else (
    echo (Asegurate de tener la contrasena del VPS a mano)
)
echo.

type "%USERPROFILE%\.ssh\id_rsa.pub" | ssh -p !VPS_PORT! !VPS_USER!@!VPS_HOST! "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"

echo.
echo ===================================================
echo LISTO! Configuracion SSH Terminada.
echo ===================================================
pause
