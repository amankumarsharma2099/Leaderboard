import User from "../models/users.model.js";
import { format, isValid } from "date-fns"; // For date formatting and validation
import ClaimHistory from "../models/claimsHistory.model.js";

export const getAllUser = async (req, res) => {
  try {
    const allUsers = await User.find();
    res.status(200).json({
      success: true,
      message: "User fetched successfully",
      data: allUsers,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const claimPoints = async (req, res) => {
  const { username } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Username not found. Please register if you are not registered.",
      });
    }

    const pointsAwarded = Math.floor(Math.random() * 10) + 1;
    user.Points += pointsAwarded;
    await user.save();

    await ClaimHistory.create({
      userId: user._id,
      pointsAwarded,
      username,
    });

    res.status(200).json({
      success: true,
      message: `${pointsAwarded} points claimed successfully!`,
      data: user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getTodayHistory = async (req, res) => {
  try {
    const today = new Date();
    const istOffset = 5 * 60 * 60 * 1000 + 30 * 60 * 1000; // IST offset from UTC
    const todayStart = new Date(today.setUTCHours(0, 0, 0, 0) + istOffset);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1); // End of the day in IST

    const todayData = await ClaimHistory.aggregate([
      {
        $match: {
          createdAt: {
            $gte: todayStart,
            $lt: todayEnd,
          },
        },
      },
      {
        $group: {
          _id: "$username",
          totalPointsAwarded: { $sum: "$pointsAwarded" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Today's history fetched successfully.",
      data: todayData,
    });
  } catch (error) {
    console.error("Error fetching today's history:", error);
    res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};
export const getWeeklyData = async (req, res) => {
  try {
    // Get the current date and time, and set it to the end of today
    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999); // End of today

    // Calculate last Monday by moving back to the start of the current week's Monday
    const lastMonday = new Date(endOfToday);
    lastMonday.setDate(endOfToday.getDate() - ((endOfToday.getDay() + 6) % 7)); // Adjust to Monday
    lastMonday.setUTCHours(0, 0, 0, 0); // Start of last Monday

    // Perform aggregation on claim history from last Monday to the end of today
    const weeklyData = await ClaimHistory.aggregate([
      {
        $match: {
          createdAt: {
            $gte: lastMonday, // From last Monday
            $lte: endOfToday, // Until the end of today
          },
        },
      },
      {
        $group: {
          _id: "$username", // Group by username
          totalPoints: { $sum: "$pointsAwarded" }, // Sum the points awarded
        },
      },
    ]);

    // Sort the weeklyData in descending order by totalPoints
    weeklyData.sort((a, b) => b.totalPoints - a.totalPoints);

    res.status(200).json({
      success: true,
      message: "Weekly data fetched successfully.",
      data: weeklyData,
    });
  } catch (error) {
    console.error("Error fetching weekly data:", error);
    res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};

export const getMonthlyData = async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyData = await ClaimHistory.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfMonth,
            $lt: endOfMonth,
          },
        },
      },
      {
        $group: {
          _id: "$username",
          totalPointsAwarded: { $sum: "$pointsAwarded" },
        },
      },
    ]);

    monthlyData.sort((a, b) => b.totalPointsAwarded - a.totalPointsAwarded);

    res.status(200).json({
      success: true,
      message: "Monthly data fetched successfully.",
      data: monthlyData,
    });
  } catch (error) {
    console.error("Error fetching monthly data:", error);
    res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};

export const getUserHistory = async (req, res) => {
  try {
    const { username } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const history = await ClaimHistory.find({ username });

    const formattedHistory = history.map((entry) => {
      const createdAt = entry.createdAt && isValid(new Date(entry.createdAt))
        ? format(new Date(entry.createdAt), "dd MMM yyyy")
        : "Invalid date";

      return {
        pointsAwarded: entry.pointsAwarded,
        date: createdAt,
      };
    });

    res.status(200).json({
      success: true,
      message: "User history fetched successfully.",
      data: formattedHistory,
    });
  } catch (error) {
    console.error("Error fetching user history:", error);
    res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};

export const getUserWithHelpOfToken = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};

export const getUserWithHelpOfId = async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User fetched successfully.",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      success: false,
      message: "Server error.",
      error: error.message,
    });
  }
};
