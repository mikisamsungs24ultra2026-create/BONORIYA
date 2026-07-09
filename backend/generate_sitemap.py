#!/usr/bin/env python3
"""
BONORIYA — SEO Sitemap Generator

Reads live data from Supabase and writes a full set of SEO-compliant sitemaps
plus a fresh robots.txt into the frontend/public directory.

Outputs:
    frontend/public/sitemap.xml              (sitemap index)
    frontend/public/sitemap-core.xml         (static site pages)
    frontend/public/sitemap-properties.xml   (all approved+active properties)
    frontend/public/sitemap-destinations.xml (state/city landing pages)
    frontend/public/sitemap-daytrips.xml     (all active day trip properties)
    frontend/public/sitemap-images.xml       (google image sitemap for props+trips)
    frontend/public/robots.txt               (with all sitemap references)

Run manually:
    python /app/backend/generate_sitemap.py

Called from FastAPI at POST /api/seo/regenerate-sitemap.
"""
from __future__ import annotations
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape
from typing import Any

import requests

BASE_URL = "https://bonoriya.com"
SUPABASE_PROJECT = "mltpbbbauvluhhddteoy"
SUPABASE_URL = f"https://{SUPABASE_PROJECT}.supabase.co"
SUPABASE_ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sdHBiYmJhdXZsdWhoZGR0ZW95Iiwicm9sZSI6ImFub24i"
    "LCJpYXQiOjE3ODAzMjc4NTQsImV4cCI6MjA5NTkwMzg1NH0.Fbwodml34b70fuPiEAVWAaydIoyNPd_YkRzbziTOP7Q"
)

PUBLIC_DIR = Path(__file__).parent.parent / "frontend" / "public"

CORE_PAGES = [
    ("/", "1.0", "weekly"),
    ("/book-stays", "0.95", "daily"),
    ("/our-properties", "0.90", "weekly"),
    ("/day-trip", "0.90", "weekly"),
    ("/destinations", "0.85", "monthly"),
    ("/prefab", "0.85", "monthly"),
    ("/blogs", "0.80", "weekly"),
    ("/contact", "0.60", "monthly"),
    ("/stays-in-assam", "0.88", "weekly"),
    ("/stays-in-meghalaya", "0.88", "weekly"),
    ("/stays-in-arunachal-pradesh", "0.82", "monthly"),
    ("/stays-in-nagaland", "0.80", "monthly"),
    ("/stays-in-manipur", "0.80", "monthly"),
    ("/stays-in-mizoram", "0.78", "monthly"),
    ("/stays-in-tripura", "0.78", "monthly"),
    ("/stays-in-sikkim", "0.78", "monthly"),
    ("/hotels-in-guwahati", "0.90", "weekly"),
    ("/hotels-in-kaziranga", "0.88", "weekly"),
    ("/hotels-in-tawang", "0.85", "monthly"),
    ("/homestays-in-shillong", "0.87", "weekly"),
    ("/homestay-in-imphal", "0.82", "monthly"),
    ("/prefab-cottages", "0.85", "monthly"),
    ("/prefab-cottages-assam", "0.87", "monthly"),
    ("/modular-resorts", "0.82", "monthly"),
    ("/prefab-structures-assam", "0.82", "monthly"),
]

NE_STATES = [
    ("assam", "Assam"),
    ("meghalaya", "Meghalaya"),
    ("arunachal-pradesh", "Arunachal Pradesh"),
    ("nagaland", "Nagaland"),
    ("manipur", "Manipur"),
    ("mizoram", "Mizoram"),
    ("tripura", "Tripura"),
    ("sikkim", "Sikkim"),
]

# ─── Helpers ─────────────────────────────────────────────────────────────────

def _slugify(s: str) -> str:
    s = (s or "").lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s).strip("-")
    return s[:96]


def _prop_slug(row: dict) -> str:
    name = row.get("name") or ""
    base = _slugify(name)
    rid = re.sub(r"[^a-z0-9]", "", (row.get("id") or "").lower())[-6:]
    return f"{base}-{rid}" if rid else base


def _sb_get(table: str, params: dict[str, Any]) -> list[dict]:
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
        "Accept": "application/json",
    }
    try:
        r = requests.get(url, params=params, headers=headers, timeout=15)
        if r.status_code == 200:
            return r.json()
        print(f"[sitemap] {table} {r.status_code}: {r.text[:200]}", file=sys.stderr)
    except Exception as e:  # noqa: BLE001
        print(f"[sitemap] {table} fetch error: {e}", file=sys.stderr)
    return []


