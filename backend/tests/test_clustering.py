"""
WaterTrace AI — Clustering engine unit tests

Tests the spatial-temporal intelligence engine logic
without requiring a live Supabase connection.
"""

import pytest
import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.intelligence.clustering import (
    _haversine_meters,
    _get_compatibility,
    _calculate_evidence_confidence,
    _calculate_priority,
    _generate_explanation,
    _run_dbscan,
)
import pandas as pd


class TestHaversine:
    def test_same_point_is_zero(self):
        d = _haversine_meters(17.4150, 78.4480, 17.4150, 78.4480)
        assert d == 0.0

    def test_known_distance(self):
        # Approximate distance between two points ~1km apart
        d = _haversine_meters(17.4150, 78.4480, 17.4240, 78.4480)
        assert 900 < d < 1100  # approximately 1km

    def test_distance_is_symmetric(self):
        d1 = _haversine_meters(17.4150, 78.4480, 17.4240, 78.4580)
        d2 = _haversine_meters(17.4240, 78.4580, 17.4150, 78.4480)
        assert abs(d1 - d2) < 0.01


class TestCategoryCompatibility:
    def test_same_category_is_one(self):
        assert _get_compatibility("NO_SUPPLY", "NO_SUPPLY") == 1.0
        assert _get_compatibility("LEAKAGE", "LEAKAGE") == 1.0

    def test_related_categories_have_score(self):
        score = _get_compatibility("NO_SUPPLY", "LOW_PRESSURE")
        assert score > 0.5

    def test_symmetric(self):
        a = _get_compatibility("NO_SUPPLY", "LOW_PRESSURE")
        b = _get_compatibility("LOW_PRESSURE", "NO_SUPPLY")
        assert a == b

    def test_unrelated_categories_low_score(self):
        # OTHER vs LEAKAGE — unlikely relationship
        score = _get_compatibility("OTHER", "LEAKAGE")
        assert score <= 0.5

    def test_leakage_infrastructure_damage_high(self):
        score = _get_compatibility("LEAKAGE", "INFRASTRUCTURE_DAMAGE")
        assert score >= 0.8


class TestEvidenceConfidence:
    def test_many_independent_reporters_raises_confidence(self):
        users_many = [f"user_{i}" for i in range(8)]
        users_few = ["user_1", "user_1", "user_1"]

        conf_many = _calculate_evidence_confidence(
            report_ids=[str(i) for i in range(8)],
            users=users_many,
            categories=["NO_SUPPLY"] * 8,
            distances=[100] * 8,
            time_diffs_min=[10] * 8,
            radius=800,
            time_window=120,
        )
        conf_few = _calculate_evidence_confidence(
            report_ids=["r1", "r2", "r3"],
            users=users_few,  # Same user repeated — should NOT count as independent
            categories=["NO_SUPPLY"] * 3,
            distances=[100] * 3,
            time_diffs_min=[10] * 3,
            radius=800,
            time_window=120,
        )
        assert conf_many > conf_few, "Many unique reporters should yield higher confidence"

    def test_confidence_in_range(self):
        conf = _calculate_evidence_confidence(
            report_ids=["r1", "r2"],
            users=["u1", "u2"],
            categories=["NO_SUPPLY", "LOW_PRESSURE"],
            distances=[200, 300],
            time_diffs_min=[15, 30],
            radius=800,
            time_window=120,
        )
        assert 0.0 <= conf <= 1.0

    def test_tight_cluster_higher_confidence(self):
        conf_tight = _calculate_evidence_confidence(
            report_ids=["r1", "r2", "r3"],
            users=["u1", "u2", "u3"],
            categories=["NO_SUPPLY"] * 3,
            distances=[50, 60, 70],  # Very close together
            time_diffs_min=[5, 10, 15],  # Close in time
            radius=800,
            time_window=120,
        )
        conf_spread = _calculate_evidence_confidence(
            report_ids=["r1", "r2", "r3"],
            users=["u1", "u2", "u3"],
            categories=["NO_SUPPLY"] * 3,
            distances=[700, 750, 790],  # At the edge of radius
            time_diffs_min=[100, 110, 118],  # At the edge of time window
            radius=800,
            time_window=120,
        )
        assert conf_tight > conf_spread

    def test_compatible_categories_higher_than_incompatible(self):
        conf_compat = _calculate_evidence_confidence(
            report_ids=["r1", "r2"],
            users=["u1", "u2"],
            categories=["NO_SUPPLY", "LOW_PRESSURE"],  # Compatible
            distances=[200],
            time_diffs_min=[20],
            radius=800,
            time_window=120,
        )
        conf_incompat = _calculate_evidence_confidence(
            report_ids=["r1", "r2"],
            users=["u1", "u2"],
            categories=["NO_SUPPLY", "OTHER"],  # Less compatible
            distances=[200],
            time_diffs_min=[20],
            radius=800,
            time_window=120,
        )
        assert conf_compat >= conf_incompat


