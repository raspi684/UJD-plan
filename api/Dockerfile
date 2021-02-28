FROM node:14-alpine as build-stage

USER node
WORKDIR /home/node

COPY . /home/node

RUN npm ci \
    && npm run build

# ---
FROM node:14-alpine as production-stage

USER node
WORKDIR /home/node

COPY --from=build-stage /home/node/package*.json /home/node/
COPY --from=build-stage /home/node/dist/ /home/node/dist/

RUN npm ci

CMD ["node", "dist/main.js"]
