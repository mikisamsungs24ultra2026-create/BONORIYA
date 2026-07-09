"""Tests for SEO backend endpoints and static sitemap files."""
import os
import re
import xml.etree.ElementTree as ET
import pytest
import requests

BACKEND = os.environ.get("VITE_BACKEND_URL") or os.environ.get("REACT_APP_BACKEND_URL")
FRONTEND = "http://localhost:3000"

assert BACKEND, "VITE_BACKEND_URL must be set"


# --- Backend SEO API ---
class TestSEOApi:
    def test_sitemap_status(self):
        r = requests.get(f"{BACKEND}/api/seo/sitemap-status", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "files" in data
        files = data["files"]
        for k in ["sitemap.xml", "sitemap-properties.xml", "sitemap-daytrips.xml", "robots.txt"]:
            assert k in files, f"missing {k} in status files: {list(files.keys())}"
            entry = files[k]
            # Accept either exists boolean or size/modified fields
            if isinstance(entry, dict):
                assert entry.get("exists", True) is not False, f"{k} not exists: {entry}"

    def test_regenerate_sitemap(self):
        r = requests.post(f"{BACKEND}/api/seo/regenerate-sitemap", timeout=120)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True, data
        counts = data.get("counts", {})
        for k in ["properties", "day_trips", "destinations", "core_pages"]:
            assert k in counts, f"missing counts.{k}: {counts}"


# --- Static sitemap files served by frontend ---
class TestSitemapFiles:
    def _get(self, path):
        r = requests.get(f"{FRONTEND}{path}", timeout=20)
        assert r.status_code == 200, f"{path} -> {r.status_code}"
        return r.text

    def test_sitemap_index(self):
        text = self._get("/sitemap.xml")
        assert "<sitemapindex" in text, text[:500]
        for f in ["sitemap-core.xml", "sitemap-properties.xml", "sitemap-destinations.xml",
                 "sitemap-daytrips.xml", "sitemap-images.xml"]:
            assert f in text, f"{f} missing from sitemap index"
        # valid XML
        ET.fromstring(text)

    def test_robots(self):
        text = self._get("/robots.txt")
        assert "Sitemap: https://bonoriya.com/sitemap.xml" in text, text
        assert "Disallow: /admin" in text, text

    def test_sitemap_properties(self):
        text = self._get("/sitemap-properties.xml")
        ET.fromstring(text)
        # at least one <loc> referencing /properties/
        assert re.search(r"<loc>[^<]*/properties/[^<]+</loc>", text), text[:800]

    def test_sitemap_daytrips(self):
        text = self._get("/sitemap-daytrips.xml")
        ET.fromstring(text)
        assert re.search(r"<loc>[^<]*/day-trips/[^<]+</loc>", text), text[:800]
