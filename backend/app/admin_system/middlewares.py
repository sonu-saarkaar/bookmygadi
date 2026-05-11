from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from .logger import admin_logger
import time

class AdminAuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Proceed with request
        try:
            response = await call_next(request)
        except Exception as e:
            admin_logger.error(f"Exception during request {request.url.path}: {e}")
            raise e
            
        process_time = time.time() - start_time
        admin_logger.info(
            f"Audit: {request.method} {request.url.path} - "
            f"Status: {response.status_code} - "
            f"Time: {process_time:.4f}s"
        )
        return response

class SecureUploadMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Validate upload requests
        if request.method == "POST" and "import" in request.url.path:
            content_type = request.headers.get("content-type", "")
            if "multipart/form-data" not in content_type:
                from fastapi.responses import JSONResponse
                return JSONResponse(status_code=400, content={"error": "Invalid content type for upload"})
        return await call_next(request)
