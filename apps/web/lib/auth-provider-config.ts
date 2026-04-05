function readEnvValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function resolveSocialProvider(
  clientIdEnv?: string | null,
  clientSecretEnv?: string | null,
) {
  const clientId = readEnvValue(clientIdEnv);
  const clientSecret = readEnvValue(clientSecretEnv);

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
  };
}

export function getConfiguredSocialProviders() {
  const google = resolveSocialProvider(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  const github = resolveSocialProvider(
    process.env.GITHUB_CLIENT_ID,
    process.env.GITHUB_CLIENT_SECRET,
  );

  return {
    ...(google ? { google } : {}),
    ...(github ? { github } : {}),
  };
}

export function getMagicLinkEmailConfig() {
  const resendApiKey = readEnvValue(process.env.RESEND_API_KEY);
  const authEmailFrom = readEnvValue(process.env.AUTH_EMAIL_FROM);

  return {
    resendApiKey,
    authEmailFrom,
    isConfigured: Boolean(resendApiKey && authEmailFrom),
    allowConsoleFallback: process.env.NODE_ENV !== 'production',
  };
}

export function getAuthMethodAvailability() {
  const socialProviders = getConfiguredSocialProviders();
  const magicLinkEmail = getMagicLinkEmailConfig();

  return {
    google: Boolean(socialProviders.google),
    github: Boolean(socialProviders.github),
    magicLink: magicLinkEmail.isConfigured || magicLinkEmail.allowConsoleFallback,
  };
}
