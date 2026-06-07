# Amazon Cart CLI

Local CLI and MCP server for interacting with your personal Amazon cart through browser automation. The CLI is the default workflow in this fork; the MCP server is still available for local MCP-compatible clients.

## ⚠️ Important Disclaimer

**This tool uses browser automation to interact with Amazon.com.**

- **Users are solely responsible** for ensuring their use complies with [Amazon's Terms of Service](https://www.amazon.com/gp/help/customer/display.html?nodeId=508088)
- This project is **for personal, educational use only** - not for commercial automation or reselling
- **Use at your own risk** - the authors assume no liability for any violations of Amazon's policies or consequences thereof
- **Not affiliated with Amazon** - this is an independent, unofficial tool
- Amazon may change their website or policies at any time, potentially breaking functionality
- Excessive automation may result in account restrictions or bans

By using this software, you acknowledge and accept these risks.

## Features

- 🔍 **Search Amazon** - Find products by search query
- 🛒 **Add to Cart** - Add items to your Amazon cart automatically
- 👀 **View Cart** - Check current cart contents and subtotal
- 🥬 **Whole Foods / Fresh** - Search, add to cart, and view grocery cart contents
- 🔐 **Login Persistence** - Session saved locally for seamless use
- 💻 **Local CLI** - Use the same operations without exposing a network server
- 🌐 **Optional MCP Server** - Bearer-token-protected MCP endpoint bound to localhost by default

## Quick Start

### Prerequisites

- Node.js v20 or higher
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ronnie3786/amazon-mcp-server.git
   cd amazon-mcp-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and set:
   - `AUTH_TOKEN` - Generate a secure random token if you plan to run the MCP server
   - `HEADLESS=false` - For first-time login and visible browser use
   - `AMAZON_DOMAIN=amazon.com` - Or your local Amazon domain

4. **Build the project:**
   ```bash
   npm run build
   ```

5. **Log in once:**
   ```bash
   npm run cli -- login
   ```

   A Chrome browser window opens. Log into Amazon manually, complete MFA/CAPTCHA if needed, then press Enter in the terminal.

6. **Use the CLI:**
   ```bash
   npm run cli -- status
   npm run cli -- search "wireless mouse"
   npm run cli -- add --asin B000000000 --quantity 1
   npm run cli -- cart
   npm run cli -- wholefoods search "strawberries"
   ```

## CLI Commands

```bash
amazon-cart login [--headless]
amazon-cart status [--json]
amazon-cart search <query> [--json]
amazon-cart add [--asin ASIN | --query QUERY | <query-or-asin>] [--quantity N] [--json]
amazon-cart cart [--json]
amazon-cart save-session [--json]
amazon-cart wholefoods search <query> [--json]
amazon-cart wholefoods add [--asin ASIN | --query QUERY | <query-or-asin>] [--quantity N] [--json]
amazon-cart wholefoods cart [--json]
```

When installed globally or linked with `npm link`, the executable is `amazon-cart`. During development, use `npm run cli -- <command>`.

## Optional MCP Server

The server binds to `127.0.0.1` by default and requires `AUTH_TOKEN` for `/mcp` access. Set `ALLOW_UNAUTHENTICATED=true` only for short-lived local testing.

```bash
npm start
```

MCP endpoint:

```text
http://127.0.0.1:3000/mcp
```

If you expose this server through a tunnel, protect both the tunnel URL and bearer token.

## Connecting to Claude Desktop

1. Build the project: `npm run build`
2. Open Claude Desktop → Settings → Developer → Edit Config
3. Add to `mcpServers`:

```json
{
  "mcpServers": {
    "amazon-cart": {
      "command": "node",
      "args": ["/absolute/path/to/amazon-mcp-server/dist/server.js"],
      "env": {
        "AUTH_TOKEN": "your-token-here",
        "HOST": "127.0.0.1",
        "HEADLESS": "true",
        "AMAZON_DOMAIN": "amazon.com"
      }
    }
  }
}
```

4. Restart Claude Desktop
5. You should see the Amazon tools available in the tools menu (🔧)

> **First-time setup:** Run the server once with `HEADLESS=false` to log into Amazon manually. After that, set `HEADLESS=true` for Claude Desktop.

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `search_amazon` | Search for products on Amazon | `query` (required) |
| `add_to_cart` | Add a product to cart | `query` or `asin`, `quantity` (optional) |
| `view_cart` | View current cart contents | None |
| `check_login` | Verify Amazon login status | None |
| `save_session` | Save Amazon cookies from the current browser session | None |
| `search_wholefoods` | Search Whole Foods / Fresh products | `query` (required) |
| `add_to_wholefoods_cart` | Add grocery item to Whole Foods / Fresh cart | `query` or `asin`, `quantity` (optional) |
| `view_wholefoods_cart` | View Whole Foods / Fresh cart contents | None |

## Architecture

```
┌─────────────────┐
│   CLI / MCP     │ (Local process)
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Puppeteer     │ (Browser Automation)
│  + Chrome       │
│  (Persistent    │
│   Session)      │
└─────────────────┘
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | MCP server bind host |
| `PORT` | `3000` | Server port |
| `AUTH_TOKEN` | *required for MCP* | Bearer token for MCP authentication |
| `ALLOW_UNAUTHENTICATED` | `false` | Allow unauthenticated MCP access for short-lived local testing only |
| `AMAZON_DOMAIN` | `amazon.com` | Amazon domain (e.g., amazon.co.uk) |
| `HEADLESS` | `false` | Run browser in headless mode |
| `USER_DATA_DIR` | `./user-data` | Chrome user data directory |
| `EXTEND_SESSION_COOKIES` | `false` | Optionally extend session cookies when saving them |

### Example .env

```bash
HOST=127.0.0.1
PORT=3000
AUTH_TOKEN=a1b2c3d4-e5f6-4789-a012-3b4c5d6e7f8a
ALLOW_UNAUTHENTICATED=false
AMAZON_DOMAIN=amazon.com
HEADLESS=false
USER_DATA_DIR=./user-data
EXTEND_SESSION_COOKIES=false
```

## Security

### ⚠️ Important Security Considerations

1. **AUTH_TOKEN Protection**
   - Never commit `.env` to Git (already in `.gitignore`)
   - Use a cryptographically secure random token
   - Generate with: `openssl rand -hex 32`

2. **Remote Tunnel Security**
   - Prefer the CLI or localhost-only MCP server
   - If you expose MCP remotely, protect both the URL and bearer token
   - Consider tunnel-level authentication and IP restrictions

3. **Session Data**
   - Login sessions stored in `./user-data/`
   - Contains cookies and authentication tokens
   - Never share or commit this directory
   - Already excluded via `.gitignore`

4. **Network Security**
   - Server only accepts authenticated requests
   - Local server binds to `127.0.0.1` by default
   - CLI commands do not start a network server

5. **Browser Automation**
   - Puppeteer runs with sandbox disabled (required for some systems)
   - Session isolation via Chrome user data directory
   - No data sent to third parties

### Best Practices

- ✅ Use strong, unique AUTH_TOKEN
- ✅ Do not expose the MCP server publicly without additional protection
- ✅ Regularly rotate AUTH_TOKEN
- ✅ Monitor server logs for suspicious activity
- ✅ Keep dependencies updated (`npm audit`)
- ✅ Use HEADLESS=true in production
- ⚠️ This is for personal use only - not production-ready for multi-user scenarios

## Troubleshooting

### CLI Cannot Find the Command

Use `npm run cli -- <command>` during development, or run `npm link` after building to install the `amazon-cart` command.

### MCP Tools Not Showing

1. Restart the server
2. Delete and re-add the MCP connection in your client
3. Check server logs for `tools/list` request
4. Verify the client is using `http://127.0.0.1:3000/mcp`

### Items Not Added to Cart

1. Verify you're logged into Amazon:
   - Check the browser window (if visible)
   - Or run `npm run cli -- status`
2. If not logged in:
   - Set `HEADLESS=false`
   - Restart server
   - Log in manually in the browser window

### Computer Sleep Mode

- Browser automation pauses when the computer sleeps
- To prevent sleep: Run `caffeinate` in a separate terminal (macOS)

## Development

### Project Structure

```
amazon-mcp/
├── src/
│   ├── server.ts       # MCP server implementation
│   ├── cli.ts          # Local command-line interface
│   ├── config.ts       # Shared environment/config helpers
│   ├── amazon.ts       # Amazon automation logic
│   ├── wholefoods.ts   # Whole Foods / Fresh automation logic
│   ├── browser.ts      # Puppeteer browser management
│   ├── session-manager.ts
│   └── types.ts        # TypeScript interfaces
├── dist/               # Compiled JavaScript (gitignored)
├── user-data/          # Chrome session data (gitignored)
├── .env                # Environment config (gitignored)
└── package.json
```

### Running in Development

```bash
npm run dev    # Uses ts-node, no build required
npm run cli -- status
```

### Building

```bash
npm run build  # Compiles TypeScript to dist/
```

## Testing

### Health Check

```bash
curl http://127.0.0.1:3000/health
```

Expected response:
```json
{"status":"ok","server":"amazon-mcp-server"}
```

### Test MCP Connection

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://127.0.0.1:3000/mcp
```

## Compliance Notes

This project is designed for **personal, single-user use only**. It is not intended for:

- ❌ Multi-tenant deployments
- ❌ Production SaaS applications
- ❌ SOC 2 Type II compliance scenarios
- ❌ HIPAA or other regulated data handling
- ❌ Commercial automation at scale

If you need enterprise-grade compliance, consider:
- Implementing proper authentication (OAuth 2.0)
- Adding audit logging
- Using encrypted storage for sessions
- Deploying to compliant infrastructure (AWS, GCP with compliance certifications)
- Implementing rate limiting and abuse prevention

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Issues:** [GitHub Issues](https://github.com/ronnie3786/amazon-mcp-server/issues)
- 📧 **Contact:** via GitHub

## Author

Forked from [@madebydia/amazon-mcp-server](https://github.com/madebydia/amazon-mcp-server).

---

**Note:** Keep your computer awake while running long browser automation sessions.
