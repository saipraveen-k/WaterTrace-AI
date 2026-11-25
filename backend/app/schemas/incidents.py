from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class IncidentStatus(str, Enum):
    DETECTED = "DETECTED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    ACTION_INITIATED = "ACTION_INITIATED"
    RESOLVED = "RESOLVED"
    REOPENED = "REOPENED"
    REJECTED = "REJECTED"


class IncidentResponse(BaseModel):
    id: str
    title: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    affected_radius_meters: Optional[float] = None
    primary_categories: List[str]
    independent_reporter_count: int
    total_report_count: int
    detection_time: datetime
    evidence_confidence: float
    investigation_priority: float
    explanation: Optional[str] = None
    status: IncidentStatus
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    is_demo: bool
    created_at: datetime
    updated_at: datetime


class IncidentStatusUpdate(BaseModel):
    status: IncidentStatus
    notes: Optional[str] = None
    assigned_to: Optional[str] = None


class IncidentMapItem(BaseModel):
    id: str
    title: str
    latitude: float
    longitude: float
    affected_radius_meters: Optional[float]
    status: IncidentStatus
    primary_categories: List[str]
    independent_reporter_count: int
    evidence_confidence: float
    investigation_priority: float
    detection_time: datetime


class IncidentListResponse(BaseModel):
    items: List[IncidentResponse]
    total: int


class IncidentEvent(BaseModel):
    id: str
    incident_id: str
    actor_id: Optional[str]
    event_type: str
    from_status: Optional[str]
    to_status: Optional[str]
    notes: Optional[str]
    metadata: dict
    created_at: datetime
