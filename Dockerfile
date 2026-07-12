# Node.js 22 Alpine 기반 이미지 사용
FROM node:22-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 운영 환경 설정
ENV NODE_ENV=production

# Health Check에 사용할 wget 설치
RUN apk add --no-cache wget

# 의존성 파일 먼저 복사하여 Layer Cache 활용
COPY package*.json ./

# lock 파일을 기준으로 운영 의존성만 설치
RUN npm ci --omit=dev

# 프로젝트 소스 코드 복사
COPY . .

# 보안을 위해 Node 기본 사용자가 애플리케이션을 실행하도록 권한 변경
RUN chown -R node:node /app

# Root 대신 Node 사용자로 컨테이너 실행
USER node

# 애플리케이션 실행 포트
EXPOSE 3000

# 컨테이너 상태 확인
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# 컨테이너 실행 시 애플리케이션 시작
CMD ["node", "app.js"]