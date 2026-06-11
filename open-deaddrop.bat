@echo off
title DeadDrop Dev Server
cd /d "D:\3.projects\deaddrop"

echo Starting DeadDrop...
start "" "http://localhost:5173"
npm run dev
pause
