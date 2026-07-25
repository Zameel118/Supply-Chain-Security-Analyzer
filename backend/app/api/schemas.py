"""
Shared Pydantic response/request shapes for the API.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, HttpUrl


class UserOut(BaseModel):
    id: UUID
    github_id: str
    username: str
    avatar_url: str | None

    model_config = {"from_attributes": True}


class ScanCreate(BaseModel):
    repo_url: str = Field(..., min_length=3, max_length=512)
    private_package_prefix: str | None = Field(default=None, max_length=255)
    project_type: str = Field(default="commercial", pattern="^(commercial|open-source)$")


class ScanOut(BaseModel):
    id: UUID
    repo_url: str
    status: str
    private_package_prefix: str | None
    project_type: str
    error_message: str | None
    created_at: datetime
    completed_at: datetime | None
    dependency_count: int = 0

    model_config = {"from_attributes": True}


class DependencyOut(BaseModel):
    id: UUID
    name: str
    version: str | None
    ecosystem: str
    is_direct: bool
    depth: int
    parent_dependency_id: UUID | None

    model_config = {"from_attributes": True}


class ScanDetailOut(ScanOut):
    """Scan metadata plus dependency rows (used by the results page)."""

    dependencies: list[DependencyOut] = []



class RepoOut(BaseModel):
    full_name: str
    html_url: HttpUrl | str
    private: bool
    description: str | None = None
    language: str | None = None
    updated_at: str | None = None
