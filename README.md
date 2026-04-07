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