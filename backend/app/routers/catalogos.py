"""Catálogos de solo lectura (niveles, lenguajes) y temas (los crea un admin)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.ejercicios import LenguajeProgramacion, NivelDificultad, Tema
from app.schemas.catalogos import LenguajeResponse, NivelResponse, TemaCreate, TemaResponse

router = APIRouter()


@router.get("/niveles", response_model=list[NivelResponse], dependencies=[Depends(get_current_user)])
def listar_niveles(db: Session = Depends(get_db)):
    return db.query(NivelDificultad).order_by(NivelDificultad.id).all()


@router.get("/lenguajes", response_model=list[LenguajeResponse], dependencies=[Depends(get_current_user)])
def listar_lenguajes(solo_activos: bool = True, db: Session = Depends(get_db)):
    consulta = db.query(LenguajeProgramacion)
    if solo_activos:
        consulta = consulta.filter(LenguajeProgramacion.activo.is_(True))
    return consulta.order_by(LenguajeProgramacion.id).all()


@router.get("/temas", response_model=list[TemaResponse], dependencies=[Depends(get_current_user)])
def listar_temas(db: Session = Depends(get_db)):
    return db.query(Tema).order_by(Tema.nombre).all()


@router.post(
    "/temas",
    response_model=TemaResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin"))],
)
def crear_tema(data: TemaCreate, db: Session = Depends(get_db)):
    # Comparación sin distinguir mayúsculas: "Arrays" y "arrays" son el mismo tema
    existente = db.query(Tema).filter(func.lower(Tema.nombre) == data.nombre.lower()).first()
    if existente:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un tema con ese nombre")

    tema = Tema(nombre=data.nombre)
    db.add(tema)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe un tema con ese nombre")
    db.refresh(tema)
    return tema
