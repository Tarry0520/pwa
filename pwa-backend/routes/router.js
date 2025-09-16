// routes/router.js
const indexRouter = require('./index');            // Home/index
const usersRouter = require('./user');             // User/auth routes
const ssoRouter = require('./sso');                // SSO login routes
const scheduleRouter = require('./schedule');      // Schedule
const transcriptsRouter = require('./transcripts');// Transcripts
const attendanceRouter = require('./attendance');  // Attendance
const announcementsRouter = require('./announcements'); // Announcements
const eventsRouter = require('./events');          // Events/Calendar
const leaveRequestsRouter = require('./leaveRequests'); // Leave requests
const pushRouter = require('./push');              // Web Push utilities

function registerRoutes(app) {
  app.use('/', indexRouter);
  app.use('/user', usersRouter);
  app.use('/sso', ssoRouter);
  // Core academic data first
  app.use('/', scheduleRouter);
  app.use('/', transcriptsRouter);
  app.use('/', attendanceRouter);
  // Communications
  app.use('/', announcementsRouter);
  app.use('/', eventsRouter);
  // Actions
  app.use('/', leaveRequestsRouter);
  // Utilities (least frequent)
  app.use('/push', pushRouter);
}

module.exports = registerRoutes;
