export type Role = 'super_admin' | 'admin' | 'staff';

export function getCapabilities(role: Role) {
  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';

  return {
    role,
    // Pro mode access
    canAccessBusinessProfile: isSuperAdmin || isAdmin,
    // Team/product/invoice settings
    canManageBusiness: isSuperAdmin || isAdmin,
    canManageTeam: isSuperAdmin || isAdmin,
    canManageProducts: isSuperAdmin || isAdmin,
    canManageInvoices: isSuperAdmin || isAdmin,
    // Delivery operations
    canAssignDeliveries: isSuperAdmin || isAdmin,
    canReceiveDeliveries: true,
    // Location scope rules
    hasImplicitAllLocations: isSuperAdmin,
    requiresAssignedLocations: isAdmin || isStaff,
    isStaff,
  };
}
