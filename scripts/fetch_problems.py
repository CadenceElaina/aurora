"""
NeetCode 150 Problem Data Pipeline

Sources:
  1. neetcode-gh/leetcode/.problemSiteData.json — problem list, categories, difficulty, URLs
  2. neetcode-gh/leetcode/hints/*.md — optimal time/space complexity per problem

Process:
  1. Download .problemSiteData.json from GitHub
  2. Filter to neetcode150 == true
  3. List all hint files from GitHub API
  4. Match hint files to problems (fuzzy match on slug)
  5. Extract optimal time/space complexity from each hint
  6. Output clean problems.json

Usage:
  python scripts/fetch_problems.py

Output:
  problems.json in project root
"""

import json
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path

GITHUB_RAW = "https://raw.githubusercontent.com/neetcode-gh/leetcode/main"
GITHUB_API = "https://api.github.com/repos/neetcode-gh/leetcode/contents/hints"

CATEGORY_ORDER = [
    "Arrays & Hashing",
    "Two Pointers",
    "Sliding Window",
    "Stack",
    "Binary Search",
    "Linked List",
    "Trees",
    "Tries",
    "Heap / Priority Queue",
    "Backtracking",
    "Graphs",
    "Advanced Graphs",
    "1-D Dynamic Programming",
    "2-D Dynamic Programming",
    "Greedy",
    "Intervals",
    "Math & Geometry",
    "Bit Manipulation",
]


