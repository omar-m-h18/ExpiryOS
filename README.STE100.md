# ExpiryOS — Technical Specification and User Manual (ASD-STE100)

## Part 1: ASD-STE100 Standard Overview and Conversion Principles

ASD-STE100 (Simplified Technical English) is an international standard for technical documentation. The specification controls vocabulary, grammar, and sentence structure to eliminate ambiguity and assist international readers.

### Applied Rules in this Document

1. **Rule 1.1 (Vocabulary):** Use only approved words from the STE dictionary. Each approved word has only one meaning and one part of speech.
   - *Example:* The word "close" is an approved verb. It is not an approved adverb or adjective.
   - *Example:* Unapproved terms such as "manage", "various", and "etc." are prohibited. Use specific verbs such as "control", "record", or "delete".

2. **Rule 2.1 (Sentence Length):**
   - Descriptive sentences must not have more than 25 words.
   - Procedural sentences (instructions) must not have more than 20 words.

3. **Rule 3.1 & 3.2 (Voice and Mood):**
   - Use active voice for descriptions.
   - Use the imperative mood (command form) for procedural instructions. Do not use passive instructions.

4. **Rule 2.2 (Noun Clusters):**
   - Do not use more than three consecutive nouns. Insert prepositions or hyphens to clarify relationships.
   - *Example:* "Database connection pool timeout configuration" is rewritten as "Configuration of the timeout for the database connection pool".

5. **Rule 5.1 (Clarity and Layout):**
   - Present procedural instructions in sequential, numbered lists.
   - Keep descriptive explanations separate from procedural steps.

---

## Part 2: ExpiryOS Manual in ASD-STE100

### 1. Description

ExpiryOS is a web application that tracks expiration dates. The application monitors dates for licenses, subscriptions, documents, policies, and product warranties.

The application calculates the item status when a user requests the data. The application does not save the status value in the database.

The application calculates three status values:
- **Active:** The item has more than 30 days before expiration.
- **Expiring Soon:** The item has 30 days or less before expiration.
- **Expired:** The expiration date is in the past.

### 2. Functional Capabilities

The application provides these functional capabilities:
- Create, read, update, and delete item records.
- Calculate item status automatically during each request.
- Show an overview display with counters for all item status types.
- Search items by title or category with debounced input.
- Filter items by status with URL query parameters.
- Provide fast-selection buttons for standard categories.
- Provide an interactive, guided walkthrough for an empty room.
- Select light mode or dark mode for the display.
- Adjust the layout for desktop displays and mobile phone displays.
- Provide an OpenAPI 3.1 specification as the single interface definition.
- Isolate visitor data in an anonymous room with an HMAC-SHA256 signed session cookie.

### 3. Tenancy and Data Protection

The live demonstration operates as an isolated multi-tenant system without user registration:
- **Session Identification:** The server gives each visitor an HTTP cookie named `expiryos_demo`. The server signs this cookie with HMAC-SHA256.
- **Data Isolation:** The database attaches an `ownerId` value to each record. The server accepts database operations only for the matching `ownerId` value.
- **Session Lifecycle:** The session cookie does not contain an expiration timestamp. When the visitor closes the browser, the session ends.
- **Initial State:** A new session starts with zero database records. The server does not write records to the database until the user requests an action.
- **Storage Limits:** Each session has a limit of 10 items. When a session reaches 10 items, the server rejects new items with HTTP status code 409.

### 4. Technical Architecture

| Component | Technology | Function |
|---|---|---|
| **Frontend** | React 19, Vite 7 | User interface with Tailwind CSS 4 |
| **Routing** | Wouter | Client-side page navigation |
| **Data Fetching** | TanStack Query v5 | Automated communication with the server |
| **Form Control** | React Hook Form, Zod | Input validation |
| **Backend API** | Express 5, Node.js 24 | Application logic and REST endpoints |
| **Database** | PostgreSQL, Drizzle ORM | Persistent data storage |
| **Interface Specification** | OpenAPI 3.1 | Shared data contracts |

