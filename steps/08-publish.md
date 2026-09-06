# Step 08 — Publish (YouTube)

> Pipeline step **08 of 8** (added 2026-09-06 at the human's request). Uploads
> `final.mp4` with the metadata from step 07 to the channel's YouTube account.
> Self-contained: read this whole file, do the work, verify the Definition of
> Done, then report to the human.

## What you produce

- **`output/<video-slug>/08-publish/publish.json`** — video id, url, privacy status
- **`secrets/youtube-token.pickle.enc`** (one-time, git-ignored) — the encrypted
  OAuth token reused by every later upload
- **One new row is NOT added here** — history is step 07's job and already done

## Why a relay again

Same wall as step 04, other direction: the sandbox cannot reach `googleapis.com`
(SNI allowlist → only github.com/pypi are open), a **GitHub runner can**. And
YouTube OAuth needs (a) a browser consent by the human, (b) a client secret that
must never sit in a public branch. So:

| Need | Where it lives |
|------|----------------|
| `client_secrets.json` (OAuth client) | chat-attached once → `secrets/client_secrets.json` (**git-ignored**) + base64 in the Actions secret `YT_CLIENT_JSON` (owner adds once, UI) |
| Refresh token (`token.pickle`) | never in plaintext outside the runner — crosses branches only **AES-256-CBC encrypted** (`-pbkdf2 -iter 200000`, pass = `client_secret`) → stored as `secrets/youtube-token.pickle.enc` |
| The upload itself | `.github/workflows/publish-youtube.yml` on `publish-request/**` branches |

The sandbox never holds a usable token; the public repo never holds a usable
secret. Files: runner logic `tools/yt_relay.py`, sandbox helpers `tools/publish.py`.

## One-time setup (first video only)

1. **`YT_CLIENT_JSON` secret.** Repo → Settings → Secrets and variables →
   Actions → New repository secret: name `YT_CLIENT_JSON`, value = base64 of
   `client_secrets.json`:
   `base64 -w0 secrets/client_secrets.json`
   (the workflow token cannot create secrets — this is a one-time human step)
2. **Consent URL.** `python3 tools/publish.py consent-url secrets/client_secrets.json`
   → hand the human the URL. They open it in the browser of the channel's Google
   account, approve. The browser lands on an unreachable `http://localhost:8899/…`
   page — **that is expected**. The human copies the full address-bar URL.
3. **Exchange (runner).** Package `request.json` (`kind: auth`) + `code.txt`
   (`code-from-url`) into a `publish-request/<id>` branch, push, wait for
   `publish-result/<id>`; fetch `token.pickle.enc` into
   `secrets/youtube-token.pickle.enc`; delete both branches.
4. **Testing-mode caveat.** If the OAuth consent screen is "Testing", refresh
   tokens die after **7 days** — re-run §2–3, or set the app to "In production"
   in Google Cloud Console → OAuth consent screen. Restricted scope
   `youtube.upload` is all this module asks for.

## Procedure (every upload)

1. `stage=$(python3 tools/publish.py package-video output/<video-slug>)` →
   `/tmp/publish-<slug>/` with `request.json` (title/description/tags from
   `metadata.md`, `privacy_status: private`, category 28 Science & Technology)
   + `final.mp4` + `token.pickle.enc`.
2. Push as `publish-request/<id>` from the session branch (same worktree pattern
   as step 04), watch the run (`gh run watch`), fetch `publish-result/<id>`.
3. On success the workflow self-deletes `publish-request/<id>`; you delete the
   result branch after collecting `RESULT.json` → save as
   `output/<video-slug>/08-publish/publish.json`.
4. On failure read `ERROR.log` on the result branch (observable-relay pattern)
   and follow the table below. Never loop-retry: fix the cause once, re-run once.

### Troubleshooting

| Error in ERROR.log | Cause | Fix |
|--------------------|-------|-----|
| `secret YT_CLIENT_JSON missing` | setup §1 not done | human adds the secret (one-time) |
| `invalid_grant` at exchange | code older than ~10 min or already exchanged | new consent URL, paste URL faster |
| `redirect_uri_mismatch` | client type≠desktop / wrong redirect in URL | rebuild consent URL (script hard-codes `http://localhost:8899/`); for "web" clients add that URI in the console |
| `invalid_grant` at refresh (upload) | testing-mode token expired (7 days) | re-run setup §2–3 |
| `uploadLimitExceeded` / `quotaExceeded` | YT Data API daily quota (default 1600 units ≈ 6 uploads) | next day, or request a quota raise |
| `youtubeSignupRequired` | Google account has no YouTube channel | create the channel once in youtube.com UI |

## Rules

- Default `privacy_status` is **`private`** — the human flips it in YouTube
  Studio (`RESULT.json` contains the studio link). Public goes only on explicit
  request (`"privacy_status": "public"` in `request.json`).
- Plaintext tokens and `client_secrets.json` never enter any branch — only the
  AES blob does, and only to git-ignored `secrets/` locally.
- Publish branches follow step 04's discipline: media enters git only as a
  temporary request branch, and that branch **self-deletes on success**.
- `made_for_kids` defaults to `false` in the request; mark true only when the
  script was actually written for children (this channel is not).

## Definition of Done

- [ ] `08-publish/publish.json` exists with `video_id`, `url`, `privacy_status`
- [ ] Upload visible in YouTube Studio at the URL (runner-confirmed 200 in RESULT)
- [ ] Title/description/tags on YT match `metadata.md` exactly
- [ ] `secrets/youtube-token.pickle.enc` refreshed if `kind=auth` ran; plaintext
      token never touched any branch
- [ ] Request branch gone (self-cleaned), result branch deleted after collect
- [ ] Final report updated with the video URL
