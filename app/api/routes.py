import csv
import io
import secrets
import shutil
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.db import engine, get_db
from app.core.security import (
    AuthContext,
    ensure_roles,
    hash_password,
    hash_token,
    is_legacy_hash,
    require_auth,
    verify_password,
)
from app.models.entities import (
    Account,
    Activity,
    ApiCredential,
    ApprovalRequest,
    AuditLog,
    BackupLog,
    Campaign,
    Contact,
    ContactConsent,
    ConnectorIntegration,
    ConnectorSyncLog,
    CRMSetting,
    CustomerEvent,
    CustomerHealthScore,
    Deal,
    DealRiskScore,
    Invoice,
    LeadScore,
    LeadAttribution,
    Message,
    Payment,
    ChurnRiskScore,
    QuotaTarget,
    Role,
    Ticket,
    TicketSLAPolicy,
    TicketSLATracking,
    User,
    WorkflowDefinition,
    WorkflowRule,
    WorkflowRun,
)
from app.schemas.dto import (
    AccountCreate,
    AccountOut,
    ActivityCreate,
    ConsentCreate,
    ContactCreate,
    ContactOut,
    CampaignCreate,
    CampaignOut,
    CampaignUpdate,
    ConnectorCreate,
    ConnectorOut,
    ConnectorUpdate,
    ContactUpdate,
    DealCreate,
    DealOut,
    DealUpdate,
    InvoiceUpdate,
    TicketUpdate,
    UserCreate,
    LoginRequest,
    LoginResponse,
    QuotaCreate,
    ActivityUpdate,
    ApprovalCreate,
    MessageCreate,
    TicketCreate,
    WorkflowDefinitionCreate,
    WorkflowRuleCreate,
)
from app.services.connectors import build_signature, send_json
from app.services.scoring import (
    churn_risk_from_thresholds,
    commission_and_attainment,
    customer_health_score,
    forecast_pipeline,
    grade_from_score,
    predict_deal_risk,
    score_lead_rules,
    suggest_next_best_action,
)
from app.services.workflow import evaluate_condition, execute_action

# Public routes that must be reachable WITHOUT a bearer token (e.g. login).
public_router = APIRouter()

# All other routes require authentication. Note many handlers also declare an
# `auth` parameter to read the caller's identity/role.
router = APIRouter(dependencies=[Depends(require_auth)])


def log_event(
    db: Session,
    *,
    contact_id: int,
    account_id: int | None,
    event_type: str,
    source_module: str,
    source_id: int | None,
    payload: dict | None = None,
    channel: str | None = None,
) -> None:
    event = CustomerEvent(
        contact_id=contact_id,
        account_id=account_id,
        event_type=event_type,
        source_module=source_module,
        source_id=source_id,
        channel=channel,
        payload_json=payload or {},
    )
    db.add(event)


def log_audit(db: Session, entity_type: str, entity_id: int, action: str, after_json: dict | None = None) -> None:
    row = AuditLog(entity_type=entity_type, entity_id=entity_id, action=action, after_json=after_json or {})
    db.add(row)


def team_user_ids(db: Session, team_id: int | None) -> list[int]:
    if team_id is None:
        return []
    rows = db.query(User.id).filter(User.team_id == team_id).all()
    return [row.id for row in rows]


def can_view_user_scope(user_id: int | None, auth: AuthContext, db: Session) -> bool:
    if auth.role == "admin":
        return True
    if auth.role == "agent":
        return user_id == auth.user_id
    if auth.role == "supervisor":
        if user_id == auth.user_id:
            return True
        return user_id in team_user_ids(db, auth.team_id)
    return False


def ensure_can_modify(owner_user_id: int | None, auth: AuthContext, db: Session) -> None:
    """Raise 403 unless the caller is allowed to edit/delete a record with this owner."""
    if not can_view_user_scope(owner_user_id, auth, db):
        raise HTTPException(status_code=403, detail="Not allowed to modify this record.")


def generate_api_key() -> str:
    """Generate a URL-safe API key that secures a connector integration."""
    return f"apex_{secrets.token_urlsafe(32)}"


@router.get("/auth/whoami")
def whoami(auth: AuthContext = Depends(require_auth), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == auth.user_id).first()
    return {
        "user_id": auth.user_id, 
        "name": user.name if user else "Unknown",
        "role": auth.role, 
        "team_id": auth.team_id
    }


@public_router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Verify password (bcrypt, with legacy SHA-256 fallback).
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Transparently upgrade legacy hashes to bcrypt on successful login.
    if is_legacy_hash(user.password_hash):
        user.password_hash = hash_password(payload.password)
        db.commit()

    # Find or create a token for the user
    cred = db.query(ApiCredential).filter(ApiCredential.user_id == user.id, ApiCredential.is_active == 1).first()
    
    role = db.query(Role).filter(Role.id == user.role_id).first()
    role_name = role.name if role else "agent"
    
    token_plain = f"{role_name}-{user.id}-token"
    if not cred:
        cred = ApiCredential(
            user_id=user.id,
            role_name=role_name,
            team_id=user.team_id,
            token_hash=hash_token(token_plain),
            is_active=1
        )
        db.add(cred)
        db.commit()
    
    return {
        "user_id": user.id,
        "name": user.name,
        "role": role_name,
        "token": token_plain
    }


