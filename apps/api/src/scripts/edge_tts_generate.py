import argparse
import asyncio
from pathlib import Path

import edge_tts


async def synthesize(input_path: Path, output_path: Path, voice: str) -> None:
    text = input_path.read_text(encoding="utf-8")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    communicate = edge_tts.Communicate(text=text, voice=voice)
    await communicate.save(str(output_path))


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate MP3 from text via edge-tts")
    parser.add_argument("--input", required=True, help="Input text file path")
    parser.add_argument("--output", required=True, help="Output mp3 file path")
    parser.add_argument("--voice", default="en-US-ChristopherNeural", help="Azure neural voice")
    args = parser.parse_args()

    asyncio.run(synthesize(Path(args.input), Path(args.output), args.voice))


if __name__ == "__main__":
    main()
