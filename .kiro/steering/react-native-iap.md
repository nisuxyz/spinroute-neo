This guide provides a comprehensive walkthrough for implementing paid subscriptions in a React Native application using the react-native-iap library.

We'll demonstrate how to create two subscription tiers—Basic and Premium—both offering 7-day free trials and monthly auto-renewing models for cross-platform integration across iOS App Store and Google Play Store. While Firebase will serve as the Backend-as-a-Service (BaaS) for this implementation, the techniques can be easily adapted to other backend technologies.

The tutorial is designed to accommodate developers at different stages of app development, allowing you to selectively follow or adapt steps based on your specific in-app subscription requirements and current development progress.
Before You Start

    Complete all required app store agreements, bank account setup, and tax documentation.
    Use physical devices only — in-app purchases are not fully supported on simulators or emulators.
    When you encounter issues, consult the official FAQ and Troubleshooting guides.

Recommended Pre-Reading

    General documentation:
        RN IAP Official Documentation
    Android:
        Understanding subscriptions
        Subscription lifecycle
        Real Time Developer Notifications and Purchase Lifecycle
        Real Time Developer Notification Reference
        Subscriptions Developer Policy
        Test your Google Play Billing Library integration
    iOS:
        Auto renewable subscriptions
        In app purchase information
        App Store Server Notifications
        App Review Guidelines

Installing the Library

Follow the installation steps outlined in the official documentation: Get started with react-native-iap.
Android Setup

Step 1: Set up application licensing

        Open Google Play Console
        Click Settings > License testing
        Choose license testers from the email lists or create new email list
        Save Changes

Step 2: Create an app in the Google Play Console

Step 3: Upload valid app bundle to internal testing track

        Generate the release AAB following React Native guide.
        Google Play Console > Testing > Internal testing > Create new release and select testers > Publish

