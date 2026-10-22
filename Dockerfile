FROM node:24-bookworm-slim AS build
WORKDIR /app/web
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
COPY web/package.json web/pnpm-lock.yaml web/.npmrc ./
RUN pnpm install --frozen-lockfile
COPY web/app ./app
COPY web/lib ./lib
COPY web/proxy.ts web/next.config.ts web/tsconfig.json ./
ENV APP_MODE=supabase NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:24-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/excel && /opt/excel/bin/pip install --no-cache-dir openpyxl==3.1.5
WORKDIR /app/web
COPY --from=build --chown=node:node /app/web /app/web
COPY --chown=node:node migration_tools/web_excel_worker.py /app/migration_tools/web_excel_worker.py
COPY --chown=node:node baselines/20260920T151632Z/source/app /app/baselines/20260920T151632Z/source/app
COPY --chown=node:node baselines/20260920T151632Z/source/data/park/items.json /app/baselines/20260920T151632Z/source/data/park/items.json
COPY --chown=node:node baselines/20260920T151632Z/source/data/rainwater/items.json /app/baselines/20260920T151632Z/source/data/rainwater/items.json
COPY --chown=node:node baselines/20260920T151632Z/source/templates /app/baselines/20260920T151632Z/source/templates
ENV NODE_ENV=production APP_MODE=supabase EXPORT_PYTHON=/opt/excel/bin/python PYTHONDONTWRITEBYTECODE=1 PYTHONUTF8=1 NEXT_TELEMETRY_DISABLED=1
USER node
EXPOSE 10000
CMD ["sh", "-c", "exec node node_modules/next/dist/bin/next start --hostname 0.0.0.0 --port ${PORT:-10000}"]
