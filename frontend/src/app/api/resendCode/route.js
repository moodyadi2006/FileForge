import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmails";

export async function POST(request) {
  await dbConnect();

  try {
    const { email } = await request.json();
    const decodedEmail = decodeURIComponent(email);

    const existingUser = await UserModel.findOne({ email: decodedEmail });

    if (!existingUser) {
      return Response.json(
        {
          success: false,
          message: "User not found",
        },
        { status: 404 }
      );
    }

    if (existingUser.isVerified) {
      return Response.json(
        {
          success: false,
          message: "User is already verified",
        },
        { status: 400 }
      );
    }

    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 10);

    existingUser.verifyCode = verifyCode;
    existingUser.verifyCodeExpiry = expiryDate;
    await existingUser.save();

    const emailResponse = await sendVerificationEmail(
      existingUser.email,
      existingUser.fullName,
      verifyCode
    );

    if (!emailResponse.success) {
      return Response.json(
        {
          success: false,
          message: "Failed to send verification email",
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Verification code resent successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 }
    );
  }
}
