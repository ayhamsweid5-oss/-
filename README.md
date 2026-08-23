# مخزني

نظام إدارة مخازن يعمل محليًا عبر Electron أو Web، مع Backend اختياري باستخدام Node.js وPostgreSQL وSocket.IO.

## تشغيل الواجهة المحلية

```powershell
cd server
npm start
```

ثم افتح [http://localhost:3000/](http://localhost:3000/).

## بيانات الدخول

يتم تحديد بيانات المستخدم الإداري من متغيرات البيئة عبر `ADMIN_USERNAME` و`ADMIN_PASSWORD`. لا تُحفظ كلمات المرور في المستودع.

## Backend

يتم إعداد PostgreSQL من خلال `server/schema.sql`، ثم إنشاء المستخدم الإداري بواسطة:

```powershell
cd server
npm install
npm run seed-admin
```

لا ترفع ملفات `.env` أو بيانات قواعد البيانات إلى GitHub.

## نشر الـBackend

الواجهة ثابتة على Netlify، بينما يحتاج الـBackend إلى خدمة Node.js وقاعدة PostgreSQL. تم توفير ملف `render.yaml` للنشر على Render.

1. افتح Render واختر New > Blueprint.
2. اختر مستودع GitHub هذا.
3. بعد إنشاء الخدمة، اضبط `CORS_ORIGIN` على رابط Netlify.
4. اضبط عنوان API في الواجهة عبر `window.MAKHZANI_API_URL` ليكون رابط خدمة Render متبوعاً بـ `/api`.
5. نفّذ تهيئة قاعدة البيانات من `server/schema.sql` ثم أنشئ المستخدم الإداري عبر `npm run seed-admin`.

لا تضع كلمات المرور أو مفاتيح JWT داخل GitHub.
