/**
 * Restart state management
 * Tracks whether a restart has been requested and should be executed when session is idle
 */

let pendingRestart = false;

/**
 * Check if restart is pending
 */
export function isRestartPending(): boolean {
    return pendingRestart;
}

/**
 * Request a restart - will be executed when session becomes idle
 */
export function requestRestart(): void {
    pendingRestart = true;
}

/**
 * Clear the pending restart flag
 */
export function clearRestartRequest(): void {
    pendingRestart = false;
}
