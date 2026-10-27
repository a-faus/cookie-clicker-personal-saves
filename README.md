# Cookie Clicker with personal saves

This repository hosts Cookie Clicker v2.058 and adds separate saves for signed-in players. The game files were taken from the [ozh/cookieclicker mirror](https://github.com/ozh/cookieclicker), which mirrors the browser version by Orteil and DashNet. Cookie Clicker, its code, graphics, sounds, writing, and trademarks remain © Orteil / DashNet. This is not an official DashNet site.

The site owner has stated that they have permission from Orteil to republish the game. The source files retain the original copyright notice. The only game-page changes are a per-player save suffix, local hosting mode, and removal of injected advertising and challenge scripts. The original achievements, buildings, upgrades, minigames, and built-in export/import save functions remain in the game code.

## Personal progress

- The unmodified game save format is used. Signed-in users have their own browser storage key and a cloud save in Cloudflare D1, keyed by the Site's stable authenticated user ID.
- The newest local or cloud backup loads before the game starts. A save is pushed to the account every 12 seconds while the game is open.
- Guests can play with a browser-local save. The game's Options menu still supports export and import.
- User save data is stored in the hosted database, not this GitHub repository.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm ci
npm run db:generate
npm run dev
```

For a local signed-in test, visit `/signin-with-chatgpt?return_to=/`. Apply `drizzle/0000_daily_sway.sql` to local D1 before testing account saves. The deployment uses OpenAI Sites and its managed ChatGPT sign-in.
