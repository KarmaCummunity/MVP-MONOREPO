## Layers and boundaries (Clean Architecture)

- **Domain (`/domain`):** Pure business logic — independent of `node_modules`, DB, or UI.
- **Application (`/application`):** Use cases / orchestration — interface to external services only through ports/interfaces.
- **Infrastructure:** Implementation details (DB, HTTP, frameworks).

**Dependency direction:** Infrastructure → Application → Domain (inward only).

Note: in the current monorepo, much of the code in `apps/mobile` and `apps/api` is not yet mapped to these layers; this document states the target architecture.