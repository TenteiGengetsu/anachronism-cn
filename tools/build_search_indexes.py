"""Build Babele on-demand title/label indexes from the shipped translations.

source-names.json records English names and IDs from the supplied 2.4.0 export.
Run from any directory; does not touch descriptions, embedded items or rules.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(path):
    return json.loads(path.read_text(encoding="utf-8"))

def save(path, data):
    previous = path.read_bytes() if path.exists() else b""
    data = (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if b"\r\n" in previous:
        data = data.replace(b"\n", b"\r\n")
    path.write_bytes(data)

def bilingual(translated, original):
    if not isinstance(translated, str) or not translated.strip():
        return original
    if not re.search(r"[\u3400-\u9fff]", translated):
        return translated
    if original.casefold() in translated.casefold():
        return translated
    return f"{translated} {original}"

def build():
    sources = load(ROOT / "tools/source-names.json")
    titles, labels = {}, {}
    counts = {"packs": 0, "entries": 0, "nameChanges": 0, "ambiguousEnglishAliases": 0}
    for collection, source in sources["packs"].items():
        path = ROOT / "translations" / f"{collection}.json"
        pack = load(path)
        label = bilingual(pack.get("label"), source["label"])
        pack["label"] = label
        labels[collection] = label
        names, aliases = {}, {}
        for identity, original in source["names"].items():
            entry = pack.get("entries", {}).get(identity)
            if not isinstance(entry, dict) or not isinstance(entry.get("name"), str):
                continue
            display = bilingual(entry["name"], original)
            counts["nameChanges"] += display != entry["name"]
            entry["name"] = display
            names[identity] = display
            aliases.setdefault(original, set()).add(display)
            counts["entries"] += 1
        for original, choices in aliases.items():
            if len(choices) == 1 and original not in names:
                names[original] = next(iter(choices))
            elif len(choices) > 1:
                counts["ambiguousEnglishAliases"] += 1
        titles[collection] = {"titles": names, "folders": pack.get("folders", {})}
        save(path, pack)
        counts["packs"] += 1
    save(ROOT / "translations/titles.json", titles)
    save(ROOT / "translations/labels.json", labels)
    print(json.dumps(counts, ensure_ascii=False))

if __name__ == "__main__":
    build()
