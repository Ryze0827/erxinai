#!/usr/bin/env python3

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


CANVAS_SIZE = 512
MARK_SIZE = 400
UI_SIZE = 96
UI_CROP_SIZE = 448
FRAME_DURATION_MS = 50
EXPAND_FRAMES = 10
ROTATE_FRAMES = 40
HOLD_DURATION_MS = 2000
CONTRACT_FRAMES = 10
MIN_ARM_SCALE = 0.56
EASE_IN_OUT = (0.77, 0.0, 0.175, 1.0)


def cubic_bezier(progress, controls=EASE_IN_OUT):
    x1, y1, x2, y2 = controls

    def coordinate(value, first, second):
        inverse = 1.0 - value
        return 3.0 * inverse * inverse * value * first + 3.0 * inverse * value * value * second + value**3

    low = 0.0
    high = 1.0
    for _ in range(24):
        midpoint = (low + high) / 2.0
        if coordinate(midpoint, x1, x2) < progress:
            low = midpoint
        else:
            high = midpoint
    return coordinate((low + high) / 2.0, y1, y2)


def centered_logo(source):
    resized = source.resize((MARK_SIZE, MARK_SIZE), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    offset = (CANVAS_SIZE - MARK_SIZE) // 2
    canvas.alpha_composite(resized, (offset, offset))
    return canvas


def center_layer(logo):
    center = CANVAS_SIZE // 2
    radius = round(MARK_SIZE * 0.215)
    mask = Image.new("L", logo.size, 0)
    ImageDraw.Draw(mask).polygon(
        [(center, center - radius), (center + radius, center), (center, center + radius), (center - radius, center)],
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(0.75))
    layer = logo.copy()
    layer.putalpha(ImageChops.multiply(logo.getchannel("A"), mask))
    return layer


def scale_from_center(image, scale):
    size = round(CANVAS_SIZE * scale)
    resized = image.resize((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", image.size, (0, 0, 0, 0))
    offset = (CANVAS_SIZE - size) // 2
    canvas.alpha_composite(resized, (offset, offset))
    return canvas


def render_frame(logo, fixed_center, arm_scale, angle):
    frame = scale_from_center(logo, arm_scale)
    frame.alpha_composite(fixed_center)
    if angle % 360:
        frame = frame.rotate(-angle, resample=Image.Resampling.BICUBIC, expand=False)
    return frame


def build_frames(logo):
    fixed_center = center_layer(logo)
    frames = []
    durations = []

    for step in range(1, EXPAND_FRAMES + 1):
        eased = cubic_bezier(step / EXPAND_FRAMES)
        scale = MIN_ARM_SCALE + (1.0 - MIN_ARM_SCALE) * eased
        frames.append(render_frame(logo, fixed_center, scale, 0))
        durations.append(FRAME_DURATION_MS)

    for step in range(1, ROTATE_FRAMES + 1):
        frames.append(render_frame(logo, fixed_center, 1.0, 360.0 * step / ROTATE_FRAMES))
        durations.append(FRAME_DURATION_MS)

    frames.append(render_frame(logo, fixed_center, 1.0, 360.0))
    durations.append(HOLD_DURATION_MS)

    for step in range(1, CONTRACT_FRAMES + 1):
        eased = cubic_bezier(step / CONTRACT_FRAMES)
        scale = 1.0 - (1.0 - MIN_ARM_SCALE) * eased
        frames.append(render_frame(logo, fixed_center, scale, 360.0))
        durations.append(FRAME_DURATION_MS)

    return frames, durations


def global_palette(frames):
    samples = frames[:: max(1, len(frames) // 12)]
    atlas = Image.new("RGB", (128 * 4, 128 * 3), (0, 0, 0))
    for index, frame in enumerate(samples[:12]):
        sample = frame.resize((128, 128), Image.Resampling.LANCZOS).convert("RGB")
        atlas.paste(sample, ((index % 4) * 128, (index // 4) * 128))
    palette = atlas.quantize(colors=255, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    colors = palette.getpalette()
    colors[255 * 3 : 255 * 3 + 3] = [0, 0, 0]
    palette.putpalette(colors)
    return palette


def gif_frame(frame, palette):
    quantized = frame.convert("RGB").quantize(palette=palette, dither=Image.Dither.FLOYDSTEINBERG)
    transparent = frame.getchannel("A").point(lambda alpha: 255 if alpha < 96 else 0)
    quantized.paste(255, mask=transparent)
    quantized.info["transparency"] = 255
    quantized.info["disposal"] = 2
    return quantized


def save_gif(frames, durations, output_path):
    palette = global_palette(frames)
    quantized_frames = [gif_frame(frame, palette) for frame in frames]
    quantized_frames[0].save(
        output_path,
        save_all=True,
        append_images=quantized_frames[1:],
        duration=durations,
        loop=0,
        disposal=2,
        transparency=255,
        optimize=False,
    )
    return len(quantized_frames)


def main():
    root = Path(__file__).resolve().parents[1]
    source_path = root / "public/assets/img/wayx-mark-05.png"
    output_path = root / "public/assets/img/wayx-mark-05-windmill.gif"
    ui_output_path = root / "public/assets/img/wayx-mark-05-windmill-96.gif"
    logo = centered_logo(Image.open(source_path).convert("RGBA"))
    rgba_frames, durations = build_frames(logo)
    frame_count = save_gif(rgba_frames, durations, output_path)
    crop_offset = (CANVAS_SIZE - UI_CROP_SIZE) // 2
    crop_box = (crop_offset, crop_offset, crop_offset + UI_CROP_SIZE, crop_offset + UI_CROP_SIZE)
    ui_frames = [frame.crop(crop_box).resize((UI_SIZE, UI_SIZE), Image.Resampling.LANCZOS) for frame in rgba_frames]
    save_gif(ui_frames, durations, ui_output_path)
    print(f"Wrote {output_path} and {ui_output_path} ({frame_count} frames, {sum(durations)} ms loop)")


if __name__ == "__main__":
    main()
