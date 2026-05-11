/**
 * 安全检测器的核心逻辑（纯函数，无副作用）
 *
 * 所有函数都是纯函数，便于测试。
 * 不依赖 Node.js 进程 API 或外部命令。
 */

/**
 * 判断命令是否为进程管理命令
 */
export function isProcessCommand(command: string): boolean {
  return /(?:stop-?process|taskkill|kill|terminate|ps|get-?process|tasklist|killall|pkill|wmic|tskill)\s+/i.test(command);
}

/**
 * 判断命令是否为 PowerShell 调用
 */
export function isPowerShellCommand(command: string): boolean {
  const trimmed = command.trim().toLowerCase();
  if (/^(powershell|pwsh|ps)\s*\.?exe?/i.test(trimmed)) return true;
  // -Command "..." (带空格的写法)
  if (/-command\s+/i.test(command)) return true;
  // -Command= 格式
  if (/-command=/i.test(trimmed)) return true;
  // -c "..." 或 "..." -c 简写格式
  if (/-c\s+["']|["']\s+-c\b/i.test(command)) return true;
  return false;
}

/**
 * 从 PowerShell -Command 参数中提取内部命令
 * 支持双引号和单引号
 */
export function extractPSCommand(command: string): string | null {
  // 双引号: -Command "xxx"
  const dqMatch = command.match(/-Command\s+"([^"]+)"/i);
  if (dqMatch) return dqMatch[1].trim();

  // 单引号: -Command 'xxx'
  const sqMatch = command.match(/-Command\s+'([^']+)'/i);
  if (sqMatch) return sqMatch[1].trim();

  // "xxx" -c (简化格式)
  const scMatch = command.match(/["]([^"]+)"\s+-c\b/i);
  if (scMatch) return scMatch[1].trim();

  return null;
}

/**
 * 从命令字符串中提取所有 PID（数字序列）
 */
export function extractPIDs(command: string): number[] {
  const matches = command.matchAll(/\b(\d+)\b/g);
  return Array.from(matches, (m) => parseInt(m[1], 10));
}

/**
 * 检测命令是否通过名称结束 opencode 或 node 进程
 * @returns 错误消息字符串（拦截）或 null（放行）
 */
export function checkProcessNameKill(command: string): string | null {
  // 同时检查原始命令和内嵌 PS 命令
  const commandsToCheck = [command];
  const psCmd = extractPSCommand(command);
  if (psCmd) {
    commandsToCheck.push(psCmd);
  }

  // 名称匹配模式列表
  // 所有模式均支持带引号的进程名，例如 "opencode" 或 'node.exe'
  const patterns: RegExp[] = [
    // taskkill /im opencode.exe, taskkill /f /im "node.exe"
    /\btaskkill\b[\s\S]*?\/im\s+["']?(?:opencode|node)(?:\.exe)?["']?\b/i,

    // Stop-Process -Name opencode, Stop-Process -Name "opencode" (显式参数名)
    /\bstop-?process\s+(?:-\w+\s+)?(?:-name\s+|-Name\s+)["']?(?:opencode|node)(?:\.exe)?["']?\b/i,

    // Stop-Process opencode, Stop-Process "opencode" (位置参数，进程名不是以 - 开头)
    /\bstop-?process\s+(?!-["']?)["']?(?:opencode|node)(?:\.exe)?\b/i,

    // killall opencode / killall "node"
    /\bkillall\s+["']?(?:opencode|node)\b/i,

    // pkill -f opencode / pkill "opencode"
    /\bpkill\s+(?:-[a-z]+\s+)?["']?(?:opencode|node)\b/i,

    // wmic process where name='opencode.exe'
    /wmic\s+process[\s\S]*?name\s*=\s*["']?(?:opencode|node)(?:\.exe)?["']?/i,

    // Get-Process opencode | Stop-Process, Get-Process "opencode" | Stop-Process
    /get-?process[\s\S]*?["']?(?:opencode|node)["']?[\s\S]*?\|[\s\S]*?stop-?process/i,

    // kill opencode / kill "opencode"
    /\bkill\s+["']?(?:opencode|node)\b/i,
  ];

  for (const cmd of commandsToCheck) {
    for (const pattern of patterns) {
      if (pattern.test(cmd)) {
        return `安全拦截：禁止通过名称结束 opencode 或 node 进程\n检测到命令: ${command}`;
      }
    }
  }

  return null;
}

/**
 * 检测命令是否试图结束受保护的 PID
 * @param command 原始命令字符串
 * @param protectedPIDs 受保护的 PID 列表（例如 opencode PID 和子进程 PID）
 * @returns 错误消息字符串（拦截）或 null（放行）
 */
export function checkProcessPIDKill(command: string, protectedPIDs: number[]): string | null {
  if (protectedPIDs.length === 0) return null;

  // 从原始命令提取 PID
  const rawPIDs = extractPIDs(command);

  // 从内嵌 PS 命令提取 PID
  const psPIDs: number[] = [];
  const psCmd = extractPSCommand(command);
  if (psCmd) {
    psPIDs.push(...extractPIDs(psCmd));
  }

  const allPIDs = [...new Set([...rawPIDs, ...psPIDs])];

  for (const pid of allPIDs) {
    if (protectedPIDs.includes(pid)) {
      return `安全拦截：禁止结束正在运行的 opencode 进程 (PID: ${pid})\n检测到命令: ${command}`;
    }
  }

  return null;
}
