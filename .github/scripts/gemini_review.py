import os, json, time, requests

diff = open("pr_diff.txt").read()

prompt = """You are a senior frontend developer reviewing a pull request for an Angular portfolio website.

Analyze this diff and respond with ONLY a valid JSON object — no markdown fences, no explanation. Use this exact shape:
{
  "summary": "2-3 sentence overview of what the changes do",
  "inline_comments": [
    {
      "file": "src/app/example/example.component.ts",
      "line": 42,
      "comment": "Your concise comment here"
    }
  ]
}

Rules:
- inline_comments must only reference lines that are ADDED in the diff (lines starting with +)
- Use the real file line number, not the diff offset
- Limit to the 5 most important issues — skip trivial nits
- Flag: bugs, security issues (XSS, unsafe bindings), accessibility problems, Angular anti-patterns
  (missing unsubscribe, no OnPush, improper lifecycle hooks), hardcoded magic strings/numbers
  that belong in an enum or const — for those, suggest the exact export to add to
  src/app/shared/enums/<name>.enum.ts or src/app/shared/enums/<name>.const.ts
- If there are no issues worth flagging, return an empty inline_comments array

Diff:
""" + diff[:28000]

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={os.environ['GEMINI_API_KEY']}"
body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.2}}

for attempt in range(4):
    resp = requests.post(url, json=body)
    if resp.status_code == 429:
        wait = 15 * (attempt + 1)
        print(f"Rate limited, retrying in {wait}s...")
        time.sleep(wait)
        continue
    break

resp.raise_for_status()

raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
if raw.startswith("```"):
    raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

review = json.loads(raw)

headers = {
    "Authorization": f"Bearer {os.environ['GH_TOKEN']}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}
repo = os.environ["REPO"]
pr   = os.environ["PR_NUMBER"]
sha  = os.environ["COMMIT_SHA"]

inline = [
    {"path": c["file"], "line": c["line"], "body": c["comment"]}
    for c in review.get("inline_comments", [])
]

payload = {
    "commit_id": sha,
    "body": f"## AI Code Review\n\n{review['summary']}",
    "event": "COMMENT",
    "comments": inline,
}

r = requests.post(
    f"https://api.github.com/repos/{repo}/pulls/{pr}/reviews",
    headers=headers,
    json=payload,
)

# If inline comments have bad line numbers, fall back to summary-only
if r.status_code == 422 and inline:
    print("Inline comments failed (line mismatch), falling back to summary-only")
    payload["comments"] = []
    notes = "\n".join(
        f"- **{c['file']}:{c['line']}** — {c['comment']}"
        for c in review["inline_comments"]
    )
    payload["body"] += f"\n\n### Suggestions\n{notes}"
    r = requests.post(
        f"https://api.github.com/repos/{repo}/pulls/{pr}/reviews",
        headers=headers,
        json=payload,
    )

print(r.status_code)
r.raise_for_status()
