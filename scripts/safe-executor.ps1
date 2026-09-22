# ==============================================================================
# Safe Executor PowerShell Wrapper
# Routes commands through the strict allowlist validator
# ==============================================================================
[CmdletBinding()]
param (
    [Parameter(Position = 0, Mandatory = $true, ValueFromRemainingArguments = $true)]
    [string[]]$CommandArgs
)

$ScriptDir = $PSScriptRoot
$cmd = $CommandArgs -join " "
node "$ScriptDir/safe-executor.js" $cmd
exit $LASTEXITCODE
