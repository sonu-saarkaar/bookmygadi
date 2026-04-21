from datetime import datetime
from pathlib import Path


MAX_BACKUP_FILES = 50


def _sqlite_path_from_url(database_url: str) -> Path | None:
    if not database_url.startswith("sqlite:///"):
        return None

    raw_path = database_url.removeprefix("sqlite:///")
    if not raw_path:
        return None

    return Path(raw_path)


def create_sqlite_backup(database_url: str) -> str | None:
    db_path = _sqlite_path_from_url(database_url)
    if db_path is None or not db_path.exists():
        return None

    backup_dir = db_path.parent / "db_backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"{db_path.stem}_{timestamp}{db_path.suffix}"
    backup_path.write_bytes(db_path.read_bytes())

    backups = sorted(
        backup_dir.glob(f"{db_path.stem}_*{db_path.suffix}"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for stale_file in backups[MAX_BACKUP_FILES:]:
        stale_file.unlink(missing_ok=True)

    return str(backup_path)