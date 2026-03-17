# Workflow Automation API

A production-ready RESTful API for automating business workflows and integrating third-party services — Airtable, Slack, and Email — built with Node.js and Express.

Designed to mirror real-world automation patterns used in platforms like n8n and Make: event-driven webhook processing, multi-step workflow orchestration, structured logging, input validation, and containerized deployment.

---

## Features

- **Webhook receiver** — accepts incoming events and routes them to the appropriate handler
- **Client onboarding workflow** — creates an Airtable record, notifies Slack, and sends a welcome email in a single API call
- **Slack notifications** — supports both Bot Token (dynamic channel) and Incoming Webhook
- **Email delivery** — integrated with SendGrid
- **Input validation** — all endpoints validated with `express-validator`
- **Rate limiting** — built-in protection with `express-rate-limit`
- **Structured logging** — Winston with file and console transports
- **Health check endpoint** — ready for load balancer and container orchestration
- **Mock mode** — works locally without any API keys configured
- **Dockerized** — single command to run the full stack

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 4 |
| Validation | express-validator |
| HTTP Client | Axios |
| Logging | Winston |
| Testing | Jest + Supertest |
| Container | Docker + Docker Compose |
| Integrations | Airtable · Slack · SendGrid |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (optional)

### 1. Clone the repository

```bash
git clone https://github.com/edgardtech/workflow-automation-api.git
cd workflow-automation-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your credentials. The API runs in **mock mode** without real credentials — all integration steps are logged and skipped gracefully.

### 4. Run in development

```bash
npm run dev
```

### 5. Run with Docker

```bash
docker-compose up --build
```

The API will be available at `http://localhost:3000`.

---

## API Reference

### Health Check

```
GET /health
```

```json
{
  "status": "ok",
  "uptime": 42.3,
  "timestamp": "2025-03-16T10:00:00.000Z"
}
```

---

### Webhooks

#### Receive a webhook event

```
POST /api/webhooks/receive
```

**Body:**
```json
{
  "event": "client.created",
  "payload": {
    "name": "Alice",
    "email": "alice@company.com"
  }
}
```

**Supported events:**

| Event | Description |
|---|---|
| `client.created` | Creates an Airtable record for the new client |
| `ride.booked` | Sends a Slack notification to `#rides` |
| `ride.completed` | Updates ride status in Airtable |
| `payment.received` | Logs the payment event |

#### Get webhook logs

```
GET /api/webhooks/logs?limit=10
```

---

### Workflows

#### Run client onboarding

```
POST /api/workflows/onboard
```

**Body:**
```json
{
  "name": "Alice",
  "email": "alice@company.com",
  "company": "Acme Corp"
}
```

**Response:**
```json
{
  "success": true,
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Onboarding workflow completed for alice@company.com",
  "steps": [
    { "step": "airtable_record_created", "status": "success" },
    { "step": "slack_notification_sent", "status": "success" },
    { "step": "welcome_email_sent", "status": "success" }
  ]
}
```

#### Get workflow execution status

```
GET /api/workflows/:id/status
```

---

### Notifications

#### Send a Slack message

```
POST /api/notifications/slack
```

```json
{
  "channel": "#general",
  "message": "Deployment completed successfully 🚀"
}
```

#### Send an email

```
POST /api/notifications/email
```

```json
{
  "to": "user@example.com",
  "subject": "Welcome!",
  "body": "Hi, your account is ready."
}
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage
```

Tests cover:
- Workflow event routing
- Onboarding step execution
- API route validation
- Error handling

---

## Project Structure

```
workflow-automation-api/
├── src/
│   ├── app.js                  # Express setup, middleware, routes
│   ├── index.js                # Server entry point
│   ├── config/
│   │   └── logger.js           # Winston logger
│   ├── controllers/
│   │   ├── webhook.controller.js
│   │   ├── workflow.controller.js
│   │   └── notification.controller.js
│   ├── routes/
│   │   ├── webhook.routes.js
│   │   ├── workflow.routes.js
│   │   └── notification.routes.js
│   ├── services/
│   │   ├── workflow.service.js  # Core automation logic
│   │   ├── airtable.service.js
│   │   ├── slack.service.js
│   │   └── email.service.js
│   └── middlewares/
│       ├── errorHandler.js
│       └── validateRequest.js
├── tests/
│   ├── api.test.js             # Integration tests
│   └── workflow.service.test.js
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Author

**Edgard Ferreira Rodrigues**  
Full-Stack Engineer · Node.js · APIs · Automation  
[linkedin.com/in/edgard-ferreira-rodrigues](https://linkedin.com/in/edgard-ferreira-rodrigues) · [github.com/edgardtech](https://github.com/edgardtech)
