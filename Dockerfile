FROM node:12.20.0-alpine

ENV TZ Europe/Rome

WORKDIR /app

COPY .config/ /root/.config/

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . ./
RUN yarn build

ENTRYPOINT ["node", "dist/bot/"]