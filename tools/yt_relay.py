#!/usr/bin/env python3
"""Step 08 runner side — executed INSIDE GitHub Actions (open internet),
never in the sandbox (googleapis.com is on its SNI blocklist).

Modes (request.json in cwd):
  kind=auth   code.txt  -> OAuth code exchange -> out/token.pickle.enc
  kind=video  final.mp4 + token.pickle.enc -> YouTube upload -> out/result.json

Every credential crossing the public repo is encrypted:
  openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -pass pass:<client_secret>
The client_secret itself arrives only via the YT_CLIENT_JSON Actions secret —
the sandbox has a copy of the same file, so both sides share the key without it
ever touching a public branch.
"""
import base64
import json
import os
import pickle
import subprocess
import sys
from pathlib import Path

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
PASS_ARGS = ["openssl", "enc", "-aes-256-cbc", "-pbkdf2", "-iter", "200000", "-md", "sha256"]


def die(msg):
    print(f"::error::{msg}", flush=True)
    sys.exit(1)


def openssl(data: bytes, decrypt: bool, password: str) -> bytes:
    cmd = PASS_ARGS + (["-d"] if decrypt else []) + ["-pass", f"pass:{password}"]
    r = subprocess.run(cmd, input=data, capture_output=True)
    if r.returncode != 0:
        die(f"openssl {'dec' if decrypt else 'en'}cryption failed: {r.stderr.decode()[:200]}")
    return r.stdout


def client_cfg() -> dict:
    raw = os.environ.get("YT_CLIENT_JSON", "").strip()
    if not raw:
        die("YT_CLIENT_JSON secret is empty")
    try:
        cfg = json.loads(base64.b64decode(raw))
    except Exception:
        cfg = json.loads(raw)  # allow plain JSON as secret value too
    return cfg


def secret(cfg: dict) -> str:
    inner = next(iter(cfg.values()))
    return inner["client_secret"]


def flow_from(cfg: dict, redirect: str):
    from google_auth_oauthlib.flow import Flow
    flow = Flow.from_client_config(cfg, scopes=SCOPES)
    flow.redirect_uri = redirect
    return flow


def mode_auth(req: dict, cfg: dict) -> dict:
    code_path = Path("code.txt")
    code_path.is_file() or die("code.txt missing on request branch")
    code = code_path.read_text().strip()
    redirect = req.get("redirect_uri", "http://localhost:8899/")
    flow = flow_from(cfg, redirect)
    print("exchanging authorization code for tokens ...")
    flow.fetch_token(code=code)
    creds = flow.credentials
    blob = pickle.dumps(creds, protocol=pickle.HIGHEST_PROTOCOL)
    Path("out").mkdir(exist_ok=True)
    Path("out/token.pickle.enc").write_bytes(openssl(blob, False, secret(cfg)))
    return {
        "kind": "auth",
        "has_refresh_token": bool(creds.refresh_token),
        "scopes": sorted(creds.scopes or []),
        "note": "encrypted with AES-256-CBC/PBKDF2, pass=client_secret; "
                "store the .enc file gitignored as secrets/youtube-token.pickle.enc",
    }


def mode_video(req: dict, cfg: dict) -> dict:
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload

    enc = Path("token.pickle.enc").read_bytes()
    creds = pickle.loads(openssl(enc, True, secret(cfg)))
    if not creds.valid:
        print("refreshing access token ...")
        creds.refresh(Request())

    body = {
        "snippet": {
            "title": req["title"],
            "description": req["description"],
            "tags": req.get("tags", []),
            "categoryId": str(req.get("category_id", "28")),
        },
        "status": {
            "privacyStatus": req.get("privacy_status", "private"),
            "selfDeclaredMadeForKids": bool(req.get("made_for_kids", False)),
        },
    }
    media = MediaFileUpload("final.mp4", mimetype="video/mp4",
                            chunksize=8 * 1024 * 1024, resumable=True)
    yt = build("youtube", "v3", credentials=creds)
    call = yt.videos().insert(part="snippet,status", body=body, media_body=media)
    response = None
    while response is None:
        status, response = call.next_chunk()
        if status:
            print(f"upload {int(status.progress() * 100)}%")
    vid = response["id"]
    return {
        "kind": "video",
        "video_id": vid,
        "url": f"https://youtu.be/{vid}",
        "studio_url": f"https://studio.youtube.com/video/{vid}",
        "title": req["title"],
        "privacy_status": body["status"]["privacyStatus"],
        "status": response.get("status", {}),
    }


def main():
    req = json.loads(Path("request.json").read_text())
    cfg = client_cfg()
    kind = req.get("kind")
    if kind == "idonly":
        result = {"kind": "idonly", "ok": True}
    elif kind == "auth":
        result = mode_auth(req, cfg)
    elif kind == "video":
        result = mode_video(req, cfg)
    else:
        die(f"unknown kind: {kind}")
    result["request_id"] = req.get("id")
    Path("out").mkdir(exist_ok=True)
    Path("out/RESULT.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
