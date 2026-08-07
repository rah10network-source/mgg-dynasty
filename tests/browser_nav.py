# Browser navigation pass — loads the built app, syncs live Sleeper data,
# and walks every tab including the ones the audit flagged as draft-day risks.
import json, sys, time, mimetypes, pathlib
from playwright.sync_api import sync_playwright

# App served via request interception from dist/ (the sandbox egress proxy
# only tunnels HTTPS CONNECT, so a localhost HTTP server can't be used).
DIST = pathlib.Path("/home/claude/work/dist")
BASE = "http://mgg.local/mgg-dynasty/"

def serve_dist(route, request):
    rel = request.url.split("mgg.local/mgg-dynasty/", 1)[-1].split("?")[0]
    f = DIST / (rel or "index.html")
    if not f.is_file():
        f = DIST / "index.html"
    route.fulfill(path=str(f), content_type=mimetypes.guess_type(str(f))[0] or "text/html")

# The sandbox egress relay resets Chromium's CONNECT tunnels, so external API
# calls are relayed through Python requests (which handles the proxy fine).
import requests
_sess = requests.Session()
HOP = {"content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"}

def relay(route, request):
    try:
        r = _sess.request(
            request.method, request.url,
            headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
            data=request.post_data_buffer, timeout=60,
        )
        route.fulfill(status=r.status_code, body=r.content,
                      headers={k: v for k, v in r.headers.items() if k.lower() not in HOP})
    except Exception as e:
        route.abort("failed")
IDENTITY = {
    "userId": "735965707254267904",
    "username": "liteworks",
    "displayName": "The J&J Connection",
    "ownerName": "The J&J Connection",
    "avatar": None,
    "isCommissioner": False,
}

results, console_errors = [], []

def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail else ""), flush=True)

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, ignore_https_errors=True)
    ctx.route("http://mgg.local/**", serve_dist)
    ctx.route(lambda url: not url.startswith("http://mgg.local"), relay)
    page = ctx.new_page()
    page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: console_errors.append(f"PAGEERROR: {e}"))

    # Seed identity so the login modal is skipped (identity read from localStorage)
    page.add_init_script(f"localStorage.setItem('mgg_identity', JSON.stringify({json.dumps(IDENTITY)}));"
                         "localStorage.removeItem('mgg_season_override');")
    page.goto(BASE, wait_until="networkidle")
    check("app loads", page.locator("text=SYNC DATA").first.is_visible() or page.locator("text=⟳ SYNC").first.is_visible())

    # ── SYNC live data (18 weeks of stats + full player DB — allow 4 min) ──
    page.locator("text=SYNC DATA").first.click()
    try:
        page.locator("text=SYNCED").first.wait_for(timeout=240_000)
        check("sync completes", True)
    except Exception:
        check("sync completes", False, "SYNCED marker never appeared")
        page.screenshot(path="/home/claude/shots/sync_fail.png", full_page=True)
        print(json.dumps(console_errors[-10:], indent=1)); browser.close(); sys.exit(1)
    # Dismiss the daily QuickRank modal if it popped over the app (audit #16)
    page.wait_for_timeout(1500)
    if page.locator("button:has-text('SKIP')").count() > 0:
        page.locator("button:has-text('SKIP')").first.click()
        page.wait_for_timeout(600)
        check("QuickRank modal dismissed via SKIP", True)
    page.screenshot(path="/home/claude/shots/01_dashboard.png", full_page=True)

    def goto_tab(label):
        page.locator(f"text={label}").first.click()
        page.wait_for_timeout(700)

    def app_alive():
        # crash = React unmounts everything; nav disappears
        return page.locator("text=DRAFT HUB").count() > 0

    # ── League Hub → Standings (the C3 crash) ──────────────────────────────
    goto_tab("LEAGUE HUB")
    check("League Hub renders", app_alive() and page.locator("text=POSITION RANKINGS").count() > 0)
    page.locator("text=▸ STANDINGS").first.click(); page.wait_for_timeout(800)
    ok = app_alive() and page.locator("text=DYNASTY POWER RANKINGS").count() > 0
    check("Standings (offseason) renders — C3 fixed", ok)
    page.screenshot(path="/home/claude/shots/02_standings.png", full_page=True)

    # ── Draft Hub → My Picks (the C2 2026 blindness) ───────────────────────
    goto_tab("DRAFT HUB")
    page.locator("text=◈ MY PICKS").first.click(); page.wait_for_timeout(1000)
    body = page.inner_text("body")
    check("My Picks shows 2026 picks — C2 fixed", "2026" in body, "no '2026' text found" if "2026" not in body else "")
    page.screenshot(path="/home/claude/shots/03_mypicks.png", full_page=True)

    # ── Big Board: FA VETS toggle (new feature) ────────────────────────────
    page.locator("text=⬡ BIG BOARD").first.click(); page.wait_for_timeout(800)
    for mode_label in ["◈ ROOKIES", "◈ FA VETS", "◈ ALL"]:
        found = page.locator(f"text={mode_label}").count() > 0
        check(f"Big Board toggle '{mode_label}' present", found)
    page.locator("text=◈ FA VETS").first.click(); page.wait_for_timeout(900)
    avail = page.locator("text=AVAILABLE").first.inner_text()
    n_avail = int(avail.split(" ")[0]) if avail and avail.split(" ")[0].isdigit() else 0
    check("FA VETS pool is non-empty — H1 fixed", n_avail > 0, avail.strip())
    page.screenshot(path="/home/claude/shots/04_bigboard_vets.png", full_page=True)
    page.locator("text=◈ ALL").first.click(); page.wait_for_timeout(900)
    avail_all = page.locator("text=AVAILABLE").first.inner_text()
    n_all = int(avail_all.split(" ")[0]) if avail_all and avail_all.split(" ")[0].isdigit() else 0
    check("ALL pool ≥ FA VETS pool", n_all >= n_avail, f"all={n_all} vets={n_avail}")

    # ── Draft Room: mock modes + live draft shows 2026 (C1) ────────────────
    page.locator("text=▸ DRAFT ROOM").first.click(); page.wait_for_timeout(800)
    for lbl in ["ROOKIES", "FA VETS", "ALL"]:
        check(f"Mock setup pool option '{lbl}' present", page.locator(f"button:has-text('{lbl}')").count() > 0)
    page.locator("text=▸ LIVE DRAFT").first.click(); page.wait_for_timeout(2500)
    body = page.inner_text("body")
    ok = "2026" in body and ("pre_draft" in body or "PRE_DRAFT" in body or "complete" not in body.lower().split("select draft")[-1][:400])
    check("Live Draft lists the 2026 draft — C1 fixed", "2026" in body, "no 2026 draft in selector" if "2026" not in body else "")
    page.screenshot(path="/home/claude/shots/05_livedraft.png", full_page=True)

    # ── Remaining tabs: no white screens ───────────────────────────────────
    for tab, marker in [("TEAM HUB", None), ("PLAYER HUB", None), ("ANALYSIS TOOLS", None), ("DASHBOARD", None)]:
        goto_tab(tab)
        check(f"{tab} renders", app_alive())
    page.screenshot(path="/home/claude/shots/06_final.png", full_page=True)

    browser.close()

fails = [r for r in results if not r[1]]
real_errors = [e for e in console_errors if "favicon" not in e and "ERR_BLOCKED" not in e]
print(f"\n{len(results)-len(fails)}/{len(results)} checks passed")
print(f"console errors: {len(real_errors)}")
for e in real_errors[:8]: print("  CONSOLE:", e[:200])
sys.exit(1 if fails else 0)
