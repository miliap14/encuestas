FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

ARG VITE_SUPABASE_ENCUESTAS_URL
ARG VITE_SUPABASE_ENCUESTAS_ANON_KEY
ARG VITE_SUPABASE_PERSONAS_URL
ARG VITE_SUPABASE_PERSONAS_ANON_KEY
ARG VITE_EVOLUTION_API_URL
ARG VITE_EVOLUTION_API_KEY
ARG VITE_EVOLUTION_INSTANCE
ARG VITE_APP_URL

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
