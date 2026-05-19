#!/usr/bin/env python3
import subprocess
import os
from pathlib import Path

os.chdir(Path(__file__).resolve().parents[1])

print("Adding files...", flush=True)
subprocess.run(['git', 'add', '-A'], check=True)

print("Committing...", flush=True)
subprocess.run([
    'git', 'commit', '-m',
    'chore: checkpoint gold coast repo'
], check=True)

print("Done!", flush=True)
