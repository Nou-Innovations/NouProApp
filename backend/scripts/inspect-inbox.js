// READ-ONLY: inspect the inbox to find the company with the group chats + candidate
// participants for creating an individual (direct) chat. No writes.
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const admin = await prisma.user.findFirst({ where: { email: 'admin@nou.pro' } });
    if (!admin) { console.log('ADMIN_NOT_FOUND'); return; }
    console.log('ADMIN', admin.id, '|', admin.name);

    const parts = await prisma.chatParticipant.findMany({ where: { userId: admin.id } });
    const chats = await prisma.chat.findMany({ where: { id: { in: parts.map((p) => p.chatId) } } });

    const byCompany = {};
    for (const c of chats) {
      const k = c.companyId || 'null';
      (byCompany[k] ||= { group: [], direct: [] });
      (c.type === 'group' ? byCompany[k].group : byCompany[k].direct).push(c);
    }
    for (const [companyId, v] of Object.entries(byCompany)) {
      const biz = companyId !== 'null'
        ? await prisma.business.findFirst({ where: { id: companyId } }).catch(() => null)
        : null;
      console.log(`\nCOMPANY ${companyId} (${biz?.name || '—'}): ${v.group.length} group, ${v.direct.length} direct`);
      for (const g of v.group) {
        const others = (Array.isArray(g.participants) ? g.participants : []).filter((u) => u !== admin.id);
        const names = await prisma.user.findMany({ where: { id: { in: others } }, select: { id: true, name: true } });
        console.log(`  group "${g.name}" participants(other): ${names.map((n) => n.id + '=' + n.name).join(', ')}`);
      }
    }
  } catch (e) {
    console.error('ERR', e.code || '', e.message);
  } finally {
    await prisma.$disconnect();
  }
})();
