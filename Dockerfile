# Étape 1 : Construire l'application
FROM node:20-alpine AS build
WORKDIR /app

# Argument pour le tag Docker
ARG DOCKER_TAG=unknown

# Copier les fichiers de package et installer les dépendances
COPY package*.json ./
RUN npm install

# Copier le reste des fichiers de l'application et construire l'application
COPY . .
RUN npm run build

# Étape 2 : Configurer l'image de production
FROM node:20-alpine AS production

WORKDIR /app

# Variable d'environnement pour le tag
ARG DOCKER_TAG=unknown
ENV DOCKER_TAG=${DOCKER_TAG}

# Copier uniquement les fichiers nécessaires pour exécuter l'application
COPY --from=build /app/build ./build

# Installer les dépendances de production (déjà incluses dans le build de adapter-node)
# Note: adapter-node inclut node_modules dans le build
COPY --from=build /app/node_modules ./node_modules

EXPOSE 3000

# Démarrer l'application
CMD ["node", "build/index.js"]