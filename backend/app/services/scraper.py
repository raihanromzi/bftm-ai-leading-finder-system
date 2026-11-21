"""Web scraping and enrichment service using ScrapeGraphAI with Gemini backbone."""

import asyncio
import logging
from typing import Optional

from scrapegraphai.graphs import SearchGraph, SmartScraperGraph

from app.config import settings

logger = logging.getLogger(__name__)


def _build_graph_config(gemini_api_key: str) -> dict:
    return {
        "llm": {
            "api_key": gemini_api_key,
            "model": "google_genai/gemini-2.0-flash",
            "model_tokens": 8192,
        },
        "use_soup": True,
        "headless": True,
        "verbose": False,
        "max_results": 2,
    }


def _run_sync_scrape(name: str, address: str, category: str, website: str = "") -> str:
    """Run ScrapeGraphAI SearchGraph (or SmartScraperGraph if website provided)."""
    if not settings.gemini_api_key:
        return ""

    config = _build_graph_config(settings.gemini_api_key)

    # 1. If lead has an accessible official website, try SmartScraperGraph first
    if website and website.startswith("http"):
        try:
            prompt = (
                f"Ekstrak informasi profil organisasi/usaha: jumlah karyawan atau murid, "
                f"kegiatan atau program terkini, dan metode pembayaran/transaksi yang digunakan."
            )
            scraper = SmartScraperGraph(
                prompt=prompt,
                source=website,
                config=config,
            )
            result = scraper.run()
            if result:
                return str(result)
        except Exception as e:
            logger.warning(f"SmartScraperGraph failed for {website}: {e}, falling back to SearchGraph")

    # 2. Use SearchGraph to search public web & local Indonesian news/directories
    search_prompt = (
        f"Cari informasi terkini mengenai profil '{name}' di wilayah '{address}', Indonesia. "
        f"Kategori: '{category}'. "
        f"Temukan data spesifik: jumlah karyawan/siswa/pedagang, kegiatan aktif, dan transaksi atau metode pembayaran."
    )
    scraper = SearchGraph(
        prompt=search_prompt,
        config=config,
    )
    result = scraper.run()
    return str(result) if result else ""


async def scrape_lead_context(name: str, address: str, category: str, website: str = "", timeout_seconds: int = 25) -> str:
    """Run ScrapeGraphAI in a thread with a timeout guard."""
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_run_sync_scrape, name, address, category, website),
            timeout=timeout_seconds,
        )
    except asyncio.TimeoutError:
        logger.warning(f"ScrapeGraphAI timed out after {timeout_seconds}s for {name}")
        return ""
    except Exception as e:
        logger.warning(f"ScrapeGraphAI failed for {name}: {e}")
        return ""
