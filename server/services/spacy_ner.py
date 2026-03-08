import json
import re
import sys

text = sys.stdin.read()

try:
    import spacy
except Exception as e:
    print(json.dumps({"ok": False, "error": f"spacy import failed: {e}"}))
    sys.exit(0)

try:
    nlp = spacy.load("en_core_web_sm")
except Exception as e:
    print(json.dumps({"ok": False, "error": f"en_core_web_sm not installed: {e}"}))
    sys.exit(0)

try:
    doc = nlp(text)

    dates = []
    orgs = []
    money = []

    for ent in doc.ents:
        if ent.label_ == "DATE":
            dates.append(ent.text.strip())
        elif ent.label_ == "ORG":
            orgs.append(ent.text.strip())
        elif ent.label_ == "MONEY":
            money.append(ent.text.strip())

    obligation_patterns = [
        r"\bshall\b[^.\n]{0,140}",
        r"\bmust\b[^.\n]{0,140}",
        r"\bis required to\b[^.\n]{0,140}",
        r"\bagrees to\b[^.\n]{0,140}",
        r"\bobligated to\b[^.\n]{0,140}",
        r"\bmay not\b[^.\n]{0,140}",
    ]

    obligations = []
    for pattern in obligation_patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            snippet = m.group(0).strip()
            if len(snippet) >= 15:
                obligations.append(snippet)

    def unique(values):
        out = []
        seen = set()
        for v in values:
            key = v.lower()
            if key in seen:
                continue
            seen.add(key)
            out.append(v)
        return out

    payload = {
        "ok": True,
        "dates": unique(dates)[:30],
        "organizations": unique(orgs)[:30],
        "monetary_values": unique(money)[:30],
        "obligations": unique(obligations)[:40]
    }

    print(json.dumps(payload))
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)}))
