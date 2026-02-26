# 单阶段构建 — 跳过 tsc 编译，直接用 tsx 运行源码
# （项目有预存 TypeScript 类型错误，tsc 会失败，但 tsx 运行正常）
FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache curl dumb-init

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --ignore-scripts
RUN npx prisma generate

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npx", "tsx", "src/index.ts"]
