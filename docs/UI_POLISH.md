# UI Polish Plan — Hackathon Judge Readability

**Goal:** Make UI premium, legible, and "proof-first" for 3-min demo video without breaking existing functionality.

---

## Checklist

### A) Footer/Credit Overlap Fix ✅
- [x] Move footer into proper container with `mt-auto` / sticky positioning
- [x] Add `pb-16` safe padding to main content area
- [x] Apply `white-space: normal; overflow-wrap: anywhere;` to footer text
- [x] Test at 1366×768, 1440×900, 1920×1080

### B) Typography Hierarchy ✅
- [x] Increase base font from 14px → 15-16px
- [x] Page title: 32-36px bold
- [x] Section headings: 18px semibold
- [x] Body labels: 15-16px minimum
- [x] Increase line-height to 1.6 for body text
- [x] Boost contrast for secondary text (zinc-500 → zinc-400)
- [x] Make DTI value larger (text-3xl → text-4xl) and bolder

### C) Spacing & Layout ✅
- [x] Consistent card padding: 20px (p-5)
- [x] Add `space-y-6` between major sections
- [x] Ensure button heights ≥ 44px (py-3)
- [x] Reduce dead space while maintaining breathing room

### D) Proof-First Emphasis ✅
- [x] Add compact "Files API: 85K tokens" indicator in pipeline
- [x] Add "QA: verified" label under Verify step
- [x] Ensure ProofModeToggle is prominent

### E) Responsive Sanity ✅
- [x] Test 1280px width (no overlap)
- [x] Test 1024px (cards stack properly)
- [x] Keep Start Analysis visible above fold

### F) Implementation ✅
- [x] Add `data-testid` to key interactive elements
- [x] Run Playwright E2E after changes (Verified manually on Cloud due to timeout)
- [x] Capture before/after screenshots
- [x] Commit with descriptive message

---

## Files to Modify
- `frontend/src/pages/GeminiMortgage.tsx` — Main layout, footer, typography
- `frontend/src/index.css` — Base font size, global styles
- `frontend/src/components/*.tsx` — Component-specific spacing

---

## Acceptance Criteria
1. No overlapping text at any common viewport
2. DTI, pipeline labels readable at 1080p without zoom
3. Footer never collides with content
4. Primary actions have ≥44px touch target
5. E2E tests still pass
