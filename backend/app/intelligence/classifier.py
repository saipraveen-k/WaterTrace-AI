"""
WaterTrace AI — Report Classifier

Deterministic keyword-based classifier with optional Anthropic LLM enhancement.
The LLM is used for enrichment only, never as authority for safety decisions.
Falls back gracefully to deterministic logic if the API is unavailable.
"""

import re
from typing import Optional
# anthropic imported lazily inside _llm_classify to avoid import error when not installed
from app.core.config import settings


# ---------------------------------------------------------------------------
# Category keyword matrix (deterministic fallback)
# ---------------------------------------------------------------------------
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "NO_SUPPLY": [
        "no water", "no supply", "water off", "no flow", "tap dry",
        "no water coming", "water stopped", "completely off", "zero supply",
        "no water supply", "no running water",
    ],
    "LOW_PRESSURE": [
        "low pressure", "weak flow", "trickle", "slow water", "poor pressure",
        "low flow", "reduced pressure", "weak pressure", "barely flowing",
    ],
    "LEAKAGE": [
        "leak", "leaking", "burst", "pipe burst", "water leak", "leakage",
        "flooding", "water on road", "pipe broken", "broken pipe", "puddle",
        "water gushing", "spraying water",
    ],
    "DISCOLOURED_WATER": [
        "brown water", "yellow water", "muddy water", "dirty water", "rust",
        "discoloured", "discolored", "dark water", "murky", "coloured water",
        "black water", "orange water",
    ],
    "UNUSUAL_SMELL": [
        "smell", "odour", "odor", "bad smell", "foul smell", "chemical smell",
        "chlorine smell", "sewage smell", "stink", "smells bad", "rotten",
    ],
    "INTERMITTENT_SUPPLY": [
        "comes and goes", "intermittent", "on and off", "irregular",
        "sometimes no water", "cuts out", "sporadic", "unreliable supply",
    ],
    "INFRASTRUCTURE_DAMAGE": [
        "broken", "damaged", "cracked pipe", "exposed pipe", "infrastructure",
        "manhole", "valve broken", "damaged pipe", "road damage", "sinkhole",
    ],
}

CATEGORY_PRIORITY: list[str] = [
    "LEAKAGE",
    "INFRASTRUCTURE_DAMAGE",
    "NO_SUPPLY",
    "DISCOLOURED_WATER",
    "UNUSUAL_SMELL",
    "LOW_PRESSURE",
    "INTERMITTENT_SUPPLY",
]


def _keyword_classify(description: str) -> dict:
    """Deterministic keyword-based classification."""
    text = description.lower()
    scores: dict[str, int] = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text)
        if score > 0:
            scores[category] = score

    if not scores:
        return {
            "category": "OTHER",
            "confidence": 0.4,
            "symptoms": [],
            "explanation": "Description did not match any known category keywords.",
            "source": "deterministic",
        }

    # Pick highest scoring; break ties by priority order
    best = max(
        scores.keys(),
        key=lambda c: (scores[c], -CATEGORY_PRIORITY.index(c) if c in CATEGORY_PRIORITY else -99),
    )

    max_score = scores[best]
    total_keywords = len(CATEGORY_KEYWORDS.get(best, []))
    confidence = min(0.95, 0.5 + (max_score / max(total_keywords, 1)) * 0.45)

    matched_symptoms = [
        kw for kw in CATEGORY_KEYWORDS.get(best, [])
        if kw in text
    ]

    return {
        "category": best,
        "confidence": round(confidence, 3),
        "symptoms": matched_symptoms[:5],
        "explanation": f"Matched {max_score} keyword(s) for category '{best}': {', '.join(matched_symptoms[:3])}.",
        "source": "deterministic",
    }


async def classify_report(description: str, use_llm: bool = True) -> dict:
    """
    Classify a water issue report.

    Returns a dict with: category, confidence, symptoms, explanation, source.
    Tries Anthropic LLM first if available, falls back to deterministic.
    """
    if use_llm and settings.anthropic_api_key:
        try:
            return await _llm_classify(description)
        except Exception:
            pass  # Fall through to deterministic

    return _keyword_classify(description)


async def _llm_classify(description: str) -> dict:
    """LLM-based classification via Anthropic API."""
    import anthropic  # Lazy import — only required when LLM is used
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    system_prompt = """You are a water infrastructure classification assistant.
Classify the citizen water report into exactly ONE of these categories:
NO_SUPPLY, LOW_PRESSURE, LEAKAGE, DISCOLOURED_WATER, UNUSUAL_SMELL, INTERMITTENT_SUPPLY, INFRASTRUCTURE_DAMAGE, OTHER

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "category": "CATEGORY_NAME",
  "confidence": 0.0-1.0,
  "symptoms": ["symptom1", "symptom2"],
  "explanation": "One sentence explaining the classification."
}

Important: You are identifying the REPORTED SYMPTOM only. Do not confirm water quality or safety."""

    message = client.messages.create(
        model="claude-3-haiku-20240307",
        max_tokens=256,
        messages=[
            {
                "role": "user",
                "content": f"Classify this water issue report:\n\n{description}",
            }
        ],
        system=system_prompt,
    )

    import json
    text = message.content[0].text.strip()
    result = json.loads(text)
    result["source"] = "llm"
    return result
