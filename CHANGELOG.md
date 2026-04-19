# Changelog

## v1.21.15 - 2026-04-20

### Changed

- Saved account-bind selections with durable `auth_identity` values when available, while keeping `auth_index` for compatibility.
- Displayed existing `auth_index` labels in credential binding dropdowns and mapped old configs to the new stable identity option automatically.
- Removed stale binding fields before writing API key entries to avoid keeping outdated account references in YAML.

## v1.21.14 - 2026-04-19

### Changed

- Updated the monitor request-log duration column to display first-token latency instead of total request duration.
- Renamed the request-log duration label from total duration to first token in Chinese and English local locales.
