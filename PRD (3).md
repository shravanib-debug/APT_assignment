# Product Requirements Document — Experimental Check

Version: 0.1-experimental

## Overview

This short PRD is an extra file created for testing. It contains a few random changes and notes so you can verify tooling, diffing, or CI behaviors.

## Random Changes

- Change: Updated success criteria to include a non-deterministic toggle.
- Change: Added a temporary feature flag `enableRandomFlows` (default: false).
- Change: Adjusted sample API path from `/api/v1/items` to `/api/v1/test-items`.

## Acceptance Criteria

1. The app can start with `enableRandomFlows` set to true without crashing.
2. The `/api/v1/test-items/health` endpoint returns `200 OK` for health checks.

## Notes for Developers

- This file is not authoritative. It's safe to delete after testing.
- Example environment variable for testing: `ENABLE_RANDOM_FLOWS=true`

## Quick Test Commands

Use these to exercise the toggle locally (PowerShell):

```
$env:ENABLE_RANDOM_FLOWS = "true"
node server/index.js
```

## Changelog

- 2026-05-20: Created experimental PRD with random changes for validation.
