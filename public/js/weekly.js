const token = localStorage.getItem('token');

if (!token) {
  window.location.replace('/login.html');
}

const bars = document.getElementById('bars');
const xLabels = document.getElementById('xLabels');
const chartMessage = document.getElementById('chartMessage');
const chartShell = document.querySelector('.chart-shell');
const profileName = document.getElementById('profileName');
const profileImage = document.getElementById('profileImage');
const riskLevel = document.getElementById('riskLevel');
const logoutBtn = document.getElementById('logoutBtn');

const summaryTotal = document.getElementById('summaryTotal');
const summaryRate = document.getElementById('summaryRate');
const summaryWarning = document.getElementById('summaryWarning');
const summaryDanger = document.getElementById('summaryDanger');
const summaryDangerCount = document.getElementById('summaryDangerCount');
const summaryPeak = document.getElementById('summaryPeak');

const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
      <rect width="96" height="96" rx="48" fill="#e9e4d8"/>
      <circle cx="48" cy="34" r="18" fill="#95a476"/>
      <path d="M20 84c6-18 20-26 28-26s22 8 28 26" fill="#95a476"/>
    </svg>
  `);

const DAY_MAP = {
  Sun: '일',
  Mon: '월',
  Tue: '화',
  Wed: '수',
  Thu: '목',
  Fri: '금',
  Sat: '토',
};

function setMessage(text) {
  chartMessage.textContent = text;
}

function formatMinutes(seconds) {
  return `${Math.round(seconds / 60)} min`;
}

function setRiskLevel(summary) {
  if (summary.danger_count > 4 || summary.danger_seconds >= 1200) {
    riskLevel.textContent = '위험수준 3 단계';
    return;
  }

  if (summary.danger_count > 1 || summary.warning_seconds >= 1800) {
    riskLevel.textContent = '위험수준 2 단계';
    return;
  }

  riskLevel.textContent = '위험수준 1 단계';
}

function removeExistingAxis() {
  const axis = chartShell.querySelector('.axis');
  if (axis) {
    axis.remove();
  }
}

function renderAxis(maxMinutes) {
  const steps = 6;
  const roundedMaxMinutes = Math.max(60, Math.ceil(maxMinutes / 60) * 60);
  const axis = document.createElement('div');
  axis.className = 'axis';

  const labels = [];

  for (let step = steps; step >= 1; step -= 1) {
    const value = Math.round((roundedMaxMinutes / steps) * step);
    labels.push(`<div class="axis-label">${value} min</div>`);
  }

  axis.innerHTML = labels.join('');
  chartShell.append(axis);
}

function renderChart(chartItems) {
  const ordered = [...chartItems];
  const hasAnyData = ordered.some((item) => item.total_usage_seconds > 0);
  const valueMinutesList = ordered.map((item) => item.normal_seconds / 60);
  const maxMinutes = hasAnyData
    ? Math.max(60, ...valueMinutesList.map((value) => Math.ceil(value / 60) * 60))
    : 360;

  bars.innerHTML = ordered
    .map((item) => {
      const valueMinutes = item.normal_seconds / 60;
      const heightPercent = maxMinutes === 0 ? 0 : (valueMinutes / maxMinutes) * 100;
      const dayLabel = DAY_MAP[item.day_label] || item.day_label;
      const title = [
        `${dayLabel}요일`,
        `바른 자세: ${Math.round(valueMinutes)}분`,
        `경고: ${Math.round(item.warning_seconds / 60)}분`,
        `위험: ${Math.round(item.danger_seconds / 60)}분`,
      ].join('\n');

      return `
        <div class="bar-wrap" title="${title}">
          <div class="bar" style="height:${heightPercent}%"></div>
        </div>
      `;
    })
    .join('');

  xLabels.innerHTML = ordered
    .map((item) => `<div class="x-label">${DAY_MAP[item.day_label] || item.day_label}</div>`)
    .join('');

  removeExistingAxis();
  renderAxis(maxMinutes);

  if (!hasAnyData) {
    setMessage('표시할 posture log 데이터가 없습니다. PostureLogs에 로그를 먼저 넣어야 합니다.');
  }
}

function fillSummary(data) {
  const { summary, peak_usage_day: peakUsageDay } = data;

  summaryTotal.textContent = formatMinutes(summary.total_usage_seconds);
  summaryRate.textContent = `${summary.good_posture_rate}%`;
  summaryWarning.textContent = formatMinutes(summary.warning_seconds);
  summaryDanger.textContent = formatMinutes(summary.danger_seconds);
  summaryDangerCount.textContent = `${summary.danger_count}회`;
  summaryPeak.textContent = peakUsageDay
    ? `${DAY_MAP[peakUsageDay.day_label] || peakUsageDay.day_label} / ${Math.round(
        peakUsageDay.total_usage_minutes
      )} min`
    : '-';

  setRiskLevel(summary);
}

async function loadProfile() {
  const response = await fetch('/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.replace('/login.html');
    return;
  }

  const payload = await response.json();
  const user = payload.data;

  profileName.textContent = `${user.nickname || user.username} 님`;
  profileImage.src = user.profile_image || DEFAULT_AVATAR;
  profileImage.alt = `${user.username} profile image`;
}

async function loadWeeklyDashboard() {
  const response = await fetch('/dashboard/weekly', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.replace('/login.html');
    return;
  }

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || 'Failed to load weekly dashboard.');
  }

  renderChart(payload.data.chart);
  fillSummary(payload.data);

  if (payload.data.summary.total_usage_seconds > 0) {
    setMessage('최근 7일 기준 posture log 집계를 불러왔습니다.');
  }
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.replace('/login.html');
});

Promise.all([loadProfile(), loadWeeklyDashboard()]).catch((error) => {
  setMessage(error.message);
});
