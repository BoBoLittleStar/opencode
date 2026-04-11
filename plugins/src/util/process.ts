import {execSync} from 'child_process';

export interface ProcessChainResult {
    opencodePID: number;
    currentPID: number;
    chain: string;
}

export function traceParentProcessChain(): ProcessChainResult {
    const out = execSync(`powershell -Command "Get-CurrentOpencodePID | ConvertTo-Json -Compress"`, {
        encoding: 'utf8',
        windowsHide: true
    });

    const result = JSON.parse(out.trim());
    return {
        opencodePID: result.OpencodePID,
        currentPID: result.CurrentPID,
        chain: result.Chain || ''
    };
}
