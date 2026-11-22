"""Deterministic Bank Mandiri product-matching rules (PRD FR-4).

Simple ordered keyword rules — no ML needed for an MVP with a fixed,
known set of Indonesian POI categories.
"""

# (category keywords, recommended_product, persona, fit_score)
RULES: list[tuple[tuple[str, ...], str, str, int]] = [
    (("school",), "Tabungan SimPel & Payroll Mandiri", "Kepala Sekolah / Bendahara", 85),
    (("university",), "Livin' Mandiri Campus & GMM Acquisition", "Rektorat / BEM", 80),
    (("convenience_store",), "GMM Campus Livin' Acquisition", "Store Manager", 75),
    (("cafe", "restaurant"), "Livin' Merchant & EDC Mandiri", "Pemilik Usaha", 70),
    (("factory", "industrial", "corporate_office"), "Payroll Mandiri & Corporate Cash Mgmt (KOPRA)", "HR / Finance Manager", 80),
    (("supermarket", "retail"), "Livin' Merchant & EDC Mandiri", "Pemilik Usaha", 72),
]

DEFAULT_MATCH = ("Livin' Acquisition Booth", "Pengelola Lokasi", 50)


def match_product(category: str) -> dict:
    """Map a POI category to a Mandiri product, persona, and fit score (0-100)."""
    category_lower = category.lower()
    for keywords, product, persona, score in RULES:
        if any(keyword in category_lower for keyword in keywords):
            return {"recommended_product": product, "pitch_angle": persona, "fit_score": score}
    product, persona, score = DEFAULT_MATCH
    return {"recommended_product": product, "pitch_angle": persona, "fit_score": score}
