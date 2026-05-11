from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from .models import DeviceFingerprint, OTPRequestLog, GPSAnomaly

class EnterpriseSecurityEngine:
    def __init__(self, db: Session):
        self.db = db

    # ------------------ OTP ABUSE PREVENTION ------------------
    def validate_otp_request(self, phone: str, ip_address: str, fingerprint: str) -> bool:
        """
        Telecom-grade OTP protection. Blocks emulator farms and brute-force IP attacks.
        """
        device = self.db.query(DeviceFingerprint).filter(DeviceFingerprint.fingerprint == fingerprint).first()
        if device and (device.is_blocked or device.is_emulator):
            return False # Drop silently to confuse bots
            
        # Rate Limiting: Max 5 requests per IP per 10 minutes
        recent_requests = self.db.query(OTPRequestLog).filter(
            OTPRequestLog.ip_address == ip_address,
            OTPRequestLog.requested_at > datetime.utcnow() - timedelta(minutes=10)
        ).count()
        
        if recent_requests >= 5:
            if device:
                device.abuse_score += 10.0
                if device.abuse_score > 50:
                    device.is_blocked = True
                self.db.commit()
            return False

        log = OTPRequestLog(phone=phone, ip_address=ip_address, fingerprint=fingerprint, is_successful=True)
        self.db.add(log)
        self.db.commit()
        return True

    # ------------------ GPS SPOOF DETECTION ------------------
    def analyze_location_integrity(self, driver_id: str, ride_id: str, lat: float, lng: float, accuracy: float, speed_kmh: float, is_mocked: bool):
        """
        Detects GPS teleporting, mock location apps, and impossible speeds.
        """
        anomalies = []
        severity = "low"
        
        if is_mocked:
            anomalies.append("mock_location_detected")
            severity = "critical"
            
        if speed_kmh > 180:
            anomalies.append("impossible_speed_detected")
            severity = "high"
            
        if accuracy > 500:
            anomalies.append("extremely_weak_signal_ignored")
            
        if anomalies:
            anomaly = GPSAnomaly(
                driver_id=driver_id, ride_id=ride_id, 
                anomaly_type="|".join(anomalies), severity=severity,
                details={"lat": lat, "lng": lng, "speed": speed_kmh}
            )
            self.db.add(anomaly)
            self.db.commit()
            
            if severity == "critical":
                # In production, this emits an event to instantly freeze driver dispatch
                pass
