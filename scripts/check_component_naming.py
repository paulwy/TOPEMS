#!/usr/bin/env python3
"""Shim: delegates to the actual script in scripts/tools/"""
import sys
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
tools_script = os.path.join(script_dir, "tools", "check_component_naming.py")
if os.path.exists(tools_script):
    os.execv(sys.executable, [sys.executable, tools_script] + sys.argv[1:])
else:
    # Script not found, exit gracefully (don't block commits)
    print(f"Warning: {tools_script} not found, skipping naming check")
    sys.exit(0)
