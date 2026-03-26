# 🥷 Ninja Trading Journal v2.0

Trading journal dashboard ที่รันในเบราว์เซอร์ ไม่ต้องติดตั้งอะไร — พร้อม sync กับ Google Sheets (optional)

---

## 📁 โครงสร้างไฟล์

```
ninja-trading-journal/
├── trading-dashboard.html       ← เปิดไฟล์นี้ในเบราว์เซอร์
├── google-apps-script.gs        ← โค้ดสำหรับ Google Sheets (optional)
└── README.md
```

---

## 🚀 วิธีรัน

### วิธีที่ 1 — เปิดไฟล์ตรงๆ (ง่ายสุด)

ดับเบิลคลิกที่ `trading-dashboard.html` — เปิดใน Chrome / Edge / Firefox ได้เลย

> ⚠️ **ข้อจำกัด:** บางเบราว์เซอร์บล็อก `localStorage` เมื่อเปิดผ่าน `file://` ถ้าข้อมูลไม่บันทึก ให้ใช้วิธี Localhost ด้านล่างแทน

---

### วิธีที่ 2 — รันผ่าน Localhost (แนะนำ)

รันด้วยวิธีใดวิธีหนึ่งด้านล่าง แล้วเปิดเบราว์เซอร์ไปที่ **`http://localhost:8080`**

#### 🐍 Python (ติดตั้งมาแล้วเกือบทุกเครื่อง)

```bash
# Python 3
cd /path/to/ninja-trading-journal
python -m http.server 8080
```

```bash
# Python 2 (เครื่องเก่า)
cd /path/to/ninja-trading-journal
python -m SimpleHTTPServer 8080
```

#### 🟢 Node.js

```bash
# ติดตั้ง serve ครั้งเดียว (ต้องมี Node.js)
npm install -g serve

# รัน
cd /path/to/ninja-trading-journal
serve -p 8080
```

หรือใช้ `npx` (ไม่ต้องติดตั้ง global):

```bash
npx serve -p 8080
```

#### 🐘 PHP (มักติดมากับ macOS / Linux)

```bash
cd /path/to/ninja-trading-journal
php -S localhost:8080
```

#### 🐳 Docker

```bash
docker run --rm -p 8080:80 \
  -v $(pwd):/usr/share/nginx/html \
  nginx:alpine
```

จากนั้นเปิด **`http://localhost:8080/trading-dashboard.html`**

---

### วิธีที่ 3 — VS Code Live Server (สำหรับนักพัฒนา)

1. ติดตั้ง Extension: **Live Server** (by Ritwick Dey)
2. คลิกขวาที่ `trading-dashboard.html` → **Open with Live Server**
3. เบราว์เซอร์จะเปิดอัตโนมัติที่ `http://127.0.0.1:5500`

---

## 💾 การย้ายเครื่อง / Backup ข้อมูล

> ข้อมูลใน Demo Mode ถูกเก็บใน `localStorage` ของเบราว์เซอร์ในเครื่องนั้นเท่านั้น — **ไม่ได้อยู่ในไฟล์ .html**
> ถ้าย้ายเครื่อง หรือเปลี่ยนเบราว์เซอร์ ต้อง Export ข้อมูลออกก่อน

### Export ข้อมูล (ก่อนย้ายเครื่อง)

1. เปิด `trading-dashboard.html` ในเบราว์เซอร์
2. กด `F12` เพื่อเปิด DevTools → ไปที่แท็บ **Console**
3. วางโค้ดนี้แล้วกด Enter:

```javascript
const backup = {
  portfolios:   localStorage.getItem('portfolios'),
  demoTrades:   localStorage.getItem('demoTrades'),
  activePortId: localStorage.getItem('activePortId'),
  scriptUrl:    localStorage.getItem('scriptUrl'),
  exportedAt:   new Date().toISOString()
};
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'ninja-journal-backup.json';
a.click();
console.log('✅ Backup downloaded!');
```

จะได้ไฟล์ **`ninja-journal-backup.json`** — เก็บไว้ด้วยกันกับ `.html`

---

### Import ข้อมูล (หลังย้ายเครื่อง)

1. เปิด `trading-dashboard.html` ในเบราว์เซอร์ใหม่
2. เปิด DevTools (`F12`) → แท็บ **Console**
3. วางโค้ดนี้แล้วกด Enter:

