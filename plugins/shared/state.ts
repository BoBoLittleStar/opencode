/**
 * 跨插件全局状态对象
 *
 * 所有插件在同一个进程中运行，共享此对象。
 * 已知键有类型约束，新键随用随加（类型为 unknown）。
 *
 * 示例：
 *   globalState['restart-pending'] = true
 *   if (globalState['restart-pending']) { ... }
 *   delete globalState['restart-pending']
 */

export interface GlobalState {
  /** 重启计划中，idle-reminder 不发送自动提醒 */
  'restart-pending'?: boolean;
  // 未来在此添加已知键，享类型提示
}

export const globalState: GlobalState & Record<string, unknown> = {};
