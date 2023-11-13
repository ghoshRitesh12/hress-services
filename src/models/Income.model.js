import { Schema, model } from "mongoose";

const collectionName = "Incomes";

const incomeSchema = new Schema({
  email: {
    type: String,
    index: true,
    unique: true,
    required: true,
  },
  referralId: {
    type: String,
    index: true,
    unique: true,
    required: true,
  },
  userProfile: {
    type: Schema.Types.ObjectId,
    ref: "Users",
    required: true
  },
  incomes: {
    type: Map,
    of: [Number] // 0th levelIncome, 1st carFund
  }
},
  {
    collection: collectionName,
    writeConcern: {
      w: "majority",
      journal: true,
    }
  }
)

export default model(collectionName, incomeSchema);
