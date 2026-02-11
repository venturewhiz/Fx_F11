def make_key(
    channel: str,
    campaign_id: str,
    segment_id: str,
    moment: str,
    creative_id: str,
    offer_id: str,
    inventory_id: str = "",
) -> str:
    """Deterministic decision-unit key used across systems."""
    if inventory_id:
        return f"{channel}|{campaign_id}|{segment_id}|{moment}|{creative_id}|{offer_id}|{inventory_id}"
    return f"{channel}|{campaign_id}|{segment_id}|{moment}|{creative_id}|{offer_id}"
