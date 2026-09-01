# إعداد Firebase

1. أنشئ مشروعًا في Firebase وأضف Web App.
2. فعّل Authentication ثم Email/Password.
   وللدخول التلقائي بدون شاشة حساب، فعّل أيضًا **Anonymous** من Sign-in providers.
3. أنشئ Firestore Database في وضع الإنتاج.
4. انسخ `firebase-config.example.js` إلى `firebase-config.js` وضع قيم Web App (القيم العامة ليست Service Account secrets).
5. انشر `firestore.rules` من Firebase Console.
6. أنشئ أول مستخدم في Authentication، ثم أنشئ مستند `users/{uid}` بحقل `role: admin`.
7. افتح `index.html` عبر Netlify. أضف إعدادات Firebase في `firebase-config.js` قبل النشر.
8. اختبر الدخول، الإضافة، الاستلام والصرف، ثم افتح نافذتين للتحقق من التحديث الفوري.

جميع المستخدمين الذين يسجلون الدخول يستطيعون قراءة وإضافة وتعديل وحذف المواد والحركات وجهات الاتصال. لا حاجة لإنشاء مستخدم Admin أو حقل role. لا تجعل القواعد عامة للزوار المجهولين؛ ذلك يسمح لأي شخص على الإنترنت بحذف المخزون.

بعد تفعيل Anonymous، يفتح الموقع تلقائيًا ويمنح كل جهاز هوية Firebase مؤقتة دون طلب بريد أو كلمة مرور.

## النشر على Firebase Hosting

ثبّت Firebase CLI ثم سجّل الدخول:

```bash
npm install -g firebase-tools
firebase login
```

من مجلد المشروع شغّل:

```bash
firebase deploy --only hosting,firestore:rules
```

سيظهر رابط الاستضافة مثل `https://makhzni-39d38.web.app`. ملف `firebase.json` يضبط الاستضافة ويدعم فتح المسارات مباشرة بدون 404.

## الاتصال والإعدادات

يدعم التطبيق Firestore persistence لتحسين العمل أثناء انقطاع قصير، مع إبقاء Firestore وقواعده مصدر الحماية. لا تضع Service Account أو Firebase Admin credentials في الواجهة.

البيانات القديمة لا تُحذف؛ استخدم تصدير JSON الحالي ثم حمّله/حوّله إلى مجموعتي `materials` و`stockMovements` مرة واحدة.
