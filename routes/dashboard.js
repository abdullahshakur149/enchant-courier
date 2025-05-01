import express from "express";
import { checkAuthenticated } from "../config/webAuth.js";
import { Order } from "../models/order.js";

const router = express.Router();

// Dashboard route
// Dashboard route
router.get("/", checkAuthenticated, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const deliveredOrders = await Order.countDocuments({ isDelivered: true });
    const returnedOrders = await Order.countDocuments({ isReturned: true });
    const pendingOrders = totalOrders - deliveredOrders - returnedOrders;

    res.render("dashboard/index", {
      user: req.user,
      title: "Dashboard",
      path: "/dashboard",
      layout: "layouts/dashboard",
      totalOrders,
      deliveredOrders,
      returnedOrders,
      pendingOrders,
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

export default router;
