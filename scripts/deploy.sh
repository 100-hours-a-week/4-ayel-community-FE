#!/bin/bash

# 명령 실행 중 오류가 발생하면 배포 중단
set -e

IMAGE_TAG=$1
TARGET_COLOR=$2

echo "FE 배포 시작"
echo "Image Tag: $IMAGE_TAG"
echo "Target Color: $TARGET_COLOR"

if [ "$TARGET_COLOR" = "blue" ]; then
  COMPOSE_FILE="compose.blue.yml"
elif [ "$TARGET_COLOR" = "green" ]; then
  COMPOSE_FILE="compose.green.yml"
else
  echo "잘못된 Target Color: $TARGET_COLOR"
  exit 1
fi

echo "Compose File: $COMPOSE_FILE"

PROJECT_NAME="community-fe-${TARGET_COLOR}"

echo "Project Name: $PROJECT_NAME"

IMAGE_TAG="$IMAGE_TAG" docker compose \
  -p "$PROJECT_NAME" \
  -f "$COMPOSE_FILE" \
  up -d --pull always

echo "FE $TARGET_COLOR 배포 완료"