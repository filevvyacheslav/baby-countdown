/**
 * Pregnancy Countdown & Dynamic Background Controller
 * Привязка к Московскому времени (Europe/Moscow, UTC+3)
 * 
 * Логика:
 * 1. Автоматический расчет срока беременности и дней до родов (15 июня 2027).
 *    Дни отсчитываются автоматически вплоть до нулевого дня (1 -> 0, роды).
 * 2. Автоматическая смена фона по неделям (7-11 недели).
 * 3. Анимация при каждом обновлении страницы:
 *    последний разряд (или разряды) вытесняются снизу вверх (например 226 -> 225, 100 -> 99, 1 -> 0).
 */

const CONFIG = {
  // ПДР (Примерная дата родов): 15 июня 2027 г.
  dueDate: new Date('2027-06-15T00:00:00+03:00'),
  
  // Акушерский старт беременности (40 нед / 280 дней до 15.06.2027 -> 08.09.2026)
  // На 02.11.2026 ровно 7 недель срока
  startDate: new Date('2026-09-08T00:00:00+03:00'),
  
  timeZone: 'Europe/Moscow',
  
  // Расписание фоновых изображений по неделям
  imageSchedule: [
    { minWeek: 7,  maxWeek: 7,  file: 'images/week-7.png' },
    { minWeek: 8,  maxWeek: 8,  file: 'images/week-8.png' },
    { minWeek: 9,  maxWeek: 9,  file: 'images/week-9.png' },
    { minWeek: 10, maxWeek: 10, file: 'images/week-10.png' },
    { minWeek: 11, maxWeek: 11, file: 'images/week-11.png' },
    { minWeek: 12, maxWeek: 13, file: 'images/week-12.jpg' },
    { minWeek: 14, maxWeek: 15, file: 'images/week-14.jpg' },
    { minWeek: 16, maxWeek: 17, file: 'images/week-16.jpg' },
    { minWeek: 18, maxWeek: 99, file: 'images/week-18.jpg' },
  ],
  defaultImage: 'images/week-7.png'
};

function getMoscowNow() {
  const now = new Date();
  const mskFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CONFIG.timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });
  
  const parts = mskFormatter.formatToParts(now);
  const p = {};
  parts.forEach(part => { p[part.type] = part.value; });
  
  return new Date(`${p.year}-${p.month.padStart(2, '0')}-${p.day.padStart(2, '0')}T${p.hour.padStart(2, '0')}:${p.minute.padStart(2, '0')}:${p.second.padStart(2, '0')}+03:00`);
}

function calculateDaysLeft() {
  const mskNow = getMoscowNow();
  const currentDayMidnight = new Date(mskNow.getFullYear(), mskNow.getMonth(), mskNow.getDate());
  const dueDayMidnight = new Date(CONFIG.dueDate.getFullYear(), CONFIG.dueDate.getMonth(), CONFIG.dueDate.getDate());
  
  const diffTime = dueDayMidnight.getTime() - currentDayMidnight.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // До нулевого дня включительно (0 = день родов)
  return Math.max(0, diffDays);
}

function calculateCurrentWeek() {
  const mskNow = getMoscowNow();
  const diffTime = mskNow.getTime() - CONFIG.startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const week = Math.floor(diffDays / 7);
  return Math.max(1, week);
}

function getImageForWeek(week) {
  const matched = CONFIG.imageSchedule.find(item => week >= item.minWeek && week <= item.maxWeek);
  return matched ? matched.file : CONFIG.defaultImage;
}

/**
 * Отрисовка цифр счётчика в SVG с динамическим расчетом позиций:
 * Равномерное расстояние между цифрами и анимация вытеснения снизу вверх
 */
function renderCounterDigits(actualDays, animate = false) {
  const container = document.getElementById('svgDigitsContainer');
  if (!container) return;

  const prevDays = actualDays + 1;
  const currStr = String(actualDays);
  const prevStr = String(prevDays);

  const len = currStr.length;
  // Ширина каждой цифры с учетом кернинга Manrope 200px: ~104px
  const digitWidth = 104;
  const totalWidth = len * digitWidth;
  const startX = (380 - totalWidth) / 2 + (digitWidth / 2);

  let defs = document.querySelector('#counterSvg defs');
  // Очищаем старые клипы если были
  const oldClips = defs.querySelectorAll('.dynamic-clip');
  oldClips.forEach(c => c.remove());

  let html = '';

  for (let i = 0; i < len; i++) {
    const x = Math.round(startX + i * digitWidth);
    const currChar = currStr[i];
    // Сопоставляем с предыдущим числом с конца
    const prevChar = prevStr[prevStr.length - (len - i)] || '0';
    const isDifferent = currChar !== prevChar;

    if (animate && isDifferent) {
      const clipId = `clip_col_${i}`;
      // Создаем clipPath для вытеснения этой колонки
      const clipRect = `<clipPath id="${clipId}" class="dynamic-clip"><rect x="${x - digitWidth/2}" y="0" width="${digitWidth}" height="200" /></clipPath>`;
      defs.insertAdjacentHTML('beforeend', clipRect);

      html += `
        <g clip-path="url(#${clipId})">
          <g class="svg-roll-group roll-up-anim">
            <text x="${x}" y="165" text-anchor="middle" class="svg-counter-text">${prevChar}</text>
            <text x="${x}" y="345" text-anchor="middle" class="svg-counter-text">${currChar}</text>
          </g>
        </g>
      `;
    } else {
      // Статичная цифра
      html += `<text x="${x}" y="165" text-anchor="middle" class="svg-counter-text">${currChar}</text>`;
    }
  }

  container.innerHTML = html;
}

function updateUI(isInitialLoad = false) {
  const days = calculateDaysLeft();
  const week = calculateCurrentWeek();
  const bgImage = getImageForWeek(week);

  // 1. Обновляем счетчик
  renderCounterDigits(days, isInitialLoad);

  // 2. Обновляем фон
  const bgEl = document.getElementById('bgLayer');
  if (bgEl) {
    const imgTest = new Image();
    imgTest.onload = function() {
      bgEl.style.backgroundImage = `url('${bgImage}')`;
    };
    imgTest.onerror = function() {
      bgEl.style.backgroundImage = `url('${CONFIG.defaultImage}')`;
    };
    imgTest.src = bgImage;
  }

  console.log(`[Moscow Time Sync] Дата: ${getMoscowNow().toISOString()} | Срок: ${week} нед. | Дней осталось: ${days} | Фон: ${bgImage}`);
}

document.addEventListener('DOMContentLoaded', () => {
  updateUI(true);
  // Автоматический пересчет каждую минуту (в полночь по МСК цифра уменьшится сама)
  setInterval(() => updateUI(false), 60 * 1000);
});
