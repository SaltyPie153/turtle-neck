# Railway Deploy Guide

Sense Posture System 백엔드를 Railway에 공용 테스트 서버로 올릴 때 사용하는 간단한 가이드입니다.

## 준비 사항

- GitHub에 현재 프로젝트 푸시
- Railway 계정
- Firebase 서비스 계정 JSON

## 1. Railway 프로젝트 생성

1. Railway에서 `New Project` 선택
2. `Deploy from GitHub repo` 선택
3. 이 저장소 연결

## 2. Volume 추가

SQLite 파일을 유지하려면 Volume이 필요합니다.

1. 서비스에 Volume 추가
2. Mount path를 `/data` 로 설정

## 3. 환경 변수 설정

Railway 서비스 Variables에 아래 값을 추가합니다.

```env
JWT_SECRET=your-strong-secret
DATABASE_PATH=/data/database.sqlite
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"..."}
```

설명:

- `JWT_SECRET`: JWT 서명용 비밀키
- `DATABASE_PATH`: Railway Volume 안에 저장될 SQLite 경로
- `FIREBASE_SERVICE_ACCOUNT_JSON`: Firebase Admin 서비스 계정 JSON 문자열

## 4. 배포 설정

이 저장소에는 Railway용 설정 파일이 이미 포함되어 있습니다.

- 시작 명령어: `npm start`
- 헬스체크 경로: `/health`

## 5. 배포 후 확인

배포가 끝나면 Railway가 public URL을 생성합니다.

확인할 주소 예시:

- `https://your-service.up.railway.app/health`

정상 응답:

```json
{
  "status": "ok"
}
```

## 6. 팀원 공유

팀원에게 아래 정보를 공유하면 됩니다.

- 서버 주소
- 테스트 계정 또는 회원가입 방법
- API 문서
  - `API_LIST.md`
  - `FRONTEND_HANDOFF.md`
  - `AI_HANDOFF.md`

## 주의 사항

- `serviceAccountKey.json`은 GitHub에 커밋하지 않습니다.
- SQLite는 공용 테스트 서버에는 적합하지만, 장기 운영용으로는 Postgres 전환이 더 안전합니다.
- Volume 없이 배포하면 재시작/재배포 시 DB가 초기화될 수 있습니다.
