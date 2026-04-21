import math
import random
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user
from app.models import User

router = APIRouter(prefix="/radar", tags=["radar"])

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@router.get("/nearby")
def get_radar_nearby_vehicles(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(default=10.0),
    _user: User = Depends(get_current_user)
):
    import time
    timestamp = time.time()
    
    # Mock generating random drivers around lat,lng with consistent orbits
    drivers = []
    # Generate 15 potential drivers within a slightly larger radius, then filter using Haversine
    for i in range(15):
        # consistent random state for this driver
        random.seed(i)
        
        # Base orbit parameters
        base_r = 15.0 * math.sqrt(random.random())
        base_theta = random.random() * 2 * math.pi
        orbit_speed = (random.random() * 0.05) + 0.01  # speed of movement
        
        # calculate current position using time
        current_theta = base_theta + (timestamp * orbit_speed * (1 if i % 2 == 0 else -1))
        
        # radius variation to simulate turning
        r = base_r + (math.sin(timestamp * orbit_speed * 2) * 1.5)
        
        dlat = (r / 111.0) * math.cos(current_theta)
        dlng = (r / (111.0 * math.cos(math.radians(lat)))) * math.sin(current_theta)
        
        driver_lat = lat + dlat
        driver_lng = lng + dlng
        
        # Calculate Haversine on backend to filter
        dist = haversine(lat, lng, driver_lat, driver_lng)
        if dist <= radius_km:
            v_type = random.choice(["car", "car", "bike", "auto"])
            eta = max(1, int(dist * 2.5)) # rough ETA proxy
            drivers.append({
                "id": f"drv_{i}",
                "lat": round(driver_lat, 6),
                "lng": round(driver_lng, 6),
                "distance": round(dist, 2),
                "type": v_type,
                "eta_mins": eta
            })
            
    # Reset random seed behavior
    random.seed()
    # Sort closest first
    drivers.sort(key=lambda d: d["distance"])
    return {"drivers": drivers}