Step 4: Configure Real-time Developer Notifications

        Open Google Cloud Console and select your project (you may need to create a new project if it's not already present in GCC)
        Search for Pub/Sub Global real-time messaging and in the navigation menu select: Pub/Sub > Topics > Create topic (Enter your topic id and leave the default values for the remaining options)
        Find your newly created topic and open permission details
        Add google-play-developer-notifications@system.gserviceaccount.com as principal and grant it the role of the pub/sub publisher > Save
        Google Play Console > Monetize > Monetization setup > Enable real-time notifications > Enter the full Cloud Pub/Sub topic name that you configured earlier (format: projects/{project_id}/topics/{topic_name})
        Test configuration by clicking "Send test notification" and then "Test notification sent" notification should appear
        Save changes

Step 5: Configure service account

        Google Cloud Console > Credentials > Create credentials > Service account
        Enter service account details > Create and continue > Add Pub/Sub Editor role > Done
        Project dashboard > Select newly created service account to open its details page > Keys > Add key > Create new key > JSON > Create
        JSON file will be downloaded: Store the file securely because this key can't be recovered if lost.

Step 6: Enable Google Play Android Developer API

        Open Google Cloud Console > Credentials > Create credentials
        Select APIs & Services > Enable APIS and Services > Search for Google Play Android Developer API > Enable
        Follow these steps to setup service account from previous step to use Google Play Developer API

Step 7: Create subscriptions - for each tier create a separate subscription with a single base plan and an free trial offer

        Google Play Console > Monetize > Products > Subscriptions > Create subscription
        Set up the subscription by following the steps listed in the play console
        Activate subscriptions, base plan and the offers

iOS Setup

Step 1: Open project in xcode (.xcworkspace)

        Make sure bundle identifier is correct
        Select Signing & Capabilities tab > + Capability > Add In-App Purchase capability

Step 2: Create an app in the App Store Connect

        Make sure to select correct bundle identifier

Step 3: Create subscriptions - Create a subscription group and then create a separate subscription for each tier

        Open your app dashboard in App Store Connect
        Sidebar > Monetization > Subscriptions > Find Subscription groups section > Create > Name your subscription group, eg. Premium Access > Create
        Select newly created subscription group > Subscriptions > Create
        Order of subscription matters: arrange your subscriptions in order from the one that offers the most (level 1) to the one that offers the least (level n) otherwise your subscription upgrades/downgrades will be broken
        Make sure all your created subscriptions are in "Ready to Submit" status: if not, check if you added all the required subscription info

Step 4: Configure Sandbox testers

        Open App Store Connect > Users and Access > Sandbox > Add new sandbox tester
        Use this user for in app purchase testing

Step 5: Configure App Store Server Notifications

        Open your app in App Store Connect > App Information > App Store Server Notifications > Add Sandbox Server URL (and production server URL when ready)

Client-side Code

The following data model tracks essential subscription details for each user, including their current plan, subscription status, platform-specific information, and billing metadata. User subscription data is automatically generated with default values when a user creates an account.

type InAppSubscription = {
id: string;
purchaseUUID: string;
subscriptionExpirationTime: number | null;
productId: SubscriptionTier | null;
upcomingProductId: SubscriptionTier | null;
trial: boolean;
renewing: boolean;
android?: { purchaseToken: string; linkedPurchaseToken: string | null };
ios?: {
originalTransactionId: string | undefined;
transactionId: string | undefined;
};
};

Here is the breakdown of InAppSubscription data model:
Field Description
id A unique identifier for the subscription
purchaseUUID UUID token to be able to correspond transactions with users
subscriptionExpirationTime The expiration time of the subscription
productId Current active subscription product id (id you defined when creating subscription in App Store Connect & Google Play Console)
subscriptionExpirationTime The expiration time of the subscription
upcomingProductId Upcoming product on the next renewal date
trial Is free trial is active or not
renewing Is subscription renewing or not
android.purchaseToken Unique identifier that represents the user and the product ID for the in-app product they purchased
android.linkedPurchaseToken Indicates the old purchase from which the user upgraded, downgraded, or resubscribed
ios.originalTransactionId The original transaction identifier of a purchase
ios.transactionId The unique identifier for a transaction, such as an In-App Purchase, restored In-App Purchase, or subscription renewal
User subscription listener

Once the user is authenticated, set up a listener to listen for subscription data changes in the database. This way, whenever subscription data changes (e.g., on renewal, cancellation, upgrade), the app will automatically update to reflect the latest information.

The subscription data is stored in shared state, making it accessible throughout the app.

useEffect(() => {
if (!user) {
return;
}

    const subscriptionDocRef = firestore()
      .collection("subscriptions")
      .doc(user.id);

    const unsubscribe = subscriptionDocRef.onSnapshot(
      (snapshot) => {
        const inAppSubscription = snapshot.data();
        setInAppSubscription(inAppSubscription as InAppSubscription);
        setIsLoadingInAppSubscription(false);
      },
      () => {
        setIsLoadingInAppSubscription(false);
      },
    );

    return unsubscribe;

}, [user]);

Displaying subscription products

⚠️ Important: Items displayed in this guide are for demonstration purposes only. Before submitting your app to the stores, review the App Review Guidelines and the Android Subscriptions Developer Policy. Be transparent about your offers, or risk app rejection.

Define the subscription tiers in a constants file:

export const skus: SubscriptionTier[] = [
"rniapexample_basic",
"rniapexample_premium",
];

Use the useIAP hook to interact with in-app purchases:

import {
clearTransactionIOS,
requestSubscription,
type Subscription,
type SubscriptionAndroid,
type SubscriptionIOS,
SubscriptionPlatform,
useIAP,
} from "react-native-iap";

const {
connected,
subscriptions,
getSubscriptions,
} = useIAP();

Once the device is connected to Play Store/App Store servers, fetch the subscription products:

useEffect(() => {
if (!connected) {
return;
}

    const fetchInAppSubscriptions = async () => {
      try {
        await getSubscriptions({
          skus,
        });
      } catch (error) {
        /** Don't forget to handle your errors. */
      } finally {
        setIsLoadingSubscriptionProducts(false);
      }
    };

    fetchInAppSubscriptions();

}, [connected]);

If the user already has an active or upcoming subscription, filter it out to avoid showing it again:

useEffect(() => {
if (!isActiveInAppSubscription || !currentInAppSubscription) {
setAvailableSubscriptionProducts(subscriptions);
return;
}

    setAvailableSubscriptionProducts(
      subscriptions.filter(
        (sub) =>
          sub.productId !== currentInAppSubscription.productId &&
          sub.productId !== currentInAppSubscription.upcomingProductId,
      ),
    );

}, [subscriptions]);

Now you can display the available subscription products on the screen.

⚠️ Note: SubscriptionAndroid and SubscriptionIOS may return different properties and values depending on your subscription setup, pricing phases, offers, and other factors.

    import {
      type Subscription,
      type SubscriptionAndroid,
      type SubscriptionIOS,
      SubscriptionPlatform,
      useIAP,
    } from "react-native-iap";

    ...

      <FlatList
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.flatListContainer}
        data={availableSubscriptionProducts}
        renderItem={({ item }) =>
          isSubscriptionTier(item.productId) ? (
            <Block>
              {item.platform === SubscriptionPlatform.ios && (
                <InAppSubscriptionCard
                  title={item.title}
                  description={item.description}
                  price={item.localizedPrice}
                  onSelectSubscription={() => requestSubscriptionIOS(item)}
                />
              )}
              {item.platform === SubscriptionPlatform.android && (
                <InAppSubscriptionCard
                  title={item.name}
                  description={item.description}
                  price={
                    item.subscriptionOfferDetails[0].pricingPhases
                      .pricingPhaseList[0].formattedPrice
                  }
                  onSelectSubscription={() => requestSubscriptionAndroid(item)}
                />
              )}
            </Block>
          ) : (
            <Text>Unkown product</Text>
          )
        }
      />
    ...

