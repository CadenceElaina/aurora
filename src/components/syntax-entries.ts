export interface SyntaxEntry {
  id: string;
  name: string;
  category: string;
  summary: string;
  syntax: string;
  example: string;
  variants?: string[];
  /** Other entries this card explicitly cross-links to */
  related?: { id: string; label: string }[];
}

export const SYNTAX_ENTRIES: SyntaxEntry[] = [
  // ── Collections ─────────────────────────────────────────────────
  {
    id: "defaultdict",
    name: "defaultdict",
    category: "Collections",
    summary: "Dict that auto-initialises missing keys with a factory function — no KeyError on first access.",
    syntax: "from collections import defaultdict\nd = defaultdict(list)  # or int, set, etc.",
    example:
      "from collections import defaultdict\n\ngroups = defaultdict(list)\nfor word in ['eat', 'tea', 'ate']:\n    key = ''.join(sorted(word))\n    groups[key].append(word)\n\nprint(list(groups.values()))\n# [['eat', 'tea', 'ate']]",
    variants: [
      "defaultdict(int)   # → 0",
      "defaultdict(set)   # → set()",
      "defaultdict(list)  # → []",
      "defaultdict(lambda: float('inf'))",
    ],
    related: [
      { id: "lambda", label: "lambda (factory functions)" },
      { id: "sorted-builtin", label: "sorted() (key usage)" },
    ],
  },
  {
    id: "counter",
    name: "Counter",
    category: "Collections",
    summary: "Dict subclass for counting hashable objects — frequency maps in one line.",
    syntax: "from collections import Counter\ncnt = Counter(iterable)",
    example:
      'from collections import Counter\n\ncnt = Counter("aabbbcc")\nprint(cnt)                  # Counter({\'b\': 3, \'a\': 2, \'c\': 2})\nprint(cnt.most_common(2))   # [(\'b\', 3), (\'a\', 2)]\nprint(cnt[\'z\'])              # 0 (no KeyError)',
    variants: [
      "Counter(string)     # char frequencies",
      "Counter(list)       # element counts",
      "c1 + c2 / c1 - c2   # merge / subtract",
      "cnt.most_common(k)  # top-k elements",
    ],
  },
  {
    id: "deque",
    name: "deque",
    category: "Collections",
    summary: "Double-ended queue — O(1) append/pop from both ends. Essential for BFS.",
    syntax: "from collections import deque\nq = deque([initial])",
    example:
      "from collections import deque\n\nq = deque([1, 2, 3])\nq.append(4)        # right: [1, 2, 3, 4]\nq.appendleft(0)    # left:  [0, 1, 2, 3, 4]\nq.popleft()        # → 0,   [1, 2, 3, 4]\nq.pop()            # → 4,   [1, 2, 3]",
    variants: [
      "deque(maxlen=N)     # auto-evict oldest",
      "q.appendleft(x)     # O(1) left insert",
      "q.popleft()          # O(1) left remove",
      "q.rotate(k)          # rotate right by k",
    ],
  },
  {
    id: "ordereddict",
    name: "OrderedDict",
    category: "Collections",
    summary: "Dict that remembers insertion order — useful for LRU cache implementation.",
    syntax: "from collections import OrderedDict\nod = OrderedDict()",
    example:
      "from collections import OrderedDict\n\nod = OrderedDict()\nod['a'] = 1\nod['b'] = 2\nod['c'] = 3\nod.move_to_end('a')     # move 'a' to end\nod.popitem(last=False)  # pop first: ('b', 2)",
    variants: [
      "od.move_to_end(key)           # move to end",
      "od.move_to_end(key, last=False)  # move to front",
      "od.popitem(last=True)         # pop last",
      "od.popitem(last=False)        # pop first (FIFO)",
    ],
  },
  {
    id: "set-operations",
    name: "set",
    category: "Collections",
    summary: "Unordered collection of unique elements — O(1) lookup, add, remove.",
    syntax: "s = set()\ns = {1, 2, 3}",
    example:
      "a = {1, 2, 3, 4}\nb = {3, 4, 5, 6}\n\nprint(a & b)   # intersection: {3, 4}\nprint(a | b)   # union: {1, 2, 3, 4, 5, 6}\nprint(a - b)   # difference: {1, 2}\nprint(a ^ b)   # symmetric diff: {1, 2, 5, 6}",
    variants: [
      "s.add(x)      # add element",
      "s.discard(x)  # remove if present, no error",
      "s.remove(x)   # remove or KeyError",
      "a & b, a | b, a - b, a ^ b",
    ],
  },
  {
    id: "frozenset",
    name: "frozenset",
    category: "Collections",
    summary: "Immutable set — can be used as a dict key or inside another set.",
    syntax: "fs = frozenset([1, 2, 3])",
    example:
      "# Use frozenset as dict key (regular sets can't)\nseen = set()\nstate = frozenset([1, 2, 3])\nseen.add(state)  # works!\n\n# Can't do this with regular set:\n# seen.add({1, 2, 3})  # TypeError: unhashable",
    variants: [
      "frozenset(iterable)  # from any iterable",
      "fs & fs2, fs | fs2   # set operations return frozenset",
    ],
  },
  // ── Sorting ─────────────────────────────────────────────────────
  {
    id: "sorted-builtin",
    name: "sorted()",
    category: "Sorting",
    summary: "Returns a new sorted list from any iterable — does not modify the original.",
    syntax: "sorted(iterable, key=None, reverse=False)",
    example:
      "nums = [3, 1, 4, 1, 5]\nprint(sorted(nums))              # [1, 1, 3, 4, 5]\nprint(sorted(nums, reverse=True))  # [5, 4, 3, 1, 1]\nprint(nums)                       # [3, 1, 4, 1, 5] — unchanged",
    variants: [
      "sorted(s)              # sort a string → list of chars",
      "sorted(d)              # sort dict → list of keys",
      "sorted(d.items())      # sort dict by key → [(k,v),…]",
    ],
    related: [
      { id: "key-lambda", label: "key=lambda" },
      { id: "sorted-zip", label: "sorted(zip(…))" },
    ],
  },
  {
    id: "sort-inplace",
    name: "list.sort()",
    category: "Sorting",
    summary: "Sorts a list in-place — returns None. Faster than sorted() when original not needed.",
    syntax: "lst.sort(key=None, reverse=False)",
    example:
      'intervals = [[3, 5], [1, 3], [2, 4]]\nintervals.sort(key=lambda x: x[0])\nprint(intervals)  # [[1, 3], [2, 4], [3, 5]]\n\nwords = ["banana", "apple", "cherry"]\nwords.sort(key=len)\nprint(words)  # [\'apple\', \'banana\', \'cherry\']',
    variants: [
      "lst.sort()                    # natural order",
      "lst.sort(reverse=True)        # descending",
      "lst.sort(key=lambda x: x[1]) # sort by 2nd element",
      "lst.sort(key=str.lower)       # case-insensitive",
    ],
    related: [
      { id: "key-lambda", label: "key=lambda" },
      { id: "sorted-builtin", label: "sorted() (non-destructive)" },
    ],
  },
  {
    id: "key-lambda",
    name: "key=lambda",
    category: "Sorting",
    summary: "Custom sort key via lambda — the go-to for sorting by a computed value.",
    syntax: "sorted(iterable, key=lambda x: expression)",
    example:
      "points = [(1, 3), (4, 1), (2, 2)]\n# Sort by y-coordinate\nby_y = sorted(points, key=lambda p: p[1])\nprint(by_y)  # [(4, 1), (2, 2), (1, 3)]\n\n# Sort by multiple criteria: x ascending, y descending\nby_both = sorted(points, key=lambda p: (p[0], -p[1]))\nprint(by_both)  # [(1, 3), (2, 2), (4, 1)]",
    variants: [
      "key=lambda x: x[0]          # by first element",
      "key=lambda x: (x[0], -x[1]) # multi-key with tiebreak",
      "key=lambda x: abs(x)        # by absolute value",
      "key=len                      # by length (no lambda needed)",
    ],
    related: [
      { id: "lambda", label: "lambda expressions" },
      { id: "sorted-builtin", label: "sorted()" },
      { id: "max-min-key", label: "max() / min() with key" },
    ],
  },
  {
    id: "sorted-zip",
    name: "sorted(zip(…))",
    category: "Sorting",
    summary: "Sort multiple parallel arrays together by zipping then sorting.",
    syntax: "pairs = sorted(zip(keys, values))\nkeys, values = zip(*pairs)",
    example:
      "names = ['Alice', 'Bob', 'Charlie']\nscores = [88, 95, 72]\n\n# Sort both lists by score (descending)\npairs = sorted(zip(scores, names), reverse=True)\nfor score, name in pairs:\n    print(f'{name}: {score}')\n# Bob: 95, Alice: 88, Charlie: 72",
    variants: [
      "sorted(zip(a, b))            # sort by first array",
      "sorted(zip(a, b), key=lambda x: x[1])  # sort by second",
      "keys, vals = zip(*sorted_pairs)  # unzip back",
    ],
  },
  // ── Heap / heapq ────────────────────────────────────────────────
  {
    id: "heapq-push-pop",
    name: "heappush / heappop",
    category: "Heap",
    summary: "Push/pop from a min-heap. O(log n) per operation.",
    syntax: "import heapq\nheapq.heappush(heap, item)\nsmallest = heapq.heappop(heap)",
    example:
      "import heapq\n\nh = []\nheapq.heappush(h, 3)\nheapq.heappush(h, 1)\nheapq.heappush(h, 4)\n\nprint(heapq.heappop(h))  # 1 (smallest)\nprint(heapq.heappop(h))  # 3\nprint(h)                 # [4]",
    variants: [
      "heapq.heappush(h, (priority, item))  # tuple comparison",
      "heapq.heappushpop(h, item)  # push then pop in one step",
      "heapq.heapreplace(h, item)  # pop then push in one step",
    ],
  },
  {
    id: "heapify",
    name: "heapq.heapify",
    category: "Heap",
    summary: "Convert a list to a min-heap in-place — O(n) instead of O(n log n).",
    syntax: "import heapq\nheapq.heapify(lst)  # modifies lst in-place",
    example:
      "import heapq\n\nnums = [5, 3, 8, 1, 2]\nheapq.heapify(nums)\nprint(nums)              # [1, 2, 8, 5, 3] — heap property\nprint(heapq.heappop(nums))  # 1",
    variants: [
      "heapq.heapify(lst)     # O(n) heapification",
      "heapq.nsmallest(k, iterable)",
      "heapq.nlargest(k, iterable)",
    ],
  },
  {
    id: "max-heap-negation",
    name: "Max-heap (negation)",
    category: "Heap",
    summary: "Python only has min-heaps. Negate values to simulate a max-heap.",
    syntax: "heapq.heappush(h, -val)      # push negated\nmax_val = -heapq.heappop(h)  # pop and negate back",
    example:
      "import heapq\n\nh = []\nfor x in [3, 1, 4, 1, 5]:\n    heapq.heappush(h, -x)\n\nprint(-heapq.heappop(h))  # 5 (largest)\nprint(-heapq.heappop(h))  # 4",
    variants: [
      "heapq.heappush(h, (-priority, item))  # max-heap with data",
      "heapq.heappush(h, (-freq, word))       # top-k frequent",
    ],
  },
  {
    id: "nlargest-nsmallest",
    name: "nlargest / nsmallest",
    category: "Heap",
    summary: "Get the k largest/smallest elements. More efficient than full sort for small k.",
    syntax: "import heapq\nheapq.nlargest(k, iterable, key=None)\nheapq.nsmallest(k, iterable, key=None)",
    example:
      "import heapq\n\nnums = [10, 4, 6, 8, 2, 9]\nprint(heapq.nlargest(3, nums))   # [10, 9, 8]\nprint(heapq.nsmallest(3, nums))  # [2, 4, 6]\n\n# With key function\nportfolio = {'AAPL': 150, 'GOOG': 280, 'MSFT': 330}\nprint(heapq.nlargest(2, portfolio, key=portfolio.get))\n# ['MSFT', 'GOOG']",
    variants: [
      "nlargest(k, lst)            # top k elements",
      "nsmallest(k, lst, key=abs)  # k closest to zero",
    ],
  },
  // ── String ──────────────────────────────────────────────────────
  {
    id: "str-split",
    name: "str.split()",
    category: "String",
    summary: "Split a string into a list by a separator. Default splits on any whitespace.",
    syntax: 's.split()         # split on whitespace\ns.split(sep)      # split on sep\ns.split(sep, n)   # split at most n times',
    example:
      's = "hello world  foo"\nprint(s.split())         # [\'hello\', \'world\', \'foo\']\nprint(s.split(\' \'))      # [\'hello\', \'world\', \'\', \'foo\']\n\ncsv = "a,b,c,d"\nprint(csv.split(",", 2))  # [\'a\', \'b\', \'c,d\']',
    variants: [
      "s.split()          # splits on any whitespace, strips empty",
      "s.split(' ')       # splits on space only, keeps empty strings",
      "s.rsplit(',', 1)   # split from right, once",
      "s.splitlines()     # split on \\n",
    ],
  },
  {
    id: "str-join",
    name: "str.join()",
    category: "String",
    summary: "Join an iterable of strings with a separator. The separator calls .join(), not the list.",
    syntax: 'sep.join(iterable)\n",".join(["a", "b", "c"])  # → "a,b,c"',
    example:
      'words = ["hello", "world"]\nprint(" ".join(words))    # "hello world"\nprint("->".join(words))   # "hello->world"\n\nchars = [\'a\', \'b\', \'c\']\nprint("".join(chars))     # "abc"',
    variants: [
      '"".join(lst)        # concatenate with no separator',
      '" ".join(lst)       # space-separated',
      '"\\n".join(lst)      # newline-separated',
      '",".join(map(str, nums))  # join non-strings',
    ],
  },
  {
    id: "str-reverse",
    name: "s[::-1]",
    category: "String",
    summary: "Reverse a string (or list) using slice with step -1.",
    syntax: 'reversed_str = s[::-1]',
    example:
      's = "hello"\nprint(s[::-1])        # "olleh"\n\n# Palindrome check\ndef is_palindrome(s):\n    return s == s[::-1]\n\nprint(is_palindrome("racecar"))  # True\nprint(is_palindrome("hello"))    # False',
    variants: [
      "s[::-1]               # reverse string",
      "lst[::-1]             # reverse list (new copy)",
      "s[::2]                # every other character",
      "s[start:stop:step]    # general slice syntax",
    ],
  },
  {
    id: "ord-chr",
    name: "ord() / chr()",
    category: "String",
    summary: "Convert between characters and Unicode code points. Essential for alphabet-index math.",
    syntax: "ord('a')   # → 97\nchr(97)    # → 'a'\nord(c) - ord('a')  # → 0–25 index",
    example:
      "# Character to alphabet index\nc = 'f'\nidx = ord(c) - ord('a')   # 5\nprint(idx)\n\n# Build frequency array\nword = 'hello'\nfreq = [0] * 26\nfor c in word:\n    freq[ord(c) - ord('a')] += 1\n# freq[4]=1(e), freq[7]=1(h), freq[11]=2(l), freq[14]=1(o)",
    variants: [
      "ord(c) - ord('a')   # lowercase letter → 0-25",
      "ord(c) - ord('A')   # uppercase letter → 0-25",
      "chr(ord('a') + i)   # index → lowercase letter",
      "chr(i + 48)          # digit int → char ('0' is 48)",
    ],
  },
  {
    id: "str-checks",
    name: "str.isdigit() / isalpha()",
    category: "String",
    summary: "Check if a string contains only digits, letters, or alphanumeric characters.",
    syntax: 's.isdigit()      # all digits?\ns.isalpha()      # all letters?\ns.isalnum()      # all letters or digits?',
    example:
      'print("123".isdigit())    # True\nprint("abc".isalpha())    # True\nprint("a1".isalnum())     # True\nprint("a 1".isalnum())    # False (space)\n\n# Common use: filter non-alphanumeric\ns = "A man, a plan, a canal: Panama"\nclean = "".join(c.lower() for c in s if c.isalnum())\nprint(clean)  # "amanaplanacanalpanama"',
    variants: [
      "s.isdigit()   # '123' → True",
      "s.isalpha()   # 'abc' → True",
      "s.isalnum()   # 'a1' → True",
      "s.isupper() / s.islower()",
    ],
  },
  {
    id: "str-strip",
    name: "str.strip()",
    category: "String",
    summary: "Remove leading/trailing whitespace (or specified characters).",
    syntax: 's.strip()        # both sides\ns.lstrip()       # left only\ns.rstrip()       # right only',
    example:
      's = "  hello world  "\nprint(s.strip())    # "hello world"\nprint(s.lstrip())   # "hello world  "\nprint(s.rstrip())   # "  hello world"\n\n# Strip specific characters\nprint("##hello##".strip("#"))  # "hello"',
    variants: [
      's.strip()           # remove whitespace',
      's.strip("chars")    # remove specific chars',
      "s.lstrip() / s.rstrip()  # one side only",
    ],
  },
  // ── List ────────────────────────────────────────────────────────
  {
    id: "list-comprehension",
    name: "List comprehension",
    category: "List",
    summary: "Build a new list by transforming/filtering an iterable in a single expression.",
    syntax: "[expr for x in iterable]\n[expr for x in iterable if condition]",
    example:
      "# Square even numbers\nnums = [1, 2, 3, 4, 5]\nsquares = [x**2 for x in nums if x % 2 == 0]\nprint(squares)  # [4, 16]\n\n# Flatten 2D → 1D\nmatrix = [[1, 2], [3, 4], [5, 6]]\nflat = [x for row in matrix for x in row]\nprint(flat)  # [1, 2, 3, 4, 5, 6]",
    variants: [
      "[x for x in lst]                  # copy",
      "[x for x in lst if cond]          # filter",
      "[f(x) for x in lst]               # transform",
      "[x for row in matrix for x in row]  # flatten",
    ],
  },
  {
    id: "enumerate",
    name: "enumerate()",
    category: "List",
    summary: "Loop over an iterable with both index and value. Avoids manual counter variables.",
    syntax: "for i, val in enumerate(iterable):\n    ...\nfor i, val in enumerate(iterable, start=1):",
    example:
      'names = ["Alice", "Bob", "Charlie"]\nfor i, name in enumerate(names):\n    print(f"{i}: {name}")\n# 0: Alice\n# 1: Bob\n# 2: Charlie\n\n# Start from 1\nfor rank, name in enumerate(names, 1):\n    print(f"#{rank} {name}")',
    variants: [
      "enumerate(lst)         # 0-indexed",
      "enumerate(lst, 1)      # 1-indexed",
      "list(enumerate(lst))   # → [(0, 'a'), (1, 'b')]",
    ],
  },
  {
    id: "zip",
    name: "zip()",
    category: "List",
    summary: "Iterate over multiple iterables in parallel. Stops at the shortest.",
    syntax: "for a, b in zip(iter1, iter2):\n    ...",
    example:
      "names = ['Alice', 'Bob']\nscores = [95, 87]\n\nfor name, score in zip(names, scores):\n    print(f'{name}: {score}')\n# Alice: 95\n# Bob: 87\n\n# Unzip with *\npairs = [(1, 'a'), (2, 'b'), (3, 'c')]\nnums, chars = zip(*pairs)\nprint(nums)   # (1, 2, 3)\nprint(chars)  # ('a', 'b', 'c')",
    variants: [
      "zip(a, b)            # pair elements",
      "zip(*pairs)          # unzip (transpose)",
      "zip(a, b, c)         # three-way zip",
      "dict(zip(keys, values))  # → dict",
    ],
  },
  {
    id: "zip-longest",
    name: "zip_longest",
    category: "List",
    summary: "Like zip() but pads shorter iterables instead of truncating.",
    syntax: "from itertools import zip_longest\nzip_longest(a, b, fillvalue=0)",
    example:
      "from itertools import zip_longest\n\na = [1, 2, 3]\nb = [10, 20]\n\nfor x, y in zip_longest(a, b, fillvalue=0):\n    print(x + y)\n# 11, 22, 3",
    variants: [
      "zip_longest(a, b, fillvalue=0)   # pad with 0",
      "zip_longest(a, b, fillvalue='')  # pad with empty string",
    ],
  },
  {
    id: "bisect",
    name: "bisect_left / insort",
    category: "List",
    summary: "Binary search insertion point in a sorted list. O(log n) lookup.",
    syntax: "from bisect import bisect_left, insort\nidx = bisect_left(sorted_list, target)\ninsort(sorted_list, value)",
    example:
      "from bisect import bisect_left, insort\n\nlst = [1, 3, 5, 7, 9]\n\n# Find insertion point\nidx = bisect_left(lst, 5)\nprint(idx)      # 2 (index where 5 is)\n\n# Check if value exists\nfound = idx < len(lst) and lst[idx] == 5\nprint(found)    # True\n\n# Insert maintaining sort\ninsort(lst, 6)\nprint(lst)      # [1, 3, 5, 6, 7, 9]",
    variants: [
      "bisect_left(lst, x)    # leftmost insertion point",
      "bisect_right(lst, x)   # rightmost insertion point",
      "insort(lst, x)         # insert maintaining order",
    ],
  },
  {
    id: "reversed-builtin",
    name: "reversed()",
    category: "List",
    summary: "Returns a reverse iterator — lazy, doesn't create a new list.",
    syntax: "for x in reversed(iterable):\n    ...",
    example:
      "# Iterate backwards without copying\nnums = [1, 2, 3, 4, 5]\nfor x in reversed(nums):\n    print(x, end=' ')  # 5 4 3 2 1\n\n# Convert to list if needed\nrev = list(reversed(nums))\nprint(rev)  # [5, 4, 3, 2, 1]",
    variants: [
      "reversed(lst)         # reverse iterator",
      "lst[::-1]             # reverse copy (new list)",
      "lst.reverse()         # reverse in-place",
    ],
  },
  // ── Dict ────────────────────────────────────────────────────────
  {
    id: "dict-get",
    name: "dict.get()",
    category: "Dict",
    summary: "Get a value with a default fallback instead of risking a KeyError.",
    syntax: "d.get(key, default)\n# Returns default if key missing (None if no default)",
    example:
      "freq = {'a': 3, 'b': 1}\n\nprint(freq.get('a', 0))   # 3\nprint(freq.get('z', 0))   # 0 (no KeyError)\nprint(freq.get('z'))      # None\n\n# Common: count occurrences\nfor c in 'hello':\n    freq[c] = freq.get(c, 0) + 1",
    variants: [
      "d.get(k, 0)       # default 0 for counting",
      "d.get(k, [])      # default empty list",
      "d.get(k, float('inf'))  # default infinity",
    ],
  },
  {
    id: "dict-items",
    name: "dict.items() / keys() / values()",
    category: "Dict",
    summary: "Iterate over key-value pairs, keys only, or values only.",
    syntax: "for k, v in d.items():  # key-value pairs\nfor k in d.keys():      # just keys (same as `for k in d`)\nfor v in d.values():    # just values",
    example:
      "scores = {'Alice': 95, 'Bob': 87, 'Charlie': 92}\n\n# Find max by value\nbest = max(scores.items(), key=lambda kv: kv[1])\nprint(best)  # ('Alice', 95)\n\n# Sum all values\ntotal = sum(scores.values())\nprint(total)  # 274",
    variants: [
      "d.items()    # → dict_items([('a', 1), …])",
      "d.keys()     # → dict_keys(['a', 'b', …])",
      "d.values()   # → dict_values([1, 2, …])",
    ],
  },
  {
    id: "dict-comprehension",
    name: "Dict comprehension",
    category: "Dict",
    summary: "Build a dict from an iterable with {key: value for …} syntax.",
    syntax: "{k: v for k, v in iterable}\n{k: v for k, v in iterable if condition}",
    example:
      "# Invert a dict\noriginal = {'a': 1, 'b': 2, 'c': 3}\ninverted = {v: k for k, v in original.items()}\nprint(inverted)  # {1: 'a', 2: 'b', 3: 'c'}\n\n# Filter by value\nhigh = {k: v for k, v in original.items() if v > 1}\nprint(high)  # {'b': 2, 'c': 3}",
    variants: [
      "{k: v for k, v in pairs}       # from pairs",
      "{x: x**2 for x in range(5)}   # computed values",
      "{k: 0 for k in keys}           # init all to 0",
    ],
  },
  {
    id: "dict-setdefault",
    name: "dict.setdefault()",
    category: "Dict",
    summary: "Get value if key exists, otherwise insert default and return it. One-liner for grouping.",
    syntax: "d.setdefault(key, default)\n# Returns d[key] if exists, else sets d[key]=default and returns it",
    example:
      "groups = {}\nfor word in ['eat', 'tea', 'ate', 'bat']:\n    key = ''.join(sorted(word))\n    groups.setdefault(key, []).append(word)\n\nprint(groups)\n# {'aet': ['eat', 'tea', 'ate'], 'abt': ['bat']}",
    variants: [
      "d.setdefault(k, []).append(v)  # group by key",
      "d.setdefault(k, 0)             # init counter",
    ],
  },
  // ── Two Pointers ────────────────────────────────────────────────
  {
    id: "two-pointer-init",
    name: "Two-pointer init",
    category: "Two Pointers",
    summary: "Initialize left/right pointers at opposite ends of an array.",
    syntax: "left, right = 0, len(arr) - 1\nwhile left < right:\n    ...",
    example:
      "# Two Sum on sorted array\ndef two_sum(nums, target):\n    left, right = 0, len(nums) - 1\n    while left < right:\n        s = nums[left] + nums[right]\n        if s == target:\n            return [left, right]\n        elif s < target:\n            left += 1\n        else:\n            right -= 1\n    return []",
    variants: [
      "left, right = 0, len(a) - 1   # opposite ends",
      "slow, fast = 0, 0              # same direction",
      "while left < right             # converging",
      "while left <= right            # binary search",
    ],
  },
  {
    id: "swap-pattern",
    name: "Swap pattern",
    category: "Two Pointers",
    summary: "Swap two elements in one line using tuple unpacking — no temp variable needed.",
    syntax: "a[i], a[j] = a[j], a[i]",
    example:
      "# Reverse array in-place\ndef reverse(arr):\n    l, r = 0, len(arr) - 1\n    while l < r:\n        arr[l], arr[r] = arr[r], arr[l]\n        l += 1\n        r -= 1\n\nnums = [1, 2, 3, 4, 5]\nreverse(nums)\nprint(nums)  # [5, 4, 3, 2, 1]",
    variants: [
      "a[i], a[j] = a[j], a[i]   # swap elements",
      "a, b = b, a               # swap variables",
      "a, b, c = c, a, b         # rotate three",
    ],
  },
  // ── Sliding Window ──────────────────────────────────────────────
  {
    id: "fixed-window",
    name: "Fixed-size window",
    category: "Sliding Window",
    summary: "Slide a window of size k across an array. Enter from right, exit from left.",
    syntax: "# Window of size k\nfor i in range(len(arr)):\n    window_sum += arr[i]\n    if i >= k:\n        window_sum -= arr[i - k]\n    if i >= k - 1:\n        # process window",
    example:
      "def max_sum_subarray(nums, k):\n    window_sum = 0\n    max_sum = float('-inf')\n    for i in range(len(nums)):\n        window_sum += nums[i]\n        if i >= k:\n            window_sum -= nums[i - k]\n        if i >= k - 1:\n            max_sum = max(max_sum, window_sum)\n    return max_sum\n\nprint(max_sum_subarray([1, 3, -1, 5, 2], 3))  # 6",
    variants: [
      "window of sums  # running total",
      "window of counts  # frequency in window",
      "deque for min/max  # sliding window min/max",
    ],
  },
  {
    id: "variable-window",
    name: "Variable-size window",
    category: "Sliding Window",
    summary: "Expand right pointer to grow, shrink left pointer when constraint violated.",
    syntax: "left = 0\nfor right in range(len(arr)):\n    # expand: add arr[right]\n    while constraint_violated:\n        # shrink: remove arr[left]\n        left += 1\n    # update answer",
    example:
      "def longest_unique_substring(s):\n    seen = set()\n    left = 0\n    best = 0\n    for right in range(len(s)):\n        while s[right] in seen:\n            seen.remove(s[left])\n            left += 1\n        seen.add(s[right])\n        best = max(best, right - left + 1)\n    return best\n\nprint(longest_unique_substring('abcabcbb'))  # 3",
    variants: [
      "while invalid: shrink left   # max window",
      "while valid: shrink left      # min window",
    ],
  },
  // ── Binary Search ───────────────────────────────────────────────
  {
    id: "binary-search-template",
    name: "Binary search template",
    category: "Binary Search",
    summary: "The standard lo/hi/mid loop for searching in a sorted array.",
    syntax: "lo, hi = 0, len(arr) - 1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if arr[mid] == target:\n        return mid\n    elif arr[mid] < target:\n        lo = mid + 1\n    else:\n        hi = mid - 1",
    example:
      "def binary_search(nums, target):\n    lo, hi = 0, len(nums) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1\n\nprint(binary_search([1, 3, 5, 7, 9], 5))  # 2",
    variants: [
      "while lo <= hi      # find exact match",
      "while lo < hi       # find boundary",
      "mid = lo + (hi - lo) // 2  # overflow-safe (Java/C++)",
    ],
  },
  {
    id: "binary-search-boundary",
    name: "Binary search on answer",
    category: "Binary Search",
    summary: "Binary search the answer space when the problem is: find the min/max value where condition holds.",
    syntax: "lo, hi = min_answer, max_answer\nwhile lo < hi:\n    mid = (lo + hi) // 2\n    if feasible(mid):\n        hi = mid      # try smaller\n    else:\n        lo = mid + 1  # need bigger\nreturn lo",
    example:
      "# Find min capacity to ship within D days\ndef ship_within_days(weights, D):\n    def feasible(cap):\n        days, load = 1, 0\n        for w in weights:\n            if load + w > cap:\n                days += 1\n                load = 0\n            load += w\n        return days <= D\n\n    lo, hi = max(weights), sum(weights)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if feasible(mid):\n            hi = mid\n        else:\n            lo = mid + 1\n    return lo",
    variants: [
      "hi = mid       # find leftmost true",
      "lo = mid + 1   # find rightmost false + 1",
      "lo = mid       # when minimising (careful with infinite loops)",
    ],
  },
  // ── Stack Patterns ──────────────────────────────────────────────
  {
    id: "stack-basic",
    name: "Stack (list as stack)",
    category: "Stack",
    summary: "Python lists work as stacks — append() to push, pop() to remove last. O(1) both.",
    syntax: "stack = []\nstack.append(x)   # push\ntop = stack.pop() # pop\npeek = stack[-1]  # peek without removing",
    example:
      "# Valid parentheses\ndef is_valid(s):\n    stack = []\n    pairs = {')': '(', ']': '[', '}': '{'}\n    for c in s:\n        if c in '([{':\n            stack.append(c)\n        elif not stack or stack.pop() != pairs[c]:\n            return False\n    return len(stack) == 0\n\nprint(is_valid('([{}])'))  # True\nprint(is_valid('([)]'))    # False",
    variants: [
      "stack.append(x)  # push",
      "stack.pop()      # pop (IndexError if empty)",
      "stack[-1]        # peek",
      "len(stack) == 0  # is empty",
    ],
  },
  {
    id: "monotonic-stack",
    name: "Monotonic stack",
    category: "Stack",
    summary: "Stack that maintains sorted order — pop elements that violate monotonicity. Classic for 'next greater element'.",
    syntax: "stack = []  # indices or values\nfor i, val in enumerate(arr):\n    while stack and arr[stack[-1]] < val:\n        idx = stack.pop()\n        result[idx] = val  # val is next greater\n    stack.append(i)",
    example:
      "# Next greater element for each position\ndef next_greater(nums):\n    result = [-1] * len(nums)\n    stack = []  # decreasing stack of indices\n    for i, val in enumerate(nums):\n        while stack and nums[stack[-1]] < val:\n            idx = stack.pop()\n            result[idx] = val\n        stack.append(i)\n    return result\n\nprint(next_greater([2, 1, 4, 3]))  # [4, 4, -1, -1]",
    variants: [
      "decreasing stack: pop when val > top  # next greater",
      "increasing stack: pop when val < top  # next smaller",
      "store indices for position-based problems",
    ],
  },
  // ── Graph ───────────────────────────────────────────────────────
  {
    id: "adjacency-list",
    name: "Adjacency list",
    category: "Graph",
    summary: "Build a graph from an edge list using defaultdict(list).",
    syntax: "from collections import defaultdict\ngraph = defaultdict(list)\nfor u, v in edges:\n    graph[u].append(v)\n    graph[v].append(u)  # undirected",
    example:
      "from collections import defaultdict\n\nedges = [[0, 1], [0, 2], [1, 3], [2, 3]]\ngraph = defaultdict(list)\nfor u, v in edges:\n    graph[u].append(v)\n    graph[v].append(u)\n\nprint(dict(graph))\n# {0: [1, 2], 1: [0, 3], 2: [0, 3], 3: [1, 2]}",
    variants: [
      "defaultdict(list)   # adjacency list",
      "defaultdict(set)    # if you check membership often",
      "graph[u].append(v)  # directed edge",
      "graph[u].append(v); graph[v].append(u)  # undirected",
    ],
  },
  {
    id: "bfs-template",
    name: "BFS (deque)",
    category: "Graph",
    summary: "Breadth-first search using deque. Explores level by level — shortest path in unweighted graphs.",
    syntax: "from collections import deque\nq = deque([start])\nvisited = {start}\nwhile q:\n    node = q.popleft()\n    for neighbor in graph[node]:\n        if neighbor not in visited:\n            visited.add(neighbor)\n            q.append(neighbor)",
    example:
      "from collections import deque\n\ndef bfs_shortest_path(graph, start, end):\n    q = deque([(start, 0)])  # (node, distance)\n    visited = {start}\n    while q:\n        node, dist = q.popleft()\n        if node == end:\n            return dist\n        for nei in graph[node]:\n            if nei not in visited:\n                visited.add(nei)\n                q.append((nei, dist + 1))\n    return -1",
    variants: [
      "deque([(node, dist)])  # track distance",
      "deque([(node, path)])  # track path",
      "level-order: process len(q) at a time",
    ],
  },
  {
    id: "dfs-template",
    name: "DFS (recursive + iterative)",
    category: "Graph",
    summary: "Depth-first search — explore as far as possible before backtracking.",
    syntax: "# Recursive\ndef dfs(node, visited):\n    visited.add(node)\n    for nei in graph[node]:\n        if nei not in visited:\n            dfs(nei, visited)\n\n# Iterative\nstack = [start]\nwhile stack:\n    node = stack.pop()\n    ...",
    example:
      "# Count connected components\ndef count_components(n, edges):\n    from collections import defaultdict\n    graph = defaultdict(list)\n    for u, v in edges:\n        graph[u].append(v)\n        graph[v].append(u)\n\n    visited = set()\n    count = 0\n    for i in range(n):\n        if i not in visited:\n            count += 1\n            stack = [i]\n            while stack:\n                node = stack.pop()\n                if node in visited:\n                    continue\n                visited.add(node)\n                stack.extend(graph[node])\n    return count",
    variants: [
      "Recursive: natural for trees, backtracking",
      "Iterative: safer for large graphs (no stack overflow)",
      "visited.add() BEFORE recursing to avoid cycles",
    ],
  },
  {
    id: "topological-sort",
    name: "Topological sort (Kahn's)",
    category: "Graph",
    summary: "Order nodes so every edge u→v has u before v. Uses BFS + in-degree counting.",
    syntax: "from collections import deque, defaultdict\n# Build in-degree map + adjacency list\n# Start BFS from nodes with in-degree 0\n# Decrement neighbors' in-degree; enqueue when 0",
    example:
      "from collections import deque, defaultdict\n\ndef topo_sort(n, prerequisites):\n    graph = defaultdict(list)\n    in_degree = [0] * n\n    for course, prereq in prerequisites:\n        graph[prereq].append(course)\n        in_degree[course] += 1\n\n    q = deque(i for i in range(n) if in_degree[i] == 0)\n    order = []\n    while q:\n        node = q.popleft()\n        order.append(node)\n        for nei in graph[node]:\n            in_degree[nei] -= 1\n            if in_degree[nei] == 0:\n                q.append(nei)\n    return order if len(order) == n else []  # empty = cycle",
    variants: [
      "Detect cycle: len(order) < n",
      "DFS variant: post-order reversed",
    ],
  },
  // ── Tree ────────────────────────────────────────────────────────
  {
    id: "treenode-class",
    name: "TreeNode class",
    category: "Tree",
    summary: "Standard binary tree node used in LeetCode problems.",
    syntax: "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right",
    example:
      "class TreeNode:\n    def __init__(self, val=0, left=None, right=None):\n        self.val = val\n        self.left = left\n        self.right = right\n\n# Build tree:    1\n#               / \\\n#              2   3\nroot = TreeNode(1, TreeNode(2), TreeNode(3))",
    variants: [
      "TreeNode(val)                  # leaf node",
      "TreeNode(val, left, right)     # with children",
      "node.left / node.right / node.val  # access",
    ],
  },
  {
    id: "tree-recursive-dfs",
    name: "Recursive tree DFS",
    category: "Tree",
    summary: "The most natural tree traversal pattern — handles base case (None) then recurse left/right.",
    syntax: "def dfs(node):\n    if not node:\n        return base_case\n    left = dfs(node.left)\n    right = dfs(node.right)\n    return combine(left, right, node.val)",
    example:
      "# Max depth of binary tree\ndef max_depth(node):\n    if not node:\n        return 0\n    return 1 + max(max_depth(node.left), max_depth(node.right))\n\n# Invert binary tree\ndef invert(node):\n    if not node:\n        return None\n    node.left, node.right = invert(node.right), invert(node.left)\n    return node",
    variants: [
      "Preorder:  process → left → right",
      "Inorder:   left → process → right (BST sorted order)",
      "Postorder: left → right → process",
    ],
  },
  {
    id: "tree-iterative-bfs",
    name: "Tree BFS (level-order)",
    category: "Tree",
    summary: "Process tree level by level using a deque. Used for level-order traversal, zigzag, etc.",
    syntax: "from collections import deque\nq = deque([root])\nwhile q:\n    level_size = len(q)\n    for _ in range(level_size):\n        node = q.popleft()\n        # process node\n        if node.left:  q.append(node.left)\n        if node.right: q.append(node.right)",
    example:
      "from collections import deque\n\ndef level_order(root):\n    if not root:\n        return []\n    result = []\n    q = deque([root])\n    while q:\n        level = []\n        for _ in range(len(q)):\n            node = q.popleft()\n            level.append(node.val)\n            if node.left:  q.append(node.left)\n            if node.right: q.append(node.right)\n        result.append(level)\n    return result",
    variants: [
      "Level-order: process len(q) nodes per loop",
      "Zigzag: alternate append/appendleft per level",
      "Right-side view: take last node of each level",
    ],
  },
  // ── Intervals ───────────────────────────────────────────────────
  {
    id: "interval-merge",
    name: "Merge intervals",
    category: "Intervals",
    summary: "Sort by start time, then merge overlapping intervals greedily.",
    syntax: "intervals.sort(key=lambda x: x[0])\nmerged = [intervals[0]]\nfor start, end in intervals[1:]:\n    if start <= merged[-1][1]:\n        merged[-1][1] = max(merged[-1][1], end)\n    else:\n        merged.append([start, end])",
    example:
      "def merge(intervals):\n    intervals.sort(key=lambda x: x[0])\n    merged = [intervals[0]]\n    for start, end in intervals[1:]:\n        if start <= merged[-1][1]:\n            merged[-1][1] = max(merged[-1][1], end)\n        else:\n            merged.append([start, end])\n    return merged\n\nprint(merge([[1,3],[2,6],[8,10],[15,18]]))\n# [[1, 6], [8, 10], [15, 18]]",
    variants: [
      "Sort by start: intervals.sort(key=lambda x: x[0])",
      "Overlap check: a[0] <= b[1] and b[0] <= a[1]",
    ],
  },
  {
    id: "interval-overlap",
    name: "Interval overlap check",
    category: "Intervals",
    summary: "Two intervals overlap if and only if one starts before the other ends.",
    syntax: "# [a, b] overlaps [c, d] iff:\na <= d and c <= b\n# Equivalently, NOT (a > d or c > b)",
    example:
      "def has_overlap(a, b):\n    return a[0] <= b[1] and b[0] <= a[1]\n\nprint(has_overlap([1, 5], [3, 7]))   # True\nprint(has_overlap([1, 5], [6, 8]))   # False\nprint(has_overlap([1, 5], [5, 8]))   # True (touching)",
    variants: [
      "a[0] <= b[1] and b[0] <= a[1]  # inclusive overlap",
      "a[0] < b[1] and b[0] < a[1]    # exclusive (no touching)",
    ],
  },
  // ── Math ────────────────────────────────────────────────────────
  {
    id: "floor-div-mod",
    name: "// floor div, % modulo",
    category: "Math",
    summary: "Integer division and modulo — the building blocks for digit extraction, coordinate math, etc.",
    syntax: "a // b   # floor division (rounds toward −∞)\na % b    # modulo (remainder)",
    example:
      "print(7 // 2)    # 3\nprint(-7 // 2)   # -4 (rounds toward −∞!)\nprint(7 % 2)     # 1\n\n# Extract digits\nn = 123\nwhile n:\n    digit = n % 10   # last digit\n    n = n // 10      # remove last digit\n    print(digit, end=' ')  # 3 2 1",
    variants: [
      "divmod(a, b)   # → (a // b, a % b) in one call",
      "n % 10         # last digit",
      "n // 10        # remove last digit",
    ],
  },
  {
    id: "infinity",
    name: "float('inf')",
    category: "Math",
    summary: "Positive and negative infinity — useful for initialising min/max trackers.",
    syntax: "float('inf')    # positive infinity\nfloat('-inf')   # negative infinity",
    example:
      "# Find minimum in array\nmin_val = float('inf')\nfor x in [5, 2, 8, 1]:\n    min_val = min(min_val, x)\nprint(min_val)  # 1\n\n# Works in comparisons\nprint(float('inf') > 10**18)   # True\nprint(float('-inf') < -10**18) # True",
    variants: [
      "float('inf')      # greater than any number",
      "float('-inf')     # less than any number",
      "math.inf          # same thing (import math)",
    ],
  },
  {
    id: "abs-builtin",
    name: "abs()",
    category: "Math",
    summary: "Absolute value — works on int, float, and complex numbers.",
    syntax: "abs(x)   # |x|",
    example:
      "print(abs(-5))       # 5\nprint(abs(3.14))     # 3.14\n\n# Manhattan distance\ndef manhattan(p1, p2):\n    return abs(p1[0] - p2[0]) + abs(p1[1] - p2[1])\n\nprint(manhattan((1, 2), (4, 6)))  # 7",
  },
  {
    id: "math-gcd",
    name: "math.gcd()",
    category: "Math",
    summary: "Greatest common divisor — useful for fraction reduction and LCM computation.",
    syntax: "import math\nmath.gcd(a, b)\n# LCM via: a * b // gcd(a, b)",
    example:
      "import math\n\nprint(math.gcd(12, 8))    # 4\nprint(math.gcd(15, 25))   # 5\n\n# Least common multiple\ndef lcm(a, b):\n    return a * b // math.gcd(a, b)\n\nprint(lcm(4, 6))  # 12",
    variants: [
      "math.gcd(a, b)              # two args",
      "math.gcd(a, b, c)           # Python 3.9+",
      "a * b // math.gcd(a, b)     # LCM formula",
    ],
  },
  {
    id: "divmod",
    name: "divmod()",
    category: "Math",
    summary: "Returns (quotient, remainder) in one call — cleaner than separate // and %.",
    syntax: "q, r = divmod(a, b)\n# Equivalent to: q = a // b; r = a % b",
    example:
      "# Convert minutes to hours + minutes\ntotal_mins = 150\nhours, mins = divmod(total_mins, 60)\nprint(f'{hours}h {mins}m')  # 2h 30m\n\n# Convert 1D index to 2D coordinates\nidx = 7\ncols = 3\nrow, col = divmod(idx, cols)\nprint(f'row={row}, col={col}')  # row=2, col=1",
    variants: [
      "divmod(n, 10)    # extract last digit",
      "divmod(idx, cols) # 1D → 2D coords",
    ],
  },
  // ── Iteration ───────────────────────────────────────────────────
  {
    id: "range-patterns",
    name: "range()",
    category: "Iteration",
    summary: "Generate sequences of integers — the most common loop control.",
    syntax: "range(n)           # 0 to n-1\nrange(a, b)        # a to b-1\nrange(a, b, step)  # a to b-1 by step",
    example:
      "for i in range(5):\n    print(i, end=' ')     # 0 1 2 3 4\n\nfor i in range(2, 7):\n    print(i, end=' ')     # 2 3 4 5 6\n\n# Iterate backwards\nfor i in range(5, 0, -1):\n    print(i, end=' ')     # 5 4 3 2 1",
    variants: [
      "range(n)          # [0, n)",
      "range(a, b)       # [a, b)",
      "range(a, b, 2)    # every other",
      "range(n, -1, -1)  # n down to 0",
    ],
  },
  {
    id: "unpacking",
    name: "* unpacking",
    category: "Iteration",
    summary: "Unpack iterables into variables or function arguments. * for sequences, ** for dicts.",
    syntax: "a, *rest = [1, 2, 3, 4]  # a=1, rest=[2,3,4]\nfirst, *_, last = lst     # first and last only\nfunc(*args, **kwargs)     # spread into function call",
    example:
      "# Star unpacking\na, *rest = [1, 2, 3, 4]\nprint(a, rest)       # 1 [2, 3, 4]\n\nfirst, *_, last = [10, 20, 30, 40, 50]\nprint(first, last)   # 10 50\n\n# Spread into function\ndef add(a, b, c):\n    return a + b + c\n\nprint(add(*[1, 2, 3]))  # 6",
    variants: [
      "a, b, *rest = lst    # head + tail",
      "*init, last = lst    # all but last",
      "fn(*lst)             # spread list as args",
      "fn(**dct)            # spread dict as kwargs",
    ],
  },
  // ── Functional ──────────────────────────────────────────────────
  {
    id: "map-builtin",
    name: "map()",
    category: "Functional",
    summary: "Apply a function to every element of an iterable. Returns a lazy iterator.",
    syntax: "map(function, iterable)\nlist(map(int, ['1', '2', '3']))  # → [1, 2, 3]",
    example:
      "# Convert strings to ints\nnums = list(map(int, '1 2 3 4'.split()))\nprint(nums)  # [1, 2, 3, 4]\n\n# Apply to multiple iterables\nsums = list(map(lambda a, b: a + b, [1, 2], [10, 20]))\nprint(sums)  # [11, 22]",
    variants: [
      "list(map(int, strs))     # parse ints",
      "list(map(str, nums))     # to strings",
      "list(map(len, lists))    # get lengths",
    ],
  },
  {
    id: "filter-builtin",
    name: "filter()",
    category: "Functional",
    summary: "Keep only elements where the function returns True. Returns a lazy iterator.",
    syntax: "filter(function, iterable)\nlist(filter(lambda x: x > 0, nums))",
    example:
      "nums = [-3, -1, 0, 2, 5]\n\npositives = list(filter(lambda x: x > 0, nums))\nprint(positives)  # [2, 5]\n\n# Filter None values\ndata = [1, None, 3, None, 5]\nclean = list(filter(None, data))\nprint(clean)  # [1, 3, 5]",
    variants: [
      "filter(fn, lst)       # keep where fn returns True",
      "filter(None, lst)     # remove falsy values",
      "filterfalse(fn, lst)  # keep where fn returns False (itertools)",
    ],
  },
  {
    id: "any-all",
    name: "any() / all()",
    category: "Functional",
    summary: "Check if any/all elements are truthy. Short-circuits — stops as soon as answer is known.",
    syntax: "any(iterable)   # True if at least one truthy\nall(iterable)   # True if all truthy",
    example:
      "nums = [0, 0, 0, 1]\nprint(any(nums))  # True (1 is truthy)\nprint(all(nums))  # False (0 is falsy)\n\n# With generator expression\nwords = ['hello', 'world', 'hi']\nprint(any(len(w) > 4 for w in words))  # True\nprint(all(len(w) > 1 for w in words))  # True",
    variants: [
      "any(x > 0 for x in lst)   # any positive?",
      "all(x > 0 for x in lst)   # all positive?",
      "not any(…)                 # none match",
    ],
  },
  {
    id: "sum-builtin",
    name: "sum()",
    category: "Functional",
    summary: "Sum an iterable of numbers. Accepts an optional start value.",
    syntax: "sum(iterable, start=0)",
    example:
      "print(sum([1, 2, 3, 4]))      # 10\nprint(sum([1, 2, 3], 100))     # 106 (start=100)\n\n# Sum with generator\nmatrix = [[1, 2], [3, 4], [5, 6]]\ntotal = sum(x for row in matrix for x in row)\nprint(total)  # 21\n\n# Count truthy values\nbools = [True, False, True, True]\nprint(sum(bools))  # 3",
  },
  {
    id: "max-min-key",
    name: "max() / min() with key",
    category: "Functional",
    summary: "Find the max/min element by a custom criterion.",
    syntax: "max(iterable, key=function)\nmin(iterable, key=function)",
    example:
      'words = ["apple", "banana", "cherry", "date"]\n\nlongest = max(words, key=len)\nprint(longest)  # "banana"\n\npoints = [(1, 3), (4, 1), (2, 5)]\nclosest = min(points, key=lambda p: p[0]**2 + p[1]**2)\nprint(closest)  # (1, 3)',
    variants: [
      "max(lst, key=len)            # longest",
      "min(lst, key=abs)            # closest to 0",
      "max(d, key=d.get)            # key with max value",
      "max(a, b)                    # max of two values",
    ],
  },
  // ── Comprehensions ──────────────────────────────────────────────
  {
    id: "set-comprehension",
    name: "Set comprehension",
    category: "Comprehensions",
    summary: "Build a set from an iterable — auto-deduplicates.",
    syntax: "{expr for x in iterable}",
    example:
      "words = ['hello', 'world', 'hello', 'hi']\nunique_lengths = {len(w) for w in words}\nprint(unique_lengths)  # {2, 5}\n\n# Vowels in a string\nvowels = {c for c in 'hello world' if c in 'aeiou'}\nprint(vowels)  # {'e', 'o'}",
    variants: [
      "{x for x in lst}              # unique elements",
      "{f(x) for x in lst}           # unique transformed",
      "{x for x in lst if cond}      # filtered unique",
    ],
  },
  {
    id: "generator-expression",
    name: "Generator expression",
    category: "Comprehensions",
    summary: "Like list comprehension but lazy — yields one element at a time. Uses () instead of [].",
    syntax: "(expr for x in iterable)\n# Often passed directly to sum(), any(), all(), etc.",
    example:
      "# Sum of squares (no intermediate list)\ntotal = sum(x**2 for x in range(1000000))\n\n# Check if any string is empty\nnames = ['Alice', '', 'Bob']\nhas_empty = any(len(n) == 0 for n in names)\nprint(has_empty)  # True\n\n# Can be used in join\nresult = ','.join(str(x) for x in [1, 2, 3])\nprint(result)  # '1,2,3'",
    variants: [
      "sum(x for x in lst)      # no extra []",
      "any(cond for x in lst)   # lazy check",
      "','.join(str(x) for x in nums)  # lazy join",
    ],
  },
  // ── Linked List ─────────────────────────────────────────────────
  {
    id: "listnode-class",
    name: "ListNode class",
    category: "Linked List",
    summary: "Standard singly-linked list node used in LeetCode problems.",
    syntax: "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next",
    example:
      "class ListNode:\n    def __init__(self, val=0, next=None):\n        self.val = val\n        self.next = next\n\n# Build: 1 → 2 → 3\nhead = ListNode(1, ListNode(2, ListNode(3)))\n\n# Traverse\ncurr = head\nwhile curr:\n    print(curr.val, end=' ')  # 1 2 3\n    curr = curr.next",
    variants: [
      "ListNode(val)            # single node",
      "ListNode(val, next_node) # with next pointer",
      "node.val / node.next     # access",
    ],
  },
  {
    id: "dummy-head",
    name: "Dummy head node",
    category: "Linked List",
    summary: "Avoids edge cases when building/modifying linked lists. Return dummy.next as the real head.",
    syntax: "dummy = ListNode(0)\ncurr = dummy\n# ... build list ...\nreturn dummy.next",
    example:
      "def merge_two_lists(l1, l2):\n    dummy = ListNode(0)\n    curr = dummy\n    while l1 and l2:\n        if l1.val <= l2.val:\n            curr.next = l1\n            l1 = l1.next\n        else:\n            curr.next = l2\n            l2 = l2.next\n        curr = curr.next\n    curr.next = l1 or l2\n    return dummy.next",
    variants: [
      "dummy = ListNode(0)   # sentinel node",
      "return dummy.next     # skip dummy",
      "Eliminates special cases for empty/single-node lists",
    ],
  },
  {
    id: "fast-slow-pointer",
    name: "Fast/slow pointer",
    category: "Linked List",
    summary: "Two pointers moving at different speeds — finds middle, detects cycles.",
    syntax: "slow = fast = head\nwhile fast and fast.next:\n    slow = slow.next\n    fast = fast.next.next\n# slow is at middle (or cycle meeting point)",
    example:
      "# Find middle of linked list\ndef find_middle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n    return slow  # middle node\n\n# Detect cycle\ndef has_cycle(head):\n    slow = fast = head\n    while fast and fast.next:\n        slow = slow.next\n        fast = fast.next.next\n        if slow == fast:\n            return True\n    return False",
    variants: [
      "Find middle: slow at middle when fast hits end",
      "Detect cycle: if slow == fast, there's a cycle",
      "Find cycle start: reset one pointer to head, advance both by 1",
    ],
  },
  // ── Backtracking ────────────────────────────────────────────────
  {
    id: "backtracking-template",
    name: "Backtracking template",
    category: "Backtracking",
    summary: "Recursive exploration of all paths — add choice, recurse, undo choice.",
    syntax: "def backtrack(path, choices):\n    if is_solution(path):\n        result.append(path[:])\n        return\n    for choice in choices:\n        path.append(choice)\n        backtrack(path, next_choices)\n        path.pop()  # undo",
    example:
      "# Generate all subsets\ndef subsets(nums):\n    result = []\n    def backtrack(start, path):\n        result.append(path[:])\n        for i in range(start, len(nums)):\n            path.append(nums[i])\n            backtrack(i + 1, path)\n            path.pop()\n    backtrack(0, [])\n    return result\n\nprint(subsets([1, 2, 3]))\n# [[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]",
    variants: [
      "path.append() + path.pop()   # standard backtrack",
      "start=i+1 for combinations (no reuse)",
      "start=i for combinations with reuse",
      "skip duplicates: if i > start and nums[i] == nums[i-1]: continue",
    ],
  },
  {
    id: "permutations-template",
    name: "Permutations",
    category: "Backtracking",
    summary: "Generate all orderings — track used elements with a set or swap method.",
    syntax: "def permute(nums):\n    result = []\n    def backtrack(path, used):\n        if len(path) == len(nums):\n            result.append(path[:])\n            return\n        for i in range(len(nums)):\n            if i in used: continue\n            used.add(i)\n            path.append(nums[i])\n            backtrack(path, used)\n            path.pop()\n            used.remove(i)\n    backtrack([], set())\n    return result",
    example:
      "def permute(nums):\n    result = []\n    def backtrack(path, used):\n        if len(path) == len(nums):\n            result.append(path[:])\n            return\n        for i in range(len(nums)):\n            if i in used:\n                continue\n            used.add(i)\n            path.append(nums[i])\n            backtrack(path, used)\n            path.pop()\n            used.remove(i)\n    backtrack([], set())\n    return result\n\nprint(permute([1, 2, 3]))\n# [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]",
    variants: [
      "used set: track indices, skip visited",
      "swap method: swap nums[i] with nums[start]",
      "Skip duplicates with sorted input + nums[i] == nums[i-1]",
    ],
  },
  // ── Dynamic Programming ─────────────────────────────────────────
  {
    id: "dp-memoization",
    name: "Memoization (@cache)",
    category: "Dynamic Programming",
    summary: "Cache recursive function results to avoid recomputation. Top-down DP.",
    syntax: "from functools import cache\n\n@cache\ndef dp(state):\n    if base_case: return ...\n    return recurrence",
    example:
      "from functools import cache\n\n@cache\ndef fib(n):\n    if n <= 1:\n        return n\n    return fib(n - 1) + fib(n - 2)\n\nprint(fib(50))  # 12586269025 (instant, not 2^50 calls)\n\n# Coin change\n@cache\ndef min_coins(amount):\n    if amount == 0: return 0\n    if amount < 0: return float('inf')\n    return 1 + min(min_coins(amount - c) for c in coins)",
    variants: [
      "@cache                  # Python 3.9+ (auto-unhashable handling)",
      "@lru_cache(maxsize=None)  # Python 3.2+",
      "dp.cache_clear()       # reset cache",
    ],
  },
  {
    id: "dp-tabulation",
    name: "Tabulation (bottom-up DP)",
    category: "Dynamic Programming",
    summary: "Fill a table iteratively from base cases up. Avoids recursion depth limits.",
    syntax: "dp = [0] * (n + 1)\ndp[0] = base_case\nfor i in range(1, n + 1):\n    dp[i] = recurrence(dp[i-1], ...)\nreturn dp[n]",
    example:
      "# Climbing stairs — n steps, 1 or 2 at a time\ndef climb_stairs(n):\n    if n <= 2:\n        return n\n    dp = [0] * (n + 1)\n    dp[1] = 1\n    dp[2] = 2\n    for i in range(3, n + 1):\n        dp[i] = dp[i-1] + dp[i-2]\n    return dp[n]\n\nprint(climb_stairs(10))  # 89",
    variants: [
      "1D: dp[i] = f(dp[i-1], dp[i-2])",
      "2D: dp[i][j] = f(dp[i-1][j], dp[i][j-1])",
      "Space optimise: keep only prev row/two variables",
    ],
  },
  // ── Bit Manipulation ────────────────────────────────────────────
  {
    id: "bitwise-operators",
    name: "Bitwise operators",
    category: "Bit Manipulation",
    summary: "AND, OR, XOR, NOT, and shift — essential for problems involving binary representations.",
    syntax: "a & b    # AND\na | b    # OR\na ^ b    # XOR\n~a       # NOT (bitwise complement)\na << n   # left shift (× 2^n)\na >> n   # right shift (÷ 2^n)",
    example:
      "# XOR to find single number (all others appear twice)\ndef single_number(nums):\n    result = 0\n    for n in nums:\n        result ^= n   # pairs cancel: a ^ a = 0\n    return result\n\nprint(single_number([4, 1, 2, 1, 2]))  # 4\n\n# Check if power of 2\ndef is_power_of_two(n):\n    return n > 0 and (n & (n - 1)) == 0",
    variants: [
      "n & 1          # check if odd",
      "n & (n - 1)    # clear lowest set bit",
      "n ^ n == 0     # XOR with self = 0",
      "1 << k         # 2^k",
    ],
  },
  {
    id: "bit-counting",
    name: "Count bits / bit tricks",
    category: "Bit Manipulation",
    summary: "Common bit tricks: count set bits, get/set/clear individual bits.",
    syntax: "bin(n).count('1')    # count set bits\nn & (1 << k)         # check kth bit\nn | (1 << k)         # set kth bit\nn & ~(1 << k)        # clear kth bit",
    example:
      "n = 0b1011  # 11 in decimal\n\n# Count set bits\nprint(bin(n).count('1'))  # 3\n\n# Check bit at position 2\nprint(bool(n & (1 << 2)))  # False (bit 2 is 0)\n\n# Set bit at position 2\nn |= (1 << 2)  # now 0b1111 = 15\nprint(n)  # 15\n\n# Clear bit at position 0\nn &= ~(1 << 0)  # now 0b1110 = 14\nprint(n)  # 14",
    variants: [
      "bin(n).count('1')  # Pythonic bit count",
      "n.bit_count()      # Python 3.10+",
      "n.bit_length()     # position of highest bit",
    ],
  },
  // ── Union Find ──────────────────────────────────────────────────
  {
    id: "union-find",
    name: "Union-Find (Disjoint Set)",
    category: "Union Find",
    summary: "Track connected components — union merges groups, find identifies which group an element belongs to.",
    syntax: "parent = list(range(n))\nrank = [0] * n\n\ndef find(x):\n    if parent[x] != x:\n        parent[x] = find(parent[x])  # path compression\n    return parent[x]\n\ndef union(x, y):\n    px, py = find(x), find(y)\n    if px == py: return False\n    if rank[px] < rank[py]: px, py = py, px\n    parent[py] = px\n    if rank[px] == rank[py]: rank[px] += 1\n    return True",
    example:
      "def count_components(n, edges):\n    parent = list(range(n))\n    rank = [0] * n\n\n    def find(x):\n        if parent[x] != x:\n            parent[x] = find(parent[x])\n        return parent[x]\n\n    def union(x, y):\n        px, py = find(x), find(y)\n        if px == py: return False\n        if rank[px] < rank[py]: px, py = py, px\n        parent[py] = px\n        if rank[px] == rank[py]: rank[px] += 1\n        return True\n\n    components = n\n    for u, v in edges:\n        if union(u, v):\n            components -= 1\n    return components",
    variants: [
      "Path compression: parent[x] = find(parent[x])",
      "Union by rank: attach smaller tree to larger",
      "Both together: nearly O(1) amortised per operation",
    ],
  },
  // ── Trie ────────────────────────────────────────────────────────
  {
    id: "trie-implementation",
    name: "Trie (prefix tree)",
    category: "Trie",
    summary: "Tree for storing strings character by character — O(L) insert and lookup where L is word length.",
    syntax: "class TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.is_end = False",
    example:
      "class TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.is_end = False\n\nclass Trie:\n    def __init__(self):\n        self.root = TrieNode()\n\n    def insert(self, word):\n        node = self.root\n        for c in word:\n            if c not in node.children:\n                node.children[c] = TrieNode()\n            node = node.children[c]\n        node.is_end = True\n\n    def search(self, word):\n        node = self.root\n        for c in word:\n            if c not in node.children:\n                return False\n            node = node.children[c]\n        return node.is_end\n\n    def starts_with(self, prefix):\n        node = self.root\n        for c in prefix:\n            if c not in node.children:\n                return False\n            node = node.children[c]\n        return True",
    variants: [
      "Dict-based children: flexible, clean",
      "Array-based: children = [None] * 26 (faster, fixed alphabet)",
      "is_end marks complete words vs prefixes",
    ],
  },
  // ── Matrix / Grid ───────────────────────────────────────────────
  {
    id: "grid-directions",
    name: "Grid directions (4/8-way)",
    category: "Matrix",
    summary: "Standard direction vectors for BFS/DFS on a 2D grid.",
    syntax: "# 4-directional\ndirs = [(0, 1), (0, -1), (1, 0), (-1, 0)]\n\n# 8-directional (includes diagonals)\ndirs8 = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]",
    example:
      "# BFS on grid (e.g., number of islands)\nfrom collections import deque\n\ndef bfs_grid(grid, start_r, start_c):\n    rows, cols = len(grid), len(grid[0])\n    dirs = [(0, 1), (0, -1), (1, 0), (-1, 0)]\n    q = deque([(start_r, start_c)])\n    grid[start_r][start_c] = '0'  # mark visited\n    while q:\n        r, c = q.popleft()\n        for dr, dc in dirs:\n            nr, nc = r + dr, c + dc\n            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == '1':\n                grid[nr][nc] = '0'\n                q.append((nr, nc))",
    variants: [
      "4-way: up, down, left, right",
      "8-way: includes diagonals",
      "Bounds check: 0 <= nr < rows and 0 <= nc < cols",
    ],
  },
  {
    id: "matrix-init",
    name: "2D array initialisation",
    category: "Matrix",
    summary: "Correct way to create a 2D list in Python — avoid the [[0]*n]*m trap.",
    syntax: "# CORRECT\nmatrix = [[0] * cols for _ in range(rows)]\n\n# WRONG — all rows share the same list object!\n# matrix = [[0] * cols] * rows",
    example:
      "# Correct: independent rows\nmatrix = [[0] * 3 for _ in range(3)]\nmatrix[0][0] = 1\nprint(matrix)  # [[1, 0, 0], [0, 0, 0], [0, 0, 0]]\n\n# Wrong: shared rows\nbad = [[0] * 3] * 3\nbad[0][0] = 1\nprint(bad)  # [[1, 0, 0], [1, 0, 0], [1, 0, 0]] — all changed!",
    variants: [
      "[[0] * cols for _ in range(rows)]       # zeros",
      "[[False] * cols for _ in range(rows)]   # booleans",
      "[row[:] for row in matrix]              # deep copy",
    ],
  },
  // ── String Building ─────────────────────────────────────────────
  {
    id: "string-building",
    name: "String building (list + join)",
    category: "String",
    summary: "Build strings with a list of parts, then join. Much faster than string concatenation in a loop.",
    syntax: 'parts = []\nfor ...:\n    parts.append(chunk)\nresult = "".join(parts)',
    example:
      '# Bad: O(n²) — creates new string each iteration\nresult = ""\nfor c in "hello":\n    result += c.upper()\n\n# Good: O(n) — append to list, join once\nparts = []\nfor c in "hello":\n    parts.append(c.upper())\nresult = "".join(parts)\nprint(result)  # "HELLO"\n\n# Best: use join with generator\nresult = "".join(c.upper() for c in "hello")',
    variants: [
      '"".join(parts)         # no separator',
      '" ".join(parts)        # space-separated',
      '"".join(c for c in s if cond)  # filtered join',
    ],
  },
  // ── Miscellaneous ───────────────────────────────────────────────
  {
    id: "defaultdict-int-counting",
    name: "Frequency counting",
    category: "Patterns",
    summary: "Three ways to count element frequencies — pick based on what you need.",
    syntax: "# Counter (most convenient)\nfrom collections import Counter\ncnt = Counter(lst)\n\n# defaultdict (when you need the dict later)\nfrom collections import defaultdict\nfreq = defaultdict(int)\nfor x in lst: freq[x] += 1\n\n# dict.get (no imports)\nfreq = {}\nfor x in lst: freq[x] = freq.get(x, 0) + 1",
    example:
      "from collections import Counter, defaultdict\n\ndata = ['a', 'b', 'a', 'c', 'a', 'b']\n\n# Method 1: Counter\ncnt = Counter(data)\nprint(cnt.most_common())  # [('a', 3), ('b', 2), ('c', 1)]\n\n# Method 2: defaultdict\nfreq = defaultdict(int)\nfor x in data:\n    freq[x] += 1\nprint(dict(freq))  # {'a': 3, 'b': 2, 'c': 1}",
    variants: [
      "Counter(lst)           # most convenient",
      "defaultdict(int)       # flexible for modifications",
      "dict.get(k, 0) + 1    # no imports needed",
    ],
  },
  {
    id: "tuple-as-key",
    name: "Tuple as dict key",
    category: "Patterns",
    summary: "Use tuples as dict keys for multi-dimensional lookups or memoisation — lists can't be keys.",
    syntax: "d = {}\nd[(r, c)] = value       # grid coordinate key\nd[tuple(lst)] = value   # convert list to hashable tuple",
    example:
      "# Visited set for grid coordinates\nvisited = set()\nvisited.add((0, 0))\nvisited.add((1, 2))\nprint((1, 2) in visited)  # True\n\n# Group anagrams by sorted char tuple\nfrom collections import defaultdict\ngroups = defaultdict(list)\nfor word in ['eat', 'tea', 'ate', 'bat']:\n    key = tuple(sorted(word))\n    groups[key].append(word)",
    variants: [
      "(r, c) as key       # grid coordinates",
      "tuple(lst) as key   # list → hashable",
      "(i, j, state)       # multi-dimensional memo key",
    ],
  },
  {
    id: "collections-comparison",
    name: "When to use which collection",
    category: "Patterns",
    summary: "Quick decision guide for picking the right data structure.",
    syntax: "# Need O(1) lookup?    → set or dict\n# Need ordering?       → list or deque\n# Need min/max fast?   → heapq\n# Need sorted + search? → bisect on sorted list\n# Need FIFO?           → deque\n# Need LIFO?           → list (as stack)",
    example:
      "# O(1) membership: set\nseen = set()\nif x not in seen: seen.add(x)\n\n# O(1) lookup by key: dict\ncache = {}\ncache[key] = value\n\n# O(1) both ends: deque\nfrom collections import deque\nq = deque()\nq.append(x)     # right\nq.popleft()     # left\n\n# O(log n) sorted insert: bisect\nfrom bisect import insort\nsorted_lst = []\ninsort(sorted_lst, x)",
    variants: [
      "dict: O(1) get/set/delete by key",
      "set: O(1) add/remove/membership",
      "list: O(1) append/pop, O(n) insert/remove",
      "deque: O(1) both ends, O(n) middle access",
    ],
  },
];
