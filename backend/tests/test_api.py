"""Comprehensive system test suite for BFTM Radar backend APIs."""

import asyncio
import os
import unittest
from httpx import AsyncClient, ASGITransport

from main import app
from app.database import create_db_and_tables


class TestBFTMRadarAPI(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        create_db_and_tables()
        self.transport = ASGITransport(app=app)
        self.client = AsyncClient(transport=self.transport, base_url="http://test")

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_01_health_check(self):
        r = await self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("service"), "bftm-radar")

    async def test_02_branch_presets_and_auto_seed(self):
        r = await self.client.get("/api/branches")
        self.assertEqual(r.status_code, 200)
        branches = r.json().get("branches", [])
        self.assertGreater(len(branches), 0, "Branches should be seeded")
        first = branches[0]
        self.assertIn("name", first)
        self.assertIn("latitude", first)
        self.assertIn("longitude", first)

    async def test_03_hyperlocal_discovery_jabodetabek(self):
        # Scan centered at KC Jakarta Thamrin
        payload = {"latitude": -6.1930, "longitude": 106.8237, "radius_km": 10}
        r = await self.client.post("/api/discover", json=payload)
        self.assertEqual(r.status_code, 200)
        data = r.json()
        leads = data.get("leads", [])
        self.assertGreater(len(leads), 0)
        # Verify product matching was applied
        first = leads[0]
        self.assertIn("recommended_product", first)
        self.assertIn("fit_score", first)
        self.assertGreater(first["fit_score"], 0)

    async def test_04_geofence_boundary_guard(self):
        # Coordinate in Yogyakarta (outside Jabodetabek + 40km buffer)
        payload = {"latitude": -7.7956, "longitude": 110.3695, "radius_km": 10}
        r = await self.client.post("/api/discover", json=payload)
        self.assertEqual(r.status_code, 400)
        self.assertIn("Jabodetabek", r.json().get("detail", ""))

    async def test_05_leads_listing(self):
        r = await self.client.get("/api/leads")
        self.assertEqual(r.status_code, 200)
        leads = r.json().get("leads", [])
        self.assertIsInstance(leads, list)

    async def test_06_lead_status_lifecycle(self):
        # Discover first to ensure leads exist
        payload = {"latitude": -6.1930, "longitude": 106.8237, "radius_km": 5}
        r = await self.client.post("/api/discover", json=payload)
        leads = r.json().get("leads", [])
        lead_id = leads[0]["id"]

        valid_statuses = ["Contacted", "Visit Scheduled", "Won", "Dropped", "New"]
        for st in valid_statuses:
            patch_res = await self.client.patch(f"/api/leads/{lead_id}/status", json={"status": st})
            self.assertEqual(patch_res.status_code, 200)
            self.assertEqual(patch_res.json().get("lead_status"), st)

        # Invalid status rejection
        inv_res = await self.client.patch(f"/api/leads/{lead_id}/status", json={"status": "FakeStatus"})
        self.assertEqual(inv_res.status_code, 400)

    async def test_07_enrichment_flow(self):
        payload = {"latitude": -6.1930, "longitude": 106.8237, "radius_km": 5}
        r = await self.client.post("/api/discover", json=payload)
        leads = r.json().get("leads", [])
        lead_id = leads[0]["id"]

        enrich_res = await self.client.post("/api/leads/enrich", json={"lead_ids": [lead_id]})
        self.assertEqual(enrich_res.status_code, 200)
        data = enrich_res.json()
        self.assertEqual(data.get("enriched_count"), 1)
        res = data["results"][0]
        self.assertIn("pitch_wa", res)
        self.assertIn("pitch_visit", res)
        self.assertIn("signals", res)

    async def test_08_csv_export(self):
        r = await self.client.get("/api/leads/export")
        self.assertEqual(r.status_code, 200)
        self.assertIn("text/csv", r.headers.get("content-type", ""))
        content = r.text
        lines = content.strip().split("\n")
        self.assertGreaterEqual(len(lines), 2)  # Header + at least 1 lead row


if __name__ == "__main__":
    unittest.main()
