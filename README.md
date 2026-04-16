# Sense Posture System Backend

웹캠 기반 자세 분석과 FCM 알림 기능을 위한 `Node.js + Express + SQLite` 백엔드입니다.

프론트 또는 AI/CV 쪽에서 전달한 MediaPipe landmark 데이터를 받아 자세 특징값을 계산하고, 기준 자세 저장, 현재 자세 분석, 자세 로그, 대시보드, 푸시 알림 기능을 제공합니다.

## 주요 기능

- 회원가입 / 로그인 / 내 정보 조회
- 프로필 수정
  - 닉네임
  - 비밀번호
  - 프로필 이미지 업로드
- 기준 자세 랜드마크 저장
- 현재 자세 분석
- 자세 로그 저장
- 금일 대시보드 / 주간 리포트
- FCM 디바이스 등록 / 푸시 전송

## 기술 스택

- Node.js
- Express
- SQLite3
- JWT
- bcrypt
- multer
- Firebase Admin SDK

## 빠른 시작

### 1. 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 참고해서 `.env`를 만듭니다.

최소 필요 값:

```env
PORT=3000
JWT_SECRET=your-secret-key
DATABASE_PATH=./database.sqlite
```

푸시 기능까지 사용할 경우 아래 값도 필요합니다.

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"..."}
```

### 3. 실행

```bash
npm start
```

### 4. 테스트

```bash
npm test
```

## 자세 분석 기준

백엔드는 MediaPipe raw landmark 형식을 기준으로 처리합니다.

- 좌표 형식: `x`, `y`, `z`, `visibility`
- 좌표 기준: normalized coordinate
- `nose_tip` 우선 사용
- `nose_tip`이 없으면 pose `nose` fallback

현재 각도 기준:

- `55도 이하`: `warning`
- `50도 이하`: `danger`

## 주요 API

### 인증 / 사용자

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /users/me`
- `PATCH /users/me`

### 자세 / 랜드마크

- `POST /landmark`
- `GET /landmark/latest`
- `POST /posture/analyze`
- `POST /posture/log`

### 대시보드

- `GET /dashboard/today`
- `GET /dashboard/weekly`

### 알림 / 디바이스

- `POST /notifications`
- `GET /notifications`
- `POST /devices/register`
- `GET /devices`
- `DELETE /devices`
- `POST /push/send`

상세 요청/응답 형식은 아래 문서를 참고해 주세요.

- [API_LIST.md](./API_LIST.md)

## 팀별 참고 문서

### 프론트엔드

- [FRONTEND_HANDOFF.md](./FRONTEND_HANDOFF.md)
- [API_LIST.md](./API_LIST.md)

### AI / CV

- [AI_HANDOFF.md](./AI_HANDOFF.md)
- [API_LIST.md](./API_LIST.md)

## Railway 공용 테스트 서버

Railway 배포용 설정이 포함되어 있습니다.

- 시작 명령어: `npm start`
- 헬스체크 경로: `/health`
- SQLite Volume 경로는 `DATABASE_PATH` 환경 변수로 설정

배포 가이드는 아래 문서를 참고해 주세요.

- [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)

## 참고 사항

- SQLite 스키마는 서버 시작 시 필요한 컬럼을 자동 보강합니다.
- 테스트는 실사용 DB와 분리된 임시 DB로 실행됩니다.
- 푸시 전송은 로그인한 사용자 본인 디바이스에 대해서만 허용됩니다.
- `JWT_SECRET`이 없으면 서버가 시작되지 않습니다.
- `serviceAccountKey.json`은 Git에 커밋하지 않는 것을 권장합니다.
