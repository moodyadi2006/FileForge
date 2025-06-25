import dbConnect from "@/lib/dbConnect";
import UserModel from "@/model/User";
import bcrypt from "bcryptjs";
import { sendVerificationEmail } from "@/helpers/sendVerificationEmails";

export async function POST(request) {
  await dbConnect();
  try {
    const { fullName, email, password } = await request.json();

    const existingUserByEmail = await UserModel.findOne({ email });
    const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
    if (existingUserByEmail) {
      if (existingUserByEmail.isVerified) {
        return Response.json(
          { success: false, message: "User Already exist with this email" },
          { status: 400 }
        );
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 1);
        existingUserByEmail.password = hashedPassword;
        existingUserByEmail.verifyCode = verifyCode;
        existingUserByEmail.verifyCodeExpiry = expiryDate;
        await existingUserByEmail.save();
      }
    } else {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const expiryDate = new Date();
        expiryDate.setMinutes(expiryDate.getMinutes() + 10);
        const newUser = new UserModel({
          email,
          password: hashedPassword,
          fullName: fullName,
          verifyCode,
          verifyCodeExpiry: expiryDate,
          isVerified: false,
        });
        await newUser.save();
      } catch (error) {
        return Response.json(
          { success: false, message: error.message },
          { status: 410 }
        );
      }
    }
    const emailResponse = await sendVerificationEmail(
      email,
      fullName,
      verifyCode
    );

    if (!emailResponse.success) {
      return Response.json(
        { success: false, message: emailResponse.message },
        { status: 500 }
      );
    }
    return Response.json(
      {
        success: true,
        message: "User registered successfully.. Please verify your email",
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Error registering User",
      },
      {
        status: 500,
      }
    );
  }
}
