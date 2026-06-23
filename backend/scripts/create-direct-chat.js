// Creates ONE individual (direct) chat in the inbox for the app account you pass in.
//
// Run from the backend/ folder with YOUR app-login email:
//   node -r dotenv/config scripts/create-direct-chat.js you@example.com
//
// If you don't pass an email (or it isn't found), it lists the users who are in your
// group chats so you can spot yourself, then exits without changing anything.
//
// Once it finds you, it targets the company where you have the most GROUP chats (the
// one you're viewing), picks a contact you already share a group with, and creates a
// 1-on-1 chat + a first message. It won't create a duplicate. To undo, delete the
// printed chat id (chat-direct-…).
const { PrismaClient } = require('@prisma/client');
// Use the direct (session) connection for this one-off script — steadier than the
// transaction pooler (6543) for a short sequence of reads + writes.
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
});

async function listGroupChatUsers() {
  const groups = await prisma.chat.findMany({ where: { type: 'group' } });
  const ids = new Set();
  for (const g of groups) (Array.isArray(g.participants) ? g.participants : []).forEach((u) => ids.add(u));
  const users = await prisma.user.findMany({ where: { id: { in: [...ids] } }, select: { id: true, name: true, email: true } });
  console.log('\nUsers found in group chats — re-run with your email:');
  for (const u of users) console.log(`  ${u.email || '(no email)'}  |  ${u.name}  |  ${u.id}`);
}

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.log('No email passed. Usage: node -r dotenv/config scripts/create-direct-chat.js you@example.com');
    await listGroupChatUsers();
    return;
  }
  const admin = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
  if (!admin) {
    console.log(`User "${email}" not found.`);
    await listGroupChatUsers();
    return;
  }
  console.log('You:', admin.id, '|', admin.name, '|', admin.email);

  const parts = await prisma.chatParticipant.findMany({ where: { userId: admin.id } });
  const chats = await prisma.chat.findMany({ where: { id: { in: parts.map((p) => p.chatId) } } });

  // Group the admin's chats by company and find the company with the most group chats.
  const byCompany = {};
  for (const c of chats) {
    const k = c.companyId || 'null';
    (byCompany[k] ||= { group: [], direct: [] });
    (c.type === 'group' ? byCompany[k].group : byCompany[k].direct).push(c);
  }
  console.log('Companies (group/direct counts):');
  let companyId = null;
  let best = -1;
  for (const [k, v] of Object.entries(byCompany)) {
    console.log(`  ${k}: ${v.group.length} group, ${v.direct.length} direct`);
    if (v.group.length > best) { best = v.group.length; companyId = k === 'null' ? null : k; }
  }
  const key = companyId || 'null';
  if (best <= 0) throw new Error('no group chats found to infer the target company');
  console.log('Target company:', companyId, `(${best} group chats)`);

  // Candidate contacts = people you share a group with.
  const candidates = new Set();
  for (const g of byCompany[key].group) {
    (Array.isArray(g.participants) ? g.participants : []).forEach((u) => { if (u !== admin.id) candidates.add(u); });
  }
  // Exclude anyone you already have a 1-on-1 with, so we always create a NEW chat.
  const alreadyDirect = new Set();
  for (const d of byCompany[key].direct) {
    (Array.isArray(d.participants) ? d.participants : []).forEach((u) => { if (u !== admin.id) alreadyDirect.add(u); });
  }
  const otherId = [...candidates].find((id) => !alreadyDirect.has(id));
  if (!otherId) { console.log('You already have a 1-on-1 with everyone in your groups — nothing new to create.'); return; }
  const other = await prisma.user.findFirst({ where: { id: otherId } });
  console.log('Other participant:', other.id, '|', other.name);

  const now = new Date();
  const chatId = 'chat-direct-' + now.getTime();
  const msgId = 'msg-' + now.getTime();
  const content = `Hi ${(other.name || '').split(' ')[0] || 'there'}, quick question for you`;

  await prisma.chat.create({
    data: {
      id: chatId,
      companyId,
      locationId: null,
      type: 'direct',
      name: null,
      participants: [admin.id, other.id],
      lastMessage: {
        id: msgId, content, type: 'text', senderId: admin.id, senderName: admin.name,
        timestamp: now.toISOString(), isRead: false, isOutgoing: true, status: 'sent',
      },
      unreadCount: 0,
    },
  });
  await prisma.chatParticipant.create({ data: { chatId, userId: admin.id } });
  await prisma.chatParticipant.create({ data: { chatId, userId: other.id } });
  await prisma.message.create({
    data: { id: msgId, chatId, senderId: admin.id, senderName: admin.name, content, type: 'text', timestamp: now, status: 'sent', isOutgoing: false },
  });

  console.log(`\n✅ Created direct chat ${chatId} in company ${companyId} between ${admin.name} and ${other.name}.`);
  console.log('Pull-to-refresh the inbox to see it.');
}

async function run() {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try { await main(); return; }
    catch (e) {
      const msg = `${e.message} ${e.code || ''}`;
      const transient = /reach database|ECONNRESET|ETIMEDOUT|P1001|P1017|Closed/.test(msg);
      if (transient && attempt < 4) {
        console.log(`Connection hiccup (attempt ${attempt}/4) — retrying in 3s...`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      console.error('ERROR:', e.message);
      process.exitCode = 1;
      return;
    }
  }
}

run().finally(() => prisma.$disconnect());
