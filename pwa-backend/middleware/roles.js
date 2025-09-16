function requireRole(roles = []) {
  return (req, res, next) => {
    try {
      const roleFromUser = req.user?.role
      const roleFromHeader = req.headers['x-user-role'] // POC override for testing
      const role = roleFromUser || roleFromHeader
      if (!role || (roles.length > 0 && !roles.includes(role))) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' })
      }
      next()
    } catch (e) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' })
    }
  }
}

module.exports = { requireRole }
