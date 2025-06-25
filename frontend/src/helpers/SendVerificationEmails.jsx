import { resend } from "@/lib/resend";
import VerificationEmail from "../../emails/VerificationEmail";

export async function sendVerificationEmail(email, fullName, verifyCode) {
  try {
    await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: [email],
      subject: "FileForge | Verification code",
      react: VerificationEmail({ fullName: fullName, otp: verifyCode }),
    });
    return { success: true, message: "Verification email sent successfully" };
  } catch (error) {
    console.error("Error sending verification email", error);
  }
}