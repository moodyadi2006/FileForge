import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await dbConnect();
        try {
          const user = await UserModel.findOne({
            $or: [{ email: credentials.identifier }],
          });

          if (!user || !user.isVerified) return null;

          const isPasswordCorrect = await bcrypt.compare(
            credentials.password,
            user.password
          );

          return isPasswordCorrect ? user : null;
        } catch (error) {
          return null;
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  pages: {
    signIn: "/signIn",
  },

  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user, account }) {
      const now = Math.floor(Date.now() / 1000);

      if (user) {
        token.fullName = user.fullName || user.name;
        token.email = user.email;
      }

      if (user && account?.provider === "credentials") {
        token._id = user._id?.toString();
        token.provider = "credentials";
        token.accessToken = user._id?.toString();
      }

      if (account?.provider === "google") {
        token.provider = "google";
        token.accessToken = account.access_token;
        token.expiresAt = now + (account.expires_at || 3600);

        await dbConnect();
        const dbUser = await UserModel.findOne({ email: user.email });
        if (dbUser) {
          token._id = dbUser._id?.toString();
          token.fullName = dbUser.fullName;
        }
      }

      if (token.provider === "google" && token.expiresAt) {
        if (token.expiresAt < now) {
          console.log("Google token expired, forcing logout");
          return null;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (!token) {
        return null;
      }

      session.user._id = token._id;
      session.user.fullName = token.fullName;
      session.user.email = token.email;
      session.accessToken = token.accessToken;
      session.provider = token.provider;
      session.expiresAt = token.expiresAt;

      return session;
    },
  },
};
