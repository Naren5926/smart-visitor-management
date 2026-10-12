// Explicit allow-list of fields that may leave the server. New fields are private by default.
const toPublicUser = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  mustChangePassword: Boolean(user.mustChangePassword),
  className: user.className,
  year: user.year,
  rollNo: user.rollNo,
  createdAt: user.createdAt,
});

module.exports = { toPublicUser };
