pyinstaller -F ^
    --name "Twitch Poll Viewer" ^
    -i icon/icon.ico ^
    --add-data "..\templates;templates" ^
    --add-data "..\static;static" ^
    --add-data "..\config.sample.yaml;." ^
    ..\main.py
@echo off
explorer.exe dist
pause