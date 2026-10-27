#!/bin/sh
# Cloud Run ジョブ + Cloud Scheduler で「5 分ごとに同期」を構築する。
# 事前に docs/workspace-sync-setup.md の 1〜3（プロジェクト・サービスアカウント・ドメイン全体の委任）を済ませておくこと。
#
# 使い方（Cloud Shell で実行）:
#   PROJECT_ID=xxx ADMIN_EMAIL=admin@example.co.jp \
#   GENESIS_ENDPOINT=https://... GENESIS_TOKEN=... ./deploy-cloud-run.sh
set -eu

: "${PROJECT_ID:?PROJECT_ID を指定してください}"
: "${ADMIN_EMAIL:?ADMIN_EMAIL を指定してください}"
: "${GENESIS_ENDPOINT:?GENESIS_ENDPOINT を指定してください}"
: "${GENESIS_TOKEN:?GENESIS_TOKEN を指定してください}"
REGION="${REGION:-asia-northeast1}"
JOB="${JOB:-genesis-calendar-sync}"
SA_NAME="${SA_NAME:-genesis-calendar-sync}"
SA="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
BUCKET="${BUCKET:-${PROJECT_ID}-genesis-sync}"
SCHEDULE="${SCHEDULE:-*/5 * * * *}"

cd "$(dirname "$0")"
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudscheduler.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com iamcredentials.googleapis.com \
  calendar-json.googleapis.com admin.googleapis.com storage.googleapis.com

# 自分自身の JWT に署名できるようにする（鍵ファイルなしでドメイン全体の委任を使うため）
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --member="serviceAccount:$SA" --role=roles/iam.serviceAccountTokenCreator >/dev/null

# 同期状態の保存先
gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1 || \
  gcloud storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$SA" --role=roles/storage.objectAdmin >/dev/null

# GWS のトークンは Secret Manager に保存
if gcloud secrets describe genesis-token >/dev/null 2>&1; then
  printf %s "$GENESIS_TOKEN" | gcloud secrets versions add genesis-token --data-file=-
else
  printf %s "$GENESIS_TOKEN" | gcloud secrets create genesis-token --data-file=-
fi
gcloud secrets add-iam-policy-binding genesis-token \
  --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor >/dev/null

# ジョブを作成／更新（ソースからビルド）
gcloud run jobs deploy "$JOB" --source . --region "$REGION" \
  --service-account "$SA" --task-timeout 240s --max-retries 0 \
  --set-env-vars "GENESIS_ENDPOINT=$GENESIS_ENDPOINT,ADMIN_EMAIL=$ADMIN_EMAIL,STATE_STORE=gs://$BUCKET/state.json,EXCLUDE_USERS=${EXCLUDE_USERS:-}" \
  --set-secrets "GENESIS_TOKEN=genesis-token:latest"

# 定期実行（Scheduler 用のサービスアカウントにジョブ実行権限を付与）
gcloud run jobs add-iam-policy-binding "$JOB" --region "$REGION" \
  --member="serviceAccount:$SA" --role=roles/run.invoker >/dev/null
URI="https://run.googleapis.com/v2/projects/$PROJECT_ID/locations/$REGION/jobs/$JOB:run"
if gcloud scheduler jobs describe "$JOB" --location "$REGION" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$JOB" --location "$REGION" --schedule "$SCHEDULE" --time-zone Asia/Tokyo \
    --uri "$URI" --http-method POST --oauth-service-account-email "$SA"
else
  gcloud scheduler jobs create http "$JOB" --location "$REGION" --schedule "$SCHEDULE" --time-zone Asia/Tokyo \
    --uri "$URI" --http-method POST --oauth-service-account-email "$SA"
fi

echo "完了: $SCHEDULE で同期します。今すぐ試す: gcloud run jobs execute $JOB --region $REGION --wait"
