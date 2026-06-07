#!/usr/bin/env node

import dotenv from 'dotenv';
import { stdin as input, stdout as output } from 'process';
import readline from 'readline/promises';
import { addToCart, checkLoginStatus, getCart, searchProducts } from './amazon';
import { closeBrowser, getBrowser, getPage } from './browser';
import { getAmazonBaseUrl, getAmazonDomain } from './config';
import { saveAmazonSession, restoreAmazonSession } from './session-manager';
import { addToWholeFoodsCart, getWholeFoodsCart, searchWholeFoods } from './wholefoods';

dotenv.config();

type ParsedArgs = {
  command: string[];
  flags: Record<string, string | boolean>;
  positionals: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  const command: string[] = [];
  const positionals: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let parsingFlags = true;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--') {
      parsingFlags = false;
      continue;
    }

    if (parsingFlags && arg.startsWith('--')) {
      const [rawName, inlineValue] = arg.slice(2).split('=', 2);
      const name = rawName.trim();

      if (inlineValue !== undefined) {
        flags[name] = inlineValue;
      } else {
        const next = argv[i + 1];
        if (next && !next.startsWith('-')) {
          flags[name] = next;
          i += 1;
        } else {
          flags[name] = true;
        }
      }
      continue;
    }

    if (parsingFlags && arg.startsWith('-') && arg.length > 1) {
      const name = arg.slice(1);
      const next = argv[i + 1];
      if (['q', 'd', 'p'].includes(name) && next && !next.startsWith('-')) {
        flags[name] = next;
        i += 1;
      } else {
        flags[name] = true;
      }
      continue;
    }

    if (command.length < 2) {
      command.push(arg);
    } else {
      positionals.push(arg);
    }
  }

  return { command, flags, positionals };
}

function getStringFlag(flags: Record<string, string | boolean>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === 'string') return value;
  }
  return undefined;
}

function getQuantity(flags: Record<string, string | boolean>): number {
  const value = getStringFlag(flags, 'quantity', 'q');
  if (!value) return 1;

  const quantity = Number(value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Quantity must be a positive integer.');
  }

  return quantity;
}

function looksLikeAsin(value: string): boolean {
  return /^[A-Z0-9]{10}$/i.test(value);
}

function getAddParams(flags: Record<string, string | boolean>, positionals: string[]) {
  const asin = getStringFlag(flags, 'asin');
  const query = getStringFlag(flags, 'query');
  const fallback = positionals.join(' ').trim();

  if (asin && query) {
    throw new Error('Use either --asin or --query, not both.');
  }

  if (asin) return { asin, quantity: getQuantity(flags) };
  if (query) return { query, quantity: getQuantity(flags) };
  if (fallback) {
    return looksLikeAsin(fallback)
      ? { asin: fallback, quantity: getQuantity(flags) }
      : { query: fallback, quantity: getQuantity(flags) };
  }

  throw new Error('Provide an ASIN or product query.');
}

function printHelp(): void {
  output.write(`amazon-cart

Usage:
  amazon-cart login [--headless]
  amazon-cart status [--json]
  amazon-cart search <query> [--json]
  amazon-cart add [--asin ASIN | --query QUERY | <query-or-asin>] [--quantity N] [--json]
  amazon-cart cart [--json]
  amazon-cart save-session [--json]
  amazon-cart wholefoods search <query> [--json]
  amazon-cart wholefoods add [--asin ASIN | --query QUERY | <query-or-asin>] [--quantity N] [--json]
  amazon-cart wholefoods cart [--json]

Options:
  --domain DOMAIN        Amazon marketplace domain, default: AMAZON_DOMAIN or amazon.com
  --profile-dir DIR     Chrome user data directory, default: USER_DATA_DIR or ./user-data
  --headless            Run Chrome headlessly
  --show-browser        Force visible Chrome
  --json                Print raw JSON
  -q, --quantity N      Quantity for add commands
  -h, --help            Show this help
`);
}

