"""Rendered-site acceptance tests. Run after bundle exec jekyll build."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "_site"


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.links = []
        self.feed(path.read_text(encoding="utf-8"))

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.links.append(dict(attrs))


class DailyInsightTest(unittest.TestCase):
    def test_daily_insight_is_in_site_navigation(self):
        home = Page(SITE / "index.html")
        self.assertTrue(any(a.get("href") == "/daily-insight/" for a in home.links),
                        "Daily Insight navigation link is missing")

    def test_daily_issue_is_linked_from_the_archive(self):
        path = SITE / "daily-insight" / "index.html"
        self.assertTrue(path.exists(), "Daily Insight archive is missing")
        archive = Page(path)
        self.assertTrue(any(a.get("href") == "/daily-insight/2026-10-01/" for a in archive.links))
        issue = SITE / "daily-insight" / "2026-10-01" / "index.html"
        self.assertTrue(issue.exists(), "Today's briefing is missing")
        text = issue.read_text(encoding="utf-8")
        self.assertIn("2026.10.01", text)
        self.assertIn('aria-current="page">Daily Insight', text)
        self.assertNotIn("{{", text)
        self.assertNotIn("{%", text)

    def test_references_are_present_without_official_source_links(self):
        issue = Page(SITE / "daily-insight" / "2026-10-01" / "index.html")
        official = [a for a in issue.links if a.get("href", "").startswith(
            ("https://blog.google/", "https://openai.com/", "https://www.anthropic.com/",
             "https://nvidianews.nvidia.com/", "https://deploymentsafety.openai.com/"))]
        self.assertEqual(official, [])
        text = (SITE / "daily-insight" / "2026-10-01" / "index.html").read_text()
        self.assertNotIn("References", text)
        self.assertIn("Exclusive Summary", text)
        self.assertIn("DrSong Opinion", text)

    def test_local_preview_is_marked_and_not_indexable(self):
        import os
        text = (SITE / "daily-insight" / "index.html").read_text(encoding="utf-8")
        if os.environ.get("EXPECT_PREVIEW") == "1":
            self.assertIn('class="preview-banner"', text, "Local preview banner is missing")
            self.assertIn('content="noindex, nofollow"', text)
        else:
            self.assertNotIn('class="preview-banner"', text)
            self.assertNotIn('content="noindex, nofollow"', text)


if __name__ == "__main__":
    unittest.main()
