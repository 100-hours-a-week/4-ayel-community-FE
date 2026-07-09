#!/bin/bash

# 명령 실행 중 오류가 발생하면 배포 중단
set -e

IMAGE_TAG=$1
TARGET_COLOR=$2

echo "FE 배포 시작"
echo "Image Tag: $IMAGE_TAG"
echo "Target Color: $TARGET_COLOR"

# 배포 대상 환경에 따라 Compose 파일과 포트 선택
if [ "$TARGET_COLOR" = "blue" ]; then
  COMPOSE_FILE="compose.blue.yml"
  TARGET_PORT=80
elif [ "$TARGET_COLOR" = "green" ]; then
  COMPOSE_FILE="compose.green.yml"
  TARGET_PORT=81
else
  echo "잘못된 Target Color: $TARGET_COLOR"
  exit 1
fi

echo "Compose File: $COMPOSE_FILE"
echo "Target Port: $TARGET_PORT"

# Blue와 Green의 Compose 프로젝트 분리
PROJECT_NAME="community-fe-${TARGET_COLOR}"

echo "Project Name: $PROJECT_NAME"

# 새 이미지 Pull 및 컨테이너 실행
IMAGE_TAG="$IMAGE_TAG" docker compose \
  -p "$PROJECT_NAME" \
  -f "$COMPOSE_FILE" \
  up -d --pull always

# 새 환경 Health Check
echo "Health Check 시작"

for i in {1..10}; do
  if curl -fsS "http://localhost:${TARGET_PORT}" > /dev/null; then
    echo "Health Check 성공"
    echo "FE $TARGET_COLOR 배포 완료"
    exit 0
  fi

  echo "Health Check 재시도: $i/10"
  sleep 3
done

echo "Health Check 실패"
exit 1