class TestPriority:
    def test_priority_in_range(self):
        p = _calculate_priority(
            unique_users=5,
            evidence_confidence=0.7,
            categories=["LEAKAGE"],
            radius=500,
            latest_report_age_hours=1,
        )
        assert 0.0 <= p <= 1.0

    def test_leakage_higher_priority_than_low_pressure(self):
        p_leakage = _calculate_priority(5, 0.7, ["LEAKAGE"], 500, 1)
        p_low = _calculate_priority(5, 0.7, ["LOW_PRESSURE"], 500, 1)
        assert p_leakage > p_low

    def test_more_reporters_higher_priority(self):
        p_many = _calculate_priority(10, 0.7, ["NO_SUPPLY"], 500, 1)
        p_few = _calculate_priority(2, 0.7, ["NO_SUPPLY"], 500, 1)
        assert p_many > p_few

    def test_recent_reports_higher_priority(self):
        p_recent = _calculate_priority(5, 0.7, ["NO_SUPPLY"], 500, 0.5)
        p_old = _calculate_priority(5, 0.7, ["NO_SUPPLY"], 500, 20)
        assert p_recent > p_old


class TestExplanation:
    def test_explanation_contains_reporter_count(self):
        explanation = _generate_explanation(
            categories=["NO_SUPPLY"] * 5,
            unique_users=4,
            total_reports=5,
            radius=600,
            time_window_min=45,
            evidence_confidence=0.72,
        )
        assert "4" in explanation  # unique reporter count
        assert "5" in explanation  # total reports

    def test_explanation_contains_disclaimer(self):
        explanation = _generate_explanation(
            categories=["LEAKAGE"] * 3,
            unique_users=3,
            total_reports=3,
            radius=400,
            time_window_min=30,
            evidence_confidence=0.65,
        )
        # Must include the responsible AI disclaimer
        assert "not a confirmed" in explanation.lower() or "candidate" in explanation.lower()

    def test_explanation_is_non_empty_string(self):
        explanation = _generate_explanation(
            categories=["NO_SUPPLY", "LOW_PRESSURE"],
            unique_users=2,
            total_reports=2,
            radius=300,
            time_window_min=20,
            evidence_confidence=0.5,
        )
        assert isinstance(explanation, str)
        assert len(explanation) > 50


class TestDBSCAN:
    def test_too_few_reports_returns_noise(self):
        """Single report should return noise label -1."""
        df = pd.DataFrame([{
            "id": "r1", "user_id": "u1", "category": "NO_SUPPLY",
            "lat": 17.415, "lon": 78.448, "occurrence_ts": 1700000000.0, "is_demo": False
        }])
        labels = _run_dbscan(df)
        assert labels[0] == -1

    def test_nearby_reports_cluster_together(self):
        """Reports within radius and time window should form a cluster."""
        import time
        base_ts = time.time()
        rows = []
        for i in range(5):
            rows.append({
                "id": f"r{i}", "user_id": f"u{i}", "category": "NO_SUPPLY",
                "lat": 17.415 + (i * 0.0005),  # ~55m apart
                "lon": 78.448 + (i * 0.0005),
                "occurrence_ts": base_ts - (i * 600),  # 10 min apart
                "is_demo": False,
            })
        df = pd.DataFrame(rows)
        labels = _run_dbscan(df)
        # At least some should cluster (not all -1)
        assert any(l != -1 for l in labels)

    def test_distant_reports_do_not_cluster(self):
        """Reports far apart geographically should not cluster."""
        import time
        base_ts = time.time()
        rows = [
            # Hyderabad
            {"id": "r1", "user_id": "u1", "category": "NO_SUPPLY",
             "lat": 17.415, "lon": 78.448, "occurrence_ts": base_ts, "is_demo": False},
            # 10km away
            {"id": "r2", "user_id": "u2", "category": "NO_SUPPLY",
             "lat": 17.505, "lon": 78.448, "occurrence_ts": base_ts - 300, "is_demo": False},
        ]
        df = pd.DataFrame(rows)
        labels = _run_dbscan(df)
        # Both should be noise (too far apart to cluster with min_samples=2 default)
        assert all(l == -1 for l in labels)
