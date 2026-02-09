export const config = {
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  sga: {
    baseUrl: "https://api.hinova.com.br/api/sga/v2",
  },
  atomos: {
    baseUrl: "https://api.chat.atomos.tech/chat/v1",
  },
  port: Number(process.env.PORT ?? 3000),
} as const;

function validateConfig(): void {
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error(
      "Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
}

validateConfig();
