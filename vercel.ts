import type { VercelConfig } from "@vercel/config/v1/types";

const config: VercelConfig = {
  crons: [
    { path: "/api/cron/smart-reminder", schedule: "0 9 * * *" },
    { path: "/api/cron/weekly-report", schedule: "0 9 * * 0" },
    { path: "/api/cron/prediction-alert", schedule: "0 20 * * *" },
  ],
};

export default config;
