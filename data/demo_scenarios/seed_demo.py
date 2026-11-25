"""
WaterTrace AI — Demo Data Seeder

Generates ~100 synthetic reports across 5 known scenarios.
All records are clearly labelled as DEMO DATA.
Never represents real citizen reports or verified incidents.

Scenarios:
  1. Neighbourhood supply disruption (Hyderabad, Banjara Hills)
  2. Pipeline leakage cluster (Jubilee Hills)
  3. Discoloured water reports (Madhapur)
  4. Isolated unrelated reports (scattered)
  5. Same-user duplicate reports (should NOT form independent cluster)

Usage:
  pip install supabase python-dotenv
  python seed_demo.py
"""

import os
import random
import uuid
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ---------------------------------------------------------------------------
# Synthetic user IDs — these must be real auth.users IDs in your Supabase
# project. Replace with actual UUIDs after creating demo accounts.
# ---------------------------------------------------------------------------
DEMO_USERS = [
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000002",
    "00000000-0000-0000-0000-000000000003",
    "00000000-0000-0000-0000-000000000004",
    "00000000-0000-0000-0000-000000000005",
    "00000000-0000-0000-0000-000000000006",
    "00000000-0000-0000-0000-000000000007",
    "00000000-0000-0000-0000-000000000008",
]

NOW = datetime.now(timezone.utc)


def jitter(base: float, amount: float) -> float:
    """Add geographic jitter to a coordinate."""
    return base + random.uniform(-amount, amount)


def ts(minutes_ago: int) -> str:
    """Return ISO timestamp N minutes in the past."""
    return (NOW - timedelta(minutes=minutes_ago)).isoformat()


def make_report(
    user_id: str,
    category: str,
    description: str,
    lat: float,
    lon: float,
    minutes_ago: int,
    location_desc: str = "",
) -> dict:
    return {
        "user_id": user_id,
        "issue_category": category,
        "description": description,
        "location": f"SRID=4326;POINT({lon} {lat})",
        "location_description": location_desc,
        "occurrence_time": ts(minutes_ago),
        "ai_category": category,
        "ai_confidence": round(random.uniform(0.72, 0.95), 3),
        "ai_symptoms": [category.lower().replace("_", " ")],
        "ai_explanation": f"Deterministic classification: matched keyword pattern for {category}.",
        "processing_status": "CLASSIFIED",
        "is_demo": True,
    }


reports = []

# ---------------------------------------------------------------------------
# SCENARIO 1: Neighbourhood supply disruption — Banjara Hills, Hyderabad
# 22 reports, ~8 unique users, ~40-minute window, tight geographic cluster
# EXPECTED: forms a strong candidate incident
# ---------------------------------------------------------------------------
BASE_LAT_1, BASE_LON_1 = 17.4150, 78.4480
SCENARIO_1_DESC = [
    "No water coming from taps since morning. Completely dry.",
    "Water supply has completely stopped. No flow at all.",
    "Zero water pressure — nothing from any tap in the house.",
    "Water has been off for over an hour. Neighbours also affected.",
    "No supply since 8am. Very low pressure before it cut out.",
    "Water stopped suddenly. Normally reliable supply.",
    "Complete water outage on our street since 7:50am.",
    "Barely a trickle from the tap, then nothing.",
    "Low pressure building up and then no water at all.",
    "Water cut suddenly, no advance notice from the authority.",
    "No water from any tap. Called my neighbour — same issue.",
    "Supply disruption — no water coming through.",
    "Water pressure dropped to zero within 10 minutes.",
    "Complete outage, no water supply at all right now.",
    "No water since early morning. Very inconvenient.",
    "Intermittent water then completely stopped.",
    "Supply went from low pressure to nothing.",
    "Water supply issue — taps running dry.",
    "No running water, dry pipes throughout the house.",
    "Very low flow this morning then completely stopped.",
    "Water pressure dramatically dropped then stopped.",
    "No water supply at all in this area right now.",
]
SCENARIO_1_CATS = ["NO_SUPPLY"] * 14 + ["LOW_PRESSURE"] * 6 + ["INTERMITTENT_SUPPLY"] * 2

