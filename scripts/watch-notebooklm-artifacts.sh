#!/bin/bash
# Poll notebooklm artifact status, download when completed, update manifest.
# Usage: ./scripts/watch-notebooklm-artifacts.sh <notebook-id> <pack-dir> <person-id>
# Example: ./scripts/watch-notebooklm-artifacts.sh 2834dc30-... /path/to/pack/sapna-sabharwal sapna-sabharwal

set -euo pipefail

NOTE="${1:?missing notebook-id}"
PACK_DIR="${2:?missing pack-dir}"
PERSON="${3:?missing person-id}"

MANIFEST="$PACK_DIR/manifest.json"
AUDIO_DIR="$PACK_DIR/audio"
VIDEO_DIR="$PACK_DIR/video"
REPORTS_DIR="$PACK_DIR/reports"
SLIDES_DIR="$PACK_DIR/slide-decks"
QUIZ_DIR="$PACK_DIR/quiz"
FLASHCARDS_DIR="$PACK_DIR/flashcards"
MINDMAP_DIR="$PACK_DIR/mind-map"
for d in "$AUDIO_DIR" "$VIDEO_DIR" "$REPORTS_DIR" "$SLIDES_DIR" "$QUIZ_DIR" "$FLASHCARDS_DIR" "$MINDMAP_DIR"; do mkdir -p "$d"; done

declare -A TARGETS
TARGETS[audio_deep_dive_long]="audio|$AUDIO_DIR/deep-dive-long.mp3"
TARGETS[video_brief]="video|$VIDEO_DIR/video-brief.mp4"
TARGETS[study_guide]="report|$REPORTS_DIR/study-guide.md|study"
TARGETS[briefing_doc]="report|$REPORTS_DIR/briefing.md|brief"
TARGETS[slide_deck_detailed]="slide_deck|$SLIDES_DIR/detailed.pdf|detailed"
TARGETS[slide_deck_preview]="slide_deck|$SLIDES_DIR/preview.pdf|preview"
TARGETS[slide_deck_vimshottari_timeline]="slide_deck|$SLIDES_DIR/vimshottari-timeline.pdf|vimshottari"
TARGETS[quiz]="quiz|$QUIZ_DIR/quiz.md"
TARGETS[flashcards]="flashcards|$FLASHCARDS_DIR/flashcards.md"
TARGETS[mind_map]="mind_map|$MINDMAP_DIR"

POLL_INTERVAL=30
MAX_RUNTIME=$((60 * 60))  # 1 hour

artifact_json() {
    notebooklm artifact list --notebook "$NOTE" --json 2>/dev/null
}

download_one() {
    local type="$1" output_path="$2" artifact_id="$3" title_needle="${4:-}"
    local type_slug="${type//_/-}"
    case "$type_slug" in
        mind_map)
            notebooklm download mind-map --all "$output_path" --notebook "$NOTE" --force 2>&1
            ;;
        *)
            local args=(download "$type_slug" "$output_path" --notebook "$NOTE" --artifact "$artifact_id" --force)
            notebooklm "${args[@]}" 2>&1
            ;;
    esac
}

update_manifest() {
    local key="$1" status="$2" artifact_id="${3:-}" output_path="${4:-}" error="${5:-}"
    python3 -c "
import json, sys
m = json.load(open('$MANIFEST'))
m['notebooklm']['notebookId'] = '$NOTE'
m['notebooklm']['artifacts']['$key'] = {
    'status': '$status',
    'artifactId': '$artifact_id',
    'outputPath': '$output_path',
    'error': '$error',
}
json.dump(m, open('$MANIFEST', 'w'), indent=2)
" 2>/dev/null
}

echo "🔥 watcher: notebook=$NOTE person=$PERSON"
echo "   interval=${POLL_INTERVAL}s max_runtime=${MAX_RUNTIME}s"
echo "   targets: ${!TARGETS[@]}"

START_TS=$(date +%s)