def _fmt_lastmod(v: str | None) -> str:
    if not v:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return v.split("T")[0]


def _url_xml(loc: str, lastmod: str, changefreq: str, priority: str, images: list[dict] | None = None) -> str:
    parts = [f"  <url>\n    <loc>{escape(loc)}</loc>\n    <lastmod>{lastmod}</lastmod>\n"
             f"    <changefreq>{changefreq}</changefreq>\n    <priority>{priority}</priority>"]
    if images:
        for img in images[:5]:
            iu = img.get("url")
            if not iu:
                continue
            parts.append(
                f"\n    <image:image>\n"
                f"      <image:loc>{escape(iu)}</image:loc>\n"
                f"      <image:title>{escape(img.get('title', '')[:120])}</image:title>\n"
                f"      <image:caption>{escape(img.get('caption', '')[:250])}</image:caption>\n"
                f"    </image:image>"
            )
    parts.append("\n  </url>")
    return "".join(parts)


def _write_xml(path: Path, body: str, image_ns: bool = False) -> None:
    xmlns_img = ' xmlns:image="http://www.google.com/schemas/sitemap-image/0.9"' if image_ns else ""
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"{xmlns_img}>\n{body}\n</urlset>\n')
    path.write_text(xml, encoding="utf-8")


# ─── Sitemap builders ────────────────────────────────────────────────────────

def build_core() -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    body = "\n".join(_url_xml(BASE_URL + p, today, cf, pr) for p, pr, cf in CORE_PAGES)
    _write_xml(PUBLIC_DIR / "sitemap-core.xml", body)


def build_properties() -> list[dict]:
    rows = _sb_get(
        "partner_properties",
        {
            "select": "id,name,image,active,location,created_at",
            "active": "eq.true",
            "order": "created_at.desc",
            "limit": "1000",
        },
    )
    urls = []
    for r in rows:
        slug = _prop_slug(r)
        if not slug:
            continue
        loc = f"{BASE_URL}/properties/{slug}"
        lastmod = _fmt_lastmod(r.get("created_at"))
        urls.append(_url_xml(loc, lastmod, "weekly", "0.80"))
    body = "\n".join(urls) or _url_xml(f"{BASE_URL}/our-properties",
                                       datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                                       "weekly", "0.7")
    _write_xml(PUBLIC_DIR / "sitemap-properties.xml", body)
    return rows


def build_daytrips() -> list[dict]:
    # Table may be day_trip_properties or fall back to bonoriya_property
    rows = _sb_get(
        "day_trip_properties",
        {"select": "id,name,hero_image,active,updated_at,location,created_at",
         "active": "eq.true", "order": "sort_order.asc", "limit": "500"},
    )
    if not rows:
        legacy = _sb_get("bonoriya_property", {"select": "id,name,hero_image,updated_at,location"})
        rows = legacy or []
    urls = []
    for r in rows:
        slug = _prop_slug({"id": str(r.get("id", "")), "name": r.get("name", "")})
        if not slug:
            continue
        loc = f"{BASE_URL}/day-trips/{slug}"
        lastmod = _fmt_lastmod(r.get("updated_at") or r.get("created_at"))
        urls.append(_url_xml(loc, lastmod, "weekly", "0.80"))
    body = "\n".join(urls) or _url_xml(f"{BASE_URL}/day-trip",
                                       datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                                       "weekly", "0.7")
    _write_xml(PUBLIC_DIR / "sitemap-daytrips.xml", body)
    return rows


def build_destinations() -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    urls = [_url_xml(f"{BASE_URL}/destinations/{slug}", today, "monthly", "0.75")
            for slug, _name in NE_STATES]
    urls.append(_url_xml(f"{BASE_URL}/destinations", today, "monthly", "0.80"))
    _write_xml(PUBLIC_DIR / "sitemap-destinations.xml", "\n".join(urls))


def _is_valid_image_url(u: str | None) -> bool:
    if not u:
        return False
    u = str(u).strip()
    if not u:
        return False
    # Reject inline base64 / blob / relative paths — image sitemaps require absolute URLs
    if u.startswith("data:") or u.startswith("blob:"):
        return False
    return u.startswith("http://") or u.startswith("https://")


