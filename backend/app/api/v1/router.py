from fastapi import APIRouter
from app.api.v1.endpoints import reports, incidents, analytics, notifications

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
api_router.include_router(analytics.router, prefix="", tags=["Analytics"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
