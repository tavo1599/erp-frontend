# ============================================
# Multi-stage build para Frontend Vue + Vite
# ============================================

# ----------- ETAPA 1: BUILD -----------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar TODAS las dependencias (incluidas devDependencies para poder compilar)
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Argumento de build (URL del backend en producción)
ARG VITE_API_URL=https://api.faktur.pe
ENV VITE_API_URL=${VITE_API_URL}

# Compilar Vue con Vite (genera dist/)
RUN npm run build


# ----------- ETAPA 2: PRODUCCIÓN (Nginx) -----------
FROM nginx:alpine AS production

# Copiar configuración personalizada de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos compilados al directorio que sirve Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto 80 (HTTP)
EXPOSE 80

# Comando para arrancar Nginx
CMD ["nginx", "-g", "daemon off;"]