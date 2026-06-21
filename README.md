# Advanced Tunnel Server System

## سیستم تانل فوق پیشرفته

یک سیستم تانل سطح تولید کامل و جامع برای مدیریت، نظارت و کنترل تانل‌های شبکه با قابلیت‌های پیشرفته.

## ویژگی‌ها 🚀

### 1. **مدیریت تانل**
- ✅ ایجاد تانل‌های جدید
- ✅ حذف تانل‌ها با آزادسازی خودکار پورت‌ها
- ✅ تغییر پورت‌های تانل
- ✅ ذخیره و بازیابی تانل‌های دائمی

### 2. **مدیریت پورت‌ها**
- ✅ تخصیص خودکار پورت‌ها
- ✅ بازسازی پورت‌های آزاد شده
- ✅ نگاه‌داری پورت‌های استفاده شده
- ✅ مدیریت دامنه پورت‌ها

### 3. **نظارت بر اتصالات**
- ✅ اندازه‌گیری پینگ در زمان واقعی
- ✅ محاسبه کیفیت اتصال (عالی/خوب/متوسط/ضعیف)
- ✅ شمارش داده‌های رد و بدل
- ✅ تشخیص و ثبت خطاها

### 4. **تجزیه و تحلیل داده‌ها**
- ✅ محاسبه پهنای باند
- ✅ آمار ترافیک در زمان واقعی
- ✅ تحلیل الگوهای استفاده
- ✅ گزارش‌های دقیق

### 5. **API RESTful**
```bash
# ایجاد تانل
POST /api/tunnels/create

# دریافت لیست تانل‌ها
GET /api/tunnels/list

# دریافت جزئیات تانل
GET /api/tunnels/:tunnelId

# حذف تانل
DELETE /api/tunnels/:tunnelId

# دریافت اتصالات فعال
GET /api/tunnels/:tunnelId/connections

# دریافت آمار تانل
GET /api/tunnels/:tunnelId/stats

# دریافت وضعیت پورت‌ها
GET /api/tunnels/ports/status

# آمار کلی
GET /api/stats/global

# وضعیت سیستم
GET /api/admin/status
```

### 6. **ابزار Command Line**
```bash
# ایجاد تانل
npm run tunnel:create

# دریافت لیست تانل‌ها
npm run tunnel:list

# حذف تانل
npm run tunnel:delete

# مشاهده وضعیت تانل
npm run tunnel:status
```

### 7. **WebSocket للاتصالات في الوقت الفعلي**
- ✅ اشتراك في تحديثات التنقل
- ✅ مراقبة المقاييس الحية
- ✅ إشعارات الأحداث

### 8. **مدیریت پایگاه داده**
- ✅ ذخیره تمام تانل‌ها
- ✅ ثبت جلسات اتصال
- ✅ ذخیره آمار
- ✅ بازیابی سریع

## نصب و راه‌اندازی 📦

### نیازمندی‌ها
```bash
Node.js >= 16.0.0
npm >= 8.0.0
```

### نصب
```bash
git clone https://github.com/XP-TAM/Tunnel.git
cd Tunnel
npm install
```

### تنظیمات محیط
```bash
cp .env.example .env
# ویرایش فایل .env با تنظیمات خود
```

### راه‌اندازی سرور
```bash
# حالت توسعه
npm run dev

# حالت تولید
npm start
```

## نمونه استفاده 💡

### ایجاد تانل
```bash
curl -X POST http://localhost:3000/api/tunnels/create \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: your-api-key" \
  -d '{
    "localHost": "127.0.0.1",
    "localPort": 8080,
    "remoteHost": "example.com",
    "remotePort": 80,
    "name": "My Tunnel",
    "description": "Test tunnel",
    "portCount": 1
  }'
```

### مشاهده جزئیات تانل
```bash
curl -X GET http://localhost:3000/api/tunnels/tunnel_123456789 \
  -H "X-API-KEY: your-api-key"
```

### حذف تانل
```bash
curl -X DELETE http://localhost:3000/api/tunnels/tunnel_123456789 \
  -H "X-API-KEY: your-api-key"
```

## ساختار پروژه 📁

```
Tunnel/
├── src/
│   ├── index.js                 # نقطه ورود اصلی
│   ├── core/
│   │   ├── tunnel-manager.js    # مدیریت تانل‌ها
│   │   ├── tunnel-session.js    # جلسات تانل
│   │   └── port-manager.js      # مدیریت پورت‌ها
│   ├── monitor/
│   │   ├── ping-monitor.js      # نظارت پینگ
│   │   ├── connection-monitor.js# نظارت اتصالات
│   │   ├── data-analyzer.js     # تجزیه داده‌ها
│   │   └── system-monitor.js    # نظارت سیستم
│   ├── routes/
│   │   ├── tunnel-routes.js     # روت‌های تانل
│   │   ├── statistics-routes.js # روت‌های آمار
│   │   └── admin-routes.js      # روت‌های مدیریتی
│   ├── server/
│   │   └── websocket-server.js  # سرور WebSocket
│   ├── database/
│   │   └── db-manager.js        # مدیریت پایگاه داده
│   ├── middleware/
│   │   ├── auth.js              # احراز هویت
│   │   └── error-handler.js     # مدیریت خطا
���   ├── utils/
│   │   └── logger.js            # سیستم لاگ
│   └── cli/
│       ├── create-tunnel.js     # ابزار ایجاد
│       ├── list-tunnels.js      # ابزار لیست
│       ├── delete-tunnel.js     # ابزار حذف
│       └── tunnel-status.js     # ابزار وضعیت
├── data/
│   └── tunnel.db                # پایگاه داده
├── logs/
│   ├── error.log
│   └── combined.log
├── package.json
└── .env
```

## معیارهای پایش شده 📊

### برای هر تانل:
- **پینگ**: مدت زمان رفت و برگشت
- **کیفیت اتصال**: عالی/خوب/متوسط/ضعیف
- **داده دریافتی**: بایت‌های دریافت شده
- **داده ارسالی**: بایت‌های ارسال شده
- **بسته‌های دریافتی**: تعداد بسته‌ها
- **بسته‌های ارسالی**: تعداد بسته‌ها
- **مدت اتصال**: مدت زمان برقراری اتصال
- **خطاها**: تعداد خطاها

## نکات امنیتی 🔒

1. استفاده از API Key برای احراز هویت
2. رمزگذاری داده‌ها در ذخیره‌سازی
3. محدودیت نرخ درخواست
4. لاگ‌گیری تمام اقدامات
5. معتبرسازی ورودی‌ها

## مجوز 📜

MIT License - برای اطلاعات بیشتر فایل LICENSE را مشاهده کنید

## پشتیبانی 💬

در صورت سؤال یا مشکل، لطفاً Issue باز کنید.

---

**ساخته شده با ❤️ توسط XP-TAM**
