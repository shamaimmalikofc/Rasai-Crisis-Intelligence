# 🚀 Rasai Crisis Intelligence: Android APK & Google Cloud Deployment Guide

Aao dost! Yeh guide aapko step-by-step bataye gi ke **Rasai Crisis Intelligence** application ko ek real Android `.apk` mobile app mein kaise convert karna hai, iski backend services ko **Google Cloud Run** par kaise deploy karna hai, aur isse judges ke sath **Google Drive** ke zariye kaise share karna hai.

---

## 🏗️ Project Architecture Overview (Sajna Aur Samjhna)

Aapka project 2 hisson par mushtamil hai:
1. **Frontend (React Native/Expo App)**: Jo mobile phone par chalti hai aur map aur chats ko render karti hai.
2. **Backend (Node.js/Express Server)**: Jo Gemini AI model, OpenWeather APIs aur OSRM router ko chala kar dynamic bypass routes calculate karta hai.

> [!IMPORTANT]  
> **Deployment Kyun Zaroori Hai?**  
> Jab aap mobile app ka `.apk` build kar ke kisi ke phone par install karte hain, to phone `http://localhost:5000` se connect nahi ho sakta (kyunke localhost phone ke apne aap ko kehta hai, aapke computer ko nahi). Gemini AI aur maps ko judges ke phone par active chalane ke liye, **backend server ko online host karna zaroori hai** taake phone internet ke zariye server se baat kar sake!

---

## 📱 PART 1: Compile Android APK (Expo EAS Build)

Hum native Android APK compile karne ke liye **Expo Application Services (EAS)** ka use karenge. Yeh Expo ka official aur fast build tool hai jo bina Android Studio ke sirf 5 minutes mein cloud par APK bana deta hai!

### Step 1: Install EAS CLI Globally
Apne terminal (PowerShell ya command prompt) mein root directory par yeh command chalayein:
```bash
npm install -g eas-cli
```

### Step 2: Login or Register on Expo
Apna free Expo account banayein (https://expo.dev) aur terminal mein login karein:
```bash
eas login
```

### Step 3: Configure EAS Build
Frontend directory (`c:\Users\Abc\Desktop\Rasai\frontend`) mein chalein aur EAS configure karein:
```bash
cd frontend
eas build:configure
```
*Terminal aapse pooche ga ke konsi platforms build karni hain, select: **Android**.*

### Step 4: Configure `eas.json` for APK Output
Configure hone ke baad, `frontend/eas.json` file auto-create ho jaye gi. Check karein ke usme `preview` profile ke andar `apk` format enabled ho:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {}
  }
}
```

### Step 5: Start the APK Compilation Build
Ab terminal mein yeh single command run karein:
```bash
eas build -p android --profile preview
```
*Yeh command aapke code ko Expo cloud servers par upload karegi aur ek mukammal **Android `.apk`** compile kar ke download link de degi.*

---

## ☁️ PART 2: Deploy Backend to Google Cloud Run (Premium Google Choice)

Chunkay yeh Google Hackathon hai, backend ko **Google Cloud Run** par deploy karna judges ko boht wow kare ga aur Google tools ke use ke extra points milenge!

### Prerequisites
1. **Google Cloud Account** (https://console.cloud.google.com) par free account banayein.
2. **Google Cloud SDK CLI** install karein (https://cloud.google.com/sdk/docs/install).

### Step-by-Step Deployment

#### Step 1: Initialize Google Cloud CLI
Apne computer ke terminal mein login karein:
```bash
gcloud auth login
```

#### Step 2: Set Project ID
GCP Console mein ek new project banayein aur uski ID yahan set karein:
```bash
gcloud config set project YOUR_PROJECT_ID
```

#### Step 3: Deploy the Backend (Root of backend folder)
Backend directory (`c:\Users\Abc\Desktop\Rasai\backend`) mein chalein aur Google Cloud Run par deploy karein:
```bash
cd backend
gcloud run deploy rasai-backend --source . --platform managed --allow-unauthenticated
```
*Terminal aapse **region** pooche ga (select `us-central1` or nearest) aur build process shuru kar de ga.*

#### Step 4: Set Environment Variables (GCP Secrets)
Deploy hone ke baad console ya CLI ke zariye credentials inject karein:
```bash
gcloud run services update rasai-backend \
  --set-env-vars="GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE,OPENWEATHER_API_KEY=YOUR_OPENWEATHER_API_KEY_HERE"
```

> [!TIP]  
> **Free Fast Alternative (Render/Railway):**  
> Agar aap Google Cloud ke complex billings ya console se bachna chahte hain aur 2 minutes mein deploy karna chahte hain, to aap **Render** (https://render.com) par GitHub connect kar ke free Web Service create kar sakte hain aur Environment Variables add kar ke deploy kar sakte hain!

---

## 🔗 PART 3: Connect Frontend to Deployed Backend

Jab aapka backend online deploy ho jaye (jaise `https://rasai-backend-xxxx.a.run.app`), to frontend ko usse connect hoga.

1. Open [frontend/App.js](file:///c:/Users/Abc/Desktop/Rasai/frontend/App.js) line 24.
2. `BACKEND_URL` ko update karein:
```javascript
// Replace localhost with your live Google Cloud Run or Render backend URL!
const BACKEND_URL = 'https://rasai-backend-xxxx.a.run.app';
```
3. Ab **Step 5 (EAS Build)** ka APK build chalayein taake aapka APK live online server se connect ho kar chal sake!

---

## 🏆 PART 4: Share Your App with Hackathon Judges (Google Drive)

Aapki final mobile app ko judges ke sath share karne ka sab se professional aur Google-approved tarika:

1. **Upload APK to Google Drive**: Expo EAS build se download shuda `.apk` file ko apne **Google Drive** par upload karein.
2. **Get Shareable Link**: File par right-click karein, *Share* par click karein, aur access ko **"Anyone with the link"** kar ke link copy kar lein.
3. **Scan QR Code & Play Video**:
   - Apni screen-recording demo video banayein aur YouTube ya Google Drive par upload karein.
   - Apni presentation slides mein Google Drive ka shareable APK download link aur video demo link add karein!

Aapka poora Agentic AI mobile system 100% stable, fully featured aur hackathon jeetne ke liye bilkul taiyar hai! 🚀
