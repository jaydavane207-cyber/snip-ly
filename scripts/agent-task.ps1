# ==============================================================================
# Agent Git Task Manager PowerShell Wrapper
# ==============================================================================
[CmdletBinding()]
param (
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("start", "verify", "commit", "pr", "discard", "help")]
    [string]$Action,

    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]]$RemainingArgs
)

$ScriptDir = $PSScriptRoot
$argsList = @($Action) + $RemainingArgs
node "$ScriptDir/agent-task.js" @argsList
exit $LASTEXITCODE
