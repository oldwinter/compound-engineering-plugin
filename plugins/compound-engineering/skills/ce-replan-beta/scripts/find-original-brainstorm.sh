#!/usr/bin/env bash
#
# find-original-brainstorm.sh — Locate the brainstorm doc that an existing
# plan derived from, if one is discoverable in the working repo.
#
# Usage:
#   find-original-brainstorm.sh PLAN_PATH
#
# Strategy:
#   1. If PLAN_PATH's frontmatter has an `origin:` field pointing to a
#      docs/brainstorms/*-requirements.md path, prefer that.
#   2. Otherwise, score docs/brainstorms/*-requirements.md filenames against
#      the plan's topic fragments (extracted from the plan filename), the
#      same way find-original-plan.sh scores plan candidates against branch
#      fragments.
#
# Output:
#   The repo-relative path of the most likely original brainstorm, or empty
#   when no candidate clears the heuristic. Empty output is not an error —
#   callers must check stdout, not exit code.

set -e

PLAN_PATH="${1:-}"

if [ -z "$PLAN_PATH" ]; then
    echo "Usage: find-original-brainstorm.sh PLAN_PATH" >&2
    exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "$REPO_ROOT" ]; then
    echo "Error: not inside a git repository." >&2
    exit 1
fi

# Resolve PLAN_PATH to absolute (accept both repo-relative and absolute).
if [ -f "$PLAN_PATH" ]; then
    PLAN_ABS="$PLAN_PATH"
elif [ -f "$REPO_ROOT/$PLAN_PATH" ]; then
    PLAN_ABS="$REPO_ROOT/$PLAN_PATH"
else
    echo "Error: plan file not found at $PLAN_PATH" >&2
    exit 1
fi

# Step 1 — try the plan's own frontmatter first.
ORIGIN=$(awk '
    /^---[[:space:]]*$/ { in_fm = !in_fm; next }
    in_fm && /^origin:/ {
        sub(/^origin:[[:space:]]*/, "")
        gsub(/^["'\'']/, "")
        gsub(/["'\''][[:space:]]*$/, "")
        print
        exit
    }
' "$PLAN_ABS")

if [ -n "$ORIGIN" ] && [ -f "$REPO_ROOT/$ORIGIN" ]; then
    echo "$ORIGIN"
    exit 0
fi

# Step 2 — fall back to topic-fragment scoring against docs/brainstorms/.
BRAINSTORMS_DIR="$REPO_ROOT/docs/brainstorms"
if [ ! -d "$BRAINSTORMS_DIR" ]; then
    exit 0
fi

# Strip the standard plan filename shape:
#   YYYY-MM-DD-NNN-<type>-<topic>-plan.md
# We want the <topic> portion as our scoring source. The simplest portable
# approach is: drop the date+seq prefix (first three dash-separated tokens),
# drop the trailing "-plan.md", and treat the rest as the topic. Any leading
# type like feat/fix/refactor/replan is also dropped to widen fragment match.
PLAN_BASENAME=$(basename "$PLAN_ABS")
TOPIC=$(echo "$PLAN_BASENAME" | sed -E 's/^[0-9]{4}-[0-9]{2}-[0-9]{2}-[0-9]+-(feat|fix|refactor|replan|chore|docs)-//; s/-(beta-)?plan\.md$//')

# Split the topic into fragments. Put '-' first in the tr SET so it is
# literal (otherwise tr reads '/-_+.' as a range from / to _, which silently
# eats uppercase letters and digits). Filter to fragments at least 4 chars.
FRAGMENTS=$(echo "$TOPIC" | tr -- '-/_+.' '\n\n\n\n\n' | awk 'length($0) >= 4')

if [ -z "$FRAGMENTS" ]; then
    exit 0
fi

# Score each *-requirements.md by the number of fragments matched in its
# basename. Tie-break by mtime (newer wins).
BEST=$(
    find "$BRAINSTORMS_DIR" -maxdepth 1 -type f -name '*-requirements.md' -print0 |
    while IFS= read -r -d '' brainstorm; do
        basename=$(basename "$brainstorm")
        score=0
        while IFS= read -r frag; do
            [ -z "$frag" ] && continue
            if echo "$basename" | grep -qiF "$frag"; then
                score=$((score + 1))
            fi
        done <<<"$FRAGMENTS"
        if [ "$score" -gt 0 ]; then
            mtime=$(stat -f %m "$brainstorm" 2>/dev/null || stat -c %Y "$brainstorm" 2>/dev/null || echo 0)
            relpath=${brainstorm#"$REPO_ROOT/"}
            printf '%d\t%d\t%s\n' "$score" "$mtime" "$relpath"
        fi
    done | sort -k1,1nr -k2,2nr | head -n 1
)

if [ -z "$BEST" ]; then
    exit 0
fi

# Surface the top candidate. False positives are caught at the synthesis
# checkpoint where the user confirms or corrects the discovered original
# brainstorm before it is relied on.
echo "$BEST" | cut -f3
