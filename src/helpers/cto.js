import User from "../models/User.model.js";

/**
 * @param {*} monthPeriod number 15 || 30
 * @param {*} month number
 * @param {*} year number
 * @returns bi monthly CTO
*/
async function getBiMonthlyCTO(monthPeriod, month, year) {
  try {
    ctoCondition: {
      if ((monthPeriod && !month) || (!monthPeriod && month) || (!monthPeriod && year)) {
        throw new Error("Need either all three cto parameters or none");
      }
      if (monthPeriod && month && year) {
        monthPeriod = monthPeriod <= 15 ? {
          $lte: [
            { $dayOfMonth: "$createdAt" },
            15
          ]
        } : {
          $gt: [
            { $dayOfMonth: "$createdAt" },
            15
          ]
        }

        break ctoCondition;
      }

      const d = new Date();
      monthPeriod = d.getDate() <= 15 ? {
        $lte: [
          { $dayOfMonth: "$createdAt" },
          15
        ]
      } : {
        $gt: [
          { $dayOfMonth: "$createdAt" },
          15
        ]
      }
      month = d.getMonth() + 1;
      year = d.getFullYear();
    }


    const biMonthlyCTO = await User.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              monthPeriod,
              {
                $eq: [
                  { $month: "$createdAt" },
                  month
                ]
              },
              {
                $eq: [
                  { $year: "$createdAt" },
                  year
                ]
              },
            ]
          },
          role: { $eq: "member" },
          active: { $eq: true }
        },
      },
      {
        $project: {
          _id: 0,
          referralId: 1,
          courseType: 1,
          joiningFees: {
            $cond: {
              if: { $eq: ["$courseType", "advance"] },
              then: 20000,
              else: {
                $cond: {
                  if: { $eq: ["$courseType", "basic"] },
                  then: 12000,
                  else: 0
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: 0,
          totalJoiningFees: { $sum: "$joiningFees" }
        }
      }
    ]).readConcern("majority");

    return biMonthlyCTO?.[0]?.totalJoiningFees ?? 0;

  } catch (err) {
    throw err
  }
}

export default getBiMonthlyCTO;
