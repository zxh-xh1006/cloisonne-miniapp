# scripts/deploy.ps1 - 一键初始化 git 仓库并推送到 GitHub
# 使用前请确保已安装 git：https://git-scm.com/download/win
# 运行方式：在项目根目录执行 powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1

param(
    [string]$RepoUrl = "",          # GitHub 仓库地址，如 https://github.com/username/cloisonne-miniapp.git
    [string]$Branch = "main",       # 分支名
    [string]$CommitMsg = "feat: 掐丝珐琅纹样生成小程序初始版本"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  掐丝珐琅纹样生成小程序 - 部署脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 git
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Write-Host "[错误] 未检测到 git，请先安装：https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}
Write-Host "[OK] git 已安装: $((git --version))" -ForegroundColor Green

# 进入项目根目录
$root = Split-Path $PSScriptRoot -Parent
Set-Location $root
Write-Host "[OK] 工作目录: $root" -ForegroundColor Green

# 初始化 git
if (-not (Test-Path ".git")) {
    git init
    Write-Host "[OK] git 仓库已初始化" -ForegroundColor Green
} else {
    Write-Host "[OK] git 仓库已存在" -ForegroundColor Green
}

# 配置用户（如未配置）
$userName = git config user.name
$userEmail = git config user.email
if (-not $userName) { git config user.name "Cloisonne Dev" }
if (-not $userEmail) { git config user.email "dev@cloisonne.local" }

# 添加所有文件
git add -A
Write-Host "[OK] 已暂存所有文件" -ForegroundColor Green

# 提交
git commit -m $CommitMsg --allow-empty
Write-Host "[OK] 已提交" -ForegroundColor Green

# 重命名分支
git branch -M $Branch
Write-Host "[OK] 分支已设置为: $Branch" -ForegroundColor Green

# 配置远程仓库
if ($RepoUrl) {
    $remote = git remote get-url origin 2>$null
    if ($remote) {
        git remote set-url origin $RepoUrl
    } else {
        git remote add origin $RepoUrl
    }
    Write-Host "[OK] 远程仓库已设置: $RepoUrl" -ForegroundColor Green

    # 推送
    Write-Host ""
    Write-Host "正在推送到 GitHub..." -ForegroundColor Yellow
    git push -u origin $Branch
    Write-Host ""
    Write-Host "[成功] 代码已推送到 GitHub!" -ForegroundColor Green
    Write-Host "仓库地址: $RepoUrl" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "[提示] 未指定仓库地址，代码已提交到本地仓库。" -ForegroundColor Yellow
    Write-Host "请在 GitHub 创建仓库后执行以下命令推送：" -ForegroundColor Yellow
    Write-Host "  git remote add origin <你的仓库地址>" -ForegroundColor White
    Write-Host "  git push -u origin $Branch" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  部署完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