Request Android Subscription

When requesting an Android subscription, consider the following:

    If the user already has an active subscription, you must include purchaseTokenAndroid with the current subscription's stored purchaseToken. This ensures the new subscription is treated as an upgrade or downgrade.
    Provide the obfuscatedAccountIdAndroid, which is an obfuscated version of the user's unique account ID in your app. This value will appear in the response from the Android Publisher API and can be used to match the subscription to the corresponding user in your database. This will be utilised in server-side code.

import {
clearTransactionIOS,
requestSubscription,
type Subscription,
type SubscriptionAndroid,
type SubscriptionIOS,
SubscriptionPlatform,
useIAP,
} from "react-native-iap";

const requestSubscriptionAndroid = async (
requestedSubscription: SubscriptionAndroid,
) => {
try {
/\*\*
_ Do not confuse current in app subscription with active in app subscription.
_ Current in app subscription is saved in db as soon as the user creates an account.
\*/
if (!currentInAppSubscription) {
throw new Error("User account is not valid. Missing subscription data.");
}

      const { subscriptionOfferDetails, productId } = requestedSubscription;

      /**
       * Find the offer detail for the free trial or the base offer.
       * Base offers have offerId set to null.
       */
      const offerDetail = subscriptionOfferDetails.find(
        (offer) => offer.offerId === "free-trial" || !offer.offerId,
      );

      if (!offerDetail) {
        throw new Error("Offer detail not found.");
      }

      await requestSubscription({
        sku: productId,
        purchaseTokenAndroid: isActiveInAppSubscription
          ? currentInAppSubscription?.android?.purchaseToken
          : undefined,
        obfuscatedAccountIdAndroid: currentInAppSubscription?.purchaseUUID,
        ...(offerDetail.offerToken && {
          subscriptionOffers: [
            {
              sku: productId,
              offerToken: offerDetail.offerToken,
            },
          ],
        }),
      });
    } catch (error) {
      console.error(error);
    }

};

