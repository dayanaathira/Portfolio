# Dayana Athira — Portfolio

Black terminal-style portfolio built with Angular 17 + NestJS + PostgreSQL.

## Project structure

```
portfolio/
├── portfolio-angular/     ← Angular frontend (this repo)
│   ├── src/app/
│   │   ├── components/terminal/   ← main terminal UI
│   │   ├── services/
│   │   │   ├── api.service.ts     ← all HTTP calls
│   │   │   └── terminal.service.ts ← command logic
│   │   └── models/index.ts        ← all interfaces
│   ├── nginx.conf                 ← nginx for docker
│   └── Dockerfile
├── portfolio-api/         ← NestJS backend
│   └── Dockerfile
├── nginx/
│   └── nginx.conf         ← reverse proxy config
├── docker-compose.yml     ← full stack
└── deploy.sh              ← one-command deploy
```

## Local development

```bash
# 1. start the NestJS API
cd portfolio-api
cp .env.example .env     # fill in your values
npm install
npm run start:dev        # runs on http://localhost:3000

# 2. start the Angular frontend
cd portfolio-angular
npm install
ng serve                 # runs on http://localhost:4200
```

## First-time server setup (Hetzner)

```bash
# SSH into your server
ssh root@your-server-ip

# Install Docker
apt update && apt upgrade -y
apt install -y docker.io docker-compose-plugin git
systemctl enable docker

# Add swap (safety net for 2GB RAM)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Clone your repo
git clone https://github.com/yourusername/portfolio.git /var/www/portfolio
cd /var/www/portfolio

# Copy and fill env file
cp portfolio-api/.env.example portfolio-api/.env
nano portfolio-api/.env

# Get SSL cert first (before starting nginx with SSL)
apt install certbot -y
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Deploy!
bash deploy.sh
```

## Updating your portfolio content

All content is driven by the NestJS API. Update via:
- `PATCH /api/profile` — update bio, metrics, status
- `PATCH /api/projects/:id` — update a project
- `PATCH /api/experience/:id` — update a job entry
- `POST /api/blog` — add a blog post

Use Swagger UI at `https://yourdomain.com/api/docs` to manage content.

## Adding a new terminal command

1. Add the command to `COMMANDS` array in `terminal.service.ts`
2. Add a handler method `cmdYourCommand()`
3. Add the case to the `resolve()` method
4. Add a shortcut button in `terminal.component.ts` shortcuts getter

## Environment variables

```env
# portfolio-api/.env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=portfolio_db
DB_USER=postgres
DB_PASSWORD=strongpassword

JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

ADMIN_EMAIL=dayana@yourdomain.com
ADMIN_PASSWORD=adminpassword

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your@gmail.com
MAIL_TO=dayana@yourdomain.com

PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
```
