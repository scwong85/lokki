# Online co-op setup: room codes and a free relay

Online co-op works with **nothing to set up**: the host and the guest swap two long codes in any chat. This guide is for two optional upgrades, both free:

| Upgrade | What it gives you | Needed? |
|---|---|---|
| **Room service** (part 2) | A short code like `K7QX2M` instead of two long ones | Nice to have |
| **Relay** (part 3) | Connects the roughly 1 in 5 home and mobile networks that cannot connect directly | Only if friends see "connection failed" |

Neither sees your game: the room service only swaps the two connection codes, and a relay only forwards encrypted packets. Single player never touches either.

> **Check before you rely on it.** I wrote this from memory of the Cloudflare dashboard and could not open Cloudflare's pages from the build environment, so button names and free-tier numbers may have moved. The game side is tested (`tests/smoke/coop-rooms.spec.ts` runs the real room service code); the Cloudflare side is the part to double-check against https://developers.cloudflare.com/workers/ and https://developers.cloudflare.com/realtime/turn/.

## Part 1: what you need
- A free **Cloudflare account** (https://dash.cloudflare.com/sign-up). No card is needed for Workers and KV on the free plan.
- **Node 22** and this repo (you already have both).

## Part 2: the room service (short room codes)

1. **Log in** from the repo folder:
   ```bash
   cd server/signal
   npx wrangler login
   ```
   A browser tab opens; allow access.
2. **Create the storage** (a tiny key-value store where rooms live for 10 minutes):
   ```bash
   npx wrangler kv namespace create ROOMS
   ```
   It prints an `id`. Paste it into `server/signal/wrangler.toml` replacing `PASTE_THE_ID_FROM_WRANGLER_HERE`.
3. **Deploy**:
   ```bash
   npx wrangler deploy
   ```
   It prints your address, like `https://lokki-rooms.YOURNAME.workers.dev`.
4. **Test it** (should print `{"iceServers":[]}`):
   ```bash
   curl https://lokki-rooms.YOURNAME.workers.dev/turn
   ```
5. **Tell the game the address.** Either:
   - **Per player:** in the game press **N**, open **Settings**, paste the address into *Room service*, **Save**. The lobby now offers *Host a game* / *Join with a room code*. Each player does this once on their device (it is remembered in that browser).
   - **For everyone** (baked into the site): in your GitHub repo go to *Settings → Secrets and variables → Actions → Variables*, add a variable named `SIGNAL_URL` with the address, and re-run the *Deploy* workflow. The deployed game then uses it by default.
6. **Optional lock-down:** in `wrangler.toml` uncomment `[vars]` and set `ALLOW_ORIGIN` to your game's address (for example `https://YOURNAME.github.io`), then `npx wrangler deploy` again. Browsers on other sites will then be refused.

**Limits and behaviour:** rooms last 10 minutes; the first answer wins (a stranger cannot take over a room once your friend joined); the free plan allows 100,000 requests per day, hundreds of times more than co-op needs. Cloudflare KV can take up to a minute to show a new room in a far-away data centre; if "No such room" appears for a code that was just made, wait a few seconds and press Join again.

## Part 3: a free relay (TURN)

A relay only matters if peer to peer fails. You have two ways to get one; the game accepts either.

### Option A: Cloudflare Realtime TURN through your room service (automatic)
1. In the Cloudflare dashboard open **Realtime** (sometimes listed under *Calls*) → **TURN** and **create a TURN key**. Note the **Key ID** and the **API token** it shows once.
2. Give them to your room service as secrets (run in `server/signal`; it asks you to paste each value):
   ```bash
   npx wrangler secret put TURN_KEY_ID
   npx wrangler secret put TURN_API_TOKEN
   ```
3. Check it (should now list `turn:` servers with a short-lived username and credential):
   ```bash
   curl https://lokki-rooms.YOURNAME.workers.dev/turn
   ```
   From then on the game fetches fresh relay credentials by itself every time someone hosts or joins. Nothing secret reaches the browser except credentials that expire after an hour.

Cloudflare's relay has a monthly free allowance (check the current number on their pricing page; it has been about 1,000 GB at the time of writing). A co-op game uses a few megabytes per hour, and only for players who need the relay.

### Option B: any free TURN provider, pasted by hand
Providers such as Metered (https://www.metered.ca/tools/openrelay/ and their free plan) hand out a TURN address, a user name and a password. In the game press **N → Settings** and paste them into *Relay* as JSON:
```json
[{"urls": "turn:YOUR-RELAY-HOST:443?transport=tcp", "username": "YOUR-USER", "credential": "YOUR-PASSWORD"}]
```
The game checks the JSON when you press Save. Both players should add it (a relay helps whichever side needs it). Because this is stored in the browser, do not use a paid plan's master key here; use the free plan's credentials.

## Quick fix for "connection failed"
Most failures are two networks that cannot reach each other directly. On **both** devices: press **N → Settings → Use a free public relay → Save**, then host and join again. The lobby now also shows what it found (for example "ice checking; you found 2 local, 1 public, 0 relay") and a plain-words reason when it gives up; send me that line if it still fails. The public relay is a free community service (Metered Open Relay): game packets pass through it encrypted, but its availability is not guaranteed, so for anything long-term set up your own (Part 3).

## If it still does not connect
1. Both players: press **N**, check the status line under the code.
2. Try the same two windows on one PC (always works): proves the game is fine.
3. Try both on the same Wi-Fi. If that works but the internet does not, you need a relay (Part 3).
4. Strict company or school networks often block everything except the web; there a relay on port 443 over TCP (`turns:` or `?transport=tcp`) is the only option.
5. Phones on mobile data sit behind carrier networks that usually need the relay.