while true; do
    NOW_TS=$(date +%s)
    if (( NOW_TS - START_TS > MAX_RUNTIME )); then
        echo "⏰ max runtime reached, exiting"
        break
    fi

    JSON=$(artifact_json)
    if [ -z "$JSON" ]; then
        echo "⚠️  artifact list empty/failed, retrying in ${POLL_INTERVAL}s"
        sleep "$POLL_INTERVAL"
        continue
    fi

    # Check current manifest state
    REMAINING=$(python3 -c "
import json, os, sys
m = json.load(open('$MANIFEST'))
arts = m.get('notebooklm',{}).get('artifacts',{})
remaining = [k for k,v in arts.items() if v.get('status') != 'ready']
print(len(remaining))
" 2>/dev/null || echo "10")

    if [ "$REMAINING" -eq 0 ]; then
        echo ""
        echo "✅ ALL ARTIFACTS READY. Exiting watcher."
        break
    fi

    FOUND_ANY=false
    echo "$JSON" | python3 -c "
import sys, json, os
data = json.load(sys.stdin)
arts = data.get('artifacts', [])
for a in arts:
    a_id = a.get('id','')
    a_type = a.get('type','').replace('-','_')
    a_status = a.get('status','')
    a_title = a.get('title','')
    if a_status == 'completed':
        print(f'READY|{a_id}|{a_type}|{a_title}')
" 2>/dev/null | while IFS='|' read -r _marker a_id a_type a_title; do
        for key in "${!TARGETS[@]}"; do
            IFS='|' read -r t_type t_path t_needle <<< "${TARGETS[$key]}"
            t_needle="${t_needle:-}"

            # Check if already downloaded
            ALREADY=$(python3 -c "
import json, os
m = json.load(open('$MANIFEST'))
v = m.get('notebooklm',{}).get('artifacts',{}).get('$key',{})
print('ready' if v.get('status') == 'ready' else 'pending')
" 2>/dev/null || echo "pending")
            if [ "$ALREADY" = "ready" ]; then continue; fi

            MATCH=false
            if [ -n "$t_needle" ]; then
                if echo "$a_title" | grep -qi "$t_needle"; then MATCH=true; fi
            elif echo "$a_type" | grep -q "$t_type"; then
                MATCH=true
            fi

            if $MATCH; then
                echo "  📥 downloading $key ($a_type) -> $t_path (artifact $a_id)"
                if download_one "$t_type" "$t_path" "$a_id" "$t_needle" > /dev/null 2>&1; then
                    if [ -f "$t_path" ]; then
                        update_manifest "$key" "ready" "$a_id" "$t_path" ""
                        echo "  ✅ $key ready ($(ls -lh "$t_path" | awk '{print $5}'))"
                        FOUND_ANY=true
                    else
                        echo "  ❌ $key download reported OK but file missing"
                    fi
                else
                    echo "  ❌ $key download failed, will retry"
                fi
            fi
        done
    done

    echo "[$(date +%H:%M:%S)] remaining: $REMAINING, sleeping ${POLL_INTERVAL}s"
    sleep "$POLL_INTERVAL"
done

# Final summary
python3 -c "
import json, os
m = json.load(open('$MANIFEST'))
arts = m.get('notebooklm',{}).get('artifacts',{})
ready = [k for k,v in arts.items() if v.get('status') == 'ready']
pending = [k for k,v in arts.items() if v.get('status') != 'ready']
print('')
print('═══ FINAL STATE ═══')
print(f'Ready: {len(ready)}/{len(arts)}')
for k in sorted(ready):
    v=arts[k]
    exists = os.path.exists(v.get('outputPath','')) if v.get('outputPath') else False
    print(f'  ✅ {k} {v.get(\"outputPath\",\"\")} {\"EXISTS\" if exists else \"MISSING\"}')
for k in sorted(pending):
    print(f'  ⏳ {k} {arts[k].get(\"error\",\"\")}')
" 2>/dev/null

echo "🔥 watcher exit"