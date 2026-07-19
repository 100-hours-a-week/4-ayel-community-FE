#!/bin/bash

# 명령 실패, 정의되지 않은 변수 사용, 파이프라인 오류 시 즉시 종료
set -euo pipefail

# 워크플로우에서 배포 정보와 App EC2 ID, 저장소 정보를 전달받음
IMAGE_TAG=${1:?IMAGE_TAG가 필요합니다}
INSTANCE_A=${2:?INSTANCE_A가 필요합니다}
GITHUB_REPOSITORY=${3:?GITHUB_REPOSITORY가 필요합니다}

echo "FE SSM 배포 시작"
echo "Image Tag: $IMAGE_TAG"

# SSM을 통해 App EC2에 배포 명령 실행
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_A" \
  --document-name "AWS-RunShellScript" \
  --timeout-seconds 600 \
  --parameters "commands=[
    \"cd /home/ssm-user/community-app/fe\",
    \"curl -fsSLO https://raw.githubusercontent.com/$GITHUB_REPOSITORY/main/compose.blue.yml\",
    \"curl -fsSLO https://raw.githubusercontent.com/$GITHUB_REPOSITORY/main/compose.green.yml\",
    \"mkdir -p scripts\",
    \"curl -fsSL -o scripts/deploy.sh https://raw.githubusercontent.com/$GITHUB_REPOSITORY/main/scripts/deploy.sh\",
    \"bash scripts/deploy.sh $IMAGE_TAG\"
  ]" \
  --query "Command.CommandId" \
  --output text)

echo "Command ID: $COMMAND_ID"
echo "SSM 명령 실행 대기"

if aws ssm wait command-executed \
  --command-id "$COMMAND_ID" \
  --instance-id "$INSTANCE_A"; then

  echo "$INSTANCE_A FE 배포 성공"

else

  echo "$INSTANCE_A FE 배포 실패"
  echo "배포 로그 확인"

  aws ssm get-command-invocation \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_A" \
    --query '{Output:StandardOutputContent,Error:StandardErrorContent}' \
    --output json

  exit 1

fi

echo "FE SSM 배포 완료"