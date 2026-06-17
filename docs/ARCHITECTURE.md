# Apex CRM Architecture

## Overview

This project uses a modular monolith architecture:

- `app/api`: FastAPI route layer
- `app/models`: SQLAlchemy relational schema
- `app/services`: domain logic (scoring, workflow, connectors)
- `app/core`: DB session and base model
- `app/core/security.py`: bcrypt password hashing, Bearer API-token auth, and RBAC helpers
- `app/main.py`: also serves the built React app (`frontend/dist`) so the API and UI run as one process

The design is event-aware and explainable:

- unified customer timeline in `customer_events`
- workflow and scoring decisions stored with metadata
- audit logs for traceability

## Core Modules

- Leads (early-stage contacts) and Contacts and Accounts
- Deals, Pipeline (kanban), and Campaigns
- Activities
- Omnichannel Messages
- Invoices and Payments
- Support Tickets with SLA tracking
- Workflow rules engine
- Explainable scoring
- Connector integrations
- Analytics and reporting
- Bulk import/export templates
- Backup and restore operations

## Data Strategy

- Primary storage: SQLite for local usage (can migrate to PostgreSQL)
- Schema-first SQLAlchemy models in `app/models/entities.py`
- Timeline events captured on key operations
- Sync logs for connector traceability
- Backup history in `backup_logs`

## Explainable AI-Like Logic (No LLM)

- Lead scoring: weighted deterministic rules
- Deal risk: linear/logistic-style inference with top factor impacts
- Next best action: rule-based deterministic policy
- Customer health: weighted penalties by support/payment/usage/engagement
- Churn risk: threshold-based classifier

## Integration Pattern

- Outbound connector push: signed JSON webhook + optional API key
- Inbound connector event endpoint: upsert-like ingestion into CRM entities
- Connector sync logs for each inbound/outbound attempt

## Deployment Notes

- Suitable for single app process in early stages
- Add workers for scheduled jobs and event processing when scaling
- Current role model: `admin`, `supervisor`, `agent`
- Passwords are hashed with bcrypt; API routes are protected by Bearer tokens
- The login route is public; all other routes require authentication
- Upgrade to short-lived JWT/OAuth tokens in production
