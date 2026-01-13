// Environment variable validation
// Ensures all required configuration is present before server starts

const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET'
];

export function validateEnvironment(): void {
  const missing: string[] = [];

  for (const envVariable of requiredEnvVars) {
    if (!process.env[envVariable]) {
      missing.push(envVariable);
    }
  }

  if (missing.length > 0) {
    console.error('FATAL ERROR: Missing required environment variables:');
    missing.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Validate JWT_SECRET is not the default placeholder
  if (process.env.JWT_SECRET === 'secret-key-change-in-production') {
    console.error('FATAL ERROR: JWT_SECRET is set to the default placeholder value.');
    console.error(' Please use a secure random string for production.');
    process.exit(1);
  }

  console.log('Environment validation passed');
}
