pyinstaller -F --add-data "templates;templates" --add-data "static;static" --add-data "config.sample.yaml;config.sample.yaml" .\main.py
explorer.exe dist
pause