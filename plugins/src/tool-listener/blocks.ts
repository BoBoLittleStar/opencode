type Blocker =
    | {
          event: {
              type: string;
              properties?: any;
          };
      }
    | {
          tool: {
              tool: string;
              input?: {
                  [p: string]: any;
              };
          };
      };
export const blocks: Blocker[] = [
    {
        event: {
            type: "tui.toast.show",
            properties: {
                message: "Sisyphus on steroids is steering OpenCode.",
            },
        },
    },
    {
        event: {
            type: "tui.toast.show",
            properties: {
                message: (message: unknown) =>
                    typeof message === "string" &&
                    /Update available: .* \(version pinned, update manually\)/.test(message),
            },
        },
    },
    {
        event: {
            type: "session.diff",
        },
    },
    {
        event: {
            type: "message.part.delta",
        },
    },
    {
        event: {
            type: "installation.update-available",
        },
    },
];
