# BookMyGadi Play Store Compliance Pack
**Confidential - Internal Publishing Guide**

Google Play requires strict adherence to their Location and Data Safety policies. Use these exact templates when filling out your Play Console declarations to ensure a 100% approval rate without getting rejected.

---

## 1. Background Location Declaration (Google Play Console)

*When you upload the Driver App to the Play Store, Google will ask you why you need background location. Copy/Paste these exact answers:*

**Core Purpose:**
> The core purpose of the BookMyGadi Driver App is to connect commercial drivers with local riders seeking transportation. To effectively dispatch rides and maintain system integrity, the platform must constantly calculate the driver's distance from incoming ride requests.

**Why is background tracking needed?**
> Background location tracking is strictly necessary because drivers frequently minimize the app to use Google Maps for navigation or to accept phone calls from riders. If background location is disabled, the platform cannot update the driver's real-time position to the waiting rider, and emergency SOS tracking will fail.

**When does it stop?**
> The app only tracks location in the background when the driver explicitly toggles their status to "Online" or is actively on a trip. Once the driver goes "Offline," all background tracking services are immediately terminated.

---

## 2. In-App Disclosure UX Copy (Prominent Disclosure)

*Before triggering the Android location permission prompt, you MUST show a full-screen disclosure inside the app. This is a strict Google requirement.*

**Headline:** Allow Background Location Tracking
**Body Text:**
> "BookMyGadi Rider App collects location data to enable real-time ride matching, accurate fare calculation, and emergency SOS tracking even when the app is closed or not in use.
> 
> We need this so you don't miss ride requests while using navigation apps or making calls. This tracking ONLY occurs when you are marked as 'Online'."

**Buttons Required:**
*   [I ACCEPT & CONTINUE] -> *(Triggers system permission)*
*   [NO THANKS] -> *(Closes dialog, keeps driver offline)*

---

## 3. Permission Request Sequence Logic

Ensure your React Native / Android codebase follows this exact sequence:

1.  **Check Status:** User clicks "Go Online".
2.  **Check Permission:** If `ACCESS_BACKGROUND_LOCATION` is missing:
3.  **Show Prominent Disclosure:** Display the full-screen UX copy (Section 2).
4.  **User Clicks Accept:** Only then trigger the system Android Permission popup.
5.  **User Selects "Allow all the time":** State changes to Online.

---

## 4. Demo Video Script (For Play Store Reviewers)

*Google often requests a YouTube link demonstrating how background location is used. Record a 60-second video of your app and upload it as Unlisted on YouTube.*

**Video Script/Action Sequence:**
1.  **[0:00 - 0:10]** Open the BookMyGadi Rider App.
2.  **[0:10 - 0:20]** Click the "Go Online" button.
3.  **[0:20 - 0:25]** Show the Prominent Disclosure screen (Very Important!).
4.  **[0:25 - 0:35]** Click "Accept" and show the Android System Permission prompt being accepted ("Allow all the time").
5.  **[0:35 - 0:45]** Swipe the app to the background (go to Android Home Screen).
6.  **[0:45 - 0:60]** Show the Android notification shade displaying the persistent notification: "BookMyGadi is running: Tracking location for rides".

*Submit this YouTube link in the Play Console Location Declaration form.*

---

## 5. Data Safety Form Answers

When filling out the Data Safety Questionnaire in the Play Console:

*   **Location:** Yes -> Precise Location -> Used for App Functionality & Fraud Prevention -> Required.
*   **Personal Info:** Name, Phone Number, Email -> Used for App Functionality & Account Management -> Required.
*   **Financial Info:** Purchase History -> Used for App Functionality -> Required.
*   **Device or Other IDs:** Yes -> Used for Fraud Prevention, Analytics -> Required.
*   **Data Deletion:** Yes, users can request data deletion. (Provide the link: `https://your-domain.com/legal-hub.html#deletion`)
*   **Data Encryption in Transit:** Yes.