for i, (desc, cat) in enumerate(zip(SCENARIO_1_DESC, SCENARIO_1_CATS)):
    user = DEMO_USERS[i % 7]  # 7 unique users
    reports.append(make_report(
        user_id=user,
        category=cat,
        description=desc,
        lat=jitter(BASE_LAT_1, 0.003),
        lon=jitter(BASE_LON_1, 0.003),
        minutes_ago=random.randint(10, 55),
        location_desc="Banjara Hills area",
    ))

# ---------------------------------------------------------------------------
# SCENARIO 2: Pipeline leakage cluster — Jubilee Hills
# 18 reports, 6 unique users, 90-minute window
# EXPECTED: forms a leakage incident
# ---------------------------------------------------------------------------
BASE_LAT_2, BASE_LON_2 = 17.4320, 78.4100

SCENARIO_2_DESC = [
    "Large water puddle on the road, pipe appears burst.",
    "Water gushing from underground pipe on the main road.",
    "Leaking pipe near the junction, water flowing onto street.",
    "Major water leak visible on the road. Pipe burst.",
    "Water pipe leaking heavily near the intersection.",
    "Burst pipe spraying water on the footpath.",
    "Underground pipe seems burst, road flooding.",
    "Water leaking from pipe near the main road.",
    "Large leak on the street — wasting water continuously.",
    "Pipe burst visible, water flowing into drain.",
    "Road flooding due to pipe leak near bus stop.",
    "Water leak from main pipe, possibly burst.",
    "Burst main pipe — large volume of water flowing.",
    "Leakage from pipe joint on street corner.",
    "Water pipe cracked, continuous leak for 2 hours.",
    "Major leakage visible from road — pipe appears damaged.",
    "Infrastructure damage: broken pipe spraying water.",
    "Water loss due to burst pipe near my house.",
]
SCENARIO_2_CATS = ["LEAKAGE"] * 14 + ["INFRASTRUCTURE_DAMAGE"] * 4

for i, (desc, cat) in enumerate(zip(SCENARIO_2_DESC, SCENARIO_2_CATS)):
    user = DEMO_USERS[i % 6]
    reports.append(make_report(
        user_id=user,
        category=cat,
        description=desc,
        lat=jitter(BASE_LAT_2, 0.002),
        lon=jitter(BASE_LON_2, 0.002),
        minutes_ago=random.randint(20, 110),
        location_desc="Jubilee Hills road area",
    ))

# ---------------------------------------------------------------------------
# SCENARIO 3: Discoloured water — Madhapur
# 15 reports, 5 unique users, 2-hour window
# EXPECTED: forms a discolouration incident
# ---------------------------------------------------------------------------
BASE_LAT_3, BASE_LON_3 = 17.4486, 78.3908

SCENARIO_3_DESC = [
    "Water coming from tap is brown and muddy.",
    "Yellow coloured water from taps today.",
    "Water is discoloured — reddish brown, smells off.",
    "Murky water from tap — not safe to use.",
    "Dark water coming from tap this morning.",
    "Water has an unusual rusty colour today.",
    "Orange tinted water from tap — looks contaminated.",
    "Water smells and looks dirty — brown colour.",
    "Discoloured water with strange smell from tap.",
    "Water coming in brown/rust colour, cannot drink.",
    "Dirty water from tap — brown and smells bad.",
    "Water has changed colour — yellow/brown.",
    "Rust coloured water from all taps in house.",
    "Unusual smell and colour from tap water today.",
    "Water looks brown and has bad odour.",
]
SCENARIO_3_CATS = ["DISCOLOURED_WATER"] * 10 + ["UNUSUAL_SMELL"] * 5

for i, (desc, cat) in enumerate(zip(SCENARIO_3_DESC, SCENARIO_3_CATS)):
    user = DEMO_USERS[i % 5]
    reports.append(make_report(
        user_id=user,
        category=cat,
        description=desc,
        lat=jitter(BASE_LAT_3, 0.0025),
        lon=jitter(BASE_LON_3, 0.0025),
        minutes_ago=random.randint(15, 130),
        location_desc="Madhapur IT area",
    ))

