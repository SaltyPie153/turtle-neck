# Sense-Posture-System Backend

> 웹캠 기반 자세 분석 및 거북목 위험 자세 감지를 위한 백엔드 서버

## 프로젝트 소개

본 프로젝트는 웹캠 영상과 자세 추정 기술을 활용하여 사용자의 머리, 귀, 어깨 랜드마크를 분석하고, 초기 기준 자세와의 차이를 비교하여 자세 이상 여부를 판단하는 시스템입니다.  
장시간 잘못된 자세로 인한 거북목 및 자세 불균형 문제를 예방하기 위해, 웹 기반 모니터링과 모바일 푸시 알림 기능을 함께 제공합니다.

## 선정 동기

스마트폰, 노트북, 태블릿과 같은 디지털 기기의 사용이 일상화되면서 장시간 화면을 바라보는 시간이 크게 증가하고 있습니다.  
특히 대학생과 직장인처럼 학습 및 업무를 위해 오랜 시간 컴퓨터와 모바일 기기를 사용하는 사람들은 바르지 못한 자세를 장시간 유지하는 경우가 많습니다.  
이러한 환경은 목과 어깨에 부담을 주며, 거북목과 같은 자세 불균형 문제를 유발할 가능성을 높입니다.  
이에 따라 사용자의 자세를 실시간으로 모니터링하고, 잘못된 자세가 지속될 경우 이를 인지하여 교정할 수 있도록 돕는 시스템의 필요성을 느껴 본 주제를 선정하였습니다.

## 목적

본 프로젝트의 목적은 카메라와 컴퓨터 비전 기술을 활용하여 사용자의 머리, 귀, 어깨 위치를 분석하고, 이를 바탕으로 자세 불균형 및 거북목 위험 자세를 실시간으로 감지하는 시스템을 구현하는 데 있습니다.  
또한 잘못된 자세가 일정 시간 이상 지속될 경우 사용자에게 경고를 제공하고, 자세 데이터를 기록 및 시각화하여 사용자가 자신의 자세 습관을 스스로 인식하고 개선할 수 있도록 지원하는 것을 목표로 합니다.

## 필요성

거북목과 같은 자세 문제는 단시간에 큰 불편을 느끼지 못하더라도 장기적으로 목, 어깨, 허리 통증 및 신체 피로를 유발할 수 있으며, 학습과 업무 효율 저하로도 이어질 수 있습니다.  
그러나 많은 사람들이 자신의 자세가 얼마나 무너져 있는지 스스로 인지하지 못한 채 장시간 잘못된 자세를 유지하는 경우가 많습니다.  
따라서 사용자의 자세를 지속적으로 관찰하고 이상 징후를 즉각적으로 알려주는 보조 시스템은 건강한 학습 및 업무 환경 조성에 도움이 될 수 있습니다.

## 주요 기능

- 회원가입 및 로그인 기능
- JWT 기반 사용자 인증
- 사용자별 초기 기준 자세 데이터 저장
- 랜드마크 기반 특징값 계산 및 기준 자세 관리
- 자세 이상 감지 시 알림 데이터 저장
- 사용자별 웹 / 모바일 기기 FCM 토큰 관리
- 웹 및 모바일 푸시 알림 전송 기반 구조 제공

## 기술 스택

### Core Environment
- Node.js 22.16.0
- Express.js
- SQLite3
- JWT Authentication
- bcrypt

### CV / Landmark Processing
- OpenCV
- MediaPipe Pose

### Database
- SQLite

### Notification
- Firebase Cloud Messaging (예정)

### Collaboration
- GitHub

## 시스템 개요

### 초기 설정 파트
웹캠을 이용하여 사용자의 초기 기준 자세 데이터를 입력받습니다.  
사용자는 약 3~5초간 바른 자세를 유지하며, 이 동안 OpenCV를 통해 입력된 영상 프레임을 MediaPipe Pose로 분석하여 코, 귀, 어깨의 랜드마크 좌표값을 추출합니다.  
추출된 좌표값은 Node.js 서버로 전송되며, 서버에서는 이를 바탕으로 어깨 중심점, 귀 중심점, 머리 전방 이동거리 등의 특징값을 산출합니다.  
이후 산출된 특징값은 사용자의 바른 자세 기준 데이터로 데이터베이스에 저장됩니다.

### 처리 파트
웹캠을 통하여 사용자의 실시간 영상을 입력받습니다.  
입력된 영상은 OpenCV를 통해 프레임 단위로 처리되며, MediaPipe Pose를 활용하여 현재 시점의 코, 귀, 어깨 랜드마크 좌표를 추출합니다.  
추출된 좌표값은 Node.js 서버로 전송되고, 서버에서는 초기 기준 자세와 동일한 방식으로 현재 특징값을 연산합니다.  
이후 현재 특징값은 초기 기준 특징값과 비교되며, 필요한 경우 일정 주기 또는 상태 변화 발생 시 데이터베이스에 저장됩니다.

