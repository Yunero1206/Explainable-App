# AR-S8 — Remove superseded V2 runtime

## Outcome

After the V3 live/replay/UI/persistence path is proven, remove the rejected V2 runtime and any now-unused adapter seams. Convert remaining sample data directly to V3. This is a deletion slice, not a redesign.

## Allowed changes

- `src/types.ts` — delete when imports reach zero
- `src/schema.ts` — delete when imports reach zero
- `src/inferenceProvider.ts` — delete when imports reach zero
- `src/canonical/**` — delete when imports reach zero
- `src/domain/currentProjection.ts` — delete
- `src/domain/commitBoundary.ts` — delete
- `src/domain/clientCommit.ts` — delete
- `src/storage/caseStore.ts` — delete
- `src/storage/blobStore.ts` — delete
- `server/reconstruction.ts` — delete
- `server/productionService.ts` — delete
- `src/data/sampleCases.ts` — finish direct V3 authoring/imports
- source/server files that import a deleted module — import-only or dead-branch removal, enumerated exactly in the handshake
- `tests/v2Absence.test.ts` — add if useful
- `project-context/ACTIVE_WORK.md` — checkpoint only
- `project-context/CURRENT_STATE.md` — verified facts only

No file may be deleted until `rg` proves no active runtime/test import depends on it and the V3 gates already pass before deletion.

## Required proof

- There is one ledger contract and one provider boundary.
- No source/server path references full-snapshot reconstruction, V2 canonical upgrade/projection or provider-owned IDs.
- No lossy placeholder projection remains.
- No hard-coded `gemini-3.6-flash`, model alias or Flash-Lite path remains.
- App, server, replay, translation and persistence use V3 imports only.
- Directly authored sample cases validate under V3.

## Counterexamples

- Deleting V2 before the V3 aggregate baseline passes.
- Keeping compatibility wrappers that preserve the old full-snapshot path.
- Broad component/CSS refactor while fixing imports.
- Migrating V2 user data silently; V0 uses a new V3 database and retains V2 data untouched.
- Relaxing TypeScript/schema validation to get import cleanup through.

## Gates

```bash
npm test
npm run typecheck
npm run build
! rg -n "src/canonical|currentProjection|commitBoundary|clientCommit|reconstruction|productionService|gemini-3\.6-flash" src server tests
rg -n "\bany\b|as unknown as" src server
git diff --check
```

The forbidden-runtime search must be empty. Architecture docs/history references are outside that search.
