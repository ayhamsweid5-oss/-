param([string]$DatabaseUrl=$env:DATABASE_URL,[string]$OutputDir='.\backups')
if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) { throw 'DATABASE_URL is required' }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$file=Join-Path $OutputDir ("makhzani-"+(Get-Date -Format 'yyyyMMdd-HHmmss')+'.dump')
pg_dump $DatabaseUrl --format=custom --file=$file
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed' }
Write-Output "Backup created: $file"
