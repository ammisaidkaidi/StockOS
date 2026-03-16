@echo off
REM Initialize Git repository if not already done
git init

REM Add all files
git add .

REM Commit with a message
git commit -m "Initial commit for StockOS project"

REM Update remote origin to your GitHub repo (HTTPS)
git remote set-url origin https://github.com/ammisaidkaidi/StockOS.git

REM Set branch name and push
git branch -M main
git push -u origin main