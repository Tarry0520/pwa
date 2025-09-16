// routes/router.js
const indexRouter = require('./index');   // 原本主页路由
const usersRouter = require('./user');   // 用户路由
const ssoRouter = require('./sso');       // SSO 登录路由
const pushRouter = require('./push');     // 推送路由
const transcriptsRouter = require('./transcripts'); // 成績單路由
const scheduleRouter = require('./schedule'); // 課表路由
const announcementsRouter = require('./announcements'); // 公告路由
const eventsRouter = require('./events'); // 行事曆路由

function registerRoutes(app) {
  app.use('/', indexRouter);
  app.use('/user', usersRouter);
  app.use('/sso', ssoRouter);
  app.use('/push', pushRouter);
  app.use('/', transcriptsRouter);
  app.use('/', scheduleRouter);
  app.use('/', announcementsRouter);
  app.use('/', eventsRouter);
}

module.exports = registerRoutes;
