from app.services.finding_text import clip_text


def test_clip_long_title() -> None:
    long = "x" * 600
    out = clip_text(long, 512)
    assert out is not None
    assert len(out) == 512
    assert out.endswith("…")