Request IOS Subscription

When requesting an IOS subscription, consider the following:

    Finish remaining transactions: The clearTransactionIOS function clears any unfinished transactions, addressing issues such as those described in issue #257 and issue #801.
    Provide appAccountToken: This token links a customer's In-App Purchase to its corresponding App Store transaction, similar to how obfuscatedAccountIdAndroid mentioned earlier is used for Android subscriptions. On the server side, this value helps match the subscription to the correct user in your database.

import {
clearTransactionIOS,
requestSubscription,
type Subscription,
type SubscriptionAndroid,
type SubscriptionIOS,
SubscriptionPlatform,
useIAP,
} from "react-native-iap";

const requestSubscriptionIOS = async (subscription: SubscriptionIOS) => {
/\*\*
_ Do not confuse current in app subscription with active in app subscription.
_ Current in app subscription is saved in db as soon as the user creates an account.
\*/
if (!currentInAppSubscription) {
throw new Error("User account is not valid. Missing subscription data.");
}

    await clearTransactionIOS();

    await requestSubscription({
      sku: subscription.productId,
      appAccountToken: currentInAppSubscription.purchaseUUID,
    });

};

Cancel Subscriptions

Use RN IAP deepLinkToSubscriptions function which deeplinks to native interface that allows users to manage their subscriptions.
From there, users can cancel their subscriptions.

function cancelSubscription(productId: string) {
deepLinkToSubscriptions({
sku: productId,
});
}

Server-side Code
Subscription Processing Android

Create and use a JWT client instance to authenticate with Google APIs, specifically the Android Publisher API. This client generates an access token for authenticating API requests. You will need client_email and private_key, which can be found in the JSON file you downloaded when setting up the service account (Android setup, step 5).

⚠️ Important: Always keep these values secure and hidden from public access.

const JWTClient = new google.auth.JWT(
process.env.GOOGLE_CLIENT_EMAIL,
undefined,
process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
["https://www.googleapis.com/auth/androidpublisher"],
);

const accessToken = await JWTClient.getAccessToken();

Each message published to a Cloud Pub/Sub topic includes a single base64-encoded data field that must be decoded.

const messageData = Buffer.from(event.data.message.data, "base64").toString(
"utf8",
);

const { subscriptionNotification, packageName }: DecodedData =
JSON.parse(messageData);

After decoding the data field, the DecodedData object contains the following structure:

{
"version": string,
"packageName": string,
"eventTimeMillis": long,
"oneTimeProductNotification": OneTimeProductNotification,
"subscriptionNotification": SubscriptionNotification,
"voidedPurchaseNotification": VoidedPurchaseNotification,
"testNotification": TestNotification
}

We are primarily interested in the subscriptionNotification and packageName properties. The SubscriptionNotification object contains these fields:

{
"version": string,
"notificationType": int,
"purchaseToken": string,
"subscriptionId": string
}

For more details on the types of real-time developer notifications Google Play may send, refer to the documentation here.

Use the Android Publisher API to get the latest subscription details:

const res = await google
.androidpublisher("v3")
.purchases.subscriptions.get({
packageName,
token: subscriptionNotification.purchaseToken,
subscriptionId: subscriptionNotification.subscriptionId,
auth: JWTClient,
});

Use the obfuscatedExternalAccountId from the API response to locate the relevant subscription record in the database:

const documentReference = await firestore()
.collection("subscriptions")
.where("purchaseUUID", "==", res.data.obfuscatedExternalAccountId)
.get();

Update the corresponding record in the database:

const subscription: Partial<InAppSubscription> = {
productId: subscriptionNotification.subscriptionId as SubscriptionTier,
subscriptionExpirationTime: Number(res.data.expiryTimeMillis),
trial: res.data.paymentState === 2,
renewing: !!res.data.autoRenewing,
android: {
purchaseToken: subscriptionNotification.purchaseToken,
linkedPurchaseToken: res.data.linkedPurchaseToken || null,
},
};

