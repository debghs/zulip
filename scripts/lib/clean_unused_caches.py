#!/usr/bin/env python3
import argparse
import os
import shutil
import sys

ZULIP_PATH = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(ZULIP_PATH)
from scripts.lib import clean_emoji_cache, clean_venv_cache
from scripts.lib.zulip_tools import parse_cache_script_args


def main(args: argparse.Namespace) -> None:
    os.chdir(ZULIP_PATH)
    clean_venv_cache.main(args)
    shutil.rmtree("/srv/zulip-npm-cache", ignore_errors=True)  # Replaced as of 7.0
    clean_emoji_cache.main(args)


if __name__ == "__main__":
    args = parse_cache_script_args("This script cleans unused Zulip caches.")
    main(args)
