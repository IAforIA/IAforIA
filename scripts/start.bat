@echo off
setlocal EnableDelayedExpansion
REM ARQUIVO: start.bat – start de desenvolvimento com envs neon + npm run dev:stable
cd /d "%~dp0.."
echo.
echo ========================================
echo   Guriri Express - Servidor Dev
echo ========================================
echo.
echo Diretorio: %CD%
echo Porta: 5000
echo.

REM Carrega variaveis de um arquivo .env.local (nao versionado)
set ENV_FILE=%~dp0..\.env.local
if exist "%ENV_FILE%" (
	for /f "usebackq tokens=* delims=" %%A in ("%ENV_FILE%") do (
		set "line=%%A"
		if not "!line!"=="" if not "!line:~0,1!"=="#" (
			for /f "tokens=1,* delims==" %%B in ("!line!") do (
				if not "%%C"=="" set "%%B=%%C"
			)
		)
	)
) else (
	echo [AVISO] Arquivo .env.local nao encontrado. Defina as variaveis manualmente.
)

REM Para processos Node existentes, evitamos conflito nas portas
taskkill /F /IM node.exe 2>nul

REM Aguarda 1 segundo para garantir que portas foram liberadas
timeout /t 1 /nobreak >nul

REM Valores padrao para variaveis nao definidas
if "%PORT%"=="" set PORT=5000
if "%NODE_ENV%"=="" set NODE_ENV=development

REM Valida segredos criticos antes de continuar
if "%DATABASE_URL%"=="" (
	echo [ERRO] DATABASE_URL nao configurado. Edite .env.local.
	goto :end
)
if "%JWT_SECRET%"=="" (
	echo [ERRO] JWT_SECRET nao configurado. Edite .env.local.
	goto :end
)
if "%SESSION_SECRET%"=="" (
	echo [ERRO] SESSION_SECRET nao configurado. Edite .env.local.
	goto :end
)

echo Iniciando servidor...
echo.
echo Pressione Ctrl+C para parar
echo.

REM Inicia o servidor em modo estável (sem hot reload agressivo)
call npm run dev:stable

:end
pause
