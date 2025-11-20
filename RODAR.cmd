@echo off
REM ARQUIVO: RODAR.cmd – atalho simples para subir backend localmente
cd /d "%~dp0"
REM Mata processos node que possam segurar a porta
taskkill /F /IM node.exe >nul 2>&1
echo.
echo ========================================
echo   GURIRI EXPRESS - SERVIDOR
echo ========================================
echo.
echo Aguarde o servidor iniciar...
echo.
REM Executa npm run dev padrão (usa Vite + API juntas)
npm run dev
