# PostgreSQL Support

This document outlines the support for PostgreSQL as a backend database and details its specific implementation characteristics.

## Overview

The system now supports PostgreSQL alongside MySQL and SQLite, providing flexibility in choosing a database solution. The PostgreSQL integration leverages its native JSONB capabilities and generated columns for efficient querying of filter and sort fields.

## Connection Setup

To use PostgreSQL, you will need to provide a standard PostgreSQL connection string when initializing the entity manager. For example:

```
postgresql://username:password@host:port/database
```

Refer to the entity manager initialization documentation for how to pass this connection string.

## Implementation of Filter and Sort Fields

A key feature of the PostgreSQL implementation is how `filterSortFields` (defined in your entity definitions) are handled. Instead of creating separate physical columns that are manually populated and updated by the application code, the PostgreSQL adapter uses **generated columns**.

-   The primary data for an entity is stored in a `contents` column of type `JSONB`.
-   Each field declared in `filterSortFields` (e.g., `name`, `age`, `isActive`) will correspond to a generated column in the PostgreSQL table.
-   The value for these generated columns is automatically derived by PostgreSQL from the data within the `contents` JSONB column. For example, a `name` field might be generated as `(contents->>'name')`.
-   These generated columns are `STORED`, meaning their values are computed on write and stored on disk, behaving like regular columns for read performance.
-   Indexes are automatically created on these generated columns to ensure efficient filtering and sorting operations.

**Advantages of this approach:**

-   **Data Integrity:** The values in filter/sort columns are always consistent with the `contents` column, as PostgreSQL manages their generation.
-   **Simplified Application Logic:** The application code for creating and updating entities only needs to manage the `contents` JSONB data. It does not need to explicitly set or update values for the filter/sort columns.
-   **Performance:** Indexes on stored generated columns provide efficient query performance for filtering and sorting.

## Development and Testing

### Docker Compose

For local development and testing, a PostgreSQL service is defined in the `docker-compose.yml` file. You can start a PostgreSQL instance using:

```bash
docker-compose up -d postgres
```

This will start a PostgreSQL 13 instance with the database named `supersave`, user `supersave`, and password `savesuper`. The connection string for this local instance would typically be:

`postgresql://supersave:savesuper@localhost:5432/supersave`

(If running tests from within another Docker container linked to the `postgres` service, the host would be `postgres`, e.g., `postgresql://supersave:savesuper@postgres:5432/supersave`).

### Running Tests

The test suite can be run against the PostgreSQL database. Ensure the `CONN` environment variable is set to your PostgreSQL connection string before running the tests. The test helper function `clear()` has been updated to support tearing down PostgreSQL tables.

Example:
```bash
CONN="postgresql://supersave:savesuper@localhost:5432/supersave" npm test
```

Or, if using a dedicated test service in `docker-compose.yml` (like the commented-out `test-postgres` example), that service would have the `CONN` variable pre-configured.
