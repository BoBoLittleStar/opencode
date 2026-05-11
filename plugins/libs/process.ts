import { execSync } from "child_process";

/**
 * Result of tracing parent process chain
 */
export interface ProcessChainResult {
    /** The PID of opencode.exe if found, otherwise current node PID */
    opencodePID: number;
    /** Current Node.js process PID */
    currentPID: number;
    /** Process chain as formatted string */
    chain: string;
}

/**
 * Trace parent process chain until we find opencode.exe
 * Equivalent to my-pid tool logic
 */
export function traceParentProcessChain(): ProcessChainResult {
    const currentPid = process.pid;
    let pid = currentPid;
    const chain: string[] = [];

    while (pid && pid > 4) {
        try {
            const out = execSync(`wmic process where "ProcessId=${pid}" get ParentProcessId,Name /format:csv`, {
                encoding: "utf8",
                windowsHide: true,
            });
            const lines = out.trim().split("\n");
            if (lines.length < 2) break;

            const parts = lines[1].split(",").map((p: string) => p.trim());
            const name = parts[1];
            const parentPid = parseInt(parts[2]);

            chain.push(`${name}(${pid})`);

            if (name === "opencode.exe") {
                return {
                    opencodePID: pid,
                    currentPID: currentPid,
                    chain: chain.reverse().join(" <- "),
                };
            }

            pid = parentPid;
        } catch {
            break;
        }
    }

    // Fallback: return current node PID if opencode.exe not found
    return {
        opencodePID: currentPid,
        currentPID: currentPid,
        chain: chain.reverse().join(" <- "),
    };
}

export function getCurrentPID(): number {
    return traceParentProcessChain().opencodePID;
}
