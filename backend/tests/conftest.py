import os
import sys
import tempfile

# Tests must never write into the live dev database: point the app at a throwaway SQLite file
# before any app module (and its engine) is imported.
_tmp_dir = tempfile.mkdtemp(prefix="roofray_tests_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_tmp_dir, 'test.db')}"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from seed import run_seed  # noqa: E402

run_seed()
