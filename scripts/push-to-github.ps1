param(
    [Parameter(Mandatory = $true)][string]$Token,
    [string]$RepoName = "cloisonne-miniapp",
    [string]$Description = "Cloisonne enamel pattern generator miniapp - WeChat MiniProgram + Cloud Development + Image Processing",
    [bool]$Private = $false,
    [string]$CommitMessage = "feat: initial release of cloisonne enamel pattern generator miniapp"
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ApiBase = "https://api.github.com"
$Headers = @{
    "Authorization"        = "Bearer $Token"
    "Accept"               = "application/vnd.github+json"
    "User-Agent"           = "cloisonne-miniapp-pusher"
    "X-GitHub-Api-Version" = "2022-11-28"
}

function Invoke-GH {
    param([string]$Method, [string]$Url, $Body)
    $params = @{ Method = $Method; Uri = $Url; Headers = $Headers; ErrorAction = "Stop" }
    if ($null -ne $Body) {
        $params.Body = ($Body | ConvertTo-Json -Depth 20 -Compress)
        $params.ContentType = "application/json; charset=utf-8"
    }
    try {
        return Invoke-RestMethod @params
    } catch {
        $resp = $_.Exception.Response
        if ($resp) {
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $detail = $reader.ReadToEnd()
            throw "HTTP $([int]$resp.StatusCode) on $Method $Url : $detail"
        }
        throw
    }
}

Write-Host "[1/7] Verifying token..."
$user = Invoke-GH -Method "GET" -Url "$ApiBase/user"
$owner = $user.login
Write-Host "      Authenticated as: $owner"

Write-Host "[2/7] Creating repository $owner/$RepoName ..."
$repoBody = @{ name = $RepoName; description = $Description; private = $Private; auto_init = $false }
try {
    $repo = Invoke-GH -Method "POST" -Url "$ApiBase/user/repos" -Body $repoBody
    Write-Host "      Repository created: $($repo.html_url)"
} catch {
    if ($_.Exception.Message -match "422") {
        Write-Host "      Repository already exists, reusing it."
        $repo = Invoke-GH -Method "GET" -Url "$ApiBase/repos/$owner/$RepoName"
    } else { throw }
}
$fullName = $repo.full_name
$defaultBranch = $repo.default_branch
if (-not $defaultBranch) { $defaultBranch = "main" }
Write-Host "      Default branch: $defaultBranch"

Write-Host "[3/7] Ensuring repository has an initial commit..."
$parentSha = $null
try {
    $refInfo = Invoke-GH -Method "GET" -Url "$ApiBase/repos/$fullName/git/ref/heads/$defaultBranch"
    $parentSha = $refInfo.object.sha
    Write-Host "      Existing commit: $($parentSha.Substring(0,7))"
} catch {
    Write-Host "      Repository is empty, initializing with a placeholder file..."
    $placeholder = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("# cloisonne-miniapp"))
    Invoke-GH -Method "PUT" -Url "$ApiBase/repos/$fullName/contents/README.md" -Body @{
        message = "chore: initialize repository"
        content = $placeholder
        branch  = $defaultBranch
    } | Out-Null
    Start-Sleep -Seconds 2
    $refInfo = Invoke-GH -Method "GET" -Url "$ApiBase/repos/$fullName/git/ref/heads/$defaultBranch"
    $parentSha = $refInfo.object.sha
    Write-Host "      Initialized commit: $($parentSha.Substring(0,7))"
}

Write-Host "[4/7] Collecting project files..."
$root = Split-Path $PSScriptRoot -Parent
$excludeDirs = @(".git", "node_modules", "miniprogram_npm")
$files = Get-ChildItem -Path $root -Recurse -File -Force |
    Where-Object {
        $rel = $_.FullName.Substring($root.Length + 1).Replace("\", "/")
        $skip = $false
        foreach ($d in $excludeDirs) {
            if ($rel -like "$d/*" -or $rel -like "*/$d/*") { $skip = $true }
        }
        -not $skip
    }
Write-Host "      Total files: $($files.Count)"

Write-Host "[5/7] Uploading blobs..."
$treeItems = @()
$i = 0
foreach ($f in $files) {
    $i++
    $rel = $f.FullName.Substring($root.Length + 1).Replace("\", "/")
    $bytes = [IO.File]::ReadAllBytes($f.FullName)
    $b64 = [Convert]::ToBase64String($bytes)
    $blob = Invoke-GH -Method "POST" -Url "$ApiBase/repos/$fullName/git/blobs" -Body @{
        content  = $b64
        encoding = "base64"
    }
    $treeItems += @{ path = $rel; mode = "100644"; type = "blob"; sha = $blob.sha }
    if ($i % 10 -eq 0 -or $i -eq $files.Count) {
        Write-Host "      Uploaded $i / $($files.Count)"
    }
}

Write-Host "[6/7] Creating tree and commit..."
$tree = Invoke-GH -Method "POST" -Url "$ApiBase/repos/$fullName/git/trees" -Body @{ tree = $treeItems }
$commit = Invoke-GH -Method "POST" -Url "$ApiBase/repos/$fullName/git/commits" -Body @{
    message = $CommitMessage
    tree    = $tree.sha
    parents = @($parentSha)
}

Write-Host "[7/7] Updating branch refs/heads/$defaultBranch ..."
Invoke-GH -Method "PATCH" -Url "$ApiBase/repos/$fullName/git/refs/heads/$defaultBranch" -Body @{
    sha   = $commit.sha
    force = $false
} | Out-Null

Write-Host ""
Write-Host "========================================"
Write-Host " PUSH COMPLETE"
Write-Host " Repo:   $($repo.html_url)"
Write-Host " Branch: $defaultBranch  Commit: $($commit.sha.Substring(0,7))"
Write-Host "========================================"
