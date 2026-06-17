from datetime import datetime

from pydantic import BaseModel, Field


class AccountCreate(BaseModel):
    name: str
    industry: str | None = None
    size_band: str | None = None
    owner_user_id: int | None = None
    billing_address: str | None = None


class AccountOut(AccountCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ContactCreate(BaseModel):
    account_id: int | None = None
    first_name: str
    last_name: str
    email: str | None = None
    phone: str | None = None
    job_title: str | None = None
    lead_source: str | None = None
    lifecycle_stage: str = "lead"
    owner_user_id: int | None = None


class ContactOut(ContactCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class DealCreate(BaseModel):
    account_id: int | None = None
    primary_contact_id: int | None = None
    pipeline_id: int | None = 1
    stage_id: int | None = 1
    amount: float = 0
    currency: str = "USD"
    owner_user_id: int | None = None
    win_probability: float = Field(default=0.2, ge=0, le=1)
    status: str = "open"


class DealOut(DealCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityCreate(BaseModel):
    contact_id: int | None = None
    account_id: int | None = None
    deal_id: int | None = None
    type: str
    subject: str
    owner_user_id: int | None = None
    outcome: str | None = None


class ActivityUpdate(BaseModel):
    outcome: str | None = None
    completed_at: datetime | None = None


class MessageCreate(BaseModel):
    contact_id: int
    account_id: int | None = None
    channel: str
    direction: str
    provider_message_id: str
    content_text: str
    status: str = "logged"


class TicketCreate(BaseModel):
    contact_id: int | None = None
    account_id: int | None = None
    subject: str
    priority: str = "medium"
    status: str = "open"
    category: str | None = None
    assigned_team_id: int | None = None
    assigned_user_id: int | None = None


class ConsentCreate(BaseModel):
    contact_id: int
    channel: str
    status: str
    source: str | None = None
    expires_at: datetime | None = None


class WorkflowDefinitionCreate(BaseModel):
    name: str
    trigger_type: str
    trigger_config_json: dict = Field(default_factory=dict)
    is_active: int = 1
    created_by: int | None = None


class WorkflowRuleCreate(BaseModel):
    workflow_id: int
    condition_json: dict
    action_json: dict
    priority: int = 100
    stop_on_match: int = 0


class ConnectorCreate(BaseModel):
    name: str
    system_type: str
    base_url: str | None = None
    api_key: str | None = None
    outbound_secret: str | None = None
    mapping_json: dict = Field(default_factory=dict)
    is_active: int = 1


class ConnectorOut(ConnectorCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ConnectorUpdate(BaseModel):
    name: str | None = None
    system_type: str | None = None
    base_url: str | None = None
    outbound_secret: str | None = None
    is_active: int | None = None


class ContactUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    phone: str | None = None
    job_title: str | None = None
    lifecycle_stage: str | None = None
    owner_user_id: int | None = None


class DealUpdate(BaseModel):
    account_id: int | None = None
    primary_contact_id: int | None = None
    amount: float | None = None
    stage_id: int | None = None
    win_probability: float | None = None
    status: str | None = None


class TicketUpdate(BaseModel):
    subject: str | None = None
    priority: str | None = None
    status: str | None = None
    category: str | None = None
    assigned_user_id: int | None = None


class InvoiceUpdate(BaseModel):
    subtotal: float | None = None
    tax: float | None = None
    status: str | None = None


class UserCreate(BaseModel):
    name: str
    email: str
    password: str | None = None
    role_name: str
    team_id: int | None = None


class EmailSend(BaseModel):
    contact_id: int
    to: str | None = None
    subject: str
    body: str


class CampaignSend(BaseModel):
    subject: str
    body: str


class ProductCreate(BaseModel):
    name: str
    sku: str | None = None
    unit_price: float = 0
    tax_rate: float = 0
    is_active: int = 1


class ProductOut(ProductCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuoteLineIn(BaseModel):
    product_id: int | None = None
    description: str | None = None
    quantity: float = 1
    unit_price: float = 0
    tax_rate: float = 0


class QuoteCreate(BaseModel):
    account_id: int | None = None
    contact_id: int | None = None
    quote_number: str | None = None
    lines: list[QuoteLineIn] = Field(default_factory=list)


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    user_id: int
    name: str
    role: str
    token: str


class CampaignCreate(BaseModel):
    name: str
    channel: str = "email"
    status: str = "draft"
    source: str | None = None
    budget: float = 0
    start_date: datetime | None = None
    end_date: datetime | None = None


class CampaignUpdate(BaseModel):
    name: str | None = None
    channel: str | None = None
    status: str | None = None
    source: str | None = None
    budget: float | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class CampaignOut(CampaignCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class QuotaCreate(BaseModel):
    user_id: int
    period_month: str
    quota_amount: float


class ApprovalCreate(BaseModel):
    request_type: str
    entity_type: str
    entity_id: int
    notes: str | None = None
