// routes/router.js
const indexRouter = require('./index');   // 原本主页路由
const usersRouter = require('./user');   // 用户路由
const ssoRouter = require('./sso');       // SSO 登录路由
const pushRouter = require('./push');     // 推送路由

function registerRoutes(app) {
  app.use('/', indexRouter);
  app.use('/user', usersRouter);
  app.use('/sso', ssoRouter);
  app.use('/push', pushRouter);
}

module.exports = registerRoutes;