def fetch_json(url: str) -> list | dict:
    """Fetch and parse JSON from a URL."""
    req = urllib.request.Request(url, headers={"User-Agent": "neetcode-scraper"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def fetch_text(url: str) -> str | None:
    """Fetch text content from a URL. Returns None on 404."""
    req = urllib.request.Request(url, headers={"User-Agent": "neetcode-scraper"})
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode()
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def extract_complexity(hint_html: str) -> tuple[str | None, str | None]:
    """
    Extract optimal time and space complexity from a hint file.

    Format: "O(n) time and O(n) space" or similar.
    Returns (time_complexity, space_complexity).
    """
    # Find the "Recommended Time & Space Complexity" section
    match = re.search(
        r"Recommended Time & Space Complexity</summary>\s*<p>\s*(.*?)\s*</p>",
        hint_html,
        re.DOTALL,
    )
    if not match:
        return None, None

    text = match.group(1)
    # Clean HTML tags
    text = re.sub(r"<[^>]+>", "", text)

    # Extract time complexity: look for O(...) before "time" (supports nested parens)
    time_match = re.search(
        r"(O\([^)]*(?:\([^)]*\)[^)]*)*\))\s*(?:time|and)", text, re.IGNORECASE
    )
    time_complexity = time_match.group(1) if time_match else None

    # Extract space complexity: look for O(...) before or after "space"
    space_match = re.search(
        r"(O\([^)]*(?:\([^)]*\)[^)]*)*\))\s*space", text, re.IGNORECASE
    )
    space_complexity = space_match.group(1) if space_match else None

    return time_complexity, space_complexity


# NeetCode uses its own problem names for hint files that differ from
# the LeetCode-style link slugs in .problemSiteData.json.
# 76 of 150 match directly; these 74 need explicit remapping.
# Map: link_slug (LeetCode-style) -> hint_slug (NeetCode-style)
LINK_TO_HINT_SLUG = {
    "3sum": "three-integer-sum",
    "alien-dictionary": "foreign-dictionary",
    "best-time-to-buy-and-sell-stock": "buy-and-sell-crypto",
    "best-time-to-buy-and-sell-stock-with-cooldown": "buy-and-sell-crypto-with-cooldown",
    "binary-tree-level-order-traversal": "level-order-traversal-of-binary-tree",
    "cheapest-flights-within-k-stops": "cheapest-flight-path",
    "combination-sum": "combination-target-sum",
    "combination-sum-ii": "combination-target-sum-ii",
    "construct-binary-tree-from-preorder-and-inorder-traversal": "binary-tree-from-preorder-and-inorder-traversal",
    "container-with-most-water": "max-water-container",
    "contains-duplicate": "duplicate-integer",
    "copy-list-with-random-pointer": "copy-linked-list-with-random-pointer",
    "design-add-and-search-words-data-structure": "design-word-search-data-structure",
    "design-twitter": "design-twitter-feed",
    "detect-squares": "count-squares",
    "diameter-of-binary-tree": "binary-tree-diameter",
    "distinct-subsequences": "count-subsequences",
    "encode-and-decode-strings": "string-encode-and-decode",
    "find-median-from-data-stream": "find-median-in-a-data-stream",
    "find-the-duplicate-number": "find-duplicate-integer",
    "graph-valid-tree": "valid-tree",
    "group-anagrams": "anagram-groups",
    "happy-number": "non-cyclical-number",
    "implement-trie-prefix-tree": "implement-prefix-tree",
    "insert-interval": "insert-new-interval",
    "invert-binary-tree": "invert-a-binary-tree",
    "koko-eating-bananas": "eating-bananas",
    "kth-largest-element-in-a-stream": "kth-largest-integer-in-a-stream",
    "kth-smallest-element-in-a-bst": "kth-smallest-integer-in-bst",
    "letter-combinations-of-a-phone-number": "combinations-of-a-phone-number",
    "linked-list-cycle": "linked-list-cycle-detection",
    "longest-increasing-path-in-a-matrix": "longest-increasing-path-in-matrix",
    "longest-repeating-character-replacement": "longest-repeating-substring-with-replacement",
    "longest-substring-without-repeating-characters": "longest-substring-without-duplicates",
    "lowest-common-ancestor-of-a-binary-search-tree": "lowest-common-ancestor-in-binary-search-tree",
    "maximum-depth-of-binary-tree": "depth-of-binary-tree",
    "meeting-rooms": "meeting-schedule",
    "meeting-rooms-ii": "meeting-schedule-ii",
    "merge-k-sorted-lists": "merge-k-sorted-linked-lists",
    "merge-triplets-to-form-target-triplet": "merge-triplets-to-form-target",
    "merge-two-sorted-lists": "merge-two-sorted-linked-lists",
    "min-cost-to-connect-all-points": "min-cost-to-connect-points",
    "min-stack": "minimum-stack",
    "minimum-interval-to-include-each-query": "minimum-interval-including-query",
    "minimum-window-substring": "minimum-window-with-characters",
    "number-of-1-bits": "number-of-one-bits",
    "number-of-connected-components-in-an-undirected-graph": "count-connected-components",
    "number-of-islands": "count-number-of-islands",
    "permutation-in-string": "permutation-string",
    "powx-n": "pow-x-n",
    "product-of-array-except-self": "products-of-array-discluding-self",
    "reconstruct-itinerary": "reconstruct-flight-path",
    "remove-nth-node-from-end-of-list": "remove-node-from-end-of-linked-list",
    "reorder-list": "reorder-linked-list",
    "reverse-linked-list": "reverse-a-linked-list",
    "rotate-image": "rotate-matrix",
    "rotting-oranges": "rotting-fruit",
    "same-tree": "same-binary-tree",
    "search-a-2d-matrix": "search-2d-matrix",
    "search-in-rotated-sorted-array": "find-target-in-rotated-sorted-array",
    "set-matrix-zeroes": "set-zeroes-in-matrix",
    "subtree-of-another-tree": "subtree-of-a-binary-tree",
    "task-scheduler": "task-scheduling",
    "top-k-frequent-elements": "top-k-elements-in-list",
    "two-sum": "two-integer-sum",
    "two-sum-ii-input-array-is-sorted": "two-integer-sum-ii",
    "unique-paths": "count-paths",
    "valid-anagram": "is-anagram",
    "valid-palindrome": "is-palindrome",
    "valid-parentheses": "validate-parentheses",
    "validate-binary-search-tree": "valid-binary-search-tree",
    "walls-and-gates": "islands-and-treasure",
    "word-search": "search-for-word",
    "word-search-ii": "search-for-word-ii",
}


def get_hint_slug(link_slug: str) -> str:
    """Convert a LeetCode-style link slug to the NeetCode hint filename slug."""
    return LINK_TO_HINT_SLUG.get(link_slug, link_slug)


def main():
    project_root = Path(__file__).parent.parent

    # Step 1: Download problem site data
    print("Fetching .problemSiteData.json...")
    site_data = fetch_json(f"{GITHUB_RAW}/.problemSiteData.json")
    print(f"  Total problems in site data: {len(site_data)}")

    # Step 2: Filter to NeetCode 150
    nc150_raw = [p for p in site_data if p.get("neetcode150")]
    print(f"  NeetCode 150 problems: {len(nc150_raw)}")

    if len(nc150_raw) != 150:
        print(f"  WARNING: Expected 150 problems, got {len(nc150_raw)}")

    # Step 3: Build problem objects
    problems = []
    for p in nc150_raw:
        lc_num = None
        if p.get("code"):
            match = re.match(r"^(\d+)-", p["code"])
            if match:
                lc_num = int(match.group(1))

        link_slug = p.get("link", "").rstrip("/")

        problems.append(
            {
                "leetcodeNumber": lc_num,
                "title": p["problem"],
                "difficulty": p["difficulty"],
                "category": p["pattern"],
                "leetcodeUrl": (
                    f"https://leetcode.com/problems/{link_slug}/" if link_slug else None
                ),
                "neetcodeUrl": (
                    f"https://neetcode.io/problems/{link_slug}" if link_slug else None
                ),
                "videoId": p.get("video"),
                "listSource": "NEETCODE_150",
                "blind75": p.get("blind75", False),
                "optimalTimeComplexity": None,
                "optimalSpaceComplexity": None,
                "patternTags": [],
                "_link_slug": link_slug,  # temporary, for matching
            }
        )

    # Step 4 & 5: Download all hints at once via repo zip archive (1 request instead of 150)
    print("\nDownloading hints via repo archive (single download)...")
    import zipfile
    import io

    archive_url = "https://github.com/neetcode-gh/leetcode/archive/refs/heads/main.zip"
    req = urllib.request.Request(
        archive_url, headers={"User-Agent": "neetcode-scraper"}
    )
    with urllib.request.urlopen(req) as resp:
        archive_bytes = resp.read()
    print(f"  Downloaded {len(archive_bytes) // 1024}KB")

    # Extract only hints/*.md files from the zip
    hint_contents = {}  # slug -> html content
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as zf:
        for name in zf.namelist():
            if "/hints/" in name and name.endswith(".md"):
                slug = name.split("/hints/")[-1].replace(".md", "")
                hint_contents[slug] = zf.read(name).decode("utf-8")

    print(f"  Extracted {len(hint_contents)} hint files")

    # Match hints to problems using explicit slug mapping
    print("\nMatching hints to problems and extracting complexity...")
    matched = 0
    missing_hints = []

    for p in problems:
        link_slug = p["_link_slug"]
        hint_slug = get_hint_slug(link_slug)

        if hint_slug in hint_contents:
            tc, sc = extract_complexity(hint_contents[hint_slug])
            if tc or sc:
                p["optimalTimeComplexity"] = tc
                p["optimalSpaceComplexity"] = sc
                matched += 1
            else:
                missing_hints.append(
                    f"LC{p['leetcodeNumber']}: {p['title']} — hint found but no complexity extracted (hint: {hint_slug})"
                )
        else:
            missing_hints.append(
                f"LC{p['leetcodeNumber']}: {p['title']} — no hint file (tried: {hint_slug})"
            )

    print(f"  Complexity data matched: {matched}/{len(problems)}")
    if missing_hints:
        print(f"  Missing complexity for {len(missing_hints)} problems:")
        for msg in missing_hints:
            print(f"    - {msg}")

    # Step 6: Sort by category order, then LC number
    cat_idx = {cat: i for i, cat in enumerate(CATEGORY_ORDER)}
    problems.sort(
        key=lambda p: (cat_idx.get(p["category"], 99), p["leetcodeNumber"] or 0)
    )

    # Assign IDs and remove temp fields
    for i, p in enumerate(problems):
        p["id"] = i + 1
        del p["_link_slug"]

    # Step 7: Verification
    print("\n--- VERIFICATION ---")
    print(f"Total problems: {len(problems)}")
    blind75_count = sum(1 for p in problems if p["blind75"])
    print(f"Blind 75 subset: {blind75_count}")

    from collections import Counter

    diff_counts = Counter(p["difficulty"] for p in problems)
    print(
        f"Difficulty: Easy={diff_counts.get('Easy',0)}, Medium={diff_counts.get('Medium',0)}, Hard={diff_counts.get('Hard',0)}"
    )

    cat_counts = Counter(p["category"] for p in problems)
    print(f"Categories ({len(cat_counts)}):")
    for cat in CATEGORY_ORDER:
        count = cat_counts.get(cat, 0)
        with_tc = sum(
            1 for p in problems if p["category"] == cat and p["optimalTimeComplexity"]
        )
        print(f"  {cat}: {count} problems, {with_tc} with complexity data")

    # Expected values (from neetcode.io as of 2026-03-17)
    EXPECTED = {
        "total": 150,
        "blind75": 75,
        "easy": 28,
        "medium": 101,
        "hard": 21,
        "categories": 18,
    }

    errors = []
    if len(problems) != EXPECTED["total"]:
        errors.append(f"Expected {EXPECTED['total']} problems, got {len(problems)}")
    if blind75_count != EXPECTED["blind75"]:
        errors.append(f"Expected {EXPECTED['blind75']} Blind 75, got {blind75_count}")
    if diff_counts.get("Easy", 0) != EXPECTED["easy"]:
        errors.append(
            f"Expected {EXPECTED['easy']} Easy, got {diff_counts.get('Easy', 0)}"
        )
    if diff_counts.get("Medium", 0) != EXPECTED["medium"]:
        errors.append(
            f"Expected {EXPECTED['medium']} Medium, got {diff_counts.get('Medium', 0)}"
        )
    if diff_counts.get("Hard", 0) != EXPECTED["hard"]:
        errors.append(
            f"Expected {EXPECTED['hard']} Hard, got {diff_counts.get('Hard', 0)}"
        )
    if len(cat_counts) != EXPECTED["categories"]:
        errors.append(
            f"Expected {EXPECTED['categories']} categories, got {len(cat_counts)}"
        )

    if errors:
        print(f"\n  VERIFICATION FAILED:")
        for e in errors:
            print(f"    - {e}")
        sys.exit(1)
    else:
        print(f"\n  ALL CHECKS PASSED")

    # Step 8: Write output
    output = {
        "version": "1.0",
        "source": "neetcode-gh/leetcode (MIT license)",
        "sourceUrl": "https://github.com/neetcode-gh/leetcode",
        "generatedAt": __import__("datetime").date.today().isoformat(),
        "totalProblems": len(problems),
        "categories": CATEGORY_ORDER,
        "problems": problems,
    }

    output_path = project_root / "problems.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nWrote {output_path} ({len(problems)} problems)")


if __name__ == "__main__":
    main()
