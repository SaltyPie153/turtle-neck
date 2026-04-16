# Sense Posture System Backend

웹캠 기반 자세 분석과 알림 기능을 위한 `Node.js + Express + SQLite` 백엔드입니다.

프론트 또는 CV/AI 쪽에서 전달한 MediaPipe landmark 데이터를 받아 자세 특징값을 계산하고, 자세 로그, 대시보드, FCM 푸시 기능을 제공합니다.

## 핵심 기능

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

## 프로젝트 구조

```text
.
├─ public/
├─ src/
│  ├─ config/
│  ├─ controllers/
│  ├─ middleware/
│  ├─ routes/
│  └─ utils/
├─ test/
├─ app.js
├─ API_LIST.md
├─ FRONTEND_HANDOFF.md
└─ AI_HANDOFF.md
```

## 실행 방법

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일에 최소한 아래 값을 설정해 주세요.

```env
PORT=3000
JWT_SECRET=your-secret-key
```

FCM을 사용할 경우 Firebase Admin 설정도 필요합니다.

주의:
`serviceAccountKey.json` 같은 비밀키 파일은 Git에 커밋하지 않는 것을 권장합니다.

### 3. 서버 실행

```bash
node app.js
```

서버가 실행되면 DB 초기화도 함께 진행됩니다.

## 테스트

내장 `node:test` 기반 API 테스트가 포함되어 있습니다.

```bash
npm test
```

현재 주요 API에 대한 통합 테스트가 구성되어 있습니다.

- Auth
- User profile
- Landmark
- Posture analyze
- Posture log
- Dashboard
- Notification
- Device
- Push

## 자세 분석 기준

백엔드는 MediaPipe raw landmark 형식을 기준으로 처리합니다.

- 좌표 형식: `x`, `y`, `z`, `visibility`
- 좌표 기준: normalized coordinate
- `nose_tip` 우선 사용
- `nose_tip`이 없으면 pose `nose` fallback

현재 각도 기준 판정:

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

## 참고 사항

- SQLite 스키마는 서버 시작 시 필요한 컬럼을 자동 보강합니다.
- 테스트는 실사용 DB와 분리된 임시 DB로 실행됩니다.
- 푸시 전송은 로그인한 사용자 본인 디바이스에 대해서만 허용됩니다.
- JWT 비밀키(`JWT_SECRET`)가 없으면 서버가 시작되지 않습니다.
