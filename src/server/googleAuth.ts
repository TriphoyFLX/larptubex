import { OAuth2Client } from 'google-auth-library';

let oauthClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_NOT_CONFIGURED');
  }
  if (!oauthClient) {
    oauthClient = new OAuth2Client(clientId);
  }
  return oauthClient;
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}

export async function verifyGoogleIdToken(idToken: string) {
  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || !payload.email_verified) {
    throw new Error('GOOGLE_EMAIL_UNVERIFIED');
  }
  return {
    email: payload.email.toLowerCase(),
    displayName: payload.name || payload.email.split('@')[0],
    avatar: payload.picture,
    googleSub: payload.sub,
  };
}
