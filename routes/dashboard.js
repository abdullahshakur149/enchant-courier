import express from "express";
import { checkAuthenticated } from "../config/webAuth.js";
import { Order } from "../models/order.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

const router = express.Router();
dayjs.extend(utc);
dayjs.extend(timezone);

const tz = "Asia/Karachi";


// Dashboard route
router.get("/", checkAuthenticated, async (req, res) => {
  try {
    const startOfDay = dayjs().tz(tz).startOf("day").toDate();
    const endOfDay = dayjs().tz(tz).endOf("day").toDate();

    // Total orders in the database
    const totalOrders = await Order.countDocuments();

    // Delivered orders in the database
    const deliveredOrders = await Order.countDocuments({ isDelivered: true });

    // Returned orders in the database
    const returnedOrders = await Order.countDocuments({ isReturned: true });

    // Pending orders
    const pendingOrders = totalOrders - deliveredOrders - returnedOrders;

    // Orders created today
    const totalOrdersToday = await Order.countDocuments({
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    // Fixed query to check for delivered orders today
    const deliveredOrdersToday = await Order.countDocuments({
      delivered_at: { $gte: startOfDay, $lt: endOfDay },
      isDelivered: true,
    });

    // Orders returned today
    const returnedOrdersToday = await Order.countDocuments({
      returned_at: { $gte: startOfDay, $lt: endOfDay },
    });

    // Fetch latest 6 orders with customer info and remarks
    const latestOrders = await Order.find({})
      .select('trackingNumber flyerId status isDelivered isReturned delivered_at returned_at productInfo invoicePayment createdAt')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // Get orders for the last 7 days for the chart with proper timezone handling
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = dayjs().tz(tz).subtract(i, 'day');
      return {
        start: date.startOf('day').toDate(),
        end: date.endOf('day').toDate(),
        label: date.format('ddd')
      };
    }).reverse();

    const ordersByDay = await Promise.all(
      last7Days.map(async ({ start, end }) => {
        return Order.countDocuments({
          createdAt: { $gte: start, $lt: end }
        });
      })
    );

    // Get courier distribution
    const courierDistribution = await Order.aggregate([
      {
        $group: {
          _id: {
            $toLower: '$courierType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          courierType: {
            $switch: {
              branches: [
                { case: { $eq: ['$_id', 'trax'] }, then: 'Trax' },
                { case: { $eq: ['$_id', 'postex'] }, then: 'Postex' },
                { case: { $eq: ['$_id', 'daewoo'] }, then: 'Daewoo' }
              ],
              default: 'Unknown'
            }
          },
          count: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const deliveredByCourierToday = await Order.aggregate([
      {
        $match: {
          isDelivered: true,
          delivered_at: { $gte: startOfDay, $lt: endOfDay },
        },
      },
      {
        $group: {
          _id: {
            $toLower: "$courierType",
          },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          courierType: {
            $switch: {
              branches: [
                { case: { $eq: ["$_id", "trax"] }, then: "Trax" },
                { case: { $eq: ["$_id", "postex"] }, then: "Postex" },
                { case: { $eq: ["$_id", "daewoo"] }, then: "Daewoo" },
              ],
              default: "Unknown",
            },
          },
          count: 1,
        },
      },
    ]);

    console.log("Delivered by Courier Today:", deliveredByCourierToday);


    const courierData = {
      labels: courierDistribution.map(c => c.courierType),
      data: courierDistribution.map(c => c.count)
    };

    res.render("dashboard/index", {
      user: req.user,
      title: "Dashboard",
      path: "/dashboard",
      layout: "layouts/dashboard",
      totalOrders,
      deliveredOrders,
      returnedOrders,
      pendingOrders,
      totalOrdersToday,
      deliveredOrdersToday,
      returnedOrdersToday,
      latestOrders,
      deliveredByCourierToday,
      chartData: {
        ordersByDay: {
          labels: last7Days.map(d => d.label),
          data: ordersByDay
        },
        courierDistribution: courierData
      }
    });
  } catch (error) {
    console.error("Error fetching order data:", error);
    res.render("dashboard/index", {
      user: req.user,
      title: "Dashboard",
      path: "/dashboard",
      layout: "layouts/dashboard",
      totalOrders: 0,
      deliveredOrders: 0,
      returnedOrders: 0,
      totalOrdersToday: 0,
      deliveredOrdersToday: 0,
      returnedOrdersToday: 0,
      chartData: {
        ordersByDay: {
          labels: [],
          data: []
        },
        courierDistribution: {
          labels: [],
          data: []
        }
      }
    });
  }
});



// Orders page (AJAX table)
router.get("/orders", checkAuthenticated, (req, res) => {
  res.render("orders", {
    user: req.user,
    title: "",
    path: "/orders",
    layout: "layouts/dashboard",
  });
});

// Delivered Orders page (AJAX table)
router.get("/delivered-orders", checkAuthenticated, (req, res) => {
  res.render("delivered-orders", {
    user: req.user,
    title: "Delivered Orders",
    path: "/delivered-orders",
    layout: "layouts/dashboard",
  });
});

// Returned Orders page (AJAX table)
router.get("/returned-orders", checkAuthenticated, (req, res) => {
  res.render("returned-orders", {
    user: req.user,
    title: "Returned Orders",
    path: "/returned-orders",
    layout: "layouts/dashboard",
  });
});

router.get('/employee-management', (req, res) => {
  res.render('employee-management', {
    layout: 'layouts/dashboard',
    title: 'Employee Management',
    path: "/employee-management",
    user: req.user,
  });
});



export default router;
