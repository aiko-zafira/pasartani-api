export function validateEnv(config: Record<string, unknown>) {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Variabel environment belum diisi: ${missing.join(', ')}`);
  }
  return config;
}