await document.set({ ...subscription }, { merge: true });

Finally, notify Google that the subscription was successfully processed. This must be done within three days to prevent auto-refund and entitlement revocation:

if (res.data.acknowledgementState === 0) {
await google.androidpublisher("v3").purchases.subscriptions.acknowledge({
packageName,
token: subscriptionNotification.purchaseToken,
subscriptionId: subscriptionNotification.subscriptionId,
auth: JWTClient,
});
}

Subscription Processing Apple

⚠️ Note: If you haven’t done so already, configure App Store Server Notifications as outlined in step 5 of the iOS setup section. For full details on App Store Server Notifications, refer to the official documentaion.

The App Store delivers JSON objects using an HTTP POST to your server for notable in-app purchase events and unreported external purchase tokens.

Since the signedPayload in the request body is cryptographically signed by the App Store in JSON Web Signature (JWS) format, decode it using the jwtDecode function. From the decoded payload, extract the notificationType, subtype, and data properties. The data object must contain signedRenewalInfo and signedTransactionInfo, as these are essential for further processing.

const { signedPayload }: ResponseBodyV2 = request.body;

if (!signedPayload)
throw new HttpsError(
'failed-precondition',
'No signed payload provided.',
);

const { notificationType, subtype, data }: ResponseBodyV2DecodedPayload =
jwtDecode(signedPayload);

if (!data || !data.signedRenewalInfo || !data.signedTransactionInfo)
throw new HttpsError('failed-precondition', 'No data in payload.');

In the same manner, decode the signedTransactionInfo and signedRenewalInfo then destructure the necessary properties:

const transactionInfo: JWSTransactionDecodedPayload = jwtDecode(
data.signedTransactionInfo,
);

    const renewalInfo: JWSRenewalInfoDecodedPayload = jwtDecode(
      data.signedRenewalInfo,
    );

    if (!transactionInfo.appAccountToken || !transactionInfo.transactionId)
      throw new HttpsError(
        'invalid-argument',
        'Transaction information missing app account token or transaction id.',
      );

    const {
      appAccountToken,
      productId,
      originalTransactionId,
      transactionId,
      expiresDate,
    } = transactionInfo;

    const { autoRenewProductId, autoRenewStatus } = renewalInfo;

Use the appAccountToken from the decoded signedTransactionInfo to locate the relevant subscription record in the database:

const documentReference = await firestore()
.collection('subscriptions')
.where('purchaseUUID', '==', appAccountToken)
.get();

    if (documentReference.empty)
      throw new HttpsError(
        'invalid-argument',
        'No subscription document found for specified account token.',
      );

    const document = documentReference.docs[0].ref;

Then, based on the notificationType and subtype from the signedPayload, update the subscription accordingly. The notificationType describes the in-app purchase or external purchase event for which the App Store sends the version 2 notification. The subtype is a string that provides details about select notification types in version 2. For a full explanation of notification types and subtypes, refer to the official documentation.

