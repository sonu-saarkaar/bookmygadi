import json
from typing import List, Dict

def point_in_polygon(x: float, y: float, polygon: List[Dict[str, float]]) -> bool:
    """
    Ray-casting algorithm to determine if a Point (lng, lat) is inside a Polygon.
    Used as an application-level fallback if PostGIS is not available.
    """
    n = len(polygon)
    inside = False
    p1x, p1y = polygon[0]["lng"], polygon[0]["lat"]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]["lng"], polygon[i % n]["lat"]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

class GeoZoneEngine:
    """
    Enterprise Geo-Zone Resolution System.
    Handles overlap conflicts by sorting via zone priority.
    """
    def __init__(self, db_session):
        self.db = db_session

    def resolve_pickup_zone(self, lat: float, lng: float):
        from .models import AdvancedGeoZone
        
        # In production, query with PostGIS ST_Contains.
        # This simulates spatial indexing logic.
        zones = self.db.query(AdvancedGeoZone).filter(AdvancedGeoZone.is_active == True).all()
        
        matching_zones = []
        for zone in zones:
            if zone.polygon_geojson:
                polygon = zone.polygon_geojson.get("coordinates", [])
                if point_in_polygon(lng, lat, polygon):
                    matching_zones.append(zone)
                    
        if not matching_zones:
            return None
            
        # Conflict Resolution: Highest priority wins (surge_zone > event_zone > city_zone)
        matching_zones.sort(key=lambda z: z.priority, reverse=True)
        return matching_zones[0]
