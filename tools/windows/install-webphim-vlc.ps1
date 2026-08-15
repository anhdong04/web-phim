param(
  [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'
$scheme = 'webphim-vlc'
$registryRoot = "HKCU:\Software\Classes\$scheme"
$installDir = Join-Path $env:LOCALAPPDATA 'WebPhimVLC'
$handlerPath = Join-Path $installDir 'handler.ps1'

function Find-VlcPath {
  $candidates = @()

  foreach ($key in @(
    'HKLM:\SOFTWARE\VideoLAN\VLC',
    'HKLM:\SOFTWARE\WOW6432Node\VideoLAN\VLC',
    'HKCU:\SOFTWARE\VideoLAN\VLC'
  )) {
    if (Test-Path $key) {
      $props = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
      if ($props.InstallDir) { $candidates += (Join-Path $props.InstallDir 'vlc.exe') }
      if ($props.PSPath -and $props.'(default)') { $candidates += $props.'(default)' }
    }
  }

  if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'VideoLAN\VLC\vlc.exe') }
  if (${env:ProgramFiles(x86)}) { $candidates += (Join-Path ${env:ProgramFiles(x86)} 'VideoLAN\VLC\vlc.exe') }

  $cmd = Get-Command vlc.exe -ErrorAction SilentlyContinue
  if ($cmd) { $candidates += $cmd.Source }

  foreach ($candidate in $candidates | Select-Object -Unique) {
    if ($candidate -and (Test-Path $candidate)) {
      return (Resolve-Path $candidate).Path
    }
  }
  return $null
}

if ($Uninstall) {
  Remove-Item -Path $registryRoot -Recurse -Force -ErrorAction SilentlyContinue
  Remove-Item -Path $installDir -Recurse -Force -ErrorAction SilentlyContinue
  Write-Host 'Web Phim VLC handler da duoc go.' -ForegroundColor Green
  exit 0
}

$vlcPath = Find-VlcPath
if (-not $vlcPath) {
  throw 'Khong tim thay VLC. Hay cai VLC Media Player tren Windows truoc, sau do chay lai script nay.'
}

New-Item -Path $installDir -ItemType Directory -Force | Out-Null
$escapedVlc = $vlcPath.Replace("'", "''")

$handler = @'
param(
  [Parameter(Mandatory=$true, Position=0)]
  [string]$Uri
)

$ErrorActionPreference = 'Stop'
$VlcPath = '__VLC_PATH__'
$logDir = Join-Path $env:LOCALAPPDATA 'WebPhimVLC'
$logPath = Join-Path $logDir 'handler.log'

function Write-HandlerLog([string]$Message) {
  try {
    New-Item -Path $logDir -ItemType Directory -Force | Out-Null
    Add-Content -Path $logPath -Value ((Get-Date -Format o) + ' ' + $Message)
  } catch {}
}

try {
  $parsed = [Uri]$Uri
  if (-not $parsed.Scheme.Equals('webphim-vlc', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Unsupported protocol'
  }

  $urlPart = $null
  foreach ($pair in $parsed.Query.TrimStart('?').Split('&')) {
    if ($pair.StartsWith('url=', [StringComparison]::OrdinalIgnoreCase)) {
      $urlPart = $pair.Substring(4)
      break
    }
  }
  if ([string]::IsNullOrWhiteSpace($urlPart)) { throw 'Missing url parameter' }

  $target = [Uri]::UnescapeDataString($urlPart)
  if ($target -notmatch '^https?://') { throw 'Only http/https playback URLs are allowed' }
  if (-not (Test-Path $VlcPath)) { throw 'VLC executable no longer exists' }

  Write-HandlerLog ('Launching VLC: ' + $target)
  $safeTarget = $target.Replace('"', '%22')
  Start-Process -FilePath $VlcPath -ArgumentList @(
    '--one-instance',
    '--no-video-title-show',
    '--play-and-exit',
    ('"' + $safeTarget + '"')
  ) | Out-Null
} catch {
  Write-HandlerLog ('ERROR: ' + $_.Exception.Message)
  exit 1
}
'@

$handler = $handler.Replace('__VLC_PATH__', $escapedVlc)
Set-Content -Path $handlerPath -Value $handler -Encoding UTF8

New-Item -Path $registryRoot -Force | Out-Null
Set-Item -Path $registryRoot -Value 'URL:Web Phim VLC Protocol'
New-ItemProperty -Path $registryRoot -Name 'URL Protocol' -Value '' -PropertyType String -Force | Out-Null

$iconKey = Join-Path $registryRoot 'DefaultIcon'
New-Item -Path $iconKey -Force | Out-Null
Set-Item -Path $iconKey -Value ('"' + $vlcPath + '",0')

$commandKey = Join-Path $registryRoot 'shell\open\command'
New-Item -Path $commandKey -Force | Out-Null
$powershellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$command = '"' + $powershellExe + '" -NoProfile -ExecutionPolicy Bypass -File "' + $handlerPath + '" "%1"'
Set-Item -Path $commandKey -Value $command

Write-Host ''
Write-Host 'Web Phim VLC handler da cai xong.' -ForegroundColor Green
Write-Host ('VLC: ' + $vlcPath)
Write-Host ('Protocol: ' + $scheme + '://')
Write-Host ''
Write-Host 'Trong Nuvio, chon nguon: YanHH3D - VLC Windows.' -ForegroundColor Cyan
Write-Host 'De go cai dat, chay lai file nay voi tham so -Uninstall.'
