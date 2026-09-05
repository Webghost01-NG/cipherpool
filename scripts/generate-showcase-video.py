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
    "Veylott is confidential prize savings on Zama F H E V M. Principal stays withdrawable while balances, draw weights, and winner state remain encrypted. This is unaudited research software on Ethereum Sepolia.",
    "Public prize pools expose balances, relative winning odds, and transaction timing. Veylott keeps custody and receipts verifiable without publishing every saver position.",
    "Official confidential c U S D C moves the encrypted asset first. Veylott credits only the token returned result and stores positions and draw weights as encrypted unsigned integers. Only the owner can authorize a private balance reveal.",
    "The React client submits wallet signed Sepolia transactions. Confidential Pool owns encrypted accounting. Sponsors fund the encrypted testnet reserve. Zama's relayer and K M S return proof bound predicates, while the indexer publishes only public metadata and stores durable checkpoints.",
    "This screenshot was captured from the canonical Vercel deployment. A disconnected session shows Connect wallet, never a placeholder address. Chain, bytecode, and custody bindings must verify before writes are enabled.",
    "The user wraps test U S D C, deposits confidential c U S D C, proves only that the encrypted position is positive, then enters a weighted draw. Prize and principal leave through the same encrypted withdrawal path.",
    "Deposits and withdrawals follow token returned custody amounts. Every award consumes the sponsor reserve and enters aggregate liabilities. The K M S reveals only request bound readiness. Aggregate weight, reserve, and winner remain encrypted. A twelve participant cap bounds computation.",
    "This active pool evidence is real. Three separately keyed wallets deposited, draw one received a readiness proof, and the K M S finalized encrypted winner selection. The winner privately detected and claimed half a c U S D C. All principals exited and participant slots returned to zero.",
    "One hundred sixty three tests cover Solidity invariants, backend and indexer behavior, the encryption adapter, and frontend. A reproducible audit scope check binds deployed source, constructor input, runtime code, custody, and draw policy across two independent R P C endpoints.",
    "Sepolia prizes are sponsor funded, not generated yield. The protocol is capped at twelve participants and is not externally audited. Open the canonical app, inspect the active pool, and review every limitation and confirmed receipt in the public repository.",
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
            run(["espeak-ng", "-v", "en-us", "-s", "170", "-p", "42", "-w", str(audio), narration])
            duration = probe_duration(audio) + 0.45
            run([
                "ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", "30", "-i", str(slide),
                "-i", str(audio), "-f", "lavfi", "-t", str(duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
                "-filter_complex", "[1:a]apad=pad_dur=0.5[a1]", "-map", "0:v", "-map", "[a1]",
                "-t", f"{duration:.3f}", "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:white,format=yuv420p",
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-c:a", "aac", "-b:a", "160k", str(segment),
            ])
            segments.append(segment)
            sentences = re.split(r"(?<=[.!?])\s+", narration)
            spoken_duration = duration - 0.45
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
