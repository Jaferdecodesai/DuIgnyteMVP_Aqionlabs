# Aqion Relay pitch source

The final 14-slide presentation is supplied as native editable **PPTX**, searchable **PDF**, and an offline **HTML** presentation with local editing, save and export controls. Slide 1 contains both the public repository and the verified live Cloudflare MVP links. The actual app screenshot on slide 7 is captured from that deployment with fictional data.

`CONTENT.md` contains slide text and speaker notes. `SOURCES.md` records direct source links and evidence boundaries. `build-config.json` contains the two cover URLs. `scripts/build_deck.py` owns content and geometry; it emits `scene.json` and the PDF. `scripts/export_deck.mjs` consumes that scene to emit the editable PowerPoint and self-contained HTML. The PowerPoint retains native text and shapes; the actual app screenshot remains an image. Font files retain their included SIL Open Font Licenses.

To rebuild with Python 3 and Node 24:

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
npm install
.venv/bin/python scripts/build_deck.py
npm run export
```

Install the included fonts locally for consistent native PowerPoint rendering. The PDF and HTML embed fonts. Open HTML in a browser; use arrow keys, Home/End, slide dots or touch swipes. Press E to edit text. Save stores edits in that browser; Export HTML creates a portable edited file. To regenerate all three formats consistently, edit the source and rebuild. Recheck text fit after changes.

`renders/` contains the final PDF slide renders. `evidence/native-render/` contains a separate LibreOffice render of the native PPTX, checked for clipping and consistency. Both sets were visually inspected. Each submission artifact is below the challenge's supplied 40 MB per-file limit. Upload and receipt in the owner's Ignyte account remain separate from this package.
