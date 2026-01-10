import sys
import os

try:
    import vr_v3_core
    print(f"Import Successful. Version: {vr_v3_core.VR_VERSION}")
except ImportError as e:
    print(f"Import Failed: {e}")
except Exception as e:
    print(f"An error occurred: {e}")
