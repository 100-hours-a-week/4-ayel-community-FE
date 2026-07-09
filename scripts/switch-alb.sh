#!/bin/bash

set -e

TARGET_COLOR=$1
LISTENER_ARN=$2

echo "ALB 전환 시작"
echo "Target Color: $TARGET_COLOR"

# 전환할 Target Group 이름 결정
if [ "$TARGET_COLOR" = "blue" ]; then
  TARGET_GROUP_NAME="community-fe-tg"
elif [ "$TARGET_COLOR" = "green" ]; then
  TARGET_GROUP_NAME="community-fe-green-tg"
else
  echo "잘못된 Target Color: $TARGET_COLOR"
  exit 1
fi

# Target Group ARN 조회
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --names "$TARGET_GROUP_NAME" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

echo "Target Group: $TARGET_GROUP_NAME"

# 새 환경이 ALB Health Check를 통과할 때까지 대기
echo "Target Group Healthy 대기"

aws elbv2 wait target-in-service \
  --target-group-arn "$TARGET_GROUP_ARN"

echo "Target Group Healthy"

# HTTPS 리스너의 기본 Rule ARN 조회
RULE_ARN=$(aws elbv2 describe-rules \
  --listener-arn "$LISTENER_ARN" \
  --query 'Rules[?IsDefault==`true`].RuleArn | [0]' \
  --output text)

# 새 Target Group으로 트래픽 전환
aws elbv2 modify-rule \
  --rule-arn "$RULE_ARN" \
  --actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN"

echo "ALB 트래픽 전환 완료"
echo "Active Color: $TARGET_COLOR"