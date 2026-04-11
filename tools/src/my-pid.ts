import { tool } from "@opencode-ai/plugin"
import { traceParentProcessChain } from "#libs/process"

export default tool({
  description: "Get the current opencode process ID by tracing the parent process chain",
  args: {},
  async execute() {
    const result = traceParentProcessChain();
    
    if (result.opencodePID === result.currentPID || result.chain === '') {
      return `Current node PID: ${result.currentPID}\nOpencode PID: Not found\nChain: ${result.chain}`;
    }
    
    return `Current node PID: ${result.currentPID}\nOpencode PID: ${result.opencodePID}\nChain: ${result.chain}`;
  },
})
