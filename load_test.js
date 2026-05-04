import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// 1. تعريف المقاييس المخصصة
const journeyDuration = new Trend('journey_total_duration_ms');
const journeySuccess = new Rate('journey_success_rate');

// 2. إعدادات الاختبار (بسيطة ومباشرة)
export const options = {
  vus: 10, 
  duration: '30s',
};

export default function () {
  const startTime = Date.now(); // تم إصلاح الخطأ النحوي هنا
  
  // --- بداية رحلة المستخدم (3 خطوات) ---
  
  // الخطوة 1: دخول الصفحة الرئيسية
  let res1 = http.get('https://test.k6.io'); 
  let check1 = check(res1, { 'home page loaded': (r) => r.status === 200 });
  sleep(1); // محاكاة تفكير المستخدم

  // الخطوة 2: محاكاة طلب بيانات (أو تسجيل دخول)
  let res2 = http.get('https://test.k6.io/pi.php?decoded=1'); 
  let check2 = check(res2, { 'data fetched': (r) => r.status === 200 });
  sleep(1);

  // الخطوة 3: الدخول للداشبورد (أو صفحة ثانية)
  let res3 = http.get('https://test.k6.io/contacts.php'); 
  let check3 = check(res3, { 'dashboard loaded': (r) => r.status === 200 });

  // --- نهاية الرحلة ---

  // حساب النجاح: يجب أن تنجح الـ 3 خطوات معاً لتعتبر الرحلة ناجحة
  const totalSuccess = check1 && check2 && check3;
  journeySuccess.add(totalSuccess);
  
  // حساب الوقت الإجمالي المستغرق للرحلة كاملة
  journeyDuration.add(Date.now() - startTime);
  
  sleep(1);
}

// 3. ملخص النتائج الأنيق (مع إصلاح الطباعة)
export function handleSummary(data) {
  const jd  = data.metrics["journey_total_duration_ms"];
  const jr  = data.metrics["journey_success_rate"];
  const req = data.metrics["http_req_duration"];

  const line = (label, val) => `${label.padEnd(32)}${val}`;

  const summary = [
    "",
    "╔══════════════════════════════════════════════════╗",
    "║          USER JOURNEY – TEST SUMMARY             ║",
    "╠══════════════════════════════════════════════════╣",
    line("Journey success rate:",    pct(jr?.values?.rate)),
    line("Journey duration p50:",    ms(jd?.values?.["p(50)"])),
    line("Journey duration p95:",    ms(jd?.values?.["p(95)"])),
    "  ──────────────────────────────────────────────",
    line("HTTP req duration p95:",   ms(req?.values?.["p(95)"])),
    "╚══════════════════════════════════════════════════╝",
    "",
  ].join("\n");

  console.log(summary); // أضفنا الطباعة لضمان ظهورها في الـ Terminal
  return { "stdout": summary };
}

function ms(v)  { return v != null ? `${Math.round(v)} ms` : "N/A"; }
function pct(v) { return v != null ? `${(v * 100).toFixed(1)} %` : "N/A"; }
