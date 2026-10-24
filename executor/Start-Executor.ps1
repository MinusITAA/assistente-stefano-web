param([switch]$Browser)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Installa Node.js 22 o successivo dal sito ufficiale nodejs.org.' }
if (-not (Test-Path -LiteralPath './config.json')) { Copy-Item -LiteralPath './config.example.json' -Destination './config.json' }
if ($Browser) {
    Write-Host 'Il browser separato richiede il pacchetto ufficiale playwright e Chromium.'
    Write-Host 'Esegui prima: npm install --save-exact playwright; npx playwright install chromium'
    $executorConfig = Get-Content -LiteralPath './config.json' -Raw | ConvertFrom-Json
    $executorConfig.enableBrowser = $true
    $executorConfig | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath './config.json' -Encoding utf8
}
Write-Host 'Perimetro: cartella dedicata; nessuna shell arbitraria, login personale, commit o deploy.'
Write-Host 'Il codice temporaneo che appare va inserito direttamente nel sito Assistente Stefano.'
node ./server.mjs
