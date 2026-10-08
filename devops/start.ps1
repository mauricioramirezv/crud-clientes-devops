$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    node devops/setup-sonar.cjs
    if ($LASTEXITCODE -ne 0) { throw 'SonarQube setup failed' }
    docker network inspect devops-net *> $null
    if ($LASTEXITCODE -ne 0) { docker network create devops-net }
    $networks = docker inspect sonarqube --format '{{json .NetworkSettings.Networks}}' | ConvertFrom-Json
    if (-not $networks.PSObject.Properties['devops-net']) { docker network connect devops-net sonarqube }
    $env:JENKINS_PASSWORD_FILE = Join-Path $env:LOCALAPPDATA 'CrudClientesDevOps/jenkins-password.txt'
    docker compose -f compose.jenkins.yml up -d --build
    if ($LASTEXITCODE -ne 0) { throw 'Jenkins startup failed' }
    $ready = $false
    for ($attempt = 0; $attempt -lt 120; $attempt++) {
        try { Invoke-WebRequest 'http://localhost:8080/login' -TimeoutSec 3 | Out-Null; $ready=$true; break } catch { Start-Sleep -Seconds 5 }
    }
    if (-not $ready) { throw 'Jenkins did not become ready' }
    node devops/setup-jenkins.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Jenkins configuration failed' }
    node devops/jenkins-api.cjs /job/crud-clientes-devops/build POST
    if ($LASTEXITCODE -ne 0) { throw 'Could not schedule the pipeline' }
} finally { Pop-Location }
