@echo off
cd /d "D:\3.projects\deaddrop"
set NODE="C:\Users\thero\AppData\Local\ms-playwright-go\1.57.0\node.exe"
start cmd /k "%NODE% node_modules\vite\bin\vite.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"
