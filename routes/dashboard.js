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
      isDelivered: true,  // Ensure the order is marked as delivered
    });

    // Orders returned today
    const returnedOrdersToday = await Order.countDocuments({
      returned_at: { $gte: startOfDay, $lt: endOfDay },
    });

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
