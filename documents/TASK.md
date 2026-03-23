# Task: Prepare iPad Build Configuration

## Status
`in progress`

## Objective
Get the app to a state where an EAS preview build can be run for iPad testing. The API already uses `EXPO_PUBLIC_API_URL` for its base URL. TypeScript is clean on both mobile and API. No `eas.json` exists yet. This task is configuration and preparation — not a Railway deploy (that requires credentials the user will do manually).

## What to do

### 1. Create `apps/mobile/eas.json`
Create an EAS build configuration with a `preview` profile for internal distribution (TestFlight / ad hoc). This is the profile that will be used to test on iPad.

```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview-simulator": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

### 2. Update `apps/mobile/app.json`
Make the following changes:
- Change `"orientation": "portrait"` to `"orientation": "default"` — iPad should work in both portrait and landscape.
- Add `"bundleIdentifier": "com.panelsync.app"` inside the `"ios"` block.
- Add `"buildNumber": "1"` inside the `"ios"` block.
- Confirm `"supportsTablet": true` is present (it is — leave it).

### 3. Create `apps/mobile/.env.example`
Document the required environment variables for a production build:

```
# API base URL — set this to the deployed Railway URL for production builds
# For local dev, omit this and the app will default to http://localhost:3000
EXPO_PUBLIC_API_URL=https://your-api.railway.app
```

### 4. Scan for portrait/hardcoded-width layout issues
Scan the following files for hardcoded pixel widths or portrait-only assumptions that would break on iPad landscape:
- `apps/mobile/app/universe/[id].tsx`
- `apps/mobile/app/index.tsx`
- `apps/mobile/components/CharacterEditor.tsx`
- `apps/mobile/components/EntityEditor.tsx`

Flag any issues you find in the completion note. Do not fix layout issues unless they are trivially one-line fixes (e.g. `width: 375` → `width: '100%'`). The binder layout will be redesigned soon — don't over-invest in fixing it now.

### 5. Add `eas-cli` note to package.json scripts (optional)
If it does not already exist, add a convenience script to `apps/mobile/package.json`:
```json
"build:preview": "eas build --profile preview --platform ios"
```

## Files to change
- `apps/mobile/eas.json` — create
- `apps/mobile/app.json` — orientation + bundleIdentifier + buildNumber
- `apps/mobile/.env.example` — create
- `apps/mobile/package.json` — add build:preview script

## Files NOT to touch
- `apps/api/` — no backend changes
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/context/UniverseContext.tsx`
- `apps/mobile/lib/api.ts`
- Any component files (unless a trivial hardcoded-width fix)
- `CLAUDE.md`, `documents/DESIGN.md`, `documents/CONCEPT.md`

## Acceptance criteria
1. `apps/mobile/eas.json` exists and is valid JSON.
2. `apps/mobile/app.json` has `orientation: default`, `bundleIdentifier: com.panelsync.app`, `buildNumber: 1`.
3. `apps/mobile/.env.example` documents `EXPO_PUBLIC_API_URL`.
4. `npx tsc --noEmit -p apps/mobile/tsconfig.json` still passes.
5. Completion note lists any layout issues found in the scan.

---

## Completion Note (Codex fills in)

_Status: `needs Claude review`_
_Files changed:_
_Verification:_
_Layout issues found:_
