from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.database_models import User
from backend.app.schemas.auth import Token, UserCreate, UserResponse
from backend.app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)
from backend.app.core.config import settings
from backend.app.services.audit.ledger import audit_ledger

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registers a new user account. Enforces unique username and email."""
    # Check if username exists
    existing_user = db.query(User).filter(User.username == user_in.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered in the security directory.",
        )

    # Check if email exists
    existing_email = db.query(User).filter(User.email == user_in.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered.",
        )

    # Sanitize role assignment
    valid_roles = {"ADMIN", "SECURITY_ANALYST", "AUTHORIZED_OPERATOR"}
    assigned_role = user_in.role.upper() if user_in.role.upper() in valid_roles else "AUTHORIZED_OPERATOR"

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        role=assigned_role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Record in audit ledger
    audit_ledger.record_event(
        db=db,
        event_type="USER_REGISTERED",
        payload={"username": new_user.username, "role": new_user.role, "user_id": new_user.id},
        actor="SYSTEM",
    )

    return new_user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticates user credentials using Argon2 and issues a JWT token."""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or security passphrase.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated. Contact a security administrator.",
        )

    access_token = create_access_token(
        subject=user.username,
        role=user.role,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        user_id=user.id,
        username=user.username,
        role=user.role,
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user_payload: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the authenticated profile of the current operator."""
    username = current_user_payload.get("sub")
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user record no longer exists.",
        )
    return user
