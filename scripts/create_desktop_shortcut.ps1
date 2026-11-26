# Create Windows Desktop Shortcut for LAW PAN POS
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "LAW PAN POS.lnk"

$TargetFile = Join-Path (Split-Path -Parent $PSScriptRoot) "scripts\run_app.bat"
$WorkingDir = Split-Path -Parent $PSScriptRoot
$IconFile = Join-Path $WorkingDir "frontend\public\lawpan_logo.jpg"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $TargetFile
$Shortcut.WorkingDirectory = $WorkingDir
$Shortcut.Description = "LAW PAN Chinese Restaurant POS & Management System"
if (Test-Path $IconFile) {
    # If icon exists, Windows accepts icon location
    $Shortcut.IconLocation = "$IconFile,0"
}
$Shortcut.Save()

Write-Host "Created Desktop Shortcut successfully: $ShortcutPath" -ForegroundColor Green
