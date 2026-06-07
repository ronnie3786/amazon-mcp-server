import { Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { getUserDataDir, shouldExtendSessionCookies } from './config';

function getCookiesFile(): string {
  return path.join(getUserDataDir(), 'amazon-session-cookies.json');
}

interface SerializedCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

/**
 * Save current Amazon cookies to a local JSON file.
 */
export async function saveAmazonSession(page: Page): Promise<void> {
  try {
    const cookies = await page.cookies();
    const amazonCookies = cookies.filter(c => c.domain.includes('amazon'));
    const cookiesFile = getCookiesFile();
    fs.mkdirSync(path.dirname(cookiesFile), { recursive: true });

    const oneYearFromNow = Date.now() / 1000 + (365 * 24 * 60 * 60);
    const serializedCookies = amazonCookies.map(cookie => {
      if (shouldExtendSessionCookies() && (!cookie.expires || cookie.expires === -1)) {
        return { ...cookie, expires: oneYearFromNow };
      }

      return cookie;
    });

    fs.writeFileSync(cookiesFile, JSON.stringify(serializedCookies, null, 2), { mode: 0o600 });
    console.log(`Saved ${serializedCookies.length} Amazon cookies to ${cookiesFile}`);

    const sessionCookies = amazonCookies.filter(c => !c.expires || c.expires === -1);
    if (sessionCookies.length > 0) {
      const note = shouldExtendSessionCookies()
        ? `Converted ${sessionCookies.length} session cookies to persistent cookies`
        : `${sessionCookies.length} session cookies saved without extending expiration`;
      console.log(note);
    }
  } catch (error) {
    console.error('Failed to save Amazon session:', error);
  }
}

/**
 * Restore Amazon cookies from the saved JSON file
 * Call this after browser launch to restore the session
 */
export async function restoreAmazonSession(page: Page): Promise<boolean> {
  try {
    const cookiesFile = getCookiesFile();
    if (!fs.existsSync(cookiesFile)) {
      console.log('ℹ No saved Amazon session found');
      return false;
    }

    const cookiesData = fs.readFileSync(cookiesFile, 'utf-8');
    const cookies: SerializedCookie[] = JSON.parse(cookiesData);

    // Filter out expired cookies
    const now = Date.now() / 1000;
    const validCookies = cookies.filter(c => !c.expires || c.expires === -1 || c.expires > now);

    if (validCookies.length === 0) {
      console.log('⚠️  All saved Amazon cookies have expired');
      return false;
    }

    await page.setCookie(...validCookies);
    console.log(`Restored ${validCookies.length} Amazon cookies from saved session`);

    if (validCookies.length < cookies.length) {
      console.log(`  (${cookies.length - validCookies.length} expired cookies were skipped)`);
    }

    return true;
  } catch (error) {
    console.error('Failed to restore Amazon session:', error);
    return false;
  }
}

/**
 * Check if the user is currently logged in to Amazon
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    const accountText = await page.evaluate(() => {
      const accountList = document.querySelector('#nav-link-accountList-nav-line-1');
      return accountList?.textContent?.trim() || '';
    });

    return accountText.includes('Hello');
  } catch {
    return false;
  }
}
