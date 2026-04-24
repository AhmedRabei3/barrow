import { NextAuthConfig } from "next-auth";
import { loginUserSchema } from "./app/validations/userValidations";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { prisma } from "./lib/prisma";
import * as bcrypt from "bcryptjs";
import { ensureOwnerAccount } from "@/lib/ensureOwnerAccount";

const googleClientId =
  process.env.AUTH_GOOGLE_ID ??
  process.env.GOOGLE_CLIENT_ID ??
  process.env.AUTH_GOOGLE_CLIENT_ID; 

const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET ??
  process.env.GOOGLE_CLIENT_SECRET ??
  process.env.AUTH_GOOGLE_CLIENT_SECRET;

const hasGoogleOAuthConfig = Boolean(googleClientId && googleClientSecret);

export default (<NextAuthConfig>{
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await ensureOwnerAccount();

        const validation = loginUserSchema.safeParse(credentials);
        if (!validation.success) return null;

        const { email, password } = validation.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.email) return null;

        const { password: hashedPassword } = user;
        if (!hashedPassword) return null;

        const passwordMatch = await bcrypt.compare(password, hashedPassword);
        if (!passwordMatch) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.profileImage,
          balance: Number(user.balance),
          isActive: user.isActive,
          isAdmin: user.isAdmin,
          isOwner: user.isOwner,
          isIdentityVerified: user.isIdentityVerified,
          activeUntil: user.activeUntil,
          pendingReferralEarnings: Number(user.pendingReferralEarnings),
          preferredInterestOrder: user.preferredInterestOrder,
          notifications: [],
        };
      },
    }),

    ...(hasGoogleOAuthConfig
      ? [
          Google({
            clientId: googleClientId!,
            clientSecret: googleClientSecret!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],
}) satisfies NextAuthConfig;
