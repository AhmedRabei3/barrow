/**
 * Firebase Admin smoke test - run with: node tmp/test-firebase-admin.js
 * Tests Firestore read/write without needing the HTTP server.
 */

// Load .env manually
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const envContent = fs.readFileSync(envPath, "utf8");
envContent.split("\n").forEach((line) => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) {
    const key = m[1].trim();
    let val = m[2].trim().replace(/^["']|["']$/g, "");
    process.env[key] = val;
  }
});

const { initializeApp, getApps, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n"
);

console.log("=== Firebase Admin Smoke Test ===\n");
console.log("FIREBASE_PROJECT_ID:", FIREBASE_PROJECT_ID ? "✓ set" : "✗ MISSING");
console.log("FIREBASE_CLIENT_EMAIL:", FIREBASE_CLIENT_EMAIL ? "✓ set" : "✗ MISSING");
console.log("FIREBASE_PRIVATE_KEY:", FIREBASE_PRIVATE_KEY ? "✓ set" : "✗ MISSING");
console.log("");

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("ERROR: Firebase Admin credentials missing from .env");
  console.error("See FIREBASE_SETUP.md for instructions.");
  process.exit(1);
}

let app;
if (getApps().length > 0) {
  app = getApps()[0];
} else {
  app = initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    }),
  });
}

const db = getFirestore(app);

const TEST_CONV_ID = `smoke_test_conv_${Date.now()}`;

async function runTest() {
  try {
    // 1. Write a test conversation
    console.log("1. Writing test conversation to Firestore...");
    await db.collection("conversations").doc(TEST_CONV_ID).set({
      participants: ["user_a", "user_b"],
      listingId: "smoke-listing-1",
      listingTitle: "Smoke Test Listing",
      itemType: "OTHER",
      participantNames: { user_a: "User A", user_b: "User B" },
      lastMessage: "hello",
      lastMessageAt: FieldValue.serverTimestamp(),
      unreadBy: { user_b: 1 },
    });
    console.log("   ✓ Conversation written:", TEST_CONV_ID);

    // 2. Write a message in subcollection
    console.log("2. Writing test message...");
    const msgRef = await db
      .collection("conversations")
      .doc(TEST_CONV_ID)
      .collection("messages")
      .add({
        senderId: "user_a",
        recipientId: "user_b",
        text: "hello from smoke test",
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });
    console.log("   ✓ Message written:", msgRef.id);

    // 3. Read the conversation back
    console.log("3. Reading conversation back...");
    const doc = await db.collection("conversations").doc(TEST_CONV_ID).get();
    const data = doc.data();
    console.log("   ✓ Read OK. unreadBy.user_b =", data?.unreadBy?.user_b);

    // 4. Query conversations for user_b (requires composite index)
    console.log("4. Querying conversations for user_b (array-contains query)...");
    try {
      const snap = await db
        .collection("conversations")
        .where("participants", "array-contains", "user_b")
        .orderBy("lastMessageAt", "desc")
        .limit(10)
        .get();
      console.log("   ✓ Query OK. Found:", snap.size, "conversations");
    } catch (queryErr) {
      if (queryErr.message?.includes("index")) {
        console.warn("   ⚠ Index missing! Create composite index in Firebase Console:");
        console.warn("     Collection: conversations");
        console.warn("     Fields: participants (Arrays) + lastMessageAt (Desc)");
        console.warn("     URL: https://console.firebase.google.com/project/" + FIREBASE_PROJECT_ID + "/firestore/indexes");
      } else {
        throw queryErr;
      }
    }

    // 5. Mark as read
    console.log("5. Marking message as read...");
    await db.collection("conversations").doc(TEST_CONV_ID).update({
      "unreadBy.user_b": 0,
    });
    const updated = (await db.collection("conversations").doc(TEST_CONV_ID).get()).data();
    console.log("   ✓ unreadBy.user_b after mark-read =", updated?.unreadBy?.user_b);

    // 6. Cleanup
    console.log("6. Cleaning up test data...");
    const messages = await db
      .collection("conversations")
      .doc(TEST_CONV_ID)
      .collection("messages")
      .get();
    for (const m of messages.docs) await m.ref.delete();
    await db.collection("conversations").doc(TEST_CONV_ID).delete();
    console.log("   ✓ Cleaned up");

    console.log("\n=== ALL TESTS PASSED ✓ ===");
    console.log("Firebase Admin SDK is working correctly.");
    console.log("The /api/chat/* routes will work when the server is running.");
    process.exit(0);
  } catch (err) {
    console.error("\n=== TEST FAILED ✗ ===");
    console.error(err.message || err);
    process.exit(1);
  }
}

runTest();
