# Script PowerShell para iniciar o servidor Guriri Express
# Etapas: (1) ir para o diretório certo, (2) carregar .env.local, (3) derrubar nodes presos e rodar npm run dev:stable
# Define o diretório de trabalho (Raiz do projeto, um nível acima de scripts/)
Set-Location -Path "$PSScriptRoot\.."

# Carrega variáveis do arquivo .env.local (sem versionamento)
$envFile = Join-Path (Get-Location) ".env.local"
if (Test-Path $envFile) {
	Get-Content $envFile | ForEach-Object {
		if (-not [string]::IsNullOrWhiteSpace($_) -and -not $_.TrimStart().StartsWith('#')) {
			$pair = $_ -split '=', 2
			if ($pair.Length -eq 2) {
				$name = $pair[0].Trim()
				$value = $pair[1].Trim()
				[System.Environment]::SetEnvironmentVariable($name, $value)
			}
		}
	}
} else {
	Write-Warning "Arquivo .env.local não encontrado. Defina as variáveis de ambiente manualmente."
}

# Garante que valores críticos existem antes de continuar
if (-not $env:DATABASE_URL) { throw "DATABASE_URL não configurado" }
if (-not $env:JWT_SECRET) { throw "JWT_SECRET não configurado" }
if (-not $env:SESSION_SECRET) { throw "SESSION_SECRET não configurado" }

# Tenta liberar a porta 5000 especificamente
$port = 5000
$tcp = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($tcp) {
    $process = Get-Process -Id $tcp.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "Parando processo na porta $port (PID: $($process.Id))..." -ForegroundColor Yellow
        Stop-Process -Id $process.Id -Force
    }
}
Start-Sleep -Seconds 1

# Permite sobrescrever porta/ambiente via .env
if (-not $env:PORT) { $env:PORT = "5000" }
if (-not $env:NODE_ENV) { $env:NODE_ENV = "development" }

# Limpa a tela
Clear-Host

# Exibe informações
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Guriri Express - Servidor Dev" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Diretório: $(Get-Location)" -ForegroundColor Green
Write-Host "Porta: 5000" -ForegroundColor Green
Write-Host "Ambiente: Development" -ForegroundColor Green
Write-Host ""
Write-Host "Iniciando servidor (modo estável)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Gray
Write-Host ""

# Inicia o servidor com modo estável (script npm que roda API + Vite sem hot reload agressivo)
npm run dev:stable
