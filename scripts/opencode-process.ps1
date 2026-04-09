# Get opencode.exe PID by tracing parent process chain
function Get-CurrentOpencodePID {
    $currentPid = $PID
    $targetPid = $currentPid
    $chain = @()

    while ($targetPid -and $targetPid -gt 4) {
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $targetPid" -ErrorAction SilentlyContinue
        if (-not $proc) { break }

        $name = $proc.Name
        $parentPid = $proc.ParentProcessId

        $chain += "$name($targetPid)"

        if ($name -eq 'opencode.exe') {
            return [PSCustomObject]@{
                OpencodePID = $targetPid
                CurrentPID  = $currentPid
                Chain       = ($chain | Select-Object -Skip 1) -join ' <- '
            }
        }

        $targetPid = $parentPid
    }

    return [PSCustomObject]@{
        OpencodePID = $currentPid
        CurrentPID  = $currentPid
        Chain       = $chain -join ' <- '
    }
}

# Get all child process IDs of opencode processes
function Get-OpencodeChildProcessId {
    $parentIds = (Get-Process -Name opencode -ErrorAction SilentlyContinue).Id
    if (-not $parentIds) {
        return
    }

    Get-CimInstance Win32_Process | 
        Where-Object { $_.ParentProcessId -in $parentIds } | 
        Select-Object -ExpandProperty ProcessId
}