# ---------------------------------------------------------------------------
# SCENARIO 4: Isolated unrelated reports — spread across city
# Should NOT cluster together (too far apart)
# ---------------------------------------------------------------------------
ISOLATED = [
    (17.3850, 78.4867, "NO_SUPPLY", "No water supply in my area today."),
    (17.4600, 78.5100, "LOW_PRESSURE", "Very low water pressure from taps."),
    (17.3600, 78.4700, "LEAKAGE", "Small water leak near my street."),
    (17.4900, 78.3800, "UNUSUAL_SMELL", "Strange smell from tap water."),
    (17.3200, 78.5500, "NO_SUPPLY", "Water supply disruption in colony."),
    (17.5100, 78.4000, "LOW_PRESSURE", "Low pressure since afternoon."),
    (17.3700, 78.3600, "INTERMITTENT_SUPPLY", "Water comes and goes all day."),
    (17.4200, 78.5600, "INFRASTRUCTURE_DAMAGE", "Damaged pipe near school."),
    (17.3900, 78.4200, "DISCOLOURED_WATER", "Yellow water from tap today."),
    (17.5300, 78.4700, "NO_SUPPLY", "No water from last evening."),
]

for i, (lat, lon, cat, desc) in enumerate(ISOLATED):
    reports.append(make_report(
        user_id=DEMO_USERS[i % len(DEMO_USERS)],
        category=cat,
        description=desc,
        lat=lat,
        lon=lon,
        minutes_ago=random.randint(60, 1440),
        location_desc="Various locations",
    ))

# ---------------------------------------------------------------------------
# SCENARIO 5: Same-user duplicates — should NOT multiply evidence score
# One user submitting 5 reports from same location
# ---------------------------------------------------------------------------
SINGLE_USER = DEMO_USERS[0]
for i in range(5):
    reports.append(make_report(
        user_id=SINGLE_USER,
        category="NO_SUPPLY",
        description=f"No water supply. Already reported this. Update #{i + 1}.",
        lat=jitter(17.4000, 0.0005),
        lon=jitter(78.4600, 0.0005),
        minutes_ago=random.randint(5, 30),
        location_desc="Same location repeated reports",
    ))

# ---------------------------------------------------------------------------
# SCENARIO 6: Old reports (should not cluster with fresh ones)
# ---------------------------------------------------------------------------
for i in range(5):
    reports.append(make_report(
        user_id=DEMO_USERS[i % len(DEMO_USERS)],
        category=random.choice(["NO_SUPPLY", "LOW_PRESSURE", "LEAKAGE"]),
        description="Old report from several days ago. No longer active.",
        lat=jitter(BASE_LAT_1, 0.003),
        lon=jitter(BASE_LON_1, 0.003),
        minutes_ago=random.randint(4320, 10080),  # 3–7 days ago
        location_desc="Old report",
    ))


def seed():
    print(f"Seeding {len(reports)} demo reports...")

    # Insert in batches of 20
    batch_size = 20
    total_inserted = 0
    for i in range(0, len(reports), batch_size):
        batch = reports[i : i + batch_size]
        try:
            result = supabase.table("reports").insert(batch).execute()
            inserted = len(result.data or [])
            total_inserted += inserted
            print(f"  Inserted batch {i // batch_size + 1}: {inserted} records")
        except Exception as e:
            print(f"  Error in batch {i // batch_size + 1}: {e}")

    print(f"\nSeeding complete. Total inserted: {total_inserted}")
    print("\nScenario summary:")
    print("  Scenario 1 (Supply disruption, Banjara Hills): 22 reports, 7 users → SHOULD cluster")
    print("  Scenario 2 (Pipeline leakage, Jubilee Hills): 18 reports, 6 users → SHOULD cluster")
    print("  Scenario 3 (Discoloured water, Madhapur): 15 reports, 5 users → SHOULD cluster")
    print("  Scenario 4 (Isolated reports, city-wide): 10 reports → Should NOT cluster")
    print("  Scenario 5 (Same-user duplicates): 5 reports, 1 user → Should NOT count as independent")
    print("  Scenario 6 (Old reports): 5 reports, old timestamps → Should NOT cluster with fresh reports")
    print("\nAfter seeding, call POST /api/v1/incidents/analyze to run clustering.")


if __name__ == "__main__":
    seed()
