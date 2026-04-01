import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyDQh4vW7zRo6MKy7AH8BaJqlWr_M-03-jg",
  authDomain: "sense-posture-system.firebaseapp.com",
  projectId: "sense-posture-system",
  storageBucket: "sense-posture-system.firebasestorage.app",
  messagingSenderId: "753161690845",
  appId: "1:753161690845:web:368012cc863d1238b08534",
  measurementId: "G-8Q953KEX3V"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

const VAPID_KEY = "BMKEUGDT1bsAcLcEL_K2O_6VQvQEJfhxB2jroQLc6j-fNJtm_uzOEg8dXg_LRrVOF-mBr-f1G_rGLk_C1-ezpFU";

export async function requestFcmToken() {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("알림 권한이 허용되지 않았습니다.");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
    });

    if (!token) {
      console.log("FCM 토큰을 가져오지 못했습니다.");
      return null;
    }

    console.log("FCM Token:", token);
    return token;
  } catch (error) {
    console.error("FCM 토큰 발급 오류:", error);
    return null;
  }
}

// 포그라운드 메시지 수신
onMessage(messaging, (payload) => {
  console.log("포그라운드 메시지 수신:", payload);

  const title = payload?.notification?.title || "자세 알림";
  const body = payload?.notification?.body || "자세를 확인하세요.";

  alert(`${title}\n${body}`);
});