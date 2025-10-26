@echo off
title Zenith Trading Journal - Auto Backup Enabled

echo Starting Zenith Trading Journal...
echo Running automatic backup system...

cd /d "C:\Trading\Automated Trading\Dani Journal"

echo Opening browser...
start http://localhost:5173

echo Starting development server with backup protection...
npm run dev

pause