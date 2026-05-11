/**
 * security-checker 核心逻辑测试
 *
 * 使用 Node.js 内置 node:test 框架（零外部依赖）。
 * 所有测试均为纯逻辑测试，不执行任何 Bash/PowerShell 命令。
 */
import assert from "node:assert";
import { describe, it } from "node:test";

import {
    checkProcessNameKill,
    checkProcessPIDKill,
    extractPIDs,
    extractPSCommand,
    isPowerShellCommand,
    isProcessCommand,
} from "../security-checker/checker";

// ============================================================
// 1. isProcessCommand — 进程管理命令检测
// ============================================================
describe("isProcessCommand", () => {
    it("should detect: Stop-Process -Name foo", () => {
        assert.strictEqual(isProcessCommand("Stop-Process -Name foo"), true);
    });

    it("should detect: Stop-Process foo (positional)", () => {
        assert.strictEqual(isProcessCommand("Stop-Process foo"), true);
    });

    it("should detect: taskkill /im foo.exe", () => {
        assert.strictEqual(isProcessCommand("taskkill /im opencode.exe"), true);
    });

    it("should detect: kill 1234", () => {
        assert.strictEqual(isProcessCommand("kill 1234"), true);
    });

    it("should detect: killall opencode", () => {
        assert.strictEqual(isProcessCommand("killall opencode"), true);
    });

    it("should detect: pkill -f opencode", () => {
        assert.strictEqual(isProcessCommand("pkill -f opencode"), true);
    });

    it("should detect: Get-Process foo", () => {
        assert.strictEqual(isProcessCommand("Get-Process foo"), true);
    });

    it("should detect: wmic process", () => {
        assert.strictEqual(isProcessCommand('wmic process where name="foo.exe" get ProcessId'), true);
    });

    it("should detect: powershell -Command Stop-Process", () => {
        assert.strictEqual(isProcessCommand('powershell -Command "Stop-Process -Name opencode"'), true);
    });

    it("should NOT detect: ls -la", () => {
        assert.strictEqual(isProcessCommand("ls -la"), false);
    });

    it("should NOT detect: echo hello", () => {
        assert.strictEqual(isProcessCommand('echo "hello world"'), false);
    });

    it("should NOT detect: npm run build", () => {
        assert.strictEqual(isProcessCommand("npm run build"), false);
    });

    it("should NOT detect: git status", () => {
        assert.strictEqual(isProcessCommand("git status"), false);
    });

    it("should NOT detect: killing (substring not followed by space)", () => {
        assert.strictEqual(isProcessCommand("this is killing me"), false);
    });
});

// ============================================================
// 2. isPowerShellCommand — PowerShell 命令检测
// ============================================================
describe("isPowerShellCommand", () => {
    it("should detect: powershell.exe -Command", () => {
        assert.strictEqual(isPowerShellCommand('powershell.exe -Command "Stop-Process -Name foo"'), true);
    });

    it("should detect: pwsh -Command", () => {
        assert.strictEqual(isPowerShellCommand('pwsh -Command "Get-Process"'), true);
    });

    it("should detect: ps -Command", () => {
        assert.strictEqual(isPowerShellCommand('ps -Command "Get-Process"'), true);
    });

    it("should detect: powershell -Command= inline", () => {
        assert.strictEqual(isPowerShellCommand("powershell -Command=Get-Process"), true);
    });

    it("should NOT detect: cmd.exe", () => {
        assert.strictEqual(isPowerShellCommand('cmd.exe /c "taskkill /im foo.exe"'), false);
    });

    it("should NOT detect: plain kill command", () => {
        assert.strictEqual(isPowerShellCommand("kill 1234"), false);
    });

    it("should NOT detect: plain ps (Unix process list)", () => {
        assert.strictEqual(isPowerShellCommand("ps aux"), false);
    });
});

// ============================================================
// 3. extractPSCommand — 从 PowerShell -Command 提取内部命令
// ============================================================
describe("extractPSCommand", () => {
    it("should extract from double-quoted -Command", () => {
        const result = extractPSCommand('powershell -Command "Stop-Process -Name opencode"');
        assert.strictEqual(result, "Stop-Process -Name opencode");
    });

    it("should extract from single-quoted -Command", () => {
        const result = extractPSCommand("powershell -Command 'Stop-Process -Name opencode'");
        assert.strictEqual(result, "Stop-Process -Name opencode");
    });

    it("should return null for plain command", () => {
        assert.strictEqual(extractPSCommand("taskkill /im opencode.exe"), null);
    });

    it("should return null for empty string", () => {
        assert.strictEqual(extractPSCommand(""), null);
    });
});

