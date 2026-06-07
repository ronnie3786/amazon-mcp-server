import path from 'path';

export function getAmazonDomain(): string {
  return process.env.AMAZON_DOMAIN || 'amazon.com';
}

export function getAmazonBaseUrl(): string {
  return `https://www.${getAmazonDomain()}`;
}

export function getUserDataDir(): string {
  return path.resolve(process.env.USER_DATA_DIR || './user-data');
}

export function getServerHost(): string {
  return process.env.HOST || '127.0.0.1';
}

export function shouldExtendSessionCookies(): boolean {
  return process.env.EXTEND_SESSION_COOKIES === 'true';
}
