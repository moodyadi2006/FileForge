import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";

export async function POST(request) {
  await dbConnect();

  try {
    const { email, verifyCode } = await request.json();
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

    const now = Date.now();

    if (verifyCode === existingUser.verifyCode) {
      if (existingUser.verifyCodeExpiry > now) {
        existingUser.isVerified = true;
        existingUser.verifyCode = undefined;
        existingUser.verifyCodeExpiry = undefined;
        await existingUser.save();

        return Response.json(
          {
            success: true,
            message: "User verified successfully",
          },
          { status: 200 }
        );
      } else {
        return Response.json(
          {
            success: false,
            message:
              "Verification code has expired. Please sign up again to receive a new code.",
          },
          { status: 410 }
        );
      }
    } else {
      return Response.json(
        {
          success: false,
          message: "Invalid verification code",
        },
        { status: 403 }
      );
    }
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
