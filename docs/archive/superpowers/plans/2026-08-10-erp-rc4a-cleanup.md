# ERP RC4a Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce ERP RC4a items by adding missing utoipa annotations and OpenAPI registrations for existing backend routes.

**Architecture:** Use `scripts/audit/p04_rc4_deep.mjs` and a temporary ERP extractor to identify frontend paths still absent from aggregated OpenAPI. Fix routes in `svc/erp/src/modules/*.rs`, register handlers in `svc/erp/src/openapi.rs`, then regenerate `tmp/openapi/topems-erp-openapi.json` and `docs/api/openapi-aggregated.json`.

**Tech Stack:** Rust, Axum, utoipa, OpenAPI JSON aggregation, TypeScript frontend API audit.

---

### Task 1: Generate ERP RC4a inventory

**Files:**
- Create temporary script outside workspace: `/Users/xingzhai/.trae-cn/work/6a791764dce1c02e1d954e4c/list_erp_rc4a.mjs`
- Read: `docs/api/openapi-aggregated.json`
- Read: `apps/web/src/api/erp/**/*.ts`

- [ ] Create a temporary extractor that mirrors `p04_rc4_deep.mjs` frontend URL parsing and filters `service === "erp"`.
- [ ] Group output by frontend file and resource stem.
- [ ] Use the grouped list to choose the first high-yield backend module.

### Task 2: Fix first ERP route batch

**Files:**
- Modify the ERP module file containing the chosen route batch.
- Modify `svc/erp/src/openapi.rs`.

- [ ] Add `#[utoipa::path]` annotations to existing handlers that lack them.
- [ ] Make handlers `pub` if they need to be referenced by `ErpApiDoc`.
- [ ] Register handlers in the `paths(...)` section of `ErpApiDoc`.
- [ ] Keep path parameter names aligned with frontend template literals.

### Task 3: Verify

**Commands:**
- `cargo check -p topems-erp`
- `cargo test -p topems-erp --test openapi_extract extract_openapi_spec -- --nocapture`
- `cp tmp/openapi/topems-erp.json tmp/openapi/topems-erp-openapi.json`
- `python3 scripts/openapi/aggregate.py`
- `node scripts/audit/p04_rc4_deep.mjs`
- `pnpm --filter topems-portal typecheck`

- [ ] Confirm ERP RC4a decreases from the current baseline of 186.
- [ ] Record the batch result in `docs/roadmap/TODO.md`.
