#!/usr/bin/env python3
"""Copy the reviewed Touchbaes protocol-v1 successor deterministically."""

import argparse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = (
    ROOT
    / "Portfolio assets/_for cargo deployment/touchbaes/sticker game/"
    "touchbaes-sticker-game/touchbaes-sticker-game-v11.html"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "touchbaes-sticker-game-v11.html",
        help="output bundle path",
    )
    return parser.parse_args()


def main() -> None:
    output = parse_args().output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    payload = SOURCE.read_bytes()
    output.write_bytes(payload)
    print(f"built {output}: {len(payload)} bytes")


if __name__ == "__main__":
    main()