The subscription update logic will vary depending on the specific notificationType and subtype, ensuring that the subscription status is accurately reflected in your system:

    /** Subscription has been renewed, update expiration time */
    if (notificationType === NotificationTypeV2.DID_RENEW) {
      const subscription: Partial<InAppSubscription> = {
        productId: productId as SubscriptionTier,
        subscriptionExpirationTime: expiresDate,
        upcomingProductId: null,
        trial: false,
        ios: { originalTransactionId, transactionId },
      };

      await document.update({ ...subscription });
    }

    /** Initial subscription, should enable trial period. */
    if (
      notificationType === NotificationTypeV2.SUBSCRIBED &&
      subtype === Subtype.INITIAL_BUY
    ) {
      const subscription: Partial<InAppSubscription> = {
        trial: true,
        renewing: autoRenewStatus === 1,
        productId: productId as SubscriptionTier,
        subscriptionExpirationTime: expiresDate,
        ios: { originalTransactionId, transactionId },
      };

      await document.update({ ...subscription });
    }

    /** Has expired subscription and resubscribed to same or some other product */
    if (
      notificationType === NotificationTypeV2.SUBSCRIBED &&
      subtype === Subtype.RESUBSCRIBE
    ) {
      const subscription: Partial<InAppSubscription> = {
        trial: false,
        renewing: autoRenewStatus === 1,
        productId: productId as SubscriptionTier,
        subscriptionExpirationTime: expiresDate,
        ios: { originalTransactionId, transactionId },
      };

      await document.update({ ...subscription });
    }

    /** Downgrade subscription on next billing interval */
    if (
      notificationType === NotificationTypeV2.DID_CHANGE_RENEWAL_PREF &&
      subtype === Subtype.DOWNGRADE
    ) {
      const subscription: Partial<InAppSubscription> = {
        upcomingProductId: autoRenewProductId as SubscriptionTier,
      };

      await document.update({ ...subscription });
    }

    /** User cancelled downgrade */
    if (
      notificationType === NotificationTypeV2.DID_CHANGE_RENEWAL_PREF &&
      !subtype
    ) {
      const subscription: Partial<InAppSubscription> = {
        upcomingProductId: null,
      };

      await document.update({ ...subscription });
    }

    /** User upgraded, should take effect immediately. */
    if (
      notificationType === NotificationTypeV2.DID_CHANGE_RENEWAL_PREF &&
      subtype === Subtype.UPGRADE
    ) {
      const subscription: Partial<InAppSubscription> = {
        renewing: autoRenewStatus === 1,
        productId: productId as SubscriptionTier,
        upcomingProductId: null,
        subscriptionExpirationTime: expiresDate,
        ios: { originalTransactionId, transactionId },
      };

      await document.update({ ...subscription });
    }

    /** User disabled auto-renew for their subscription. */
    if (
      notificationType === NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS &&
      subtype === Subtype.AUTO_RENEW_DISABLED
    ) {
      await document.update({ renewing: false });
    }

    /** User re-enabled auto-renew for their subscription */
    if (
      notificationType === NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS &&
      subtype === Subtype.AUTO_RENEW_ENABLED
    ) {
      await document.update({ renewing: true });
    }

Conclusion

Implementing in-app purchases with React Native is a detailed process requiring careful attention to both client-side and server-side implementation. With the react-native-iap library, you gain a powerful toolset for creating seamless subscription experiences on both Android and iOS platforms. By following the outlined steps, from initial setup to subscription management, you ensure a robust and scalable in-app purchase system.
Key Takeaways

    Preparation Matters: Familiarizing yourself with the subject beforehand is essential for a smooth development process. Be sure to review the pre-reading materials, which include helpful links and resources, and complete all necessary store agreements and Google Play Console/App Store Connect configurations upfront.
    Test Rigorously: Use physical devices and sandbox testers to simulate real-world scenarios, ensuring your subscription flow works as expected.
    Be Transparent: Clearly communicate subscription terms and conditions to users to comply with app store policies and avoid rejection.
    Automate Management: Utilize server-side processes to handle subscription updates, ensuring your app dynamically reflects changes such as renewals, cancellations, and upgrades.
    Secure Data: Safeguard sensitive information, such as API keys and user tokens, to maintain trust and security.

Next Steps

    Iterate and Improve: Continuously monitor user feedback and analytics to refine your subscription offerings and user experience.
    Stay Informed: Keep up-to-date with changes to the Android and iOS platforms, as well as updates to the react-native-iap library.
    Scale with Confidence: With a solid in-app purchase foundation, explore additional monetization strategies or expand your app’s functionality to enhance user value.

By implementing a structured and well-documented approach, you position your app for success in the competitive mobile marketplace.

Happy coding, and may your subscriptions drive growth!
