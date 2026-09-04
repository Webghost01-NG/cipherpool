#!/usr/bin/env python3
"""Create a narrated, burned-caption demo video from rendered deck slides."""

import re
import shutil
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SHOWCASE = ROOT / "docs" / "showcase" / "presentation"
ASSETS = SHOWCASE / "assets"
OUTPUT = SHOWCASE / "Veylott-Demo.mp4"

NARRATION = [
    "Veylott is private prize savings built on Zama F H E V M. It protects balances and ticket weights while keeping custody and settlement independently verifiable. The current deployment is research software on Ethereum Sepolia.",
    "Public ledgers make financial state easy to inspect. A savings balance, ticket weight, and transaction timing can expose intent or make high value users easy to track. Veylott preserves auditability without publishing every private position.",
    "A deposit transfers confidential c U S D C, and the pool credits only the token returned encrypted result. Balances and draw weights remain encrypted. A saver can reveal a balance locally only after signing a wallet authorization.",
    "The React application reads Ethereum Sepolia and sends explicit wallet signed transactions. The pool owns encrypted accounting and prize liabilities, while sponsors fund the encrypted testnet prize reserve. Zama's relayer and K M S prepare decryption evidence. The public indexer stores durable checkpoints in Postgre S Q L.",
    "This is the production interface captured from Vercel. A disconnected session shows only Connect wallet. An address appears only after the provider returns one. Public protocol status remains visible, and deployment bindings are verified before writes can proceed.",
    "The journey has four explicit steps. Wrap test U S D C into official confidential c U S D C. Deposit an encrypted amount. Fund or monitor a K M S verified prize round. Then withdraw c U S D C directly. Every transaction still requires wallet confirmation.",
    "The contracts bind encrypted credit to the token returned transfer, consume sponsor funded reserves when awarding prizes, and keep winner credits in the aggregate liability. Draw proofs are bound to stored handles. Anyone can release a stale draw lock after twenty four hours. Sepolia does not claim generated yield.",
    "This is not a simulated transaction. On a documented predecessor deployment, a real encrypted half c U S D C deposit entered draw one. Zama K M S finalized the winner selection. The winner privately detected and claimed the prize through an ordinary withdrawal, then recovered the remaining principal. Every historical receipt and the authorized post settlement check are linked in the repository.",
    "Reproducible validation covers Solidity invariants, backend A P I and indexer behavior, the client encryption adapter, and frontend user experience. The frontend runs on Vercel, the read only indexer A P I on Render, and Postgre S Q L storage lets the indexer resume from its saved checkpoint after restart.",
    "Veylott demonstrates that private savings can remain usable and verifiable. Open the live research app, inspect the active Sepolia contracts, and review every security decision and test in the public repository.",
]


def run(command):
    subprocess.run(command, check=True)


def probe_duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def timestamp(seconds):
    milliseconds = round(seconds * 1000)
    hours, remainder = divmod(milliseconds, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, millis = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def require_tools():
    missing = [tool for tool in ("espeak-ng", "ffmpeg", "ffprobe") if shutil.which(tool) is None]
    if missing:
        raise SystemExit("Missing required tools: " + ", ".join(missing))


def main():
    require_tools()
    slides = sorted(ASSETS.glob("slide-*.png"))
    if len(slides) != len(NARRATION):
        raise SystemExit(f"Expected {len(NARRATION)} rendered slides, found {len(slides)} in {ASSETS}")

    with tempfile.TemporaryDirectory(prefix="veylott-video-") as temp_name:
        temp = Path(temp_name)
        segments = []
        caption_blocks = []
        caption_index = 1
        elapsed = 0.0

        for index, (slide, narration) in enumerate(zip(slides, NARRATION), start=1):
            audio = temp / f"audio-{index:02d}.wav"
            segment = temp / f"segment-{index:02d}.mp4"
            run(["espeak-ng", "-v", "en-us", "-s", "150", "-p", "42", "-w", str(audio), narration])
            duration = probe_duration(audio) + 0.8
            run([
                "ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", str(slide),
                "-i", str(audio), "-f", "lavfi", "-t", str(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                "-filter_complex", "[1:a]apad=pad_dur=1[a1]", "-map", "0:v", "-map", "[a1]",
                "-t", f"{duration:.3f}", "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k", str(segment),
            ])
            segments.append(segment)
            sentences = re.split(r"(?<=[.!?])\s+", narration)
            spoken_duration = duration - 0.8
            weight_total = sum(len(sentence) for sentence in sentences)
            sentence_start = elapsed
            for sentence_index, sentence in enumerate(sentences):
                sentence_duration = spoken_duration * len(sentence) / weight_total
                sentence_end = sentence_start + sentence_duration
                if sentence_index == len(sentences) - 1:
                    sentence_end = elapsed + spoken_duration
                caption_blocks.append(
                    f"{caption_index}\n{timestamp(sentence_start)} --> {timestamp(sentence_end)}\n{sentence}\n"
                )
                caption_index += 1
                sentence_start = sentence_end
            elapsed += duration

        concat_file = temp / "segments.txt"
        concat_file.write_text("".join(f"file '{segment.as_posix()}'\n" for segment in segments), encoding="utf-8")
        uncaptioned = temp / "uncaptioned.mp4"
        run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(uncaptioned)])

        subtitles = temp / "captions.srt"
        subtitles.write_text("\n".join(caption_blocks), encoding="utf-8")
        subtitle_filter = (
            f"subtitles={subtitles.as_posix()}:force_style='FontName=Liberation Sans,FontSize=14,"
            "PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=3,Outline=1,Shadow=0,"
            "BackColour=&H80000000,MarginV=32,Alignment=2'"
        )
        run([
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(uncaptioned), "-vf", subtitle_filter,
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "copy", "-movflags", "+faststart", str(OUTPUT),
        ])

    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
