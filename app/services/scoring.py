from __future__ import annotations

from dataclasses import dataclass
from math import exp


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def grade_from_score(score: float) -> str:
    if score >= 80:
        return "A"
    if score >= 60:
        return "B"
    if score >= 40:
        return "C"
    return "D"


def score_lead_rules(
    job_title: str | None,
    lifecycle_stage: str,
    activity_count_30d: int,
    replied_30d: int,
    unsubscribed: bool,
) -> tuple[float, dict]:
    score = 0.0
    reasons: list[str] = []
    icp_titles = {"founder", "ceo", "head of sales", "vp sales", "director sales"}
    if job_title and job_title.lower() in icp_titles:
        score += 25
        reasons.append("title_match")
    if lifecycle_stage in {"mql", "sql", "opportunity"}:
        score += 15
        reasons.append("funnel_progress")
    if activity_count_30d >= 5:
        score += 20
        reasons.append("high_activity")
    if replied_30d >= 1:
        score += 30
        reasons.append("recent_reply")
    if unsubscribed:
        score -= 60
        reasons.append("unsubscribe_penalty")
    score = clamp(score, 0, 100)
    return score, {"reasons": reasons, "mode": "rules"}


@dataclass
class LinearModel:
    weights: list[float]
    bias: float


DEAL_RISK_MODEL = LinearModel(weights=[0.08, 0.35, 0.1, 0.25, 0.3], bias=-2.5)


def predict_deal_risk(
    stage_age_days: int,
    inactivity_days: int,
    stakeholder_count: int,
    discount_pct: float,
    stage_regressions: int,
) -> tuple[float, str, dict]:
    features = [
        float(stage_age_days),
        float(inactivity_days),
        float(max(0, 3 - stakeholder_count)),
        float(discount_pct / 10.0),
        float(stage_regressions),
    ]
    z = sum(w * x for w, x in zip(DEAL_RISK_MODEL.weights, features, strict=False)) + DEAL_RISK_MODEL.bias
    p_loss = 1 / (1 + exp(-z))
    risk_score = clamp(round(p_loss * 100, 2), 0, 100)
    risk_level = "high" if risk_score >= 70 else ("medium" if risk_score >= 40 else "low")
    reason_pairs = [
        ("stage_age_days", DEAL_RISK_MODEL.weights[0] * features[0]),
        ("inactivity_days", DEAL_RISK_MODEL.weights[1] * features[1]),
        ("stakeholder_gap", DEAL_RISK_MODEL.weights[2] * features[2]),
        ("discount_pressure", DEAL_RISK_MODEL.weights[3] * features[3]),
        ("stage_regressions", DEAL_RISK_MODEL.weights[4] * features[4]),
    ]
    top_factors = sorted(reason_pairs, key=lambda x: x[1], reverse=True)[:3]
    explanation = {"top_factors": [{"feature": f, "impact": round(v, 3)} for f, v in top_factors]}
    return risk_score, risk_level, explanation


def suggest_next_best_action(stage: str, inactivity_days: int, replied_30d: int, amount: float, stakeholders: int) -> str:
    if stage.lower() == "proposal" and inactivity_days >= 7 and replied_30d == 0:
        return "Create call task and send follow-up template B."
    if inactivity_days >= 14:
        return "Escalate to manager and schedule recovery meeting."
    if amount >= 50000 and stakeholders < 2:
        return "Add economic buyer stakeholder before next negotiation."
    return "Continue current sequence."


def customer_health_score(unresolved_tickets: int, avg_payment_delay_days: int, usage_drop_pct: float, exec_engagement_gap_days: int) -> tuple[float, str, dict]:
    score = 100.0
    penalties = {
        "tickets_penalty": min(unresolved_tickets * 5, 25),
        "payment_penalty": min(avg_payment_delay_days * 2, 20),
        "usage_penalty": min(max(usage_drop_pct, 0), 25),
        "engagement_penalty": min((exec_engagement_gap_days // 7) * 3, 15),
    }
    score -= sum(penalties.values())
    score = clamp(score, 0, 100)
    band = "healthy" if score >= 75 else ("watch" if score >= 50 else "at_risk")
    return score, band, penalties


def churn_risk_from_thresholds(usage_drop_pct: float, unresolved_tickets: int, late_payments_count: int) -> tuple[float, str, dict]:
    risk = 0.0
    reasons: list[str] = []
    if usage_drop_pct >= 30:
        risk += 35
        reasons.append("usage_drop")
    if unresolved_tickets >= 3:
        risk += 30
        reasons.append("support_load")
    if late_payments_count >= 2:
        risk += 35
        reasons.append("payment_delay")
    risk = clamp(risk, 0, 100)
    level = "high" if risk >= 70 else ("medium" if risk >= 40 else "low")
    return risk, level, {"reasons": reasons}


def forecast_pipeline(open_deals: list[dict], stage_win_rates: dict[int, float], seasonality_factor: float = 1.0) -> dict:
    pipeline_total = sum(float(d["amount"]) for d in open_deals)
    weighted_total = sum(float(d["amount"]) * stage_win_rates.get(int(d["stage_id"]), 0.2) for d in open_deals)
    forecast_total = weighted_total * seasonality_factor
    return {
        "pipeline_total": round(pipeline_total, 2),
        "weighted_total": round(weighted_total, 2),
        "forecast_total": round(forecast_total, 2),
    }


def commission_and_attainment(booked_revenue: float, quota: float) -> dict:
    attainment = booked_revenue / quota if quota > 0 else 0
    if attainment < 1.0:
        rate = 0.05
    elif attainment < 1.2:
        rate = 0.07
    else:
        rate = 0.07 * 1.2
    commission = booked_revenue * rate
    return {
        "booked_revenue": round(booked_revenue, 2),
        "quota": round(quota, 2),
        "attainment_pct": round(attainment * 100, 2),
        "commission_amount": round(commission, 2),
        "rate_used": round(rate, 4),
    }
