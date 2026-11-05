@echo off
setlocal EnableExtensions
rem ==================================================================
rem  Atajo para usar SonarQube con Atlas (Windows: PowerShell o CMD)
rem  Uso, desde la carpeta principal del proyecto:   .\sonar.cmd COMANDO
rem  Escribe  .\sonar.cmd help  para ver los comandos disponibles.
rem ==================================================================

set "DC=docker compose --env-file .env.sonar -f docker-compose.sonar.yml"
set "PORT=9000"

if not exist ".env.sonar" goto no_env

for /f "tokens=2 delims==" %%B in ('findstr /b "PORT_SONARQUBE=" .env.sonar') do set "PORT=%%B"

if "%~1"=="" goto help
if /i "%~1"=="up" goto up
if /i "%~1"=="scan" goto scan
if /i "%~1"=="scan-backend" goto scan_backend
if /i "%~1"=="scan-frontend" goto scan_frontend
if /i "%~1"=="status" goto status
if /i "%~1"=="logs" goto logs
if /i "%~1"=="stop" goto stop
if /i "%~1"=="down" goto down
if /i "%~1"=="reset" goto reset
goto help

:up
echo Iniciando SonarQube. La primera vez descarga imagenes y puede tardar varios minutos...
%DC% up -d
if errorlevel 1 goto fail
call :wait_ready
goto end

:scan
call :check_token
if errorlevel 1 goto end
echo.
echo === Analizando BACKEND ===
%DC% run --rm scanner-backend
echo.
echo === Analizando FRONTEND ===
%DC% run --rm scanner-frontend
echo.
echo Listo. Revisa los resultados en http://localhost:%PORT%/projects
goto end

:scan_backend
call :check_token
if errorlevel 1 goto end
echo === Analizando BACKEND ===
%DC% run --rm scanner-backend
echo.
echo Listo. Revisa los resultados en http://localhost:%PORT%/projects
goto end

:scan_frontend
call :check_token
if errorlevel 1 goto end
echo === Analizando FRONTEND ===
%DC% run --rm scanner-frontend
echo.
echo Listo. Revisa los resultados en http://localhost:%PORT%/projects
goto end

:status
%DC% ps
echo.
echo Estado de SonarQube (debe decir UP cuando esta listo):
curl -s http://localhost:%PORT%/api/system/status
echo.
goto end

:logs
echo Mostrando registros de SonarQube. Para salir presiona Ctrl + C.
%DC% logs -f sonarqube
goto end

:stop
%DC% stop
goto end

:down
%DC% down
goto end

:reset
echo Esto BORRA todos los datos de SonarQube: proyectos, resultados y contrasenas.
set /p CONFIRM=Escribe SI para continuar:
if /i not "%CONFIRM%"=="SI" goto cancelled
%DC% down -v
goto end

:cancelled
echo Cancelado. No se borro nada.
goto end

:help
echo.
echo Uso:  .\sonar.cmd COMANDO
echo.
echo   up             Enciende SonarQube y espera a que este listo
echo   scan           Analiza BACKEND y FRONTEND
echo   scan-backend   Analiza solo el BACKEND
echo   scan-frontend  Analiza solo el FRONTEND
echo   status         Muestra si SonarQube esta encendido y listo
echo   logs           Muestra los registros de SonarQube
echo   stop           Apaga SonarQube conservando los datos
echo   down           Elimina los contenedores, conserva los datos
echo   reset          Borra TODO (vuelve al estado inicial)
echo.
goto end

:no_env
echo [ERROR] No encuentro el archivo .env.sonar en esta carpeta.
echo         Ejecuta este script desde la carpeta principal del proyecto.
exit /b 1

:fail
echo [ERROR] Docker no pudo completar la operacion.
echo         Revisa que Docker Desktop este abierto y diga Engine running.
goto end

:check_token
findstr /r "^SONAR_TOKEN=..*" .env.sonar >nul
if errorlevel 1 goto no_token
exit /b 0

:no_token
echo.
echo [ERROR] Falta el token de SonarQube en el archivo .env.sonar
echo.
echo   1. Abre http://localhost:%PORT% e inicia sesion.
echo   2. Menu de tu cuenta, Mi cuenta, pestana Seguridad, Generar token.
echo   3. Copia el token y pegalo en .env.sonar, en la linea SONAR_TOKEN=
echo   4. Guarda el archivo y vuelve a ejecutar este comando.
echo.
exit /b 1

:wait_ready
set /a TRIES=0
:wait_loop
curl -s http://localhost:%PORT%/api/system/status 2>nul | findstr "UP" >nul
if not errorlevel 1 goto ready_ok
set /a TRIES+=1
if %TRIES% GEQ 72 goto ready_timeout
timeout /t 5 /nobreak >nul
goto wait_loop

:ready_ok
echo.
echo SonarQube esta listo: http://localhost:%PORT%
echo Usuario inicial: admin   Contrasena inicial: admin (te pedira cambiarla)
exit /b 0

:ready_timeout
echo.
echo SonarQube aun no responde. Revisa los registros con:  .\sonar.cmd logs
exit /b 1

:end
endlocal
