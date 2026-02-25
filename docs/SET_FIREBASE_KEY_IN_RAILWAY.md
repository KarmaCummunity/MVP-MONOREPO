# הגדרת Firebase Service Account Key ב-Railway

## שלב 1: העתק את ה-JSON

העתק את כל התוכן הזה (כולל הסוגריים):

```json
{
  "type": "service_account",
  "project_id": "karma-community-app",
  "private_key_id": "5ab25ce36b9b98abb3c1a03130766181dd75f0de",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCyfaWFXr795jEz\ntQPDK8w4c6a85D1hslyrYE7ZtWDICDHXw9NnB3DuZEHb4F+elGlkGirA9QF4E2QQ\nQF4NIJjq/dxksUR0bRb1pLBxqhRJ/oxdh96REoLpCLlM70fK5He/QK4pFsPddOGx\nK6os++hp0vp1GN/NVLmV5U+xMLmI2qxm1o21gQ+pss2p6AR8VHfAZWtPfBcby8j3\nvYG9Fk4IMngjcfiAURNgcjL3ZSk7DE0A7OOk4VZ/J2lvXssTDqRKReIr1wNcQ/nT\nri86l1S08LQgD1bgF7WrVzvEKItt0NZRavRJh54+c5fm3MHD1a3m8Y/mndfmIbb9\nYsnxFlD5AgMBAAECggEAG6H8GBO8+c3DXD/v3y1OpoaxD5k+L3vPgPCeBHJiE1XB\ncafteIvcXevDjmjEJObREiBC8jB8E7zcxu9QIDQluGuozSXsdSHWZh0i+9Xa4kG4\nNVqtiEQXZEBnf5Ojx7NrHn7C97WAiS5pKmaaJ/Cv4II7KBm7vCwbtysTFVl3v8no\nSD0P3IRmVtcpAxNWNFE9pVHnq0Vn+zMhiRNiWz7rlHOgqYAz0EgWAwbldEcVQU7Y\nheIexPWhYupl8Fjaf9ExyFMEkSgLEUlXQLxgVhbSsfCJ0dcZs9F3ROqo+m7KCB3n\npi2fWobXIOVtefjF+O5Ynm86vpmqvwyit987Hd2TSQKBgQDuHg4FINdu0BkiunvL\nD3QxtWL4QGPnuyFAUkkJfKMfTJFxUiz6e8OK4nIzlyLOm3NH1LDR7XogWtQOjh4R\n9aynQlnEp3Q7mvATl2fD/WEuQMUo7vHdFB+Ig0NpXod5Py6x3a7Pu2wVaChDZNj/\nNh+h5MEVkNLrMEQh+hSIdsyz2wKBgQC/5TxlA8asbN1XtyW+zvCs0o1zYe2P/9l/\nGoGnq9qcgZ3E1WK7froVtfDYsQmLT4KRfh7IuCZocKGnApbKwo6Bz9ZkxE6wtdy9\n9r7/vZx4STHbkfs5B3yQgk63EZ0fiDUL+a7IJzVHi1eiPIVAAzth06qEyQpSrbTD\nYDW0qFfQuwKBgQDeqUYM75fkLD3E5sLJsCrELMxePb/uOmMuhYN8lormwq+iWuhq\nVf8VSQjnSyWmM2CKQ84Qj9NKnAR9k9F0k9meEgJlTPz4m7pxZ3wFnlMYcEKtMzsB\ns0aFXdFUn6to6nccpaJI6AZ6wgoccxojFBZiSclwBBvnBxw+9V3r+cMTTwKBgAGh\nhCLjplOe1T7CmrqFbbw6SeN6KJe5t/KBmip/pmsAGwQqQB2R1SkME9DzqD4b3eM4\nrDBOiF0I4AbYWcm9X5Kw3oSauoR79zVSHIt15BeNn7PbCMSSULe1s8+QgcJb2P+S\nDq86zhQelg8V7pf9rwqEzwUz5DeRrGCgt7QiXiSzAoGAOT8nMR2wZpFAWw6fVq8e\nF2oDQsPdP3KkEAoXPEx0HBm1Qu/4oVW5lY1uTsaOt9pnaH8WHjmJex6ym3AFUvOZ\nrhxOmTwcs0rxW0zxJaIt/RXcBHFetuB5wRqL1kWqk1wjlQQcwtiqJw4WlBj4v98P\nekqjPNEGehUGx/EfkbzV4k8=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@karma-community-app.iam.gserviceaccount.com",
  "client_id": "110455126389065908008",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40karma-community-app.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```

## שלב 2: הגדר ב-Railway

1. לך ל-[Railway Dashboard](https://railway.app/dashboard)
2. בחר את הפרויקט **KC-MVP-server** (production)
3. בחר את ה-service
4. לך לטאב **Variables**
5. לחץ **+ New Variable**
6. שם המשתנה: `FIREBASE_SERVICE_ACCOUNT_KEY`
7. הערך: הדבק את כל ה-JSON מהשלב 1 (כולל הסוגריים)
8. לחץ **Add**

## שלב 3: השרת יתאתחל מחדש

השרת יתאתחל אוטומטית אחרי הוספת המשתנה (2-3 דקות).

## שלב 4: הרצת הסינכרון

אחרי שהשרת עלה, הרץ:

```bash
curl -X POST "https://kc-mvp-server-production.up.railway.app/api/sync/all" \
  -H "Content-Type: application/json"
```

או פשוט תגיד לי ואני אריץ את זה עבורך! 🚀


