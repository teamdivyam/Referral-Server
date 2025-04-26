import AgentModel from "../../db/models/agent.js";
import NotificationModel from "../../db/models/notification.js";

export const notificationService = async (agentId, skip, limit) => {
    try {
        const notifications = await AgentModel.findById(agentId)
            .select("-_id notifications")
            .populate({
                path: "notifications",
                select: "-_id message type createdAt isRead",
                options: { sort: { createdAt: -1 }, skip, limit },
            });

        return notifications.notifications;
    } catch (error) {
        console.log("Error in retreiving notifications:", error.message);
        throw error;
    }
};

export const countNotifications = async (agentId) => {
    try {
        const total = await AgentModel.aggregate([
            { $match: { _id: agentId } },
            {
                $project: {
                    count: { $size: { $ifNull: ["$notifications", []] } }, // if $referrals.latest is null, return empty array, else return "$referrals.latest" },
                },
            },
        ]);

        return total[0].count;
    } catch (error) {
        console.log("Error in retreiving notifications count:", error.message);
        throw error;
    }
};

export const countUnreadNotifications = async (agentId) => {
    try {
        const unreadCount = await NotificationModel.countDocuments({
            _id: {
                $in: (
                    await AgentModel.findById(agentId).select(
                        "notifications"
                    )
                ).notifications,
            },
            isRead: false,
        });

        return unreadCount;
    } catch (error) {
        console.log(
            "Error in retreiving unread notifications count:",
            error.message
        );
        throw error;
    }
};

export const markNotificationReadService = async (agentId) => {
    try {
        await NotificationModel.updateMany(
            { agentId, isRead: false },
            { $set: { isRead: true } }
        );
    } catch (error) {
        throw error;
    }
};