@router.post("/contacts", response_model=ContactOut)
def create_contact(payload: ContactCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    body = payload.model_dump()
    lead_source = body.pop("lead_source", None)
    if body.get("owner_user_id") is None:
        body["owner_user_id"] = auth.user_id
    if auth.role == "agent" and body["owner_user_id"] != auth.user_id:
        raise HTTPException(status_code=403, detail="Agents can only create contacts for themselves.")
    contact = Contact(**body)
    db.add(contact)
    db.flush()
    if lead_source:
        db.add(LeadAttribution(contact_id=contact.id, source=lead_source))
    log_event(
        db,
        contact_id=contact.id,
        account_id=contact.account_id,
        event_type="contact_created",
        source_module="contacts",
        source_id=contact.id,
        payload={"name": f"{contact.first_name} {contact.last_name}", "source": lead_source or "unknown"},
    )
    log_audit(db, "contact", contact.id, "create", body)
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/leads")
def list_leads(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    """Contacts in early lifecycle stages, with their latest lead score."""
    query = db.query(Contact).filter(Contact.lifecycle_stage.in_(["lead", "mql", "sql"]))
    if auth.role == "agent":
        query = query.filter(Contact.owner_user_id == auth.user_id)
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        query = query.filter(Contact.owner_user_id.in_(ids)) if ids else query.filter(Contact.owner_user_id == auth.user_id)
    rows = query.order_by(Contact.id.desc()).all()
    result = []
    for c in rows:
        score = db.query(LeadScore).filter(LeadScore.contact_id == c.id).order_by(LeadScore.id.desc()).first()
        result.append({
            "id": c.id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "phone": c.phone,
            "job_title": c.job_title,
            "lifecycle_stage": c.lifecycle_stage,
            "owner_user_id": c.owner_user_id,
            "score": score.score if score else None,
            "grade": score.grade if score else None,
        })
    return result


@router.get("/campaigns", response_model=list[CampaignOut])
def list_campaigns(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    return db.query(Campaign).order_by(Campaign.id.desc()).all()


@router.post("/campaigns", response_model=CampaignOut)
def create_campaign(payload: CampaignCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    row = Campaign(**payload.model_dump(), created_by=auth.user_id)
    db.add(row)
    log_audit(db, "campaign", 0, "create", payload.model_dump(mode="json"))
    db.commit()
    db.refresh(row)
    return row


@router.put("/campaigns/{campaign_id}", response_model=CampaignOut)
def update_campaign(campaign_id: int, payload: CampaignUpdate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    row = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="campaign not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, value)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/campaigns/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    row = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="campaign not found")
    db.delete(row)
    log_audit(db, "campaign", campaign_id, "delete", {})
    db.commit()
    return {"status": "deleted", "id": campaign_id}


@router.post("/accounts", response_model=AccountOut)
def create_account(payload: AccountCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    if auth.role == "agent":
        raise HTTPException(status_code=403, detail="Agents cannot create accounts directly.")
    account = Account(**payload.model_dump())
    db.add(account)
    db.flush()
    log_audit(db, "account", account.id, "create", payload.model_dump())
    db.commit()
    db.refresh(account)
    return account


@router.get("/accounts", response_model=list[AccountOut])
def list_accounts(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    query = db.query(Account)
    if auth.role == "agent":
        query = query.filter(Account.owner_user_id == auth.user_id)
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        query = query.filter(Account.owner_user_id.in_(ids)) if ids else query.filter(Account.owner_user_id == auth.user_id)
    return query.order_by(Account.id.desc()).all()


@router.get("/contacts", response_model=list[ContactOut])
def list_contacts(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    query = db.query(Contact)
    if auth.role == "agent":
        query = query.filter(Contact.owner_user_id == auth.user_id)
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        query = query.filter(Contact.owner_user_id.in_(ids)) if ids else query.filter(Contact.owner_user_id == auth.user_id)
    return query.order_by(Contact.id.desc()).all()


@router.put("/contacts/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: int, payload: ContactUpdate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="contact not found")
    ensure_can_modify(contact.owner_user_id, auth, db)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(contact, field, value)
    log_audit(db, "contact", contact.id, "update", updates)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="contact not found")
    ensure_can_modify(contact.owner_user_id, auth, db)
    # Remove dependent rows that require a contact (NOT NULL FKs).
    db.query(CustomerEvent).filter(CustomerEvent.contact_id == contact_id).delete()
    db.query(LeadAttribution).filter(LeadAttribution.contact_id == contact_id).delete()
    db.query(ContactConsent).filter(ContactConsent.contact_id == contact_id).delete()
    db.query(LeadScore).filter(LeadScore.contact_id == contact_id).delete()
    db.query(Message).filter(Message.contact_id == contact_id).delete()
    # Detach optional references on other records.
    db.query(Activity).filter(Activity.contact_id == contact_id).update({Activity.contact_id: None})
    db.query(Deal).filter(Deal.primary_contact_id == contact_id).update({Deal.primary_contact_id: None})
    db.query(Ticket).filter(Ticket.contact_id == contact_id).update({Ticket.contact_id: None})
    db.delete(contact)
    log_audit(db, "contact", contact_id, "delete", {})
    db.commit()
    return {"status": "deleted", "id": contact_id}


@router.post("/deals", response_model=DealOut)
def create_deal(payload: DealCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    body = payload.model_dump()
    if body.get("owner_user_id") is None:
        body["owner_user_id"] = auth.user_id
    if auth.role == "agent" and body["owner_user_id"] != auth.user_id:
        raise HTTPException(status_code=403, detail="Agents can only create own deals.")
    deal = Deal(**body)
    db.add(deal)
    db.flush()
    if deal.primary_contact_id:
        log_event(
            db,
            contact_id=deal.primary_contact_id,
            account_id=deal.account_id,
            event_type="deal_created",
            source_module="deals",
            source_id=deal.id,
            payload={"amount": float(deal.amount), "stage_id": deal.stage_id},
        )
    log_audit(db, "deal", deal.id, "create", body)
    db.commit()
    db.refresh(deal)
    return deal


@router.get("/deals", response_model=list[DealOut])
def list_deals(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    query = db.query(Deal)
    if auth.role == "agent":
        query = query.filter(Deal.owner_user_id == auth.user_id)
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        query = query.filter(Deal.owner_user_id.in_(ids)) if ids else query.filter(Deal.owner_user_id == auth.user_id)
    return query.order_by(Deal.id.desc()).all()


@router.put("/deals/{deal_id}", response_model=DealOut)
def update_deal(deal_id: int, payload: DealUpdate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="deal not found")
    ensure_can_modify(deal.owner_user_id, auth, db)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(deal, field, value)
    log_audit(db, "deal", deal.id, "update", updates)
    db.commit()
    db.refresh(deal)
    return deal


@router.delete("/deals/{deal_id}")
def delete_deal(deal_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="deal not found")
    ensure_can_modify(deal.owner_user_id, auth, db)
    db.delete(deal)
    log_audit(db, "deal", deal_id, "delete", {})
    db.commit()
    return {"status": "deleted", "id": deal_id}


@router.get("/activities")
def list_activities(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    query = db.query(Activity)
    if auth.role == "agent":
        query = query.filter(Activity.owner_user_id == auth.user_id)
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        query = query.filter(Activity.owner_user_id.in_(ids)) if ids else query.filter(Activity.owner_user_id == auth.user_id)
    return query.order_by(Activity.id.desc()).all()


@router.post("/activities")
def create_activity(payload: ActivityCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    body = payload.model_dump()
    if body.get("owner_user_id") is None:
        body["owner_user_id"] = auth.user_id
    
    # Check permission to assign
    if auth.role == "agent" and body["owner_user_id"] != auth.user_id:
        raise HTTPException(status_code=403, detail="Agents can only create own activities.")
    if auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        if body["owner_user_id"] != auth.user_id and body["owner_user_id"] not in ids:
            raise HTTPException(status_code=403, detail="Supervisors can only assign to team members.")
    
    # Map agent name for UI display consistency if possible, but keep simple for now
    row = Activity(**body)
    db.add(row)
    db.flush()
    if row.contact_id:
        log_event(
            db,
            contact_id=row.contact_id,
            account_id=row.account_id,
            event_type=f"activity_{row.type}",
            source_module="activities",
            source_id=row.id,
            payload={"subject": row.subject},
        )
    log_audit(db, "activity", row.id, "create", body)
    db.commit()
    return {"id": row.id, "status": "created"}


@router.patch("/activities/{activity_id}")
def update_activity(
    activity_id: int, 
    payload: ActivityUpdate, 
    db: Session = Depends(get_db), 
    auth: AuthContext = Depends(require_auth)
):
    activity = db.query(Activity).filter(Activity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    
    if auth.role == "agent" and activity.owner_user_id != auth.user_id:
        raise HTTPException(status_code=403, detail="Agents can only update their own activities.")
    
    if payload.outcome:
        activity.outcome = payload.outcome
        activity.completed_at = datetime.utcnow()
    
    db.commit()
    return {"id": activity.id, "status": "updated"}


@router.post("/messages")
def log_message(payload: MessageCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    consent = (
        db.query(ContactConsent)
        .filter(
            ContactConsent.contact_id == payload.contact_id,
            ContactConsent.channel == payload.channel,
            ContactConsent.status == "granted",
        )
        .order_by(ContactConsent.captured_at.desc())
        .first()
    )
    if payload.direction == "outbound" and consent is None:
        raise HTTPException(status_code=400, detail="Consent missing for outbound message.")

    row = Message(**payload.model_dump(), sent_at=datetime.utcnow() if payload.direction == "outbound" else None)
    db.add(row)
    db.flush()
    log_event(
        db,
        contact_id=row.contact_id,
        account_id=row.account_id,
        event_type=f"message_{row.direction}",
        source_module="messaging",
        source_id=row.id,
        payload={"status": row.status},
        channel=row.channel,
    )
    log_audit(db, "message", row.id, "create", payload.model_dump())
    db.commit()
    return {"id": row.id, "status": "logged"}


@router.get("/messages")
def list_messages(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    query = db.query(Message)
    if auth.role == "agent":
        query = query.join(Contact, Contact.id == Message.contact_id).filter(Contact.owner_user_id == auth.user_id)
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        query = query.join(Contact, Contact.id == Message.contact_id).filter(Contact.owner_user_id.in_(ids))
    return query.order_by(Message.id.desc()).all()


@router.post("/consents")
def create_consent(payload: ConsentCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    row = ContactConsent(**payload.model_dump())
    db.add(row)
    db.flush()
    log_event(
        db,
        contact_id=row.contact_id,
        account_id=None,
        event_type="consent_updated",
        source_module="privacy",
        source_id=row.id,
        payload={"channel": row.channel, "status": row.status},
    )
    db.commit()
    return {"id": row.id}


@router.get("/contacts/{contact_id}/timeline")
def contact_timeline(contact_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="contact not found")
    if not can_view_user_scope(contact.owner_user_id, auth, db):
        raise HTTPException(status_code=403, detail="Not allowed to view this timeline.")
    rows = (
        db.query(CustomerEvent)
        .filter(CustomerEvent.contact_id == contact_id)
        .order_by(CustomerEvent.event_ts.desc())
        .all()
    )
    return rows


@router.post("/tickets")
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ticket = Ticket(**payload.model_dump())
    db.add(ticket)
    db.flush()
    policy = (
        db.query(TicketSLAPolicy)
        .filter(TicketSLAPolicy.priority == ticket.priority)
        .order_by(TicketSLAPolicy.id.asc())
        .first()
    )
    if policy:
        now = datetime.utcnow()
        tracking = TicketSLATracking(
            ticket_id=ticket.id,
            policy_id=policy.id,
            first_response_due_at=now + timedelta(minutes=policy.first_response_minutes),
            resolution_due_at=now + timedelta(minutes=policy.resolution_minutes),
        )
        db.add(tracking)
    if ticket.contact_id:
        log_event(
            db,
            contact_id=ticket.contact_id,
            account_id=ticket.account_id,
            event_type="ticket_created",
            source_module="support",
            source_id=ticket.id,
            payload={"priority": ticket.priority},
        )
    log_audit(db, "ticket", ticket.id, "create", payload.model_dump())
    db.commit()
    return {"id": ticket.id, "sla_policy_applied": policy.id if policy else None}


@router.get("/tickets")
def list_tickets(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    query = db.query(Ticket)
    if auth.role == "agent":
        query = query.filter((Ticket.assigned_user_id == auth.user_id) | (Ticket.assigned_user_id.is_(None)))
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        query = query.filter(Ticket.assigned_user_id.in_(ids)) if ids else query.filter(Ticket.assigned_user_id == auth.user_id)
    return query.order_by(Ticket.id.desc()).all()


@router.get("/tickets/{ticket_id}/sla")
def ticket_sla(ticket_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    tracking = db.query(TicketSLATracking).filter(TicketSLATracking.ticket_id == ticket_id).first()
    if not tracking:
        raise HTTPException(status_code=404, detail="SLA tracking not found")
    now = datetime.utcnow()
    breach = int(now > tracking.resolution_due_at and tracking.resolved_at is None)
    return {
        "ticket_id": ticket_id,
        "first_response_due_at": tracking.first_response_due_at,
        "resolution_due_at": tracking.resolution_due_at,
        "breach_flag": breach,
    }


@router.get("/workflows")
def list_workflows(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    rows = db.query(WorkflowDefinition).order_by(WorkflowDefinition.id.desc()).all()
    result = []
    for w in rows:
        rule_count = db.query(func.count(WorkflowRule.id)).filter(WorkflowRule.workflow_id == w.id).scalar() or 0
        result.append(
            {
                "id": w.id,
                "name": w.name,
                "trigger_type": w.trigger_type,
                "is_active": w.is_active,
                "rule_count": int(rule_count),
            }
        )
    return result


def _can_modify_ticket(ticket: Ticket, auth: AuthContext, db: Session) -> bool:
    if auth.role == "admin":
        return True
    if auth.role == "supervisor":
        return ticket.assigned_user_id in (team_user_ids(db, auth.team_id) + [auth.user_id, None])
    return ticket.assigned_user_id in (auth.user_id, None)


@router.put("/tickets/{ticket_id}")
def update_ticket(ticket_id: int, payload: TicketUpdate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="ticket not found")
    if not _can_modify_ticket(ticket, auth, db):
        raise HTTPException(status_code=403, detail="Not allowed to modify this ticket.")
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(ticket, field, value)
    if updates.get("status") == "resolved" and ticket.resolved_at is None:
        ticket.resolved_at = datetime.utcnow()
        tracking = db.query(TicketSLATracking).filter(TicketSLATracking.ticket_id == ticket_id).first()
        if tracking:
            tracking.resolved_at = ticket.resolved_at
    log_audit(db, "ticket", ticket.id, "update", updates)
    db.commit()
    return {"id": ticket.id, "status": "updated"}


@router.delete("/tickets/{ticket_id}")
def delete_ticket(ticket_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="ticket not found")
    if not _can_modify_ticket(ticket, auth, db):
        raise HTTPException(status_code=403, detail="Not allowed to delete this ticket.")
    db.query(TicketSLATracking).filter(TicketSLATracking.ticket_id == ticket_id).delete()
    db.delete(ticket)
    log_audit(db, "ticket", ticket_id, "delete", {})
    db.commit()
    return {"status": "deleted", "id": ticket_id}


@router.post("/workflows")
def create_workflow(payload: WorkflowDefinitionCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    row = WorkflowDefinition(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.delete("/workflows/{workflow_id}")
def delete_workflow(workflow_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    workflow = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="workflow not found")
    db.query(WorkflowRule).filter(WorkflowRule.workflow_id == workflow_id).delete()
    db.delete(workflow)
    log_audit(db, "workflow_definition", workflow_id, "delete", {})
    db.commit()
    return {"status": "deleted", "id": workflow_id}


@router.post("/workflow-rules")
def create_workflow_rule(payload: WorkflowRuleCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    row = WorkflowRule(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.post("/workflows/{workflow_id}/run")
def run_workflow(workflow_id: int, entity: dict, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    workflow = db.query(WorkflowDefinition).filter(WorkflowDefinition.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="workflow not found")
    rules = (
        db.query(WorkflowRule)
        .filter(WorkflowRule.workflow_id == workflow_id)
        .order_by(WorkflowRule.priority.asc())
        .all()
    )
    actions_result = []
    for rule in rules:
        if evaluate_condition(entity, rule.condition_json):
            actions_result.append(execute_action(rule.action_json, entity))
            if rule.stop_on_match:
                break
    run = WorkflowRun(
        workflow_id=workflow_id,
        entity_type=entity.get("entity_type", "generic"),
        entity_id=int(entity.get("entity_id", 0)),
        status="completed",
        result_json={"actions": actions_result, "entity_after": entity},
    )
    db.add(run)
    db.commit()
    return run.result_json


@router.get("/scores/lead/{contact_id}")
def score_lead(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="contact not found")
    activity_count = db.query(func.count(Activity.id)).filter(Activity.contact_id == contact_id).scalar() or 0
    replied = (
        db.query(func.count(Message.id))
        .filter(Message.contact_id == contact_id, Message.direction == "inbound")
        .scalar()
        or 0
    )
    score, explanation = score_lead_rules(
        job_title=contact.job_title,
        lifecycle_stage=contact.lifecycle_stage,
        activity_count_30d=int(activity_count),
        replied_30d=int(replied),
        unsubscribed=False,
    )
    row = LeadScore(
        contact_id=contact_id,
        model_version="lead_rules_v1",
        score=score,
        grade=grade_from_score(score),
        explanation_json=explanation,
    )
    db.add(row)
    db.commit()
    return {"contact_id": contact_id, "score": score, "grade": row.grade, "explanation": explanation}


@router.get("/scores/deal-risk/{deal_id}")
def score_deal_risk(
    deal_id: int,
    stage_age_days: int = Query(10, ge=0),
    inactivity_days: int = Query(7, ge=0),
    stakeholders: int = Query(1, ge=0),
    discount_pct: float = Query(0, ge=0),
    stage_regressions: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="deal not found")
    risk_score, risk_level, explanation = predict_deal_risk(
        stage_age_days=stage_age_days,
        inactivity_days=inactivity_days,
        stakeholder_count=stakeholders,
        discount_pct=discount_pct,
        stage_regressions=stage_regressions,
    )
    row = DealRiskScore(
        deal_id=deal_id,
        model_version="deal_logreg_v1",
        risk_score=risk_score,
        risk_level=risk_level,
        explanation_json=explanation,
    )
    db.add(row)
    db.commit()
    next_action = suggest_next_best_action("proposal", inactivity_days, 0, float(deal.amount), stakeholders)
    return {"deal_id": deal_id, "risk_score": risk_score, "risk_level": risk_level, "explanation": explanation, "next_best_action": next_action}


@router.get("/scores/health/{account_id}")
def score_health(
    account_id: int,
    unresolved_tickets: int = Query(0, ge=0),
    avg_payment_delay_days: int = Query(0, ge=0),
    usage_drop_pct: float = Query(0, ge=0),
    exec_engagement_gap_days: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    score, band, explanation = customer_health_score(
        unresolved_tickets=unresolved_tickets,
        avg_payment_delay_days=avg_payment_delay_days,
        usage_drop_pct=usage_drop_pct,
        exec_engagement_gap_days=exec_engagement_gap_days,
    )
    row = CustomerHealthScore(account_id=account_id, score=score, band=band, explanation_json=explanation)
    db.add(row)
    db.commit()
    return {"account_id": account_id, "score": score, "band": band, "explanation": explanation}


@router.get("/scores/churn/{account_id}")
def score_churn(
    account_id: int,
    usage_drop_pct: float = Query(0, ge=0),
    unresolved_tickets: int = Query(0, ge=0),
    late_payments_count: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    risk_score, risk_level, explanation = churn_risk_from_thresholds(
        usage_drop_pct=usage_drop_pct,
        unresolved_tickets=unresolved_tickets,
        late_payments_count=late_payments_count,
    )
    row = ChurnRiskScore(account_id=account_id, risk_score=risk_score, risk_level=risk_level, explanation_json=explanation)
    db.add(row)
    db.commit()
    return {"account_id": account_id, "risk_score": risk_score, "risk_level": risk_level, "explanation": explanation}


@router.get("/reports/pipeline-forecast")
def pipeline_forecast(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    deals_query = db.query(Deal).filter(Deal.status == "open")
    if auth.role == "agent":
        deals_query = deals_query.filter(Deal.owner_user_id == auth.user_id)
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        deals_query = deals_query.filter(Deal.owner_user_id.in_(ids)) if ids else deals_query.filter(Deal.owner_user_id == auth.user_id)
    deals = deals_query.all()
    rows = [{"amount": float(d.amount), "stage_id": int(d.stage_id or 1)} for d in deals]
    stage_win_rates = {1: 0.1, 2: 0.25, 3: 0.45, 4: 0.7}
    forecast = forecast_pipeline(rows, stage_win_rates=stage_win_rates, seasonality_factor=1.02)
    return forecast


@router.get("/reports/commission")
def commission(
    booked_revenue: float = Query(..., ge=0),
    quota: float = Query(..., gt=0),
    auth: AuthContext = Depends(require_auth),
):
    ensure_roles(auth, {"admin", "supervisor"})
    return commission_and_attainment(booked_revenue=booked_revenue, quota=quota)


@router.get("/reports/funnel")
def funnel(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    query = db.query(Deal.stage_id, func.count(Deal.id).label("count"))
    if auth.role == "agent":
        query = query.filter(Deal.owner_user_id == auth.user_id)
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        query = query.filter(Deal.owner_user_id.in_(ids)) if ids else query.filter(Deal.owner_user_id == auth.user_id)
    stage_counts = (
        query
        .group_by(Deal.stage_id)
        .order_by(Deal.stage_id.asc())
        .all()
    )
    total = sum(row.count for row in stage_counts) or 1
    return [{"stage_id": row.stage_id, "count": row.count, "pct": round((row.count / total) * 100, 2)} for row in stage_counts]


@router.get("/reports/bottlenecks")
def bottlenecks(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    now = datetime.utcnow()
    stale_deals = db.query(Deal).filter(Deal.status == "open", Deal.created_at < now - timedelta(days=45)).count()
    stale_tickets = db.query(Ticket).filter(Ticket.status != "resolved", Ticket.created_at < now - timedelta(days=7)).count()
    return {
        "stale_open_deals_over_45d": stale_deals,
        "stale_open_tickets_over_7d": stale_tickets,
        "alerts": [
            "review_stage_progression" if stale_deals > 10 else "deals_normal",
            "review_support_capacity" if stale_tickets > 20 else "support_normal",
        ],
    }


@router.get("/reports/channels")
def channel_analytics(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    rows = (
        db.query(
            Message.channel,
            func.sum(case((Message.direction == "outbound", 1), else_=0)).label("outbound_count"),
            func.sum(case((Message.direction == "inbound", 1), else_=0)).label("inbound_count"),
        )
        .group_by(Message.channel)
        .all()
    )
    result = []
    for row in rows:
        outbound = int(row.outbound_count or 0)
        inbound = int(row.inbound_count or 0)
        response_rate = round((inbound / outbound) * 100, 2) if outbound > 0 else 0
        result.append(
            {
                "channel": row.channel,
                "outbound_count": outbound,
                "inbound_count": inbound,
                "response_rate_pct": response_rate,
            }
        )
    return result


@router.get("/reports/sla")
def sla_analytics(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    total = db.query(TicketSLATracking).count()
    breached = (
        db.query(TicketSLATracking)
        .filter(TicketSLATracking.resolved_at.is_(None), TicketSLATracking.resolution_due_at < datetime.utcnow())
        .count()
    )
    breach_rate = round((breached / total) * 100, 2) if total > 0 else 0
    return {"total_tracked_tickets": total, "currently_breached": breached, "breach_rate_pct": breach_rate}


@router.get("/reports/activity")
def activity_analytics(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    query = db.query(Activity.type, func.count(Activity.id).label("count"))
    if auth.role == "agent":
        query = query.filter(Activity.owner_user_id == auth.user_id)
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id)
        query = query.filter(Activity.owner_user_id.in_(ids)) if ids else query.filter(Activity.owner_user_id == auth.user_id)
    rows = (
        query
        .group_by(Activity.type)
        .order_by(func.count(Activity.id).desc())
        .all()
    )
    return [{"type": row.type, "count": row.count} for row in rows]


@router.get("/reports/health-distribution")
def health_distribution(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    rows = (
        db.query(CustomerHealthScore.band, func.count(CustomerHealthScore.id).label("count"))
        .group_by(CustomerHealthScore.band)
        .all()
    )
    churn_rows = (
        db.query(ChurnRiskScore.risk_level, func.count(ChurnRiskScore.id).label("count"))
        .group_by(ChurnRiskScore.risk_level)
        .all()
    )
    return {
        "health_bands": [{"band": row.band, "count": row.count} for row in rows],
        "churn_risk_levels": [{"risk_level": row.risk_level, "count": row.count} for row in churn_rows],
    }


@router.get("/reports/analytics-overview")
def analytics_overview(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    total_contacts = db.query(Contact).count()
    total_accounts = db.query(Account).count()
    total_open_deals = db.query(Deal).filter(Deal.status == "open").count()
    total_open_tickets = db.query(Ticket).filter(Ticket.status != "resolved").count()
    total_messages = db.query(Message).count()
    deals_rows = [{"amount": float(d.amount), "stage_id": int(d.stage_id or 1)} for d in db.query(Deal).filter(Deal.status == "open").all()]
    latest_forecast = forecast_pipeline(deals_rows, stage_win_rates={1: 0.1, 2: 0.25, 3: 0.45, 4: 0.7}, seasonality_factor=1.02)
    total = db.query(TicketSLATracking).count()
    breached = (
        db.query(TicketSLATracking)
        .filter(TicketSLATracking.resolved_at.is_(None), TicketSLATracking.resolution_due_at < datetime.utcnow())
        .count()
    )
    sla = {"total_tracked_tickets": total, "currently_breached": breached, "breach_rate_pct": round((breached / total) * 100, 2) if total else 0}
    return {
        "core_totals": {
            "contacts": total_contacts,
            "accounts": total_accounts,
            "open_deals": total_open_deals,
            "open_tickets": total_open_tickets,
            "messages": total_messages,
        },
        "pipeline": latest_forecast,
        "sla": sla,
        "generated_at": datetime.utcnow(),
    }


@router.post("/connectors", response_model=ConnectorOut)
def create_connector(payload: ConnectorCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    data = payload.model_dump()
    # Auto-generate an API key that secures this integration if none was provided.
    if not data.get("api_key"):
        data["api_key"] = generate_api_key()
    row = ConnectorIntegration(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    log_audit(db, "connector_integration", row.id, "create", {k: v for k, v in data.items() if k != "api_key"})
    db.commit()
    return row


@router.get("/connectors", response_model=list[ConnectorOut])
def list_connectors(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    return db.query(ConnectorIntegration).order_by(ConnectorIntegration.id.desc()).all()


def _get_connector_or_404(connector_id: int, db: Session) -> ConnectorIntegration:
    connector = db.query(ConnectorIntegration).filter(ConnectorIntegration.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="connector not found")
    return connector


@router.put("/connectors/{connector_id}", response_model=ConnectorOut)
def update_connector(connector_id: int, payload: ConnectorUpdate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    connector = _get_connector_or_404(connector_id, db)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(connector, field, value)
    log_audit(db, "connector_integration", connector.id, "update", updates)
    db.commit()
    db.refresh(connector)
    return connector


@router.delete("/connectors/{connector_id}")
def delete_connector(connector_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    connector = _get_connector_or_404(connector_id, db)
    # Remove sync logs tied to this connector first.
    db.query(ConnectorSyncLog).filter(ConnectorSyncLog.connector_id == connector_id).delete()
    db.delete(connector)
    log_audit(db, "connector_integration", connector_id, "delete", {})
    db.commit()
    return {"status": "deleted", "id": connector_id}


@router.post("/connectors/{connector_id}/regenerate-key", response_model=ConnectorOut)
def regenerate_connector_key(connector_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    connector = _get_connector_or_404(connector_id, db)
    connector.api_key = generate_api_key()
    log_audit(db, "connector_integration", connector.id, "regenerate_key", {})
    db.commit()
    db.refresh(connector)
    return connector


@router.delete("/connectors/{connector_id}/key")
def delete_connector_key(connector_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    connector = _get_connector_or_404(connector_id, db)
    connector.api_key = None
    log_audit(db, "connector_integration", connector.id, "delete_key", {})
    db.commit()
    return {"status": "key_deleted", "id": connector_id}


@router.post("/connectors/{connector_id}/test")
def test_connector(connector_id: int, dry_run: bool = True, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    connector = db.query(ConnectorIntegration).filter(ConnectorIntegration.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="connector not found")
    if not connector.base_url:
        return {"ok": False, "detail": "base_url is missing"}
    payload = {"event": "crm.connector.test", "ts": datetime.utcnow().isoformat()}
    signature = build_signature(connector.outbound_secret, payload) if connector.outbound_secret else None
    if dry_run:
        return {"ok": True, "dry_run": True, "target_url": connector.base_url, "payload": payload}
    result = send_json(url=connector.base_url, payload=payload, api_key=connector.api_key, signature=signature)
    db.add(
        ConnectorSyncLog(
            connector_id=connector.id,
            direction="outbound",
            entity_type="test",
            status="success" if result.get("ok") else "failed",
            request_json=payload,
            response_json=result,
        )
    )
    db.commit()
    return result


@router.post("/connectors/{connector_id}/push/contact/{contact_id}")
def push_contact(connector_id: int, contact_id: int, dry_run: bool = True, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    connector = db.query(ConnectorIntegration).filter(ConnectorIntegration.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="connector not found")
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="contact not found")
    payload = {
        "entity_type": "contact",
        "entity": {
            "id": contact.id,
            "account_id": contact.account_id,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email": contact.email,
            "phone": contact.phone,
            "job_title": contact.job_title,
            "lifecycle_stage": contact.lifecycle_stage,
        },
    }
    if dry_run:
        return {"ok": True, "dry_run": True, "payload": payload}
    if not connector.base_url:
        raise HTTPException(status_code=400, detail="connector base_url missing")
    signature = build_signature(connector.outbound_secret, payload) if connector.outbound_secret else None
    result = send_json(url=connector.base_url, payload=payload, api_key=connector.api_key, signature=signature)
    db.add(
        ConnectorSyncLog(
            connector_id=connector.id,
            direction="outbound",
            entity_type="contact",
            entity_id=contact.id,
            status="success" if result.get("ok") else "failed",
            request_json=payload,
            response_json=result,
        )
    )
    db.commit()
    return result


@router.post("/connectors/{connector_id}/push/deal/{deal_id}")
def push_deal(connector_id: int, deal_id: int, dry_run: bool = True, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    connector = db.query(ConnectorIntegration).filter(ConnectorIntegration.id == connector_id).first()
    if not connector:
        raise HTTPException(status_code=404, detail="connector not found")
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="deal not found")
    payload = {
        "entity_type": "deal",
        "entity": {
            "id": deal.id,
            "account_id": deal.account_id,
            "primary_contact_id": deal.primary_contact_id,
            "stage_id": deal.stage_id,
            "amount": float(deal.amount),
            "currency": deal.currency,
            "status": deal.status,
            "win_probability": deal.win_probability,
        },
    }
    if dry_run:
        return {"ok": True, "dry_run": True, "payload": payload}
    if not connector.base_url:
        raise HTTPException(status_code=400, detail="connector base_url missing")
    signature = build_signature(connector.outbound_secret, payload) if connector.outbound_secret else None
    result = send_json(url=connector.base_url, payload=payload, api_key=connector.api_key, signature=signature)
    db.add(
        ConnectorSyncLog(
            connector_id=connector.id,
            direction="outbound",
            entity_type="deal",
            entity_id=deal.id,
            status="success" if result.get("ok") else "failed",
            request_json=payload,
            response_json=result,
        )
    )
    db.commit()
    return result


@router.post("/connectors/inbound/{system_type}")
def inbound_connector_event(system_type: str, payload: dict, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    event_type = payload.get("entity_type")
    entity = payload.get("entity", {})
    created = None
    if event_type == "contact":
        created = Contact(
            account_id=entity.get("account_id"),
            first_name=entity.get("first_name", "Unknown"),
            last_name=entity.get("last_name", "Unknown"),
            email=entity.get("email"),
            phone=entity.get("phone"),
            job_title=entity.get("job_title"),
            lifecycle_stage=entity.get("lifecycle_stage", "lead"),
        )
        db.add(created)
        db.flush()
        log_event(
            db,
            contact_id=created.id,
            account_id=created.account_id,
            event_type="connector_contact_ingested",
            source_module=f"connector:{system_type}",
            source_id=created.id,
            payload={"system_type": system_type},
        )
    elif event_type == "ticket":
        ticket = Ticket(
            contact_id=entity.get("contact_id"),
            account_id=entity.get("account_id"),
            subject=entity.get("subject", "Inbound ticket"),
            priority=entity.get("priority", "medium"),
            status=entity.get("status", "open"),
        )
        db.add(ticket)
        db.flush()
        created = ticket
    else:
        raise HTTPException(status_code=400, detail="Unsupported inbound entity_type")
    db.add(
        ConnectorSyncLog(
            connector_id=None,
            direction="inbound",
            entity_type=event_type or "unknown",
            entity_id=getattr(created, "id", None),
            status="success",
            request_json=payload,
            response_json={"system_type": system_type},
        )
    )
    db.commit()
    return {"ok": True, "entity_type": event_type, "created_id": getattr(created, "id", None)}


@router.get("/connectors/logs")
def connector_logs(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    rows = db.query(ConnectorSyncLog).order_by(ConnectorSyncLog.id.desc()).limit(100).all()
    return [
        {
            "id": row.id,
            "connector_id": row.connector_id,
            "direction": row.direction,
            "entity_type": row.entity_type,
            "entity_id": row.entity_id,
            "status": row.status,
            "request_json": row.request_json,
            "response_json": row.response_json,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.post("/invoices")
def create_invoice(
    account_id: int,
    deal_id: int | None = None,
    invoice_number: str = "INV-001",
    subtotal: float = 0,
    tax: float = 0,
    db: Session = Depends(get_db),
):
    due_date = datetime.utcnow() + timedelta(days=30)
    inv = Invoice(
        account_id=account_id,
        deal_id=deal_id,
        invoice_number=invoice_number,
        due_date=due_date,
        subtotal=subtotal,
        tax=tax,
        total=subtotal + tax,
        status="issued",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return {"id": inv.id, "total": float(inv.total)}


@router.post("/payments")
def create_payment(invoice_id: int, amount: float, method: str = "bank_transfer", db: Session = Depends(get_db)):
    row = Payment(invoice_id=invoice_id, amount=amount, method=method, status="posted")
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "status": row.status}


@router.get("/invoices")
def list_invoices(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    query = db.query(Invoice)
    if auth.role != "admin":
        # Non-admins only see invoices tied to deals they (or their team) own.
        if auth.role == "supervisor":
            owner_ids = team_user_ids(db, auth.team_id) or [auth.user_id]
        else:
            owner_ids = [auth.user_id]
        deal_ids = [d.id for d in db.query(Deal.id).filter(Deal.owner_user_id.in_(owner_ids)).all()]
        query = query.filter(Invoice.deal_id.in_(deal_ids)) if deal_ids else query.filter(Invoice.id == -1)
    rows = query.order_by(Invoice.id.desc()).all()
    return [
        {
            "id": r.id,
            "invoice_number": r.invoice_number,
            "account_id": r.account_id,
            "deal_id": r.deal_id,
            "subtotal": float(r.subtotal or 0),
            "tax": float(r.tax or 0),
            "total": float(r.total or 0),
            "status": r.status,
            "issue_date": r.issue_date,
            "due_date": r.due_date,
        }
        for r in rows
    ]


@router.patch("/invoices/{invoice_id}")
def update_invoice(invoice_id: int, payload: InvoiceUpdate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="invoice not found")
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(inv, field, value)
    # Recompute total if money fields changed.
    if "subtotal" in updates or "tax" in updates:
        inv.total = float(inv.subtotal or 0) + float(inv.tax or 0)
    log_audit(db, "invoice", inv.id, "update", updates)
    db.commit()
    return {"id": inv.id, "total": float(inv.total), "status": inv.status}


@router.delete("/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="invoice not found")
    db.query(Payment).filter(Payment.invoice_id == invoice_id).delete()
    db.delete(inv)
    log_audit(db, "invoice", invoice_id, "delete", {})
    db.commit()
    return {"status": "deleted", "id": invoice_id}


@router.post("/admin/users")
def admin_create_user(payload: UserCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    role = db.query(Role).filter(Role.name == payload.role_name).first()
    if not role:
        role = Role(name=payload.role_name, permissions_json={})
        db.add(role)
        db.flush()
    
    password_hash = hash_password(payload.password) if payload.password else hash_password("apex123")

    user = User(
        name=payload.name,
        email=payload.email, 
        password_hash=password_hash,
        role_id=role.id, 
        team_id=payload.team_id, 
        status="active"
    )
    db.add(user)
    db.flush()
    token_plain = f"{payload.role_name}-{user.id}-token"
    cred = ApiCredential(
        user_id=user.id,
        role_name=payload.role_name,
        team_id=payload.team_id,
        token_hash=hash_token(token_plain),
        is_active=1,
    )
    db.add(cred)
    log_audit(db, "user", user.id, "create", {"role": payload.role_name, "team_id": payload.team_id})
    db.commit()
    return {"id": user.id, "email": user.email, "role": payload.role_name, "team_id": payload.team_id, "token": token_plain}


@router.get("/admin/users")
def admin_list_users(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    rows = db.query(User, Role.name).join(Role, Role.id == User.role_id, isouter=True).order_by(User.id.asc()).all()
    return [{"id": u.id, "name": u.name, "email": u.email, "role": role_name or "unknown", "team_id": u.team_id} for u, role_name in rows]


@router.get("/admin/settings")
def list_settings(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    rows = db.query(CRMSetting).order_by(CRMSetting.id.desc()).all()
    return [
        {
            "id": r.id,
            "category": r.category,
            "key": r.key,
            "value_json": r.value_json,
            "updated_at": r.updated_at,
        }
        for r in rows
    ]


@router.post("/admin/settings")
def upsert_setting(category: str, key: str, value_json: dict, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    row = db.query(CRMSetting).filter(CRMSetting.category == category, CRMSetting.key == key).first()
    if row:
        row.value_json = value_json
        row.updated_by = auth.user_id
        row.updated_at = datetime.utcnow()
    else:
        row = CRMSetting(category=category, key=key, value_json=value_json, updated_by=auth.user_id)
        db.add(row)
    db.commit()
    return {"id": row.id, "category": row.category, "key": row.key, "value_json": row.value_json}


@router.get("/admin/audit-logs")
def admin_audit_logs(limit: int = Query(200, ge=1, le=2000), db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    return rows


@router.post("/supervisor/quotas")
def set_quota(payload: QuotaCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    if auth.role == "supervisor":
        target_user = db.query(User).filter(User.id == payload.user_id).first()
        if not target_user or target_user.team_id != auth.team_id:
            raise HTTPException(status_code=403, detail="Supervisor can set quota only for same team.")
    row = QuotaTarget(user_id=payload.user_id, period_month=payload.period_month, quota_amount=payload.quota_amount, set_by_user_id=auth.user_id)
    db.add(row)
    db.commit()
    return {"id": row.id}


@router.get("/approvals")
def list_approvals(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    query = db.query(ApprovalRequest)
    if auth.role == "agent":
        query = query.filter(ApprovalRequest.requested_by == auth.user_id)
    elif auth.role == "supervisor":
        ids = team_user_ids(db, auth.team_id) or [auth.user_id]
        query = query.filter(ApprovalRequest.requested_by.in_(ids))
    rows = query.order_by(ApprovalRequest.id.desc()).all()
    # Resolve requester names for display.
    user_names = {u.id: u.name for u in db.query(User).all()}
    return [
        {
            "id": r.id,
            "request_type": r.request_type,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "requested_by": r.requested_by,
            "requested_by_name": user_names.get(r.requested_by, "Unknown"),
            "status": r.status,
            "notes": r.notes,
            "created_at": r.created_at,
            "decided_at": r.decided_at,
        }
        for r in rows
    ]


@router.post("/approvals")
def create_approval(payload: ApprovalCreate, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    row = ApprovalRequest(
        request_type=payload.request_type,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        requested_by=auth.user_id,
        notes=payload.notes,
    )
    db.add(row)
    db.commit()
    return {"id": row.id, "status": row.status}


@router.post("/approvals/{approval_id}/decision")
def decide_approval(approval_id: int, approved: bool, notes: str | None = None, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    row = db.query(ApprovalRequest).filter(ApprovalRequest.id == approval_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="approval request not found")
    row.status = "approved" if approved else "rejected"
    row.approver_user_id = auth.user_id
    row.decided_at = datetime.utcnow()
    if notes:
        row.notes = notes
    db.commit()
    return {"id": row.id, "status": row.status}


@router.get("/bulk/templates/{entity}")
def download_csv_template(entity: str, auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    templates = {
        "contacts": "account_id,first_name,last_name,email,phone,job_title,lifecycle_stage,owner_user_id,lead_source\n",
        "deals": "account_id,primary_contact_id,pipeline_id,stage_id,amount,currency,owner_user_id,win_probability,status\n",
        "agents": "name,email,role_name,team_id\n",
    }
    if entity not in templates:
        raise HTTPException(status_code=404, detail="Template not found.")
    return PlainTextResponse(
        templates[entity],
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{entity}_template.csv"'},
    )


@router.post("/bulk/upload/{entity}")
def bulk_upload(entity: str, file: UploadFile = File(...), db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    if entity not in {"contacts", "deals", "agents"}:
        raise HTTPException(status_code=400, detail="Unsupported entity for bulk upload.")
    if entity == "agents":
        ensure_roles(auth, {"admin"})
    try:
        content = file.file.read().decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded CSV.")
    reader = csv.DictReader(io.StringIO(content))
    created_count = 0
    errors: list[dict] = []
    # row 1 is the header, so data rows start at line 2
    for line_no, row in enumerate(reader, start=2):
        try:
            if entity == "contacts":
                if not (row.get("first_name") or row.get("last_name")):
                    raise ValueError("first_name or last_name is required")
                contact = Contact(
                    account_id=int(row["account_id"]) if row.get("account_id") else None,
                    first_name=row.get("first_name", ""),
                    last_name=row.get("last_name", ""),
                    email=row.get("email"),
                    phone=row.get("phone"),
                    job_title=row.get("job_title"),
                    lifecycle_stage=row.get("lifecycle_stage") or "lead",
                    owner_user_id=int(row["owner_user_id"]) if row.get("owner_user_id") else auth.user_id,
                )
                db.add(contact)
                db.flush()
                if row.get("lead_source"):
                    db.add(LeadAttribution(contact_id=contact.id, source=row["lead_source"]))
            elif entity == "deals":
                deal = Deal(
                    account_id=int(row["account_id"]) if row.get("account_id") else None,
                    primary_contact_id=int(row["primary_contact_id"]) if row.get("primary_contact_id") else None,
                    pipeline_id=int(row["pipeline_id"]) if row.get("pipeline_id") else 1,
                    stage_id=int(row["stage_id"]) if row.get("stage_id") else 1,
                    amount=float(row.get("amount") or 0),
                    currency=row.get("currency") or "USD",
                    owner_user_id=int(row["owner_user_id"]) if row.get("owner_user_id") else auth.user_id,
                    win_probability=float(row.get("win_probability") or 0.2),
                    status=row.get("status") or "open",
                )
                db.add(deal)
                db.flush()
            elif entity == "agents":
                if not row.get("email"):
                    raise ValueError("email is required")
                role_name = row.get("role_name") or "agent"
                role = db.query(Role).filter(Role.name == role_name).first()
                if not role:
                    role = Role(name=role_name, permissions_json={})
                    db.add(role)
                    db.flush()
                user = User(name=row.get("name", ""), email=row.get("email", ""), role_id=role.id, team_id=int(row["team_id"]) if row.get("team_id") else None)
                db.add(user)
                db.flush()
                token_plain = f"{role_name}-{user.id}-token"
                db.add(ApiCredential(user_id=user.id, role_name=role_name, team_id=user.team_id, token_hash=hash_token(token_plain), is_active=1))
            # Commit per row so one bad row does not roll back earlier good rows.
            db.commit()
            created_count += 1
        except (ValueError, KeyError) as exc:
            db.rollback()
            errors.append({"line": line_no, "error": str(exc)})
    return {"entity": entity, "created_count": created_count, "error_count": len(errors), "errors": errors}


def _create_backup_file(backup_type: str, triggered_by: int | None, db: Session) -> dict:
    backups_dir = Path("backups")
    backups_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    file_name = f"{backup_type}_crm_{timestamp}.db"
    destination = backups_dir / file_name
    source = Path("crm.db")
    if not source.exists():
        raise HTTPException(status_code=404, detail="Primary database file not found.")
    shutil.copy2(source, destination)
    log = BackupLog(backup_type=backup_type, file_path=str(destination), status="completed", triggered_by=triggered_by)
    db.add(log)
    db.commit()
    return {"backup_id": log.id, "file_path": str(destination), "status": log.status}


@router.post("/admin/backups/manual")
def manual_backup(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    return _create_backup_file("manual", auth.user_id, db)


@router.post("/admin/backups/monthly")
def monthly_backup(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    return _create_backup_file("monthly", auth.user_id, db)


@router.get("/admin/backups")
def list_backups(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    rows = db.query(BackupLog).order_by(BackupLog.id.desc()).all()
    return rows


@router.post("/admin/backups/restore")
def restore_backup(file_path: str, db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    backups_dir = Path("backups").resolve()
    source = Path(file_path).resolve()
    # Prevent path traversal: only allow restoring files that live inside ./backups.
    if backups_dir != source.parent:
        raise HTTPException(status_code=400, detail="Backup file must be inside the backups directory.")
    if not source.exists():
        raise HTTPException(status_code=404, detail="Backup file not found.")
    engine.dispose()
    shutil.copy2(source, Path("crm.db"))
    log = BackupLog(backup_type="restore", file_path=str(source), status="completed", triggered_by=auth.user_id)
    db.add(log)
    db.commit()
    return {"status": "restored", "file_path": str(source)}


@router.get("/reports/sales/pipeline")
def report_sales_pipeline(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    return pipeline_forecast(db=db, auth=auth)


@router.get("/reports/sales/forecast")
def report_sales_forecast(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    deals = db.query(Deal).filter(Deal.status == "open").all()
    committed = sum(float(d.amount) for d in deals if float(d.win_probability or 0) >= 0.7)
    best_case = sum(float(d.amount) for d in deals if float(d.win_probability or 0) >= 0.4)
    by_month: dict[str, float] = {}
    for d in deals:
        month_key = (d.close_date or datetime.utcnow()).strftime("%Y-%m")
        by_month[month_key] = by_month.get(month_key, 0.0) + float(d.amount)
    return {"expected_revenue_by_month": by_month, "committed": round(committed, 2), "best_case": round(best_case, 2)}


@router.get("/reports/sales/win-loss")
def report_win_loss(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    won = db.query(Deal).filter(Deal.status == "closed_won").count()
    lost = db.query(Deal).filter(Deal.status == "closed_lost").count()
    return {"closed_won": won, "closed_lost": lost, "loss_reasons": [], "competitor_mentions": []}


@router.get("/reports/sales/performance")
def report_sales_performance(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    rows = (
        db.query(Deal.owner_user_id, func.count(Deal.id).label("closed"), func.sum(Deal.amount).label("revenue"))
        .filter(Deal.status == "closed_won")
        .group_by(Deal.owner_user_id)
        .all()
    )
    result = []
    for row in rows:
        quota_row = (
            db.query(QuotaTarget)
            .filter(QuotaTarget.user_id == row.owner_user_id)
            .order_by(QuotaTarget.id.desc())
            .first()
        )
        quota = float(quota_row.quota_amount) if quota_row else 0
        revenue = float(row.revenue or 0)
        attainment = round((revenue / quota) * 100, 2) if quota > 0 else 0
        result.append({"user_id": row.owner_user_id, "deals_closed": int(row.closed), "revenue": round(revenue, 2), "quota_attainment_pct": attainment})
    return result


@router.get("/reports/leads/source")
def report_lead_source(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    rows = db.query(LeadAttribution.source, func.count(LeadAttribution.id).label("count")).group_by(LeadAttribution.source).all()
    return [{"source": row.source, "lead_count": row.count} for row in rows]


@router.get("/reports/leads/conversion-funnel")
def report_lead_conversion_funnel(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    stage_rows = db.query(Contact.lifecycle_stage, func.count(Contact.id).label("count")).group_by(Contact.lifecycle_stage).all()
    return [{"stage": row.lifecycle_stage, "count": row.count} for row in stage_rows]


@router.get("/reports/leads/response-time")
def report_lead_response_time(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    contacts = db.query(Contact).all()
    samples = []
    for c in contacts:
        first_activity = db.query(Activity).filter(Activity.contact_id == c.id).order_by(Activity.id.asc()).first()
        if first_activity:
            delta = (first_activity.completed_at or datetime.utcnow()) - c.created_at
            samples.append(max(delta.total_seconds() / 60.0, 0))
    avg_minutes = round(sum(samples) / len(samples), 2) if samples else 0
    return {"average_first_response_minutes": avg_minutes, "sample_size": len(samples)}


@router.get("/reports/customers/activity")
def report_customer_activity(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    rows = (
        db.query(Activity.contact_id, func.count(Activity.id).label("count"))
        .group_by(Activity.contact_id)
        .order_by(func.count(Activity.id).desc())
        .all()
    )
    return [{"contact_id": row.contact_id, "activity_count": row.count} for row in rows]


@router.get("/reports/customers/health")
def report_customer_health(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    return health_distribution(db=db, auth=auth)


@router.get("/reports/customers/account-value")
def report_account_value(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    rows = (
        db.query(Invoice.account_id, func.sum(Invoice.total).label("revenue"))
        .group_by(Invoice.account_id)
        .order_by(func.sum(Invoice.total).desc())
        .all()
    )
    return [{"account_id": row.account_id, "revenue": float(row.revenue or 0), "ltv_estimate": float(row.revenue or 0)} for row in rows]


@router.get("/reports/support/ticket-volume")
def report_ticket_volume(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    by_priority = db.query(Ticket.priority, func.count(Ticket.id).label("count")).group_by(Ticket.priority).all()
    by_category = db.query(Ticket.category, func.count(Ticket.id).label("count")).group_by(Ticket.category).all()
    return {
        "by_priority": [{"priority": row.priority, "count": row.count} for row in by_priority],
        "by_category": [{"category": row.category, "count": row.count} for row in by_category],
    }


@router.get("/reports/support/sla-compliance")
def report_sla_compliance(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    return sla_analytics(db=db, auth=auth)


@router.get("/reports/support/performance")
def report_support_performance(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    rows = (
        db.query(Ticket.assigned_user_id, func.count(Ticket.id).label("count"))
        .group_by(Ticket.assigned_user_id)
        .all()
    )
    resolved = db.query(Ticket).filter(Ticket.status == "resolved").count()
    escalated = db.query(Ticket).filter(Ticket.status == "escalated").count()
    return {"tickets_per_agent": [{"assigned_user_id": row.assigned_user_id, "count": row.count} for row in rows], "resolved_count": resolved, "escalated_count": escalated}


@router.get("/reports/finance/revenue")
def report_revenue(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    rows = db.query(Invoice.issue_date, Invoice.total).all()
    by_month: dict[str, float] = {}
    for issue_date, total in rows:
        month_key = issue_date.strftime("%Y-%m")
        by_month[month_key] = by_month.get(month_key, 0.0) + float(total or 0)
    return {"revenue_by_month": by_month, "total_revenue": round(sum(by_month.values()), 2)}


@router.get("/reports/finance/invoice-payment-status")
def report_invoice_payment_status(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    paid = db.query(Invoice).filter(Invoice.status == "paid").count()
    unpaid = db.query(Invoice).filter(Invoice.status != "paid").count()
    overdue = db.query(Invoice).filter(Invoice.status != "paid", Invoice.due_date < datetime.utcnow()).count()
    return {"paid": paid, "unpaid": unpaid, "overdue": overdue}


@router.get("/reports/finance/commission")
def report_commission(booked_revenue: float = Query(..., ge=0), quota: float = Query(..., gt=0), auth: AuthContext = Depends(require_auth)):
    return commission(booked_revenue=booked_revenue, quota=quota, auth=auth)


@router.get("/reports/productivity/daily-activity")
def report_daily_activity(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    rows = db.query(Activity.owner_user_id, Activity.type, func.count(Activity.id).label("count")).group_by(Activity.owner_user_id, Activity.type).all()
    return [{"owner_user_id": row.owner_user_id, "activity_type": row.type, "count": row.count} for row in rows]


@router.get("/reports/productivity/task-followup")
def report_task_followup(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    overdue_tasks = db.query(Activity).filter(Activity.type == "task", Activity.due_at < datetime.utcnow(), Activity.completed_at.is_(None)).count()
    return {"overdue_tasks": overdue_tasks}


@router.get("/reports/admin/user-access-audit")
def report_user_access_audit(limit: int = Query(200, ge=1, le=2000), db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin"})
    rows = db.query(AuditLog).order_by(AuditLog.id.desc()).limit(limit).all()
    return rows


@router.get("/reports/admin/data-quality")
def report_data_quality(db: Session = Depends(get_db), auth: AuthContext = Depends(require_auth)):
    ensure_roles(auth, {"admin", "supervisor"})
    missing_email = db.query(Contact).filter((Contact.email.is_(None)) | (Contact.email == "")).count()
    missing_phone = db.query(Contact).filter((Contact.phone.is_(None)) | (Contact.phone == "")).count()
    dup_rows = db.query(Contact.email, func.count(Contact.id).label("count")).filter(Contact.email.is_not(None)).group_by(Contact.email).having(func.count(Contact.id) > 1).all()
    duplicate_contacts = sum(int(row.count) for row in dup_rows)
    return {
        "missing_email_contacts": missing_email,
        "missing_phone_contacts": missing_phone,
        "duplicate_contacts": duplicate_contacts,
    }
