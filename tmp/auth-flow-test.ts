import { loginAction, registerAction } from "../src/actions/auth.actions";
import { cookies } from "next/headers";

const run = async () => {
  const langCookie = (await cookies()).get("barrow-locale")?.value;
  const isArabic = langCookie === "ar";

  const existing = await loginAction(
    {
      email: "ahmed@mail.com",
      password: "12345678",
    },
    isArabic,
  );
  console.log("existing-login:", existing);

  const email = `qa_${Date.now()}@mail.com`;
  const reg = await registerAction(
    {
      name: "QA User",
      email,
      password: "StrongPass1!",
      acceptPrivacyPolicy: true,
    },
    isArabic,
  );
  console.log("register:", reg, "email=", email);

  const loginNew = await loginAction(
    {
      email,
      password: "StrongPass1!",
    },
    isArabic,
  );
  console.log("new-login:", loginNew);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
