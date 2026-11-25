"""
WaterTrace AI — Classifier unit tests

Tests the deterministic keyword classifier.
No external API calls — entirely offline.
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.intelligence.classifier import _keyword_classify


class TestDeterministicClassifier:
    """Tests for the keyword-based fallback classifier."""

    def test_no_supply_classification(self):
        result = _keyword_classify("No water coming from the tap at all since morning")
        assert result["category"] == "NO_SUPPLY"
        assert result["confidence"] > 0.5
        assert result["source"] == "deterministic"

    def test_low_pressure_classification(self):
        result = _keyword_classify("Very low pressure from all taps in the house today")
        assert result["category"] == "LOW_PRESSURE"
        assert result["confidence"] > 0.5

    def test_leakage_classification(self):
        result = _keyword_classify("Water pipe is burst, water gushing out on the road")
        assert result["category"] == "LEAKAGE"
        assert result["confidence"] > 0.5

    def test_discoloured_water_classification(self):
        result = _keyword_classify("Brown water coming from taps, looks dirty and murky")
        assert result["category"] == "DISCOLOURED_WATER"
        assert result["confidence"] > 0.5

    def test_unusual_smell_classification(self):
        result = _keyword_classify("Foul smell from the tap water, strong chlorine odour")
        assert result["category"] == "UNUSUAL_SMELL"
        assert result["confidence"] > 0.5

    def test_infrastructure_damage_classification(self):
        result = _keyword_classify("Broken pipe visible on the street, damaged infrastructure")
        assert result["category"] == "INFRASTRUCTURE_DAMAGE"
        assert result["confidence"] > 0.5

    def test_intermittent_supply_classification(self):
        result = _keyword_classify("Water comes and goes all day, very intermittent supply")
        assert result["category"] == "INTERMITTENT_SUPPLY"
        assert result["confidence"] > 0.5

    def test_other_category_for_unrecognized(self):
        result = _keyword_classify("I am not happy with the service")
        assert result["category"] == "OTHER"

    def test_confidence_range(self):
        """Confidence must always be between 0 and 1."""
        descriptions = [
            "No water supply",
            "Low pressure",
            "Burst pipe",
            "Brown water smells bad",
            "Water",  # minimal
            "No water coming from taps since morning. Completely dry. Called neighbours.",
        ]
        for desc in descriptions:
            result = _keyword_classify(desc)
            assert 0.0 <= result["confidence"] <= 1.0, f"Confidence out of range for: {desc}"

    def test_symptoms_are_list(self):
        result = _keyword_classify("No water supply and low pressure observed")
        assert isinstance(result["symptoms"], list)

    def test_explanation_is_string(self):
        result = _keyword_classify("Leaking pipe near the junction")
        assert isinstance(result["explanation"], str)
        assert len(result["explanation"]) > 0

    def test_case_insensitive(self):
        lower = _keyword_classify("no water supply")
        upper = _keyword_classify("NO WATER SUPPLY")
        mixed = _keyword_classify("No Water Supply")
        # All should classify as NO_SUPPLY
        assert lower["category"] == "NO_SUPPLY"
        assert upper["category"] == "NO_SUPPLY"
        assert mixed["category"] == "NO_SUPPLY"

    def test_leakage_prioritized_over_no_supply(self):
        """LEAKAGE has higher priority than NO_SUPPLY in case of tie."""
        result = _keyword_classify("Burst pipe causing no water supply and leakage on the road")
        assert result["category"] == "LEAKAGE"
