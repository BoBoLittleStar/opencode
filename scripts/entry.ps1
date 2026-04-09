# Entry script that loads all PowerShell scripts from the scripts directory
$scriptsDir = "D:\workspace\opencode\scripts"

Get-ChildItem -Path $scriptsDir -Filter "*.ps1" | Where-Object { $_.Name -ne "entry.ps1" } | ForEach-Object {
    . $_.FullName
}