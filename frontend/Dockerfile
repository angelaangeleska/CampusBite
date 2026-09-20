FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ENV PORT=80
ENV MENU_SERVICE_URL=http://menu-service:8001
ENV ORDER_SERVICE_URL=http://order-service:8002
ENV NOTIFY_SERVICE_URL=http://notify-service:8003
ENV AUTH_SERVICE_URL=http://auth-service:8004
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY start.sh /start.sh
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["/start.sh"]
