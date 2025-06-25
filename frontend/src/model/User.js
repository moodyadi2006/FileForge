import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      "Please use a valid email",
    ],
    unique: true,
  },
  password: {
    type: String,
    required: true,
    trim: true,
  },
  verifyCode: {
    type: String,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifyCodeExpiry: {
    type: Date,
  },
});

const UserModel = mongoose.models.User || mongoose.model("User", userSchema);

export default UserModel;
