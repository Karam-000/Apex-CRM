from __future__ import annotations


def _compare(op: str, left, right) -> bool:
    if op == "eq":
        return left == right
    if op == "neq":
        return left != right
    if op == "gt":
        return left > right
    if op == "gte":
        return left >= right
    if op == "lt":
        return left < right
    if op == "lte":
        return left <= right
    if op == "contains":
        return str(right).lower() in str(left).lower()
    return False


def evaluate_condition(entity: dict, condition: dict) -> bool:
    field = condition.get("field")
    op = condition.get("op", "eq")
    value = condition.get("value")
    if field is None:
        return False
    return _compare(op, entity.get(field), value)


def execute_action(action: dict, entity: dict) -> dict:
    action_type = action.get("type")
    if action_type == "set_field":
        target = action.get("field")
        if target:
            entity[target] = action.get("value")
        return {"status": "applied", "type": "set_field", "field": target}
    if action_type == "add_tag":
        tags = entity.get("tags", [])
        tag = action.get("value")
        if tag and tag not in tags:
            tags.append(tag)
            entity["tags"] = tags
        return {"status": "applied", "type": "add_tag", "tag": tag}
    if action_type == "create_task":
        return {"status": "applied", "type": "create_task", "task_subject": action.get("subject", "Follow up")}
    return {"status": "ignored", "type": action_type}
