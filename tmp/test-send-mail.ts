import { sendMail } from "../src/lib/mailer.js";
import "dotenv/config";

async function main() {
  await sendMail({
    to: "rabie3ahm@gmail.com",
    subject: "اختبار إرسال البريد من safeguid",
    html: "<b>تم إرسال هذا البريد بنجاح من إعدادات safeguid الجديدة.</b>",
    text: "تم إرسال هذا البريد بنجاح من إعدادات safeguid الجديدة.",
  });
  console.log("تم إرسال البريد بنجاح إلى rabie3ahm@gmail.com");
}

main().catch((err) => {
  console.error("فشل الإرسال:", err);
  process.exit(1);
});
