import http from "http";
import type { Option } from "./types";

export async function postQuestions(
    questions: {
        group_id: string;
        source_id: string;
        content: string;
        options: Option[];
        multiple?: boolean;
        createdAt?: string;
    }[],
): Promise<void> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ questions });
        const options = {
            hostname: "localhost",
            port: 17346,
            path: "/api/questions",
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(data),
            },
        };

        const req = http.request(options, res => {
            let body = "";
            res.on("data", chunk => body += chunk);
            res.on("end", () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve();
                } else {
                    reject(new Error(`Failed to post questions: ${res.statusCode} ${body}`));
                }
            });
        });

        req.on("error", reject);
        req.write(data);
        req.end();
    });
}
