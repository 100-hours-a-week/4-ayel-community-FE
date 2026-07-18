#!/bin/bash

# 명령 실패, 정의되지 않은 변수 사용, 파이프라인 오류 시 즉시 종료
set -euo pipefail

# 전달받은 이미지 태그와 배포 환경 확인
IMAGE_TAG=${1:?IMAGE_TAG가 필요합니다}
TARGET_COLOR=${2:?TARGET_COLOR가 필요합니다}

echo "FE 배포 시작"
echo "Image Tag: $IMAGE_TAG"
echo "Target Color: $TARGET_COLOR"

# 배포 환경에 따라 Compose 파일과 포트 결정
if [ "$TARGET_COLOR" = "blue" ]; then
  COMPOSE_FILE="compose.blue.yml"
  TARGET_PORT=3000
elif [ "$TARGET_COLOR" = "green" ]; then
  COMPOSE_FILE="compose.green.yml"
  TARGET_PORT=3001
else
  echo "잘못된 Target Color: $TARGET_COLOR"
  exit 1
fi

# Blue와 Green을 독립된 Compose 프로젝트로 관리
PROJECT_NAME="community-fe-${TARGET_COLOR}"

echo "Compose File: $COMPOSE_FILE"
echo "Target Port: $TARGET_PORT"
echo "Project Name: $PROJECT_NAME"

# SHA 태그의 이미지를 Pull하여 대상 환경의 컨테이너 실행
IMAGE_TAG="$IMAGE_TAG" docker compose \
  -p "$PROJECT_NAME" \
  -f "$COMPOSE_FILE" \
  up -d --pull always

echo "Health Check 시작"

# 새 컨테이너가 정상적으로 응답할 때까지 최대 10회 확인
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