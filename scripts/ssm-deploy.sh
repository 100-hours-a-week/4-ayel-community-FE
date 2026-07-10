#!/bin/bash

# 명령 실패, 정의되지 않은 변수 사용, 파이프라인 오류 시 즉시 종료
set -euo pipefail

# 워크플로우에서 배포 정보와 App EC2 ID, 저장소 정보를 전달받음
IMAGE_TAG=${1:?IMAGE_TAG가 필요합니다}
TARGET_COLOR=${2:?TARGET_COLOR가 필요합니다}
INSTANCE_A=${3:?INSTANCE_A가 필요합니다}
INSTANCE_C=${4:?INSTANCE_C가 필요합니다}
GITHUB_REPOSITORY=${5:?GITHUB_REPOSITORY가 필요합니다}

echo "FE SSM 배포 시작"
echo "Image Tag: $IMAGE_TAG"
echo "Target Color: $TARGET_COLOR"

# SSM을 통해 App EC2 2대에 동일한 배포 명령 실행
COMMAND_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_A" "$INSTANCE_C" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[
    \"cd /home/ssm-user/community-app/fe\",
    \"curl -fsSLO https://raw.githubusercontent.com/$GITHUB_REPOSITORY/main/compose.blue.yml\",
    \"curl -fsSLO https://raw.githubusercontent.com/$GITHUB_REPOSITORY/main/compose.green.yml\",
    \"mkdir -p scripts\",
    \"curl -fsSL -o scripts/deploy.sh https://raw.githubusercontent.com/$GITHUB_REPOSITORY/main/scripts/deploy.sh\",
    \"bash scripts/deploy.sh $IMAGE_TAG $TARGET_COLOR\"
  ]" \
  --query "Command.CommandId" \
  --output text)

echo "Command ID: $COMMAND_ID"
echo "SSM 명령 실행 대기"

# 각 EC2의 배포 결과를 확인하고 실패 시 배포 로그 출력
for INSTANCE_ID in "$INSTANCE_A" "$INSTANCE_C"; do
  if aws ssm wait command-executed \
    --command-id "$COMMAND_ID" \
    --instance-id "$INSTANCE_ID"; then

    echo "$INSTANCE_ID FE 배포 성공"

  else
    echo "$INSTANCE_ID FE 배포 실패"
    echo "배포 로그 확인"

    aws ssm get-command-invocation \
      --command-id "$COMMAND_ID" \
      --instance-id "$INSTANCE_ID" \
      --query '{Output:StandardOutputContent,Error:StandardErrorContent}' \
      --output json

    exit 1
  fi
done

echo "FE SSM 배포 완료"