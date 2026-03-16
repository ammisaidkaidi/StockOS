@echo off
REM Initialize Git repository in current folder
git init

REM Add all files
git add .

REM Commit with a message
git commit -m "Initial commit for StockOS project"

REM Link to your GitHub repository
git remote add origin https://github.com/ammisaidkaidi/StockOS.git

REM Set branch name and push
git branch -M main
git push -u origin main