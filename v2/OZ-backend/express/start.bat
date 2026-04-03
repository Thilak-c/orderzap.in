@echo off
echo Starting Express API via Docker Compose...
cd ..
docker compose up -d express --build
echo.
pause
