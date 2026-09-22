# ==============================================================================
# Ephemeral Container Runner for AI Agents (PowerShell for Windows)
# ==============================================================================
[CmdletBinding()]
param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("build", "run", "respawn", "kill", "exec")]
    [string]$Action,

    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)

$ImageName = "agent-sandbox:node20"
$ContainerName = "agent_ephemeral_sandbox"
$RepoRoot = (Get-Item $PSScriptRoot).Parent.FullName

function Build-AgentImage {
    Write-Host "[Agent Sandbox] Building ephemeral agent image: $ImageName..." -ForegroundColor Cyan
    docker build -t $ImageName -f "$RepoRoot/docker/Dockerfile.agent" "$RepoRoot"
    Write-Host "[Agent Sandbox] Build completed." -ForegroundColor Green
}

function Stop-AgentContainer {
    Write-Host "[Agent Sandbox] Terminating any existing container '$ContainerName'..." -ForegroundColor Yellow
    docker rm -f $ContainerName 2>$null
    Write-Host "[Agent Sandbox] Container removed." -ForegroundColor Green
}

function Run-AgentContainer {
    Build-AgentImage

    # Verify docker network exists
    docker network inspect project1_default 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        docker network create project1_default | Out-Null
    }

    Write-Host "[Agent Sandbox] Starting ephemeral container..." -ForegroundColor Cyan
    Write-Host "[Agent Sandbox] Note: Core configuration files mounted READ-ONLY." -ForegroundColor Yellow
    Write-Host "[Agent Sandbox] Modifiable directories: app/, lib/, prisma/, public/" -ForegroundColor Green

    # Run ephemeral with strict read-only / read-write splits
    docker run --rm -it `
        --name $ContainerName `
        --cpus="2.0" `
        --memory="2048m" `
        -v "${RepoRoot}:/workspace:ro" `
        -v "${RepoRoot}/app:/workspace/app:rw" `
        -v "${RepoRoot}/lib:/workspace/lib:rw" `
        -v "${RepoRoot}/prisma:/workspace/prisma:rw" `
        -v "${RepoRoot}/public:/workspace/public:rw" `
        -v "${RepoRoot}/.git:/workspace/.git:rw" `
        -v "${RepoRoot}/node_modules:/workspace/node_modules:ro" `
        -v "${RepoRoot}/package.json:/workspace/package.json:ro" `
        -v "${RepoRoot}/tsconfig.json:/workspace/tsconfig.json:ro" `
        -v "${RepoRoot}/next.config.mjs:/workspace/next.config.mjs:ro" `
        -w /workspace `
        $ImageName /bin/bash
}

function Respawn-AgentContainer {
    Write-Host "[Agent Sandbox] Immediate Respawn: Wiping dirty state and recreating from base image..." -ForegroundColor Magenta
    Stop-AgentContainer
    Run-AgentContainer
}

function Exec-AgentCommand {
    param([string[]]$CommandArgs)
    $cmd = $CommandArgs -join " "
    if (-not $cmd) {
        Write-Error "No command provided to exec."
        return
    }
    Write-Host "[Agent Sandbox] Executing in container: $cmd" -ForegroundColor Cyan
    docker exec -it $ContainerName /bin/bash -c $cmd
}

switch ($Action) {
    "build"   { Build-AgentImage }
    "run"     { Run-AgentContainer }
    "respawn" { Respawn-AgentContainer }
    "kill"    { Stop-AgentContainer }
    "exec"    { Exec-AgentCommand -CommandArgs $RemainingArgs }
}
