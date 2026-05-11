import os
import shutil

backend_app_api = "c:/bookmygadi-recover/bookmygadi/backend/app/api"
backend_app = "c:/bookmygadi-recover/bookmygadi/backend/app"

folders = {
    "user": ["rides.py", "vehicles.py", "services.py", "pricing.py", "payment.py", "radar.py"],
    "rider": ["rider.py"],
    "admin": ["admin.py", "admin_enterprise.py", "crm.py", "users_mgmt.py"],
    "common": ["auth.py", "realtime.py", "system.py", "deps.py"],
}

# Create folders
for folder in folders:
    os.makedirs(os.path.join(backend_app_api, folder), exist_ok=True)
    # create __init__.py
    with open(os.path.join(backend_app_api, folder, "__init__.py"), "w") as f:
        pass

# Move files
for folder, files in folders.items():
    for file in files:
        src = os.path.join(backend_app_api, file)
        dst = os.path.join(backend_app_api, folder, file)
        if os.path.exists(src):
            shutil.move(src, dst)

# Build replacement mapping for imports
module_mapping = {}
for folder, files in folders.items():
    for file in files:
        module = file.replace(".py", "")
        module_mapping[f"app.api.{module}"] = f"app.api.{folder}.{module}"

def process_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = content
    for old_import, new_import in module_mapping.items():
        # Handle cases like `from app.api.deps import ...`
        new_content = new_content.replace(f"from {old_import} import", f"from {new_import} import")
        new_content = new_content.replace(f"import {old_import}", f"import {new_import}")
    
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)

# Update all python files in app/
for root, dirs, files in os.walk(backend_app):
    for file in files:
        if file.endswith(".py"):
            process_file(os.path.join(root, file))

print("Refactoring complete.")
