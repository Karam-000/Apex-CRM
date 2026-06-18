from app.core.db import Base, SessionLocal, engine
from app.core.security import hash_password, hash_token
from app.models.entities import (
    ApiCredential,
    Role,
    TicketSLAPolicy,
    User,
)


def run_seed(db) -> None:
    """Provision the minimum a production install needs to operate.

    This creates the role definitions, the default login accounts, their API
    credentials, and the default SLA policies. It intentionally seeds **no**
    sample business data (accounts, contacts, deals, etc.) so the system
    starts empty and ready for real use.
    """
    def ensure_role(name: str, permissions: dict) -> Role:
        existing = db.query(Role).filter(Role.name == name).first()
        if existing:
            return existing
        existing = Role(name=name, permissions_json=permissions)
        db.add(existing)
        db.flush()
        return existing

    def ensure_user(email: str, name: str, role_id: int, team_id: int, password: str = "apex123") -> User:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            # Update password if not set
            if not existing.password_hash:
                existing.password_hash = hash_password(password)
                db.flush()
            return existing
        existing = User(name=name, email=email, role_id=role_id, team_id=team_id, password_hash=hash_password(password))
        db.add(existing)
        db.flush()
        return existing

    def ensure_credential(user_id: int, role_name: str, team_id: int, token_plain: str) -> None:
        token_h = hash_token(token_plain)
        existing = db.query(ApiCredential).filter(ApiCredential.token_hash == token_h).first()
        if existing:
            return
        db.add(ApiCredential(user_id=user_id, role_name=role_name, team_id=team_id, token_hash=token_h, is_active=1))

    admin_role = ensure_role("admin", {"all": True})
    supervisor_role = ensure_role("supervisor", {"team": True})
    agent_role = ensure_role("agent", {"self": True})

    admin = ensure_user("admin@apex.com", "CRM Admin", admin_role.id, 1)
    supervisor = ensure_user("supervisor@apex.com", "Sales Manager", supervisor_role.id, 1)
    agent = ensure_user("agent@apex.com", "Sales Agent", agent_role.id, 1)

    ensure_credential(admin.id, "admin", 1, "admin-1-token")
    ensure_credential(supervisor.id, "supervisor", 1, "supervisor-2-token")
    ensure_credential(agent.id, "agent", 1, "agent-3-token")

    if db.query(TicketSLAPolicy).filter(TicketSLAPolicy.name == "Default Medium").first() is None:
        db.add(
            TicketSLAPolicy(
                name="Default Medium",
                priority="medium",
                first_response_minutes=120,
                resolution_minutes=1440,
                business_hours_json={"timezone": "UTC", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]},
            )
        )
    if db.query(TicketSLAPolicy).filter(TicketSLAPolicy.name == "Default High").first() is None:
        db.add(
            TicketSLAPolicy(
                name="Default High",
                priority="high",
                first_response_minutes=30,
                resolution_minutes=480,
                business_hours_json={"timezone": "UTC", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]},
            )
        )
    db.commit()


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()


if __name__ == "__main__":
    run()
