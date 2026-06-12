# Tooling Scope

The first tool goal is official API discovery, not third-party site cloning. Discovery tools should extract candidate hosts, URL paths, headers, request keys, response keys, and player-stat terminology from official website bundles and official client artifacts.

Confirmed official APIs can become collectors only after their request / response shape is documented in `docs/research/api-inventory.md`.

Strings-only scans are useful for host discovery but weak for endpoint discovery in Unity clients. Treat Unity asset-bundle path matches as noise unless the same path is corroborated by decompiled call sites or live traffic.

## Tool Stages

1. Static discovery: scan website bundles, APK contents, EXE strings, and decoded resources for hosts, URL paths, headers, and schema-like keys.
2. Candidate inventory: store candidate endpoints and supporting evidence in docs.
3. Live verification: make minimal requests only when allowed by authentication, terms, and rate limits.
4. Collector implementation: write explicit fetchers for confirmed accessible APIs.

## Collector Rules

Collectors must not rely on undocumented guesses hidden in code. Each collector needs a matching docs entry that names endpoint, method, parameters, headers, authentication, pagination, response schema, and source evidence.

Player-data collectors should preserve raw API responses under ignored data directories first. Normalized tables can come after the schema is stable.
