import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  cacheTtlHours: parseInt(process.env.CACHE_TTL_HOURS || "24", 10),
} as const;

export function validateConfig(): void {
  if (!config.supabaseUrl) {
    throw new Error("SUPABASE_URL is required");
  }
  if (!config.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");
  }
}
