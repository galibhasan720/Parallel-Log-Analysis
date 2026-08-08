"""Dataset upload and listing. Paths are server-side only."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import DatasetOut
from app.auth.deps import get_current_user
from app.datasets.store import extension_ok, save_upload
from app.db.models import Dataset, User
from app.db.session import get_db

router = APIRouter()


@router.post("", response_model=DatasetOut, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DatasetOut:
    name = file.filename or "upload.log"
    if not extension_ok(name):
        raise HTTPException(status_code=400, detail="Only .log and .txt uploads are allowed")
    try:
        dest, original, size, checksum = await save_upload(file)
    except ValueError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc
    row = Dataset(
        user_id=user.id,
        filename=original,
        stored_path=str(dest),
        format="application",
        size_bytes=size,
        checksum=checksum,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return DatasetOut(
        id=row.id,
        filename=row.filename,
        format=row.format,
        size_bytes=row.size_bytes,
        checksum=row.checksum,
        created_at=row.created_at,
    )


@router.get("", response_model=list[DatasetOut])
def list_datasets(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[DatasetOut]:
    rows = db.scalars(select(Dataset).where(Dataset.user_id == user.id).order_by(Dataset.id)).all()
    return [
        DatasetOut(
            id=r.id,
            filename=r.filename,
            format=r.format,
            size_bytes=r.size_bytes,
            checksum=r.checksum,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.get("/{dataset_id}", response_model=DatasetOut)
def get_dataset(
    dataset_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DatasetOut:
    row = db.get(Dataset, dataset_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return DatasetOut(
        id=row.id,
        filename=row.filename,
        format=row.format,
        size_bytes=row.size_bytes,
        checksum=row.checksum,
        created_at=row.created_at,
    )