### 5. System Requirements

Before you install the software, verify that your system has these components:
- Node.js version 24 or newer.
- pnpm package manager version 10.30.3.
- PostgreSQL database version 15 or newer.

### 6. Installation Procedure

Do these steps in the specified sequence:

1. Clone the repository from GitHub:
   ```bash
   git clone https://github.com/omar-m-h18/ExpiryOS
   cd ExpiryOS
   ```

2. Install all dependencies:
   ```bash
   pnpm install
   ```

3. Set the database connection string in your terminal environment:
   ```bash
   export DATABASE_URL="postgresql://postgres:password@localhost:5432/expirytracker"
   ```

4. Apply the database schema:
   ```bash
   pnpm --filter @workspace/db run push
   ```

### 7. Configuration Procedure

The application reads configuration values directly from system environment variables.

| Variable Name | Status | Function | Default Value |
|---|---|---|---|
| `DATABASE_URL` | Mandatory | PostgreSQL connection string | None |
| `SESSION_SECRET` | Mandatory in production | Key for HMAC-SHA256 signature verification | None |
| `PORT` | Mandatory | Network port for the backend server | None |
| `NODE_ENV` | Optional | Set to `production` for production environments | `development` |
| `EXPIRING_SOON_DAYS` | Optional | Number of days for the warning threshold | `30` |
| `MAX_ITEMS_PER_OWNER` | Optional | Maximum number of records for each session | `10` |

### 8. Operation Procedure

Start the backend API server and the frontend interface in two separate terminals.

1. In the first terminal, build and start the backend server:
   ```bash
   pnpm --filter @workspace/api-server run build
   NODE_ENV=development pnpm --filter @workspace/api-server run start
   ```

2. In the second terminal, set the API target address:
   ```bash
   export VITE_API_BASE_URL="http://localhost:3001"
   ```

3. Start the frontend interface:
   ```bash
   pnpm --filter @workspace/expiry-os run dev
   ```

4. Open your web browser.

5. Navigate to `http://localhost:3000`.

### 9. Verification Procedure

Verify system integrity with these automated tests:

1. Validate TypeScript types across all workspace packages:
   ```bash
   pnpm run typecheck
   ```

2. Run the API unit tests:
   ```bash
   pnpm --filter @workspace/api-server test
   ```

3. Run the database integration tests:
   ```bash
   RUN_DB_TESTS=1 pnpm --filter @workspace/api-server test
   ```

### 10. Application Programming Interface (API) Reference

All application endpoints use the base path `/api`.

| HTTP Method | Route | Description | Expected Status |
|---|---|---|---|
| `GET` | `/healthz` | Checks system health. | 200 OK |
| `GET` | `/session` | Returns the session validation data. | 200 OK |
| `POST` | `/session/reset` | Clears the session and adds 4 sample records. | 200 OK |
| `GET` | `/items` | Returns filtered items for the active session. | 200 OK |
| `POST` | `/items` | Creates a new record for the active session. | 201 Created |
| `GET` | `/items/summary` | Returns counters for all status types. | 200 OK |
| `GET` | `/items/:id` | Returns one item record. | 200 OK |
| `PATCH` | `/items/:id` | Updates specified fields in an item record. | 200 OK |
| `DELETE` | `/items/:id` | Deletes the specified item record. | 204 No Content |

### 11. Mathematical Rules for Expiration Status

The backend calculates all status values with Universal Coordinated Time (UTC). This calculation prevents errors from local time zones and Daylight Saving Time:

```
todayUtc = Current date at 00:00:00 UTC
expiryUtc = Item expiration date at 00:00:00 UTC

daysRemaining = Round((expiryUtc - todayUtc) / 86400000)

If daysRemaining < 0:
    Status = "expired"
If 0 <= daysRemaining <= 30:
    Status = "expiring_soon"
If daysRemaining > 30:
    Status = "active"
```

