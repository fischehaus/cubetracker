# Frontend-Build + nginx-Serve (W.api-prefix, Hetzner/Coolify).
# Eine Domain: nginx serviert die Vite-Build-Dateien + proxyt /api ans Backend.
FROM node:22-slim AS build
WORKDIR /app
COPY . .
ARG VITE_API_BASE=/api
ENV VITE_API_BASE=$VITE_API_BASE
RUN npm install && npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
