#!/bin/bash

# 명령 실패, 정의되지 않은 변수 사용, 파이프라인 오류 시 즉시 종료
set -euo pipefail

# 워크플로우에서 배포 환경과 HTTPS Listener ARN을 전달받음
TARGET_COLOR=${1:?TARGET_COLOR가 필요합니다}
LISTENER_ARN=${2:?LISTENER_ARN이 필요합니다}

echo "FE ALB 전환 시작"
echo "Target Color: $TARGET_COLOR"

# 배포 환경에 따라 새 Target Group과 기존 Target Group 결정
if [ "$TARGET_COLOR" = "blue" ]; then
  TARGET_TG_NAME="community-fe-tg"
  PREVIOUS_TG_NAME="community-fe-green-tg"
elif [ "$TARGET_COLOR" = "green" ]; then
  TARGET_TG_NAME="community-fe-green-tg"
  PREVIOUS_TG_NAME="community-fe-tg"
else
  echo "잘못된 Target Color: $TARGET_COLOR"
  exit 1
fi

# Target Group 이름으로 ARN 조회
TARGET_TG_ARN=$(aws elbv2 describe-target-groups \
  --names "$TARGET_TG_NAME" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

PREVIOUS_TG_ARN=$(aws elbv2 describe-target-groups \
  --names "$PREVIOUS_TG_NAME" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target Group: $TARGET_TG_NAME"
echo "FE ALB 트래픽 전환: $TARGET_COLOR"

# 새 Target Group으로 Listener의 Default Action 전환
aws elbv2 modify-listener \
  --listener-arn "$LISTENER_ARN" \
  --default-actions \
  "Type=forward,TargetGroupArn=$TARGET_TG_ARN"

echo "새 Target Group Healthy 대기"

# 전환한 Target Group의 Health Check 결과 확인
if aws elbv2 wait target-in-service \
  --target-group-arn "$TARGET_TG_ARN"; then

  echo "새 Target Group Healthy 확인"
  echo "FE ALB 전환 완료"
  echo "Active Color: $TARGET_COLOR"

else
  echo "Health Check 실패"
  echo "기존 Target Group으로 롤백"

  aws elbv2 modify-listener \
    --listener-arn "$LISTENER_ARN" \
    --default-actions \
    "Type=forward,TargetGroupArn=$PREVIOUS_TG_ARN"

  echo "FE ALB 롤백 완료"
  exit 1
fi