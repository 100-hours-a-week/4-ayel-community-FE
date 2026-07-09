#!/bin/bash

set -e

TARGET_COLOR=$1
LISTENER_ARN=$2

echo "ALB 전환 시작"
echo "Target Color: $TARGET_COLOR"

if [ "$TARGET_COLOR" = "blue" ]; then
  NEW_TG_NAME="community-fe-tg"
  OLD_TG_NAME="community-fe-green-tg"
elif [ "$TARGET_COLOR" = "green" ]; then
  NEW_TG_NAME="community-fe-green-tg"
  OLD_TG_NAME="community-fe-tg"
else
  echo "잘못된 Target Color: $TARGET_COLOR"
  exit 1
fi

NEW_TG_ARN=$(aws elbv2 describe-target-groups \
  --names "$NEW_TG_NAME" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

OLD_TG_ARN=$(aws elbv2 describe-target-groups \
  --names "$OLD_TG_NAME" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "새 Target Group을 ALB에 연결"

aws elbv2 modify-listener \
  --listener-arn "$LISTENER_ARN" \
  --default-actions \
  "Type=forward,ForwardConfig={TargetGroups=[{TargetGroupArn=$OLD_TG_ARN,Weight=100},{TargetGroupArn=$NEW_TG_ARN,Weight=0}]}"

echo "새 Target Group Healthy 대기"

aws elbv2 wait target-in-service \
  --target-group-arn "$NEW_TG_ARN"

echo "새 Target Group Healthy"

aws elbv2 modify-listener \
  --listener-arn "$LISTENER_ARN" \
  --default-actions \
  "Type=forward,TargetGroupArn=$NEW_TG_ARN"

echo "ALB 트래픽 전환 완료"
echo "Active Color: $TARGET_COLOR"