### 이상 알림 파트
서버에서는 초기 기준 자세 데이터와 실시간으로 입력되는 현재 자세 데이터의 특징값을 비교합니다.  
이 과정에서 귀 중심점과 어깨 중심점 사이의 거리, 코와 어깨 중심점 사이의 상대 거리, 그리고 어깨 중심점과 귀 중심점을 연결한 벡터의 각도 및 변화량을 계산합니다.  
계산된 거리 차이와 각도 차이가 사전에 설정한 임계값을 초과하고, 이러한 상태가 일정 시간 이상 지속될 경우 이를 바르지 않은 자세로 판단합니다.  
이후 웹페이지 또는 모바일 앱으로 푸시 알림을 전송하여 사용자에게 자세 이상 상태를 알려줍니다.

## 자세 분석 로직

1. 사용자가 초기 설정 단계에서 약 3~5초간 바른 자세를 유지합니다.
2. OpenCV와 MediaPipe Pose를 통해 코, 귀, 어깨 랜드마크 좌표를 추출합니다.
3. 서버에서 어깨 중심점, 귀 중심점, 머리 전방 이동거리, 각도 등의 특징값을 계산합니다.
4. 실시간 자세 데이터와 초기 기준 특징값을 비교하여 자세 이상 여부를 판별합니다.
5. 일정 시간 이상 임계값을 초과한 경우, 자세 이상 상태로 판단하여 알림을 생성합니다.

## 특징값 정의

원본 랜드마크 좌표를 그대로 비교하지 않고, 서버에서 자세 판단용 특징값을 계산하여 사용합니다.

- **어깨 중심점**
  - `ShoulderCenterX = (LeftShoulderX + RightShoulderX) / 2`
  - `ShoulderCenterY = (LeftShoulderY + RightShoulderY) / 2`

- **귀 중심점**
  - `EarCenterX = (LeftEarX + RightEarX) / 2`
  - `EarCenterY = (LeftEarY + RightEarY) / 2`

- **머리 전방 이동거리**
  - `ForwardDistance = EarCenterX - ShoulderCenterX`

- **코-어깨 거리**
  - `NoseShoulderDistance = NoseX - ShoulderCenterX`

- **머리-어깨 각도**
  - `HeadAngle = atan2(EarCenterY - ShoulderCenterY, EarCenterX - ShoulderCenterX)`

- **어깨 너비**
  - 양쪽 어깨 좌표를 기반으로 계산

## 프로젝트 구조

```bash
Sense-Posture-System/
├── public/
│   ├── css/
│   │   └── auth.css
│   ├── js/
│   │   ├── login.js
│   │   └── register.js
│   ├── login.html
│   └── register.html
├── src/
│   ├── app.js
│   ├── config/
│   │   └── db.js
│   │   └── firebaseAdmin.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── deviceController.js
│   │   ├── landmarkController.js
│   │   ├── notificationController.js
│   │   └── pushController.js
│   ├── middleware/
│   │   └── authMiddleware.js
│   │── routes/
│   │   ├── authRoutes.js
│   │   ├── deviceRoutes.js
│   |   ├── landmarkRoutes.js
│   |   ├── notificationRoutes.js
│   |   └── pushRoutes.js
│   └── utils/
│       └── calculateLandmarkFeatures.js
├── .env
├── .gitignore
├── app.js
├── database.sqlite
└── package.json
```

## API 구조

### Auth
- `POST /auth/register` : 회원가입
- `POST /auth/login` : 로그인
- `GET /auth/me` : 현재 로그인 사용자 정보 조회

### LandMark
- `POST /landmark` : 초기 기준 자세 저장
- `GET /landmark/latest` : 최근 기준 자세 조회

### Notifications
- `POST /notifications` : 알림 저장
- `GET /notifications` : 사용자 알림 목록 조회

### UserDevices
- `POST /devices/register` : FCM 토큰 등록
- `GET /devices` : 등록된 기기 목록 조회
- `DELETE /devices` : 특정 기기 토큰 삭제

## 데이터베이스 설계

### Users
사용자 계정 정보를 저장합니다.

- `id`
- `username`
- `email`
- `password`
- `created_at`

### LandMark
사용자별 초기 기준 자세의 랜드마크 좌표 및 특징값을 저장합니다.

- `user_id`
- `nose_x`, `nose_y`
- `left_ear_x`, `left_ear_y`
- `right_ear_x`, `right_ear_y`
- `left_shoulder_x`, `left_shoulder_y`
- `right_shoulder_x`, `right_shoulder_y`
- `shoulder_center_x`, `shoulder_center_y`
- `ear_center_x`, `ear_center_y`
- `forward_distance`
- `nose_shoulder_distance`
- `head_angle`
- `shoulder_width`
- `created_at`
- `updated_at`

### Notifications
자세 이상 감지 시 생성되는 알림 내역을 저장합니다.

- `user_id`
- `status`
- `message`
- `created_at`

### UserDevices
사용자별 웹 / 모바일 기기의 FCM 토큰을 저장합니다.

- `user_id`
- `device_type`
- `fcm_token`
- `created_at`
- `updated_at`

