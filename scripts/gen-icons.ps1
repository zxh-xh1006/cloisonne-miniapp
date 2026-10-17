# scripts/gen-icons.ps1 - 生成 TabBar PNG 图标
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\miniprogram\images\tab"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$icons = @(
    @{ Name = "home"; R = 138; G = 138; B = 138 },
    @{ Name = "home-active"; R = 212; G = 175; B = 55 },
    @{ Name = "toolbox"; R = 138; G = 138; B = 138 },
    @{ Name = "toolbox-active"; R = 212; G = 175; B = 55 },
    @{ Name = "favorite"; R = 138; G = 138; B = 138 },
    @{ Name = "favorite-active"; R = 212; G = 175; B = 55 }
)

foreach ($icon in $icons) {
    $bmp = New-Object System.Drawing.Bitmap(81, 81)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    $color = [System.Drawing.Color]::FromArgb(255, $icon.R, $icon.G, $icon.B)
    $brush = New-Object System.Drawing.SolidBrush($color)

    # 画圆形
    $g.FillEllipse($brush, 14, 14, 53, 53)

    $brush.Dispose()
    $g.Dispose()

    $outPath = Join-Path $outDir "$($icon.Name).png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Generated $($icon.Name).png"
}

Write-Host "All icons generated!"