function applyGlobalFlags(flags: Record<string, string | boolean>): void {
  const domain = getStringFlag(flags, 'domain', 'd');
  const profileDir = getStringFlag(flags, 'profile-dir', 'p');

  if (domain) process.env.AMAZON_DOMAIN = domain;
  if (profileDir) process.env.USER_DATA_DIR = profileDir;
  if (flags.headless === true) process.env.HEADLESS = 'true';
  if (flags['show-browser'] === true) process.env.HEADLESS = 'false';
}

function printResult(result: any, json: boolean): void {
  if (json) {
    output.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  output.write(`${result.message}\n`);

  if (result.data?.items) {
    for (const item of result.data.items) {
      output.write(`- ${item.title} | ${item.price} | qty ${item.quantity} | ${item.asin}\n`);
    }
    const subtotal = result.data.subtotal || result.data.total;
    if (subtotal) output.write(`Subtotal: ${subtotal}\n`);
    return;
  }

  if (Array.isArray(result.data)) {
    for (const item of result.data) {
      output.write(`- ${item.title} | ${item.price} | ${item.rating || item.perUnit || ''} | ${item.asin}\n`);
    }
    return;
  }

  if (result.data && typeof result.data === 'object') {
    output.write(`${JSON.stringify(result.data, null, 2)}\n`);
  }
}

async function initializeBrowser(): Promise<void> {
  await getBrowser();
  const page = await getPage();
  await restoreAmazonSession(page);
}

async function runLogin(json: boolean): Promise<void> {
  process.env.HEADLESS = process.env.HEADLESS || 'false';
  await initializeBrowser();

  const page = await getPage();
  await page.goto(getAmazonBaseUrl(), { waitUntil: 'networkidle2' });

  output.write(`Opened https://www.${getAmazonDomain()} in Chrome.\n`);
  output.write('Log in there, complete MFA/CAPTCHA if prompted, then press Enter here.\n');

  const rl = readline.createInterface({ input, output });
  await rl.question('');
  rl.close();

  await saveAmazonSession(page);
  const result = await checkLoginStatus();
  printResult(result, json);
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  applyGlobalFlags(parsed.flags);

  const json = parsed.flags.json === true;
  const [first, second] = parsed.command;

  if (!first || first === 'help' || parsed.flags.help === true || parsed.flags.h === true) {
    printHelp();
    return;
  }

  let result: any;

  try {
    if (first === 'login') {
      await runLogin(json);
      return;
    }

    if (first === 'status') {
      await initializeBrowser();
      result = await checkLoginStatus();
    } else if (first === 'search') {
      const query = [second, ...parsed.positionals].filter(Boolean).join(' ').trim();
      if (!query) throw new Error('Search query is required.');
      await initializeBrowser();
      result = await searchProducts(query);
    } else if (first === 'add') {
      const params = getAddParams(parsed.flags, [second, ...parsed.positionals].filter(Boolean));
      await initializeBrowser();
      result = await addToCart(params);
    } else if (first === 'cart') {
      await initializeBrowser();
      result = await getCart();
    } else if (first === 'save-session') {
      await initializeBrowser();
      const page = await getPage();
      await saveAmazonSession(page);
      result = { success: true, message: 'Amazon session saved.' };
    } else if (first === 'wholefoods') {
      if (second === 'search') {
        const query = parsed.positionals.join(' ').trim();
        if (!query) throw new Error('Whole Foods search query is required.');
        await initializeBrowser();
        result = await searchWholeFoods(query);
      } else if (second === 'add') {
        const params = getAddParams(parsed.flags, parsed.positionals);
        await initializeBrowser();
        result = await addToWholeFoodsCart(params);
      } else if (second === 'cart') {
        await initializeBrowser();
        result = await getWholeFoodsCart();
      } else {
        throw new Error('Unknown Whole Foods command. Use search, add, or cart.');
      }
    } else {
      throw new Error(`Unknown command: ${first}`);
    }

    printResult(result, json);
    if (!result.success) process.exitCode = 1;
  } finally {
    await closeBrowser();
  }
}

main().catch(async (error) => {
  await closeBrowser().catch(() => {});
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