def build_images(props: list[dict], trips: list[dict]) -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    entries: list[str] = []
    for r in props:
        img = r.get("image")
        if not _is_valid_image_url(img):
            continue
        slug = _prop_slug(r)
        loc = f"{BASE_URL}/properties/{slug}"
        entries.append(_url_xml(
            loc, _fmt_lastmod(r.get("updated_at") or r.get("created_at")), "weekly", "0.7",
            images=[{"url": img, "title": r.get("name", ""),
                     "caption": f"{r.get('name', '')} — {r.get('location', '')}"}]
        ))
    for r in trips:
        img = r.get("hero_image")
        if not _is_valid_image_url(img):
            continue
        slug = _prop_slug({"id": str(r.get("id", "")), "name": r.get("name", "")})
        loc = f"{BASE_URL}/day-trips/{slug}"
        entries.append(_url_xml(
            loc, _fmt_lastmod(r.get("updated_at") or r.get("created_at")), "weekly", "0.7",
            images=[{"url": img, "title": r.get("name", ""),
                     "caption": f"{r.get('name', '')} — day trip"}]
        ))
    if not entries:
        entries.append(_url_xml(f"{BASE_URL}/", today, "weekly", "0.5"))
    _write_xml(PUBLIC_DIR / "sitemap-images.xml", "\n".join(entries), image_ns=True)


def build_index() -> None:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    parts = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for name in ("sitemap-core.xml", "sitemap-properties.xml", "sitemap-destinations.xml",
                 "sitemap-daytrips.xml", "sitemap-images.xml", "blog-sitemap.xml"):
        parts.append(f"  <sitemap>\n    <loc>{BASE_URL}/{name}</loc>\n    <lastmod>{today}</lastmod>\n  </sitemap>")
    parts.append("</sitemapindex>\n")
    (PUBLIC_DIR / "sitemap.xml").write_text("\n".join(parts), encoding="utf-8")


def build_robots() -> None:
    body = f"""User-agent: *

# ── Public pages — allow all ──────────────────────────────────────────────────
Allow: /
Allow: /book-stays
Allow: /our-properties
Allow: /prefab
Allow: /day-trip
Allow: /blogs
Allow: /contact
Allow: /destinations
Allow: /properties/
Allow: /destinations/
Allow: /day-trips/

# State landing pages
Allow: /stays-in-assam
Allow: /stays-in-meghalaya
Allow: /stays-in-arunachal-pradesh
Allow: /stays-in-nagaland
Allow: /stays-in-manipur
Allow: /stays-in-mizoram
Allow: /stays-in-tripura
Allow: /stays-in-sikkim

# City / destination pages
Allow: /hotels-in-guwahati
Allow: /hotels-in-kaziranga
Allow: /hotels-in-tawang
Allow: /homestays-in-shillong
Allow: /homestay-in-imphal

# Prefab pages
Allow: /prefab-cottages
Allow: /prefab-cottages-assam
Allow: /modular-resorts
Allow: /prefab-structures-assam

# ── Private / admin pages — block crawlers ────────────────────────────────────
Disallow: /admin
Disallow: /admin/
Disallow: /partner-login
Disallow: /partner-dashboard
Disallow: /api/
Disallow: /checkout
Disallow: /booking-confirm

# ── Sitemaps ──────────────────────────────────────────────────────────────────
Sitemap: {BASE_URL}/sitemap.xml
Sitemap: {BASE_URL}/sitemap-core.xml
Sitemap: {BASE_URL}/sitemap-properties.xml
Sitemap: {BASE_URL}/sitemap-destinations.xml
Sitemap: {BASE_URL}/sitemap-daytrips.xml
Sitemap: {BASE_URL}/sitemap-images.xml
Sitemap: {BASE_URL}/blog-sitemap.xml
"""
    (PUBLIC_DIR / "robots.txt").write_text(body, encoding="utf-8")


# ─── Entrypoint ──────────────────────────────────────────────────────────────

def run() -> dict:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    build_core()
    build_destinations()
    props = build_properties()
    trips = build_daytrips()
    build_images(props, trips)
    build_index()
    build_robots()
    return {
        "ok": True,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "properties": len(props),
            "day_trips": len(trips),
            "destinations": len(NE_STATES),
            "core_pages": len(CORE_PAGES),
        },
        "files": [
            "sitemap.xml", "sitemap-core.xml", "sitemap-properties.xml",
            "sitemap-destinations.xml", "sitemap-daytrips.xml",
            "sitemap-images.xml", "robots.txt",
        ],
    }


if __name__ == "__main__":
    result = run()
    print(result)
