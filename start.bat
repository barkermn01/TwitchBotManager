@echo off

start node index.js
ping -n 6 127.0.0.1 > nul
start http://localhost:8000/LetsPlaySNES/