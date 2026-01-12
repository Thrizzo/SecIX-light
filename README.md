# SecIX Light

A streamlined GRC (Governance, Risk, Compliance) platform focused on core security management with AI capabilities.

## Prerequisites

- **Docker** & **Docker Compose** - [Install Docker](https://docs.docker.com/get-docker/)
- **Ollama** (optional, for local AI) - [Download Ollama](https://ollama.com/download)

### Installing Ollama (Recommended)

Ollama provides free, local AI capabilities. Install it before starting SecIX Light:

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows
# Download from https://ollama.com/download

# Pull the recommended model
ollama pull llama3.2
```

> **Note**: If you skip Ollama, you can configure OpenAI API keys in Settings → AI after deployment.

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Executive overview with AI-powered insights |
| **Security Journey** | Guided implementation wizard |
| **Risk Management** | Risk register with AI suggestions |
| **Control Library** | Control management with Control Forge AI |
| **Asset Management** | Primary & secondary asset inventory |
| **AI Assistant** | Fragobert AI helper throughout the app |

## Quick Start

### Option 1: Clone from GitHub

```bash
# Clone the repository
git clone https://github.com/Thrizzo/secix-light.git
cd secix-light

# Copy environment file and configure
cp .env.example .env

# Start all services
docker compose up -d

# With Ollama AI (local LLM)
docker compose --profile ollama up -d
```

### Option 2: Development Mode

```bash
npm install
npm run dev
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=secix_light

# AI Provider (ollama or openai)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# Or use OpenAI
# AI_PROVIDER=openai
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4o-mini
```

## Architecture

```
secix-light/
├── src/
│   ├── app/                 # Main router
│   ├── components/
│   │   ├── ui/              # Shared UI components (shadcn/ui)
│   │   ├── dashboard/       # Dashboard widgets
│   │   ├── journey/         # Security Journey wizard
│   │   ├── risk/            # Risk management
│   │   ├── controls/        # Control library
│   │   ├── assets/          # Asset management
│   │   ├── assistant/       # AI Assistant (Fragobert)
│   │   └── settings/        # Settings panels
│   ├── pages/               # Page components
│   ├── hooks/               # React hooks
│   ├── contexts/            # React contexts
│   ├── lib/                 # Utilities & adapters
│   └── integrations/        # Database client
├── docker/                  # Docker deployment files
└── public/                  # Static assets
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui (Radix primitives)
- **State Management**: TanStack Query
- **Database**: PostgreSQL
- **AI**: Ollama (local) or OpenAI
- **Deployment**: Docker, Kubernetes

## Deployment

### Docker Compose

```bash
# Start all services
docker compose up -d
```

Access at: http://localhost

### Troubleshooting

#### Database Initialization Errors

If you encounter database initialization errors during first startup, the init scripts may have failed mid-execution:

```bash
# Stop all containers and remove volumes (clears database)
docker compose down -v

# Rebuild and restart
docker compose build --no-cache
docker compose up -d
```

> **Note**: The `-v` flag removes volumes including database data. Only use this for fresh installations or when troubleshooting init errors.

#### Docker Network Not Found

If you see an error like:
```
Error response from daemon: failed to set up container networking: network ... not found
```

**Quick Fix:**
```bash
# Stop containers
docker compose --profile ollama down

# Clean up orphaned networks
docker network prune -f

# Restart
docker compose --profile ollama up -d
```

**Full Reset (if quick fix fails):**
```bash
# Stop everything
docker compose --profile ollama down

# Remove the specific network if it exists
docker network rm secix-light-network 2>/dev/null || true

# Clean up all unused networks
docker network prune -f

# Force recreate containers
docker compose --profile ollama up -d --force-recreate
```

#### Table Does Not Exist

If you see errors like `relation "public.confidentiality_levels" does not exist`, the database schema wasn't fully initialized.

**Option A - Keep existing data:**
```bash
docker compose exec -T db psql -U postgres -d postgres < ./docker/init-scripts/002_schema.sql
```

**Option B - Fresh start (wipes all data):**
```bash
docker compose down -v
docker compose up -d
```

#### Container Won't Start

If containers fail to start or keep restarting:

```bash
# Check container logs
docker compose logs api
docker compose logs frontend
docker compose logs db

# Check container status
docker compose ps

# Force rebuild
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### Ollama Connection Issues

If AI features aren't working with Ollama:

```bash
# Verify Ollama is running
docker compose --profile ollama ps

# Check Ollama logs
docker compose logs ollama

# Verify model is available
docker compose exec ollama ollama list

# Pull model if missing
docker compose exec ollama ollama pull llama3.2
```

#### Port Already in Use

If you see "port is already allocated":

```bash
# Find what's using the port (e.g., port 80)
# Windows
netstat -ano | findstr :80

# Linux/macOS
lsof -i :80

# Either stop the conflicting service or change the port in .env
FRONTEND_PORT=8080
API_PORT=3002
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| **frontend** | 80 | Nginx serving the React app |
| **api** | 3001 | Express API server |
| **postgres** | 5432 | PostgreSQL database |
| **ollama** | 11434 | Local AI (optional) |

## Default Credentials

After first deployment, create an admin user via the signup form at http://localhost/auth

## API Endpoints

The API is available at `/api` when running in Docker mode.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | User registration |
| `/api/auth/login` | POST | User login |
| `/api/functions/*` | GET/POST | AI function endpoints |
| `/health` | GET | Health check |

## Upgrading to Full Edition

SecIX Light can be upgraded to the Full edition which includes:

- My Workplace
- Governance & Policies  
- Vendor Management
- Business Continuity / BIA
- Data Protection
- Maturity Assessment
- Security Operations
- AI Governance
- Data Forge

Contact sales for upgrade options.

## License

Proprietary - All rights reserved.

## Support

- Documentation: https://docs.secix.io
- Issues: https://github.com/Thrizzo/secix-light/issues
