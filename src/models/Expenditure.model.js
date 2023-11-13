import { Schema, model } from "mongoose";

const collectionName = "Expenditures";

const expenditureSchema = new Schema({
  name: {
    type: String,
    trim: true,
    required: true
  },
  status: {
    type: String,
    default: "pending"
  },
  month: {
    type: String, // day-month-year
    trim: true,
    index: true,
    unique: true,
    required: true
  },
  payees: [{
    userRef: {
      type: Schema.Types.ObjectId,
      ref: "Users",
      // required: true
    },
    income: [Number] // 0th levelIncome, 1st carFund
  }],
},
  {
    collection: collectionName,
    writeConcern: {
      w: "majority",
      journal: true,
    }
  }
)

export default model(collectionName, expenditureSchema);
