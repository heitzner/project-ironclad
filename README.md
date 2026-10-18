# IronClad: Integrated Room Boarding & Campaign Distribution Engine

IronClad is a microservices-based web application developed for the Computer Studies Department at the University of Caloocan City (Congress Campus). The platform integrates real-time venue onboarding for students with an automated digital campaign asset generator for campus events.

## Tech Stack

### Core
![JavaScript](https://img.shields.io/badge/JAVASCRIPT-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/NODE.JS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)

### Web App
![React](https://img.shields.io/badge/REACT-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/VITE-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TAILWIND_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![HTML5 Canvas](https://img.shields.io/badge/HTML5_CANVAS-E34F26?style=for-the-badge&logo=html5&logoColor=white)

### Backend & Real-Time
![Express.js](https://img.shields.io/badge/EXPRESS.JS-000000?style=for-the-badge&logo=express&logoColor=white)
![WebSockets](https://img.shields.io/badge/WEBSOCKETS-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

### Database & Caching
![PostgreSQL](https://img.shields.io/badge/POSTGRESQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/REDIS-DC382D?style=for-the-badge&logo=redis&logoColor=white)

### Tooling
![Git](https://img.shields.io/badge/GIT-F05032?style=for-the-badge&logo=git&logoColor=white)
![GitHub](https://img.shields.io/badge/GITHUB-181717?style=for-the-badge&logo=github&logoColor=white)
![Figma](https://img.shields.io/badge/FIGMA-F24E1E?style=for-the-badge&logo=figma&logoColor=white)
![npm Workspaces](https://img.shields.io/badge/NPM_WORKSPACES-CB3837?style=for-the-badge&logo=npm&logoColor=white)

## System Features

* Real-Time Room Boarding: High-concurrency venue reservation utilizing Redis-backed distributed locks and WebSockets to eliminate race conditions and double-booking.
* Digital Campaign Generator: Browser-based HTML5 Canvas client-side engine enabling students to generate campaign overlays directly.
* MIS Administrative Dashboard: Live, event-driven monitoring for room occupancy state and asset metrics.
* Role-Based Access Control (RBAC): Strict security boundaries separating MIS Administrators, Class Presidents, and Students.
* Automated Event Pipeline: Asynchronous webhooks triggering campaign template generation upon venue approval.

## Monorepo Architecture

This project is organized as a [monorepo](https://monorepo.tools/) managed via npm workspaces:

```text
.
└── project-ironclad
    ├── apps
    │   ├── server
    │   └── web
    │       ├── public
    │       └── src
    │           └── assets
    └── packages
        ├── config
        └── database
```
## Team & Domain Responsibilities

* **Database Lead**: PostgreSQL schema design, migration management, and database seeding via `/packages/database`
* **Frontend Developer**: Client UI, Tailwind Styling, and HTML5 Canvas Engine Implementation via `/apps/web`
* **Backend Developer**: REST APIs, WebSocket event handlers, Redis locking logic via `/apps/server`
* **Fullstack Developer**: Feature Integration across server/client layers, state management and webhooks.
* **Quality Assurance**: Inspect the initial website, analyze possible bugs, loopholes, security measures.

## Setup Instructions

1. Clone the repository:
```
git clone https://github.com/heitzner/project-ironclad
```

2. Install all dependencies across workspaces:
```
npm install
```

3. Run the frontend development server:
```
npm run dev --workspaces=apps/web
```

## Development Workflow

1. Always pull the latest changes from `main` before creating a new branch:
```
git checkout main
git pull origin main
```

2. Create a feature branch following the naming standard (`feat/feature-name` e.g `db/integration-schema`):
```
git checkout -b feat/your-feature
```

3. Open a PR (Pull Request) on GitHub **against** `main` upon completion for code review. Direct pushes to `main` are **restricted**.
