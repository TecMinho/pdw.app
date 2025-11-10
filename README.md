## 🎒 Credentials Wallet App (EBSI SSI Mobile Wallet)

A mobile app that acts as a Self-Sovereign Identity (SSI) digital wallet for managing Verifiable Credentials (VCs) and 
Verifiable Presentations (VPs). The app is part of the EBSI SSI Prototype, enabling credential retrieval, storage and presentation through QR code scanning.

## 🛠️ Technologies Used

- React Native (Expo)
- [expo-camera](https://www.npmjs.com/package/expo-camera) with [expo-barcode-scanner](https://www.npmjs.com/package/expo-barcode-scanner)
for scanning QR codes
- [AsyncStorage](https://www.npmjs.com/package/@react-native-async-storage/async-storage) for local wallet storage

## 🧪 Features

- 🔐 Authenticate the user with the EBSI portal
- 📥 Accept credentials via QR code and credential offer URL
- 🗂️ Store and manage received credentials locally
- ☑️ Full compliance with the EBSI conformance tests
- 🧾 Present credentials when requested (selectively)

## 📲 Running the App

#### 1. Install Expo Go on your smartphone

#### 2. Run `portuguese-digital-wallet-api` before running the application

Ensure both the machine running the app and your smartphone and on the same network.

#### 3. Clone the project

```
git clone https://github.com/DaxLedger/portuguese-digital-wallet-app.git
cd portuguese-digital-wallet-app
```

#### 4. Install dependencies

```
npm install
```

#### 5. Configure API endpoint

Edit `.env` file:

    `EXPO_PUBLIC_API_URL=http://<YOUR_API_URL>`

#### 6. Start the app

```
npm run start
```

#### 7. Open the app on your phone

Open the Expo Go app on your phone and scan the QR code from your terminal or browser. The application should launch automatically.

## 🧱 Project Structure

```
/app
|-- /(app)
|     |-- /(tabs)/      // Main page view
|     |-- /credential   // Credential information view
|-- /auth               // Authentication layer
/assets                 // Images and fonts
/components             // Reusable UI components
/constants              // Color constants
/helpers                // Scan mappings and DIDs, EBSI and storage utility logic
/providers              // Authentication and Dialog providers
/utils                  // Utility functions
```

## 🔐 Credential Lifecycle

#### 1. Issuance

- The student requests credential issuance by scanning a QR code or pasting an offer URL and enters a 
pre-authorized code (if needed)
- The app fetches the credential offer and handles the OpenID compliant flow
- The credential is stored in the local wallet

#### 2. Presentation

- The student scans a presentation request QR code
- The app requests a Verifiable Presentation and handles the OpenID compliant flow
- The validity of the credentials shared in the Verifiable Presentation is returned and displayed to the user

## 🌍 Notes / FAQs

- Localhost (`127.0.0.1`) won't work for API access from mobile — use your network's IP!
- One must set a PIN to unlock the device when running in the *emulator* otherwise the App will be stuck in the splash screen.