// ============================================================
// 4. extractPIDs — PID 数字提取
// ============================================================
describe("extractPIDs", () => {
    it("should extract single PID", () => {
        assert.deepStrictEqual(extractPIDs("kill 1234"), [1234]);
    });

    it("should extract multiple PIDs", () => {
        assert.deepStrictEqual(extractPIDs("kill 1234 5678"), [1234, 5678]);
    });

    it("should extract from taskkill", () => {
        assert.deepStrictEqual(extractPIDs("taskkill /PID 4321 /F"), [4321]);
    });

    it("should extract all numbers", () => {
        assert.deepStrictEqual(extractPIDs("timeout 5 && taskkill /PID 1234"), [5, 1234]);
    });

    it("should return empty array", () => {
        assert.deepStrictEqual(extractPIDs("echo hello"), []);
    });

    it("should not match numbers inside words", () => {
        assert.deepStrictEqual(extractPIDs("run cmd_a123b"), []);
    });

    it("should extract from Stop-Process -Id", () => {
        assert.deepStrictEqual(extractPIDs("Stop-Process -Id 8888 -Confirm:$false"), [8888]);
    });
});

// ============================================================
// 5. checkProcessNameKill — 名称拦截检测
// ============================================================
describe("checkProcessNameKill", () => {
    // Should block
    // --- Unquoted names ---
    it("should block: taskkill /im opencode.exe", () => {
        assert.notStrictEqual(checkProcessNameKill("taskkill /im opencode.exe"), null);
    });

    it("should block: taskkill /f /im opencode.exe", () => {
        assert.notStrictEqual(checkProcessNameKill("taskkill /f /im opencode.exe"), null);
    });

    it("should block: taskkill /im node.exe", () => {
        assert.notStrictEqual(checkProcessNameKill("taskkill /im node.exe"), null);
    });

    it("should block: taskkill /f /im node.exe", () => {
        assert.notStrictEqual(checkProcessNameKill("taskkill /f /im node.exe"), null);
    });

    it("should block: Stop-Process -Name opencode", () => {
        assert.notStrictEqual(checkProcessNameKill("Stop-Process -Name opencode"), null);
    });

    it("should block: Stop-Process -Name node", () => {
        assert.notStrictEqual(checkProcessNameKill("Stop-Process -Name node"), null);
    });

    it("should block: Stop-Process opencode (positional)", () => {
        assert.notStrictEqual(checkProcessNameKill("Stop-Process opencode"), null);
    });

    it("should block: Stop-Process node (positional)", () => {
        assert.notStrictEqual(checkProcessNameKill("Stop-Process node"), null);
    });

    it("should block: killall opencode", () => {
        assert.notStrictEqual(checkProcessNameKill("killall opencode"), null);
    });

    it("should block: killall node", () => {
        assert.notStrictEqual(checkProcessNameKill("killall node"), null);
    });

    it("should block: pkill opencode", () => {
        assert.notStrictEqual(checkProcessNameKill("pkill opencode"), null);
    });

    it("should block: pkill node", () => {
        assert.notStrictEqual(checkProcessNameKill("pkill node"), null);
    });

    it("should block: pkill -f opencode", () => {
        assert.notStrictEqual(checkProcessNameKill("pkill -f opencode"), null);
    });

    // --- Quoted names (double quotes) ---
    it('should block: Stop-Process -Name "opencode"', () => {
        assert.notStrictEqual(checkProcessNameKill('Stop-Process -Name "opencode"'), null);
    });

    it('should block: Stop-Process -Name "node"', () => {
        assert.notStrictEqual(checkProcessNameKill('Stop-Process -Name "node"'), null);
    });

    it('should block: taskkill /im "opencode.exe"', () => {
        assert.notStrictEqual(checkProcessNameKill('taskkill /im "opencode.exe"'), null);
    });

    it('should block: taskkill /f /im "node.exe"', () => {
        assert.notStrictEqual(checkProcessNameKill('taskkill /f /im "node.exe"'), null);
    });

    it('should block: Stop-Process "opencode" (positional quoted)', () => {
        assert.notStrictEqual(checkProcessNameKill('Stop-Process "opencode"'), null);
    });

    it('should block: killall "opencode"', () => {
        assert.notStrictEqual(checkProcessNameKill('killall "opencode"'), null);
    });

    it('should block: pkill "opencode"', () => {
        assert.notStrictEqual(checkProcessNameKill('pkill "opencode"'), null);
    });

    it('should block: kill "opencode"', () => {
        assert.notStrictEqual(checkProcessNameKill('kill "opencode"'), null);
    });

    it("should block: powershell -Command with inner single-quoted name", () => {
        // 通过 -Command 包裹，内层使用单引号：-Command "Stop-Process -Name 'opencode'"
        assert.notStrictEqual(checkProcessNameKill("powershell -Command \"Stop-Process -Name 'opencode'\""), null);
    });

    // --- Quoted names (single quotes) ---
    it("should block: Stop-Process -Name 'opencode'", () => {
        assert.notStrictEqual(checkProcessNameKill("Stop-Process -Name 'opencode'"), null);
    });

    it("should block: taskkill /im 'opencode.exe'", () => {
        assert.notStrictEqual(checkProcessNameKill("taskkill /im 'opencode.exe'"), null);
    });

    it("should block: wmic process where name='opencode.exe' delete", () => {
        assert.notStrictEqual(checkProcessNameKill("wmic process where name='opencode.exe' delete"), null);
    });

    it("should block: Get-Process opencode | Stop-Process", () => {
        assert.notStrictEqual(checkProcessNameKill("Get-Process opencode | Stop-Process"), null);
    });

    it("should block: kill opencode", () => {
        assert.notStrictEqual(checkProcessNameKill("kill opencode"), null);
    });

    it("should block: kill node", () => {
        assert.notStrictEqual(checkProcessNameKill("kill node"), null);
    });

    it("should block: powershell -Command Stop-Process -Name opencode", () => {
        assert.notStrictEqual(checkProcessNameKill('powershell -Command "Stop-Process -Name opencode"'), null);
    });

    it("should block: powershell -Command taskkill /im opencode.exe", () => {
        assert.notStrictEqual(checkProcessNameKill('powershell -Command "taskkill /im opencode.exe"'), null);
    });

    // Should NOT block
    it("should NOT block: ls -la", () => {
        assert.strictEqual(checkProcessNameKill("ls -la"), null);
    });

    it("should NOT block: git commit", () => {
        assert.strictEqual(checkProcessNameKill('git commit -m "fix"'), null);
    });

    it("should NOT block: npm run build", () => {
        assert.strictEqual(checkProcessNameKill("npm run build"), null);
    });

    it("should NOT block: Stop-Process -Name other-service", () => {
        assert.strictEqual(checkProcessNameKill("Stop-Process -Name other-service"), null);
    });

    it("should NOT block: taskkill /im other.exe", () => {
        assert.strictEqual(checkProcessNameKill("taskkill /im other.exe"), null);
    });

    it('should NOT block: taskkill /im "other.exe" (quoted non-matching)', () => {
        assert.strictEqual(checkProcessNameKill('taskkill /im "other.exe"'), null);
    });

    it('should NOT block: Stop-Process -Name "other" (quoted non-matching)', () => {
        assert.strictEqual(checkProcessNameKill('Stop-Process -Name "other"'), null);
    });

    it("should NOT block: killall other-service", () => {
        assert.strictEqual(checkProcessNameKill("killall other-service"), null);
    });

    it("should NOT block: pkill other-service", () => {
        assert.strictEqual(checkProcessNameKill("pkill other-service"), null);
    });

    it("should NOT block: empty string", () => {
        assert.strictEqual(checkProcessNameKill(""), null);
    });
});