```javascript
// โหลดไฟล์ backup.json จากเครื่อง
const input = document.createElement('input');
input.type = 'file';
input.accept = '.json';
input.onchange = e => {
  const reader = new FileReader();
  reader.onload = ev => {
    const backup = JSON.parse(ev.target.result);
    if (backup.portfolios)   localStorage.setItem('portfolios',   backup.portfolios);
    if (backup.demoTrades)   localStorage.setItem('demoTrades',   backup.demoTrades);
    if (backup.activePortId) localStorage.setItem('activePortId', backup.activePortId);
    if (backup.scriptUrl)    localStorage.setItem('scriptUrl',    backup.scriptUrl);
    alert('✅ Import สำเร็จ! กด OK เพื่อ Reload');
    location.reload();
  };
  reader.readAsText(e.target.files[0]);
};
input.click();
```

4. เลือกไฟล์ `ninja-journal-backup.json` → ข้อมูลจะโหลดเข้ามาทันที

> 💡 **ทางที่ดีที่สุดคือเชื่อมต่อ Google Sheets** — ข้อมูลอยู่บน Cloud ย้ายเครื่องได้เลย ไม่ต้อง backup เอง

---

## 🔗 เชื่อมต่อ Google Sheets (ข้อมูลอยู่บน Cloud)

### ขั้นตอนที่ 1 — สร้าง Google Sheet

