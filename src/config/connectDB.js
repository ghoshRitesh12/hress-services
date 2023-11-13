import mongoose from "mongoose";

export default async function connectDB() {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(process.env.DATABASE_URI)
    console.log("💾 connected to DB");

  } catch (err) {
    console.error("Could not connect to the db");
    throw createError({
      message: "Could not connect to the db",
      statusCode: 500
    })
  }
}