// ============================================================
// 6. checkProcessPIDKill — PID 拦截检测
// ============================================================
describe("checkProcessPIDKill", () => {
    const protectedPIDs = [1234, 5678];

    it("should block: kill 1234", () => {
        assert.notStrictEqual(checkProcessPIDKill("kill 1234", protectedPIDs), null);
    });

    it("should block: taskkill /PID 1234", () => {
        assert.notStrictEqual(checkProcessPIDKill("taskkill /PID 1234 /F", protectedPIDs), null);
    });

    it("should block: Stop-Process -Id 1234", () => {
        assert.notStrictEqual(checkProcessPIDKill("Stop-Process -Id 1234", protectedPIDs), null);
    });

    it("should block: kill 5678 (second protected PID)", () => {
        assert.notStrictEqual(checkProcessPIDKill("kill 5678", protectedPIDs), null);
    });

    it("should block: timeout 5 && kill 1234", () => {
        assert.notStrictEqual(checkProcessPIDKill("timeout 5 && kill 1234", protectedPIDs), null);
    });

    it("should block: powershell -Command with PID", () => {
        assert.notStrictEqual(checkProcessPIDKill('powershell -Command "Stop-Process -Id 1234"', protectedPIDs), null);
    });

    it("should block: echo with protected PID (conservative)", () => {
        assert.notStrictEqual(checkProcessPIDKill("echo 1234", protectedPIDs), null);
    });

    it("should NOT block: kill 9999 (non-matching)", () => {
        assert.strictEqual(checkProcessPIDKill("kill 9999", protectedPIDs), null);
    });

    it("should NOT block: ls -la (no PIDs)", () => {
        assert.strictEqual(checkProcessPIDKill("ls -la", protectedPIDs), null);
    });

    it("should NOT block: empty protected PIDs", () => {
        assert.strictEqual(checkProcessPIDKill("kill 1234", []), null);
    });

    it("should NOT block: empty string", () => {
        assert.strictEqual(checkProcessPIDKill("", protectedPIDs), null);
    });
});
