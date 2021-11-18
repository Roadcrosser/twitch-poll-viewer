pyinstaller -F ^
    --name "Twitch Poll Viewer" ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --add-data "config.sample.yaml;." ^
    .\main.py
@echo off
explorer.exe dist
pause