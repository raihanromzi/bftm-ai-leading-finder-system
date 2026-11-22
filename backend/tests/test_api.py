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
        self.assertEqual(len(branches), 1, "Sole branch preset should be seeded")
        first = branches[0]
        self.assertEqual(first["name"], "Bank Mandiri KC Jakarta Wisma Danantara")
        self.assertEqual(first["code"], "JKT-DANANTARA")
        self.assertEqual(first["latitude"], -6.2249)
        self.assertEqual(first["longitude"], 106.8145)

    async def test_03_hyperlocal_discovery_jabodetabek(self):
        # Scan centered at KC Jakarta Wisma Danantara (tight hyperlocal radius: 3 km)
        payload = {"latitude": -6.2249, "longitude": 106.8145, "radius_km": 3}
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
        payload = {"latitude": -7.7956, "longitude": 110.3695, "radius_km": 3}
        r = await self.client.post("/api/discover", json=payload)
        self.assertEqual(r.status_code, 400)
        self.assertIn("Jabodetabek", r.json().get("detail", ""))

        # Verify max radius 5 km limit (radius > 5 must be rejected by Pydantic)
        r_invalid_radius = await self.client.post(
            "/api/discover",
            json={"latitude": -6.1930, "longitude": 106.8237, "radius_km": 10},
        )
        self.assertEqual(r_invalid_radius.status_code, 422)

    async def test_05_leads_listing(self):
        r = await self.client.get("/api/leads")
        self.assertEqual(r.status_code, 200)
        leads = r.json().get("leads", [])
        self.assertIsInstance(leads, list)

    async def test_06_lead_status_lifecycle(self):
        # Discover first to ensure leads exist
        payload = {"latitude": -6.2249, "longitude": 106.8145, "radius_km": 5}
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
        payload = {"latitude": -6.2249, "longitude": 106.8145, "radius_km": 5}
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

    async def test_10_location_search(self):
        # Geocode search for a known Jakarta landmark
        r = await self.client.post("/api/geocode/search", json={"query": "Monas Jakarta"})
        self.assertEqual(r.status_code, 200)
        places = r.json().get("places", [])
        self.assertGreater(len(places), 0)
        first = places[0]
        self.assertIn("label", first)
        self.assertIsInstance(first["latitude"], float)
        self.assertIsInstance(first["longitude"], float)
        # Should land inside Jabodetabek
        self.assertTrue(-6.70 < first["latitude"] < -6.08)

        # Empty/too-short query rejected
        r_short = await self.client.post("/api/geocode/search", json={"query": "a"})
        self.assertEqual(r_short.status_code, 422)

    async def test_09_office_building_tenant_unbundling(self):
        # Discover leads
        payload = {"latitude": -6.2249, "longitude": 106.8145, "radius_km": 3}
        r = await self.client.post("/api/discover", json=payload)
        leads = r.json().get("leads", [])
        tower_lead = next((lead for lead in leads if "tower" in lead["name"].lower() or "gedung" in lead["name"].lower()), leads[0])
        self.assertIsNotNone(tower_lead)

        # Enrich the tower lead
        enrich_res = await self.client.post("/api/leads/enrich", json={"lead_ids": [tower_lead["id"]]})
        self.assertEqual(enrich_res.status_code, 200)
        enriched = enrich_res.json()["results"][0]
        signals = enriched["signals"]
        self.assertIn("tenants", signals)
        self.assertIsInstance(signals["tenants"], list)
        self.assertGreater(len(signals["tenants"]), 0)
        first_tenant = signals["tenants"][0]
        self.assertIn("name", first_tenant)
        self.assertIn("product", first_tenant)

        # Verify GET /api/leads joins tenant data
        leads_res = await self.client.get("/api/leads")
        all_leads = leads_res.json()["leads"]
        matched_lead = next(l for l in all_leads if l["id"] == tower_lead["id"])
        self.assertIn("tenants", matched_lead["enrichment"])
        self.assertGreater(len(matched_lead["enrichment"]["tenants"]), 0)


if __name__ == "__main__":
    unittest.main()
