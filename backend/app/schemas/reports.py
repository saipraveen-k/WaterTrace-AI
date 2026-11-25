from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class IssueCategory(str, Enum):
    NO_SUPPLY = "NO_SUPPLY"
    LOW_PRESSURE = "LOW_PRESSURE"
    LEAKAGE = "LEAKAGE"
    DISCOLOURED_WATER = "DISCOLOURED_WATER"
    UNUSUAL_SMELL = "UNUSUAL_SMELL"
    INTERMITTENT_SUPPLY = "INTERMITTENT_SUPPLY"
    INFRASTRUCTURE_DAMAGE = "INFRASTRUCTURE_DAMAGE"
    OTHER = "OTHER"


class ProcessingStatus(str, Enum):
    PENDING = "PENDING"
    CLASSIFIED = "CLASSIFIED"
    CLUSTERED = "CLUSTERED"
    INCIDENT_LINKED = "INCIDENT_LINKED"
    REJECTED = "REJECTED"
    DUPLICATE = "DUPLICATE"


class LocationInput(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    description: Optional[str] = Field(None, max_length=200)


class ReportCreate(BaseModel):
    issue_category: IssueCategory
    description: str = Field(..., min_length=10, max_length=2000)
    location: LocationInput
    occurrence_time: datetime

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Description cannot be blank")
        return v.strip()


class ReportUpdate(BaseModel):
    issue_category: Optional[IssueCategory] = None
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    confirmed_category: Optional[IssueCategory] = None
    user_confirmed: Optional[bool] = None


class AIClassification(BaseModel):
    category: IssueCategory
    confidence: float = Field(..., ge=0.0, le=1.0)
    symptoms: List[str] = []
    explanation: str


class ReportResponse(BaseModel):
    id: str
    user_id: str
    issue_category: IssueCategory
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_description: Optional[str] = None
    occurrence_time: datetime
    submitted_at: datetime
    ai_category: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_symptoms: Optional[List[str]] = None
    ai_explanation: Optional[str] = None
    confirmed_category: Optional[str] = None
    user_confirmed: bool
    processing_status: ProcessingStatus
    is_demo: bool
    created_at: datetime
    updated_at: datetime


class ReportListResponse(BaseModel):
    items: List[ReportResponse]
    total: int
    page: int
    per_page: int
