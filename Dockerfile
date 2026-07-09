# 베이스 이미지 설정
FROM node:22-alpine

# 작업 디렉토리 설정
WORKDIR /app

# 운영 환경 설정
ENV NODE_ENV=production

# 의존성 파일 먼저 복사하여 Layer Cache 활용
COPY package*.json ./

# lock 파일을 기준으로 운영 의존성만 설치
RUN npm ci --omit=dev

# 프로젝트 소스 코드 복사
COPY . .

# 애플리케이션 실행 포트
EXPOSE 3000

# 컨테이너 실행 시 애플리케이션 시작
CMD ["node", "app.js"]