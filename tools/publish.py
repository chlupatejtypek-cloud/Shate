#!/usr/bin/env python3
"""Step 08 sandbox side — see steps/08-publish.md.

  consent-url SECRETS_JSON              print the OAuth consent URL to give the human
  code-from-url PASTED_REDIRECT_URL     extract the OAuth code from the pasted URL
  package-video output/<slug>           stage a publish-request payload in /tmp/publish-<slug>
                                       (request.json + final.mp4 + token.pickle.enc)

The OAuth dance itself never runs here: googleapis.com is unreachable from the
sandbox; exchange + upload happen on the runner (tools/yt_relay.py). Only the
AES-encrypted token crosses public branches — pass = client_secret, which is
never committed (survives only in secrets/ (gitignored) and the YT_CLIENT_JSON
Actions secret).
"""
import json
import re
import shutil
import subprocess
import sys
import urllib.parse
from pathlib import Path

SCOPE = "https://www.googleapis.com/auth/youtube.upload"
REDIRECT = "http://localhost:8899/"
REPO = Path(__file__).resolve().parent.parent
SECRETS = REPO / "secrets"
PASS_ARGS = ["openssl", "enc", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-md", "sha256"]


def load_client(path: str) -> dict:
    cfg = json.loads(Path(path).read_text())
    next(iter(cfg.values()))  # validate installed/web wrapper
    return cfg


def consent_url(secrets_json: str) -> str:
    cfg = load_client(secrets_json)
    inner = next(iter(cfg.values()))
    q = urllib.parse.urlencode({
        "client_id": inner["client_id"],
        "redirect_uri": REDIRECT,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",          # force refresh_token on every consent
        "include_granted_scopes": "false",
    })
    print(f"REDIRECT_URI={REDIRECT}")
    print(f"Open this URL in the browser of the YouTube channel's Google account:")
    return f"https://accounts.google.com/o/oauth2/v2/auth?{q}"


def code_from_url(pasted: str) -> str:
    pasted = pasted.strip().strip('"')
    q = urllib.parse.parse_qs(urllib.parse.urlsplit(pasted.replace("#", "?")).query)
    code = (q.get("code") or [None])[0]
    if not code:
        sys.exit("no ?code= in that URL — paste the FULL address-bar URL after consent "
                 "(the page that fails to load is expected, the code is in its URL)")
    return code


def parse_metadata(slug_dir: Path) -> dict:
    md = (slug_dir / "metadata.md").read_text()

    def section(name: str) -> str:
        m = re.search(rf"^## {re.escape(name)}\s*\n(.*?)(?=^## |\Z)", md, re.M | re.S)
        return (m.group(1).strip() if m else "")

    title = next((l.strip() for l in section("Title").splitlines() if l.strip()), "")
    desc = section("Description")
    tags_line = next((l.strip() for l in section("Tags").splitlines() if l.strip()), "")
    tags = [t.strip() for t in tags_line.split(",") if t.strip()]
    if not title or not desc:
        sys.exit(f"metadata.md in {slug_dir} is missing Title or Description")
    return {"title": title, "description": desc, "tags": tags}


def encrypt_file(src: Path, dst: Path, password: str):
    data = src.read_bytes()
    r = subprocess.run(PASS_ARGS + ["-pass", f"pass:{password}"],
                       input=data, capture_output=True, check=True)
    dst.write_bytes(r.stdout)


def package_video(slug: str) -> Path:
    vid = REPO / "output" / slug
    meta = parse_metadata(vid)
    enc = SECRETS / "youtube-token.pickle.enc"
    if not enc.is_file():
        sys.exit(f"{enc} missing — run the auth flow first (steps/08-publish.md §2)")
    stage = Path(f"/tmp/publish-{slug}")
    shutil.rmtree(stage, ignore_errors=True)
    stage.mkdir(parents=True)
    import time
    rid = f"{slug}-{int(time.time())}"
    (stage / "request.json").write_text(json.dumps({
        "id": rid, "kind": "video", "slug": slug,
        "title": meta["title"], "description": meta["description"],
        "tags": meta["tags"], "privacy_status": "private",
        "category_id": "28", "redirect_uri": REDIRECT,
    }, indent=2, ensure_ascii=False) + "\n")
    shutil.copy2(vid / "final.mp4", stage / "final.mp4")
    shutil.copy2(enc, stage / "token.pickle.enc")
    print(f"staged {stage} (id={rid}, privacy=private)")
    return stage


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "consent-url":
        print(consent_url(sys.argv[2]))
    elif cmd == "code-from-url":
        print(code_from_url(sys.argv[2]))
    elif cmd == "package-video":
        package_video(sys.argv[2])
    elif cmd == "secrets-dir":
        SECRETS.mkdir(exist_ok=True)
        print(SECRETS)
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
