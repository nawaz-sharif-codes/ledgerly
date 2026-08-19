export interface Environment {
  PORT: number;
  CORS_ORIGINS: string[];
  LOG_LEVEL: string;
}

function readString(
  value: unknown,
  fallback: string,
  variableName: string,
): string {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value !== 'string') {
    throw new Error(`${variableName} must be a string`);
  }

  return value;
}

export function validateEnvironment(
  environment: Record<string, unknown>,
): Environment {
  const port = Number(environment.PORT ?? 3001);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  const corsOrigins = readString(
    environment.CORS_ORIGINS,
    'http://localhost:3000',
    'CORS_ORIGINS',
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must contain at least one origin');
  }

  return {
    PORT: port,
    CORS_ORIGINS: corsOrigins,
    LOG_LEVEL: readString(environment.LOG_LEVEL, 'info', 'LOG_LEVEL'),
  };
}
