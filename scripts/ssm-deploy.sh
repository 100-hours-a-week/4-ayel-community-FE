#!/bin/bash

# 명령 실행 중 오류가 발생하면 중단
set -e

IMAGE_TAG=$1
TARGET_COLOR=$2

INSTANCE_A="i-01d75fd54fbe9641a"
INSTANCE_C="i-041f03685bee07ddd"

echo "SSM 배포 시작"
echo "Image Tag: $IMAGE_TAG"
echo "Target Color: $TARGET_COLOR"

# 두 App EC2에 배포 명령 전송
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_A" "$INSTANCE_C" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    \"cd /home/ssm-user/community-app/fe\",
    \"curl -fsSLO https://raw.githubusercontent.com/100-hours-a-week/4-ayel-community-FE/main/compose.blue.yml\",
    \"curl -fsSLO https://raw.githubusercontent.com/100-hours-a-week/4-ayel-community-FE/main/compose.green.yml\",
    \"mkdir -p scripts\",
    \"curl -fsSL -o scripts/deploy.sh https://raw.githubusercontent.com/100-hours-a-week/4-ayel-community-FE/main/scripts/deploy.sh\",
    \"bash scripts/deploy.sh $IMAGE_TAG $TARGET_COLOR\"
  ]" \
  --query "Command.CommandId" \
  --output text)

echo "Command ID: $COMMAND_ID"
echo "SSM 명령 실행 대기"

# A EC2 배포 완료 대기
aws ssm wait command-executed \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_A"

echo "App EC2 A 배포 성공"

# C EC2 배포 완료 대기
aws ssm wait command-executed \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_C"

echo "App EC2 C 배포 성공"
echo "SSM 배포 완료"