# Local-First Collaborative Document Editor

A production-oriented collaborative document editor designed around **local-first principles**. Users can continue editing documents while offline, persist changes locally, automatically synchronize when connectivity returns, and safely reconcile concurrent edits using conflict-free replicated data types (CRDTs).

**Live Application:** [https://local-first-doc-editor-seven.vercel.app/]

**Repository:** [https://github.com/hejazi-zarkawi/local-first-doc-editor/]

---

## Overview

Traditional collaborative editors are often server-first: users depend on an active network connection to load, edit, and save their work.

This project explores a different architecture.

The browser maintains a persistent local copy of document state using **IndexedDB**, allowing documents to remain editable even when the network is unavailable. Changes are represented using **Yjs CRDT updates**, persisted locally, and synchronized with the backend when connectivity is available.

The application also includes authentication, document-level role-based access control, version history, automated testing, and CI/CD.

---

## Key Features

- Local-first document editing
- Offline editing with persistent local storage
- Automatic synchronization after reconnecting
- Deterministic conflict resolution using CRDTs
- Multi-user collaborative document editing
- Document-level Owner, Editor, and Viewer roles
- Version history and snapshot restoration
- Secure authentication and authorization
- Payload validation and synchronization safeguards
- Optional AI-assisted writing features
- Unit and end-to-end testing
- Automated CI/CD pipeline

---

## Architecture

### Local-First Editing

The application treats the browser's locally persisted document state as a core part of the architecture rather than adding offline support as an afterthought.

**Yjs** manages the collaborative document state, while **y-indexeddb** persists the Yjs document locally in the browser.

This allows users to:

1. Open and edit locally available documents without depending on an active connection.
2. Continue editing when connectivity is lost.
3. Persist changes in the browser.
4. Queue synchronization updates.
5. Reconcile local and remote changes when connectivity returns.

The result is an editing experience that remains usable even during temporary network failures.

---

## Conflict Resolution with CRDTs

Collaborative systems need a strategy for resolving concurrent edits.

Several common approaches exist:

| Approach | Trade-off |
|---|---|
| Last-write-wins | Simple, but concurrent changes can be silently overwritten |
| Operational Transformation | Effective for real-time collaboration but typically relies on coordinated operation ordering |
| CRDT | Replicas can independently process changes and converge after receiving the same updates |

This project uses **Yjs**, a CRDT implementation designed for collaborative applications.

Yjs updates are designed to be merged regardless of the order in which they arrive, allowing independently edited document replicas to converge after synchronization.

CRDT convergence and update idempotency are tested in:

```text
tests/unit/crdt-merge.test.ts
```

---

## Synchronization Strategy

The deployed application uses an HTTP-based synchronization mechanism.

Local updates are queued and synchronized with the backend using dedicated sync endpoints. The client periodically exchanges Yjs updates with the server and merges remote changes into its local document state.

The synchronization flow can be summarized as:

```text
User edits document
        ↓
Yjs updates local document state
        ↓
Changes persist in IndexedDB
        ↓
Updates enter the synchronization queue
        ↓
Client sends queued updates to the server
        ↓
Server merges and stores document state
        ↓
Other clients retrieve unseen updates
        ↓
Yjs merges updates deterministically
```

Updates are batched and flushed after a short debounce period to avoid sending a network request for every individual keystroke.

---

## Offline and Reconnection Handling

The synchronization layer is designed to handle temporary network failures.

If synchronization fails, pending updates remain available locally and can be retried later.

When connectivity returns, the application reconciles local and server-side document state through the synchronization process.

Because Yjs updates are designed to be idempotent, receiving the same update more than once does not result in duplicated document content.

---

## Version History

The application supports document snapshots that allow users to navigate previous versions of a document.

Restoring a historical version is handled as a new state transition rather than simply rewriting the document's history. This preserves the collaborative nature of the document while allowing previous states to be restored.

---

## Authentication and Authorization

Authentication is implemented using **Auth.js / NextAuth** with JWT-based sessions.

Authorization is enforced at the document level through three roles:

- **Owner** — full document access
- **Editor** — can view and modify document content
- **Viewer** — read-only access

This allows the same user to have different permissions across different documents.

Authorization checks protect synchronization and document operations so that read-only users cannot submit document modifications.

---

## Sync Payload Protection

Synchronization endpoints validate incoming updates before they are applied to document state.

The application includes safeguards for:

- Oversized request payloads
- Excessively large individual updates
- Oversized update batches
- Malformed CRDT updates

Potentially invalid Yjs updates are validated before being applied to the actual document state.

Related validation tests are located in:

```text
tests/unit/validate.test.ts
```

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Radix UI

### Local-First Collaboration

- Yjs
- y-indexeddb

### Backend

- Next.js Route Handlers
- PostgreSQL
- Prisma ORM

### Authentication

- Auth.js / NextAuth
- JWT sessions

### Validation

- Zod

### AI Integration

- AI SDK
- Groq

### Testing

- Vitest
- Playwright

### DevOps

- GitHub Actions
- Vercel

---

## Project Structure

```text
local-first-doc-editor/
│
├── .github/
│   └── workflows/          # CI/CD workflows
│
├── prisma/                 # Database schema and migrations
│
├── src/                    # Application source code
│
├── tests/                  # Unit and end-to-end tests
│
├── .env.example            # Environment variable template
├── next.config.ts          # Next.js configuration
├── package.json            # Dependencies and scripts
├── playwright.config.ts    # End-to-end test configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── vitest.config.ts        # Unit test configuration
```

---

## Getting Started

### Prerequisites

Make sure you have:

- Node.js 22 or later
- PostgreSQL
- npm

### Installation

Clone the repository:

```bash
git clone <your-repository-url>
cd local-first-doc-editor
```

Install dependencies:

```bash
npm install
```

Create your local environment configuration:

```bash
cp .env.example .env
```

Configure the required environment variables in `.env`.

Run the database migrations:

```bash
npm run prisma:migrate
```

Seed the development database if required:

```bash
npm run seed
```

Start the development server:

```bash
npm run dev
```

The application will be available locally at:

```text
http://localhost:3000
```

---

## Running Tests

Run unit tests:

```bash
npm run test
```

Run end-to-end tests:

```bash
npm run test:e2e
```

The test suite covers critical application behavior including CRDT convergence, synchronization validation, offline editing, and role-based access restrictions.

---

## Testing Offline Editing

To test the local-first workflow:

1. Sign in to the application.
2. Open a document.
3. Open browser developer tools.
4. Navigate to the **Network** tab.
5. Change the network state to **Offline**.
6. Continue editing the document.
7. Restore the network connection.

Changes made while offline remain available locally and are synchronized when connectivity returns.

---

## Deployment

The application is deployed using **Vercel**, with PostgreSQL used for persistent server-side storage.

The production environment requires the appropriate database, authentication, and optional AI integration environment variables.

The repository also includes a GitHub Actions workflow for automated validation of code changes.

---

## Scaling Considerations

The current architecture stores merged Yjs document state and maintains synchronization operations.

For a larger production deployment, potential improvements include:

- Periodic compaction and garbage collection of document state
- Archiving older synchronization operations
- Background processing for maintenance tasks
- Dedicated real-time infrastructure
- Horizontal scaling of synchronization services
- Monitoring and observability for synchronization failures

---

## Future Improvements

A future version could introduce a dedicated WebSocket collaboration service for lower-latency synchronization and presence features.

Potential additions include:

- Real-time cursor presence
- Live collaborator indicators
- Selection awareness
- Document comments
- Sharing through invitations
- Advanced document permissions
- Audit logs
- Improved synchronization observability

A dedicated long-running collaboration service could use a WebSocket-based Yjs provider while keeping the main application deployed independently.

---

## What I Learned

Building this project involved working through several challenges common to distributed and collaborative applications:

- Designing an offline-capable editing workflow
- Understanding CRDT-based conflict resolution
- Persisting collaborative state locally
- Synchronizing state across multiple replicas
- Handling network interruptions and retries
- Designing document-level authorization
- Protecting synchronization endpoints
- Testing distributed state convergence
- Deploying a full-stack application with automated CI

The project provided practical experience with architectural trade-offs that go beyond traditional CRUD-based web applications.

---

## Author

**Mohammad Umar Al Hejazi**

Software Developer

**GitHub:** [https://github.com/hejazi-zarkawi/]

**LinkedIn:** [https://www.linkedin.com/in/mohammad-umar-al-hejazi/]