1. เปิด [Google Sheets](https://sheets.google.com) แล้วสร้าง Spreadsheet ใหม่
2. ไปที่เมนู **Extensions → Apps Script**
3. ลบโค้ดเดิมทั้งหมด แล้ว paste โค้ดจากไฟล์ `google-apps-script.gs`
4. กด **Save** (Ctrl+S)

### ขั้นตอนที่ 2 — Deploy เป็น Web App

1. กด **Deploy → New Deployment**
2. เลือก Type: **Web App**
3. ตั้งค่า:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. กด **Deploy** → อนุญาต Permission ที่ขอ
5. Copy **Web App URL** (รูปแบบ `https://script.google.com/macros/s/…/exec`)

### ขั้นตอนที่ 3 — ใส่ URL ใน Dashboard

1. เปิด Dashboard → กด **＋ Add Trade / Settings**
2. ไปที่แท็บ **⚙️ Settings**
3. วาง Web App URL ในช่อง → กด **💾 Save Settings & Reload**
4. จุดสีเขียว ✅ ใน Header จะแสดง "เชื่อมต่อแล้ว"

> ⚠️ หาก Deploy ใหม่ (เช่น แก้โค้ด) URL จะเปลี่ยน — ต้องอัปเดตใน Settings ด้วยทุกครั้ง

---

## 📊 ฟีเจอร์หลัก

### Performance Stats

| การ์ด | ความหมาย |
|-------|----------|
| Balance | ยอดเงินปัจจุบัน = ต้นทุน + Net PnL |
| Net PnL | กำไร/ขาดทุนรวม และ % Return |
| Win Rate | % ชนะของ Closed Trades (TP+Loss) |
| Max Drawdown | การร่วงจาก Peak สูงสุด (%) |
| Profit Factor | Gross Profit ÷ Gross Loss |
| Avg RR | Risk-Reward เฉลี่ย |
| Expectancy | PnL เฉลี่ยต่อ Trade |
| Max Con Loss | จำนวน Trade ขาดทุนต่อเนื่องสูงสุด |
| Sum Con Loss $ | ขาดทุนรวมของ Streak ที่ยาวที่สุด |
| Sum DD Loss | ขาดทุนสะสมทั้งหมด ($) |

### Charts
- **Equity Curve** — กราฟ Balance รายเทรด
- **Monthly PnL** — กำไร/ขาดทุนแยกตามเดือน

### Win Rate Breakdown
วิเคราะห์ Win Rate แยกตาม: Session, Code, Mode, Class, Model, Time Slot, Day, Mitigated Zone

---

## 🔍 ฟิลเตอร์ Dashboard

กด **▼ Filter** เพื่อเปิด Filter Panel — Stats, Charts และ Win Rate Bars อัปเดตตาม Filter ทันที

| ฟิลเตอร์ | ตัวเลือก |
|---------|---------|
| Result | TP / Loss / Miss |
| Day | Mon, Tue, Wed, Thu, Fri |
| Time Slot | 05:00–07:00 ถึง 23:00–01:00 |
| Code | Code1, Code2, Nochi |
| Duration | ≤ N นาที |
| Position | Buy / Sell |
| Session | Out, AS (Asia), LO (London), NY (New York) |
| Mode | Be, CHe, BE>B, CHe>B, BE>CHe, CHe>BE, BE>BE, CHe>CHe |
| Class | A+, A, B |
| Model | RBR, RBD, DBD, DBR, R, D |
| Mitigated Zone | Bos1, Bos1 ย้าย, Bos สุดท้าย, ไม่มี |

Filter ที่ active แสดงเป็น Tag — กด **✕** ลบทีละตัว หรือ **✕ Clear** ล้างทั้งหมด

---

## 📝 การบันทึก Trade

กด **＋ Add Trade / Settings** → แท็บ **📝 Log Trade**

| ฟิลด์ | หมายเหตุ |
|-------|---------|
| Portfolio | เลือกพอร์ตที่จะบันทึก |
| Day | วันในสัปดาห์ (auto-fill) |
| Session | Out / AS / LO / NY |
| Date | วันที่ (auto-fill เป็นวันนี้) |
| Time Slot | ช่วงเวลา Session |
| Duration | ระยะเวลา Trade (นาที) |
| Time Entry | เวลาที่เข้า Trade (auto-fill) |
| Code | Code1, Code2, Nochi |
| Class | A+, A, B |
| Mode | 8 ตัวเลือก (Be, CHe, BE>B, …) |
| Model | RBR, RBD, DBD, DBR, R, D |
| Mitigated Zone | โซนที่ Mitigate |
| Entry / Target / SL | ราคา Entry, Target, Stop Loss |
| Result | TP / Loss / Miss |
| Risk ($) | ความเสี่ยงเป็นดอลลาร์ |
| Max RR | RR สูงสุดที่เป็นไปได้ |
| Picture URL | ลิงก์รูปภาพ Chart |
| Tip / Note | บันทึกสิ่งที่เรียนรู้ |

### คำนวณอัตโนมัติ

| ฟิลด์ | สูตร |
|-------|------|
| Position | Buy ถ้า Entry > SL / Sell ถ้า Entry < SL |
| RR | `(Target − Entry) ÷ (Entry − SL)` |
| PnL ($) | `Risk × RR` (TP) หรือ `−Risk` (Loss) |
| TP% | `PnL ÷ Initial Balance × 100` |

---

## 🗂️ จัดการพอร์ต

กด **＋** ในแถบพอร์ตด้านบน → เปิด Portfolio Manager

- **เพิ่มพอร์ต** — ตั้งชื่อ, เลือกสี, ใส่ยอดเริ่มต้น
- **แก้ไขพอร์ต** — กด ✏️ ถ้าเชื่อมต่อ Sheets จะ Rename Sheet อัตโนมัติ
- **ลบพอร์ต** — กด ✕ (ข้อมูล Trade จะถูกลบด้วย)

---

## 🗃️ โครงสร้าง Google Sheet

แต่ละพอร์ตสร้าง Sheet Tab แยกกัน มี 33 คอลัมน์:

| กลุ่ม | คอลัมน์ | ข้อมูล |
|-------|---------|--------|
| Input | A–R | ID, Date, Day, Session, Time Slot, Duration, Time Entry, Code, Class, Mode, Model, Zone, Entry, Target, SL, Result, Risk, Max RR |
| Auto-calc | S–AD | Position, Point, RR, PnL, TP$, SL$, TP%, DD%, Con Loss, Sum Con Loss$, Sum DD$, Balance |
| Extra | AE–AG | Picture URL, Tip/Note, Created At |

Balance เริ่มต้นเก็บใน Note ของ Cell A1 (default: 10,000)
เปลี่ยนได้โดยรัน function นี้ใน Apps Script Editor:

```javascript
setInitialBalance('ชื่อพอร์ต', 50000)
```

---

## 🛠️ Troubleshooting

| ปัญหา | วิธีแก้ |
|-------|--------|
| ข้อมูลหายหลัง Refresh | ใช้ Localhost แทนการเปิดผ่าน `file://` |
| ข้อมูลหายหลังล้าง Cache | Export backup ก่อนเสมอ หรือใช้ Google Sheets |
| เชื่อมต่อ Sheets ไม่ได้ | ตรวจสอบ URL ใน Settings / Deploy ใหม่ |
| Deploy แล้ว URL เปลี่ยน | ใส่ URL ใหม่ใน Settings แล้วกด Save |
| ข้อมูลไม่ขึ้น Sheets | ตรวจสอบ Who has access ว่าตั้งเป็น "Anyone" |
| กราฟไม่แสดง | ต้องมี Closed Trades (TP หรือ Loss) อย่างน้อย 1 รายการ |
| Port 8080 ถูกใช้งานอยู่ | เปลี่ยนเป็น port อื่น เช่น `python -m http.server 3000` |

---

## 📌 สรุปข้อควรรู้

- ไฟล์ `.html` **ไม่ได้เก็บข้อมูล Trade** — ย้ายได้เสมอ
- **Demo Mode** ข้อมูลอยู่ใน `localStorage` ของเบราว์เซอร์เครื่องนั้นเท่านั้น
- **Google Sheets Mode** ข้อมูลอยู่บน Cloud ปลอดภัย ใช้ได้ทุกเครื่อง
- แนะนำใช้ **Localhost + Google Sheets** เพื่อความเสถียรสูงสุด
