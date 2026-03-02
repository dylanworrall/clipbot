"""
Export YouTube cookies from Chrome to cookies.txt for yt-dlp.

Usage:
  1. Close ALL Chrome windows (Chrome locks the cookie database)
  2. Run: python scripts/export-cookies.py
  3. Reopen Chrome

The cookies.txt file will be saved to the clipbot root directory.
yt-dlp will auto-detect it when downloading age-restricted videos.
"""

import sqlite3
import shutil
import tempfile
import os
import sys

CLIPBOT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_PATH = os.path.join(CLIPBOT_ROOT, "cookies.txt")

# Chrome cookie DB paths (try in order)
HOME = os.path.expanduser("~")
COOKIE_PATHS = [
    os.path.join(HOME, "AppData", "Local", "Google", "Chrome", "User Data", "Default", "Network", "Cookies"),
    os.path.join(HOME, "AppData", "Local", "Google", "Chrome", "User Data", "Default", "Cookies"),
]


def main():
    # Find the cookie DB
    db_path = None
    for p in COOKIE_PATHS:
        if os.path.exists(p):
            db_path = p
            break

    if not db_path:
        print("ERROR: Chrome cookie database not found.")
        print("Checked:", "\n  ".join(COOKIE_PATHS))
        sys.exit(1)

    print(f"Found Chrome cookie DB: {db_path}")

    # Copy to temp (Chrome must be closed for this to work)
    tmp = tempfile.mktemp(suffix=".db")
    try:
        shutil.copy2(db_path, tmp)
    except PermissionError:
        print()
        print("ERROR: Chrome is still running and has the cookie database locked.")
        print()
        print("Please:")
        print("  1. Close ALL Chrome windows (check system tray too)")
        print("  2. Run this script again")
        print()
        print("Alternatively, install the 'Get cookies.txt LOCALLY' Chrome extension")
        print("and export cookies from youtube.com to clipbot/cookies.txt")
        sys.exit(1)

    # Read cookies
    conn = sqlite3.connect(tmp)
    cursor = conn.execute(
        "SELECT host_key, name, value, path, expires_utc, is_secure, is_httponly "
        "FROM cookies WHERE host_key LIKE '%youtube.com' OR host_key LIKE '%google.com'"
    )
    rows = cursor.fetchall()
    conn.close()
    os.unlink(tmp)

    if not rows:
        print("WARNING: No YouTube/Google cookies found. Are you logged into YouTube in Chrome?")
        sys.exit(1)

    # Write Netscape cookie format
    with open(OUTPUT_PATH, "w") as f:
        f.write("# Netscape HTTP Cookie File\n")
        f.write("# Exported by clipbot/scripts/export-cookies.py\n")
        f.write("# This file is used by yt-dlp for age-restricted videos\n\n")

        for host, name, value, path, expires, secure, httponly in rows:
            domain_dot = "TRUE" if host.startswith(".") else "FALSE"
            secure_str = "TRUE" if secure else "FALSE"
            # Chrome stores expires_utc as microseconds since 1601-01-01
            # Convert to Unix timestamp (seconds since 1970-01-01)
            if expires > 0:
                unix_expires = str(int((expires / 1_000_000) - 11644473600))
            else:
                unix_expires = "0"
            f.write(f"{host}\t{domain_dot}\t{path}\t{secure_str}\t{unix_expires}\t{name}\t{value}\n")

    print(f"Exported {len(rows)} cookies to: {OUTPUT_PATH}")
    print("yt-dlp will auto-detect this file for age-restricted videos.")


if __name__ == "__main__":
    main()
