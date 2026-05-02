type Blocker =
    | {
          event: {
              type: string;
              properties?: any;
          };
      }
    | {
          tool: any;
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
            type: "session.diff",
        },
    },
    {
        tool: {
            tool: "read",
        },
    },
];
