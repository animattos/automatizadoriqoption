
@echo off
title Iniciando Painel de Sinais IQ Option

echo Iniciando servidor backend (server.py)...
start cmd /k "python server.py"

timeout /t 5 > nul

echo Abrindo painel no navegador...
start "" "index.html"

exit
