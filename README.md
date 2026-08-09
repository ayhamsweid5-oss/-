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
