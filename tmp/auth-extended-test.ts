import { loginAction, registerAction } from "../src/actions/auth.actions";
import { DEFAULT_USER_INTEREST_ORDER } from "../src/lib/primaryCategories";

import { cookies } from "next/headers";

const run = async () => {
  const uniqueEmail = `qa_ext_${Date.now()}@mail.com`;
  const langCookie = (await cookies()).get("barrow-locale")?.value;
  const isArabic = langCookie === "ar";
  const okReg = await registerAction(
    {
      name: "QA Extended",
      email: uniqueEmail,
      password: "StrongPass1!",
      interestOrder: DEFAULT_USER_INTEREST_ORDER,
      acceptPrivacyPolicy: true,
    },
    isArabic,
  );
  console.log("register-unique:", okReg);

  const dupReg = await registerAction(
    {
      name: "QA Extended Dup",
      email: uniqueEmail,
      password: "StrongPass1!",
      interestOrder: DEFAULT_USER_INTEREST_ORDER,
      acceptPrivacyPolicy: true,
    },
    false,
  );
  console.log("register-duplicate:", dupReg);

  const okLogin = await loginAction(
    {
      email: uniqueEmail,
      password: "StrongPass1!",
    },
    isArabic,
  );
  console.log("login-correct:", okLogin);

  const badLogin = await loginAction(
    {
      email: uniqueEmail,
      password: "wrong-password",
    },
    isArabic,
  );
  console.log("login-wrong-password:", badLogin);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
