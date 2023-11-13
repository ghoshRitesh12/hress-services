import { config } from "dotenv";
import { Schema, model } from "mongoose";
import { randomBytes } from "crypto";

config();
const collectionName = "Users";

const userSchema = new Schema({
  info: {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    phoneNumber: { type: String, default: null },
    country: { type: String, default: null },
    postalCode: { type: String, default: null },
    cityState: { type: String, default: null },
    streetAddress: { type: String, default: null },
    xlmWalletAddress: { type: String, default: null },
    pancardNo: { type: String, default: null },
    bankAccountNo: { type: String, default: null },
    ifsc: { type: String, default: null },
  },
  password: { type: String, required: true },
  pfp: {
    type: String,
    default: () =>
      'https://api.dicebear.com/7.x/bottts/png' + `?seed=${Date.now()}&eyes=shade01` +
      '&mouth=smile01&texture=circuits' + '&face=round02&sides=square'
  },

  role: { type: String, default: "member" },
  active: { type: Boolean, default: false, },
  verified: { type: Boolean, default: false, },
  courseType: { type: String, required: true },

  rank: { type: Number, default: 1, },
  referralId: {
    type: String,
    index: true,
    unique: true,
    default: () => randomBytes(
      Number(process.env.REFERRAL_ID_BYTES)
    ).toString('hex')
  },

  ancestors: [{
    type: Schema.Types.ObjectId,
    ref: "Users"
  }],
  levels: [{
    levelNo: {
      type: Number,
      default: 0
    },
    referrals: [{
      commission: {
        type: Number,
        default: 0,
      },
      createdAt: {
        type: String, // day-month-year
        default: null
      },
      userRef: {
        type: Schema.Types.ObjectId,
        ref: "Users",
        required: true,
      },
    }]
  }],
},
  {
    timestamps: true,
    collection: collectionName,
    writeConcern: {
      w: "majority",
      journal: true,
    }
  }
)


export default model(collectionName, userSchema);
