FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npx tsc

FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist dist/
COPY knowledge/ knowledge/
COPY agents/ agents/
COPY koshas/ koshas/
COPY protocols/ protocols/
COPY manifest.yaml ./
ENV NODE_ENV=production
EXPOSE 3333
CMD ["node", "dist/serve.js"]
