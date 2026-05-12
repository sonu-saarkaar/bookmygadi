def generate_booking_display_id(ride_id: str) -> str:
    """Generate a consistent booking display ID for any ride ID."""
    if not ride_id:
        return "BMG-RIDE-0000"
    return f"BMG-RIDE-{str(ride_id)[:8].upper()}"
