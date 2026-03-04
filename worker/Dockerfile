FROM mcr.microsoft.com/playwright:noble AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY src ./src
RUN npm run build

# ---

FROM mcr.microsoft.com/playwright:noble

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/main"]
