import express from "express";
import { checkAuthenticated } from "../config/webAuth.js";
import { Order } from "../models/order.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";
import axios from "axios";

const router = express.Router();
dayjs.extend(utc);
dayjs.extend(timezone);

const tz = "Asia/Karachi";

// Dashboard route
router.get("/", checkAuthenticated, async (req, res) => {
  try {
    // Get all statistics
    const [
      orderStatusStats,
      courierStats,
      timeBasedStats,
      returnStats,
      paymentStats,
      performanceMetrics,
      remarksAnalysis,
      productStats,
      latestOrders,
      todayStats
    ] = await Promise.all([
      // 1. Order Status Distribution
      Order.aggregate([
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ['$isReturned', true] },
                'returned',
                {
                  $cond: [
                    { $eq: ['$isDelivered', true] },
                    'delivered',
                    'pending'
                  ]
                }
              ]
            },
            count: { $sum: 1 }
          }
          // changes
        },
        {
          $project: {
            _id: 0,
            status: '$_id',
            count: 1
          }
        }
      ]),

      // 2. Courier Performance Metrics
      Order.aggregate([
        {
          $group: {
            _id: {
              $toLower: '$courierType' // Convert to lowercase for standardization
            },
            totalOrders: { $sum: 1 },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$isDelivered', true] }, 1, 0] }
            },
            returnedOrders: {
              $sum: { $cond: [{ $eq: ['$isReturned', true] }, 1, 0] }
            },
            averageDeliveryTime: {
              $avg: {
                $subtract: ['$delivered_at', '$createdAt']
              }
            }
          }
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id', 'trax'] }, then: 'Trax' },
                  { case: { $eq: ['$_id', 'postex'] }, then: 'PostEx' },
                  { case: { $eq: ['$_id', 'daewoo'] }, then: 'Daewoo' }
                ],
                default: 'Other'
              }
            },
            totalOrders: { $sum: '$totalOrders' },
            deliveredOrders: { $sum: '$deliveredOrders' },
            returnedOrders: { $sum: '$returnedOrders' },
            averageDeliveryTime: { $avg: '$averageDeliveryTime' }
          }
        },
        {
          $project: {
            _id: 0,
            courier: '$_id',
            totalOrders: 1,
            deliveredOrders: 1,
            returnedOrders: 1,
            averageDeliveryTime: 1
          }
        },
        {
          $sort: { totalOrders: -1 }
        }
      ]),

      // 3. Time-based Analytics
      Order.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            dailyOrders: { $sum: 1 },
            deliveredOrders: {
              $sum: { $cond: [{ $eq: ['$isDelivered', true] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } },
        { $limit: 30 } // Last 30 days
      ]),

      // 4. Return Analysis
      Order.aggregate([
        {
          $group: {
            _id: {
              $toLower: '$courierType' // Convert to lowercase for standardization
            },
            returnCount: { $sum: { $cond: [{ $eq: ['$isReturned', true] }, 1, 0] } },
            totalOrders: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id', 'trax'] }, then: 'Trax' },
                  { case: { $eq: ['$_id', 'postex'] }, then: 'PostEx' },
                  { case: { $eq: ['$_id', 'daewoo'] }, then: 'Daewoo' }
                ],
                default: 'Other'
              }
            },
            returnCount: { $sum: '$returnCount' },
            totalOrders: { $sum: '$totalOrders' }
          }
        },
        {
          $project: {
            _id: 0,
            courier: '$_id',
            returnCount: 1,
            totalOrders: 1,
            returnRate: {
              $multiply: [
                { $divide: ['$returnCount', '$totalOrders'] },
                100
              ]
            }
          }
        },
        {
          $sort: { returnCount: -1 }
        }
      ]),

      // 5. Payment Status Tracking
      Order.aggregate([
        {
          $group: {
            _id: '$invoicePayment',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),

      // 6. Performance Metrics
      Order.aggregate([
        {
          $group: {
            _id: null,
            averageProcessingTime: {
              $avg: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$last_tracking_update', null] },
                      { $ne: ['$createdAt', null] }
                    ]
                  },
                  { $subtract: ['$last_tracking_update', '$createdAt'] },
                  null
                ]
              }
            },
            deliverySuccessRate: {
              $avg: { $cond: [{ $eq: ['$isDelivered', true] }, 1, 0] }
            },
            returnRate: {
              $avg: { $cond: [{ $eq: ['$isReturned', true] }, 1, 0] }
            }
          }
        }
      ]),

      // 7. Remarks Analysis
      Order.aggregate([
        {
          $unwind: '$remarks'
        },
        {
          $group: {
            _id: '$remarks.type',
            count: { $sum: 1 },
            users: { $addToSet: '$remarks.createdBy' }
          }
        }
      ]),

      // 8. Product Information Stats
      Order.aggregate([
        {
          $group: {
            _id: '$productInfo.OrderDetails.ProductName',
            totalQuantity: { $sum: '$productInfo.OrderDetails.Quantity' },
            orderCount: { $sum: 1 }
          }
        },
        {
          $sort: { orderCount: -1 }
        }
      ]),


      // 9. Latest Orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('trackingNumber productInfo.CustomerName createdAt isDelivered isReturned invoicePayment'),

      // 10. Today's Statistics
      Order.aggregate([
        {
          $facet: {
            todaysOrders: [
              {
                $match: {
                  createdAt: {
                    $gte: dayjs().tz(tz).startOf('day').toDate(),
                    $lte: dayjs().tz(tz).endOf('day').toDate()
                  }
                }
              },
              { $count: "count" }
            ],
            deliveredToday: [
              {
                $match: {
                  isDelivered: true,
                  delivered_at: {
                    $gte: dayjs().tz(tz).startOf('day').toDate(),
                    $lte: dayjs().tz(tz).endOf('day').toDate()
                  }
                }
              },
              { $count: "count" }
            ],
            returnsToday: [
              {
                $match: {
                  isReturned: true,
                  returned_at: {
                    $gte: dayjs().tz(tz).startOf('day').toDate(),
                    $lte: dayjs().tz(tz).endOf('day').toDate()
                  }
                }
              },
              { $count: "count" }
            ],
            deliveredByCourier: [
              {
                $match: {
                  isDelivered: true,
                  delivered_at: {
                    $gte: dayjs().tz(tz).startOf('day').toDate(),
                    $lte: dayjs().tz(tz).endOf('day').toDate()
                  }
                }
              },
              {
                $group: {
                  _id: {
                    $switch: {
                      branches: [
                        { case: { $eq: [{ $toLower: '$courierType' }, 'trax'] }, then: 'Trax' },
                        { case: { $eq: [{ $toLower: '$courierType' }, 'postex'] }, then: 'PostEx' },
                        { case: { $eq: [{ $toLower: '$courierType' }, 'daewoo'] }, then: 'Daewoo' }
                      ],
                      default: 'Other'
                    }
                  },
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  courier: '$_id',
                  count: 1
                }
              }
            ],
            returnedByCourier: [
              {
                $match: {
                  isReturned: true,
                  returned_at: {
                    $gte: dayjs().tz(tz).startOf('day').toDate(),
                    $lte: dayjs().tz(tz).endOf('day').toDate()
                  }
                }
              },
              {
                $group: {
                  _id: {
                    $switch: {
                      branches: [
                        { case: { $eq: [{ $toLower: '$courierType' }, 'trax'] }, then: 'Trax' },
                        { case: { $eq: [{ $toLower: '$courierType' }, 'postex'] }, then: 'PostEx' },
                        { case: { $eq: [{ $toLower: '$courierType' }, 'daewoo'] }, then: 'Daewoo' }
                      ],
                      default: 'Other'
                    }
                  },
                  count: { $sum: 1 }
                }
              },
              {
                $project: {
                  _id: 0,
                  courier: '$_id',
                  count: 1
                }
              }
            ]
          }
        }
      ])
    ]);

    // Format the data for the dashboard
    const dashboardData = {
      orderStatus: orderStatusStats.reduce((acc, curr) => {
        acc[curr.status] = curr.count;
        return acc;
      }, { pending: 0, delivered: 0, returned: 0 }),

      courierPerformance: courierStats.map(stat => ({
        courier: stat.courier,
        totalOrders: stat.totalOrders,
        deliveredOrders: stat.deliveredOrders,
        returnedOrders: stat.returnedOrders,
        deliveryRate: (stat.deliveredOrders / stat.totalOrders * 100).toFixed(2),
        returnRate: (stat.returnedOrders / stat.totalOrders * 100).toFixed(2),
        averageDeliveryTime: stat.averageDeliveryTime ?
          Math.round(stat.averageDeliveryTime / (1000 * 60 * 60 * 24)) : 0
      })),

      timeBasedAnalytics: timeBasedStats.map(stat => ({
        date: `${stat._id.year}-${stat._id.month}-${stat._id.day}`,
        orders: stat.dailyOrders,
        delivered: stat.deliveredOrders,
        deliveryRate: (stat.deliveredOrders / stat.dailyOrders * 100).toFixed(2)
      })),

      returnAnalysis: returnStats.map(stat => ({
        courier: stat.courier,
        returnCount: stat.returnCount,
        totalOrders: stat.totalOrders,
        returnRate: stat.returnRate.toFixed(2)
      })),

      paymentStats: paymentStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount
        };
        return acc;
      }, {}),

      performance: performanceMetrics[0] || {
        averageProcessingTime: 0,
        deliverySuccessRate: 0,
        returnRate: 0
      },

      remarks: remarksAnalysis.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          uniqueUsers: stat.users.length
        };
        return acc;
      }, {}),

      productStats: productStats.map(stat => ({
        product: stat._id,
        totalQuantity: stat.totalQuantity,
        orderCount: stat.orderCount
      })),

      latestOrders,

      todayStats: {
        todaysOrders: todayStats[0]?.todaysOrders[0]?.count || 0,
        deliveredToday: todayStats[0]?.deliveredToday[0]?.count || 0,
        returnsToday: todayStats[0]?.returnsToday[0]?.count || 0,
        deliveredByCourier: todayStats[0]?.deliveredByCourier || [],
        returnedByCourier: todayStats[0]?.returnedByCourier || []
      }
    };

    res.render("dashboard/index", {
      user: req.user,
      title: "Dashboard",
      path: "/dashboard",
      layout: "layouts/dashboard",
      dashboardData,
      latestOrders
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).render("error", {
      message: "Error loading dashboard",
      error: error
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

router.get('/system-status', checkAuthenticated, async (req, res) => {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseConnection();

    // Check file system
    const fileSystemStatus = await checkFileSystem();

    // Check API endpoints
    const apiStatus = await checkAPIEndpoints();

    res.render('dashboard/system-status', {
      title: 'System Status',
      user: req.user,
      dbStatus,
      fileSystemStatus,
      apiStatus,
      currentPage: 'system-status',
      layout: 'layouts/dashboard',
      path: '/dashboard/system-status'
    });
  } catch (error) {
    console.error('Error checking system status:', error);
    res.status(500).render('error', {
      message: 'Error checking system status',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Helper functions to check system components
async function checkDatabaseConnection() {
  try {
    await mongoose.connection.db.admin().ping();
    return {
      status: 'operational',
      message: 'Database connection is healthy',
      lastChecked: new Date()
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      lastChecked: new Date()
    };
  }
}

async function checkFileSystem() {
  try {
    // Check if public directory exists and is writable
    const publicDir = path.join(process.cwd(), 'public');
    await fs.access(publicDir, fs.constants.R_OK);

    // Check if views directory exists and is readable
    const viewsDir = path.join(process.cwd(), 'views');
    await fs.access(viewsDir, fs.constants.R_OK);

    return {
      status: 'operational',
      message: 'File system is healthy',
      lastChecked: new Date()
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'File system check failed',
      error: error.message,
      lastChecked: new Date()
    };
  }
}

async function checkAPIEndpoints() {
  const endpoints = [
    {
      name: 'Authentication API',
      path: '/auth',
      routes: [
        { path: '/', method: 'GET' },
        { path: '/', method: 'POST' },
        { path: '/logout', method: 'POST' }
      ]
    },
    {
      name: 'Orders API',
      path: '/api/orders',
      routes: [
        { path: '/', method: 'GET' },
        { path: '/delivered', method: 'GET' },
        { path: '/returned', method: 'GET' },
        { path: '/verify-return', method: 'POST' },
        { path: '/update-status', method: 'GET' },
        { path: '/:orderId', method: 'DELETE' },
        { path: '/:orderId', method: 'PUT' },
        { path: '/remarks/:orderId', method: 'PUT' }
      ]
    },
    {
      name: 'Logs API',
      path: '/api/logs',
      routes: [
        { path: '/', method: 'GET' }
      ]
    }
  ];

  const results = await Promise.all(endpoints.map(async (endpoint) => {
    try {
      // For auth routes, we'll check if the route exists by making a GET request
      if (endpoint.path === '/auth') {
        const response = await axios.get(`http://localhost:${process.env.PORT}${endpoint.path}`);
        return {
          name: endpoint.name,
          status: 'operational',
          message: 'API endpoint is healthy',
          routes: endpoint.routes,
          lastChecked: new Date()
        };
      } else {
        // For other APIs, use the health endpoint
        const response = await axios.get(`http://localhost:${process.env.PORT}${endpoint.path}/health`, {
          headers: {
            'Cookie': 'connect.sid=' + process.env.SESSION_SECRET // Add session cookie if needed
          }
        });
        return {
          name: endpoint.name,
          status: 'operational',
          message: 'API endpoint is healthy',
          routes: endpoint.routes,
          lastChecked: new Date()
        };
      }
    } catch (error) {
      // If we get a 401/403, the API is working but requires authentication
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        return {
          name: endpoint.name,
          status: 'operational',
          message: 'API endpoint is healthy (requires authentication)',
          routes: endpoint.routes,
          lastChecked: new Date()
        };
      }
      return {
        name: endpoint.name,
        status: 'error',
        message: 'API endpoint check failed',
        routes: endpoint.routes,
        error: error.message,
        lastChecked: new Date()
      };
    }
  }));

  return results;
}

export default router;
