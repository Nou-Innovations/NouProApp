/**
 * Recurring Schedule Service
 *
 * Mints deliveries/transfers from due RecurringSchedule rows and advances their
 * nextRunAt. `runDue()` is invoked on an interval from server.js (and can be
 * triggered by an internal endpoint / cron).
 */

const { getRepos } = require('../repositories');
const { v4: uuidv4 } = require('uuid');

function computeNextRun(frequency, from) {
  const d = new Date(from || new Date());
  switch (frequency) {
    case 'daily': d.setDate(d.getDate() + 1); break;
    case 'weekly': d.setDate(d.getDate() + 7); break;
    case 'biweekly': d.setDate(d.getDate() + 14); break;
    case 'monthly': d.setMonth(d.getMonth() + 1); break;
    default: d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Run all schedules whose nextRunAt is due. Mints one delivery/transfer per
 * schedule from its template, then advances nextRunAt.
 */
async function runDue(now = new Date()) {
  const repos = getRepos();
  let due = [];
  try {
    due = await repos.recurringRepo.getDue(now);
  } catch (e) {
    return { ran: 0, error: e.message };
  }

  const results = [];
  for (const sched of due) {
    try {
      const tmpl = sched.template || {};
      if (sched.kind === 'transfer') {
        await repos.transferRepo.create({
          ...tmpl,
          id: uuidv4(),
          businessId: sched.businessId,
          status: 'Requested',
          fromLocationId: sched.fromLocationId || tmpl.fromLocationId || null,
          toLocationId: sched.toLocationId || tmpl.toLocationId || null,
          items: tmpl.items || [],
          itemCount: Array.isArray(tmpl.items) ? tmpl.items.length : null,
          recurringScheduleId: sched.id,
          orderTime: now.toISOString(),
        });
      } else {
        await repos.deliveryRepo.create({
          ...tmpl,
          id: uuidv4(),
          businessId: sched.businessId,
          type: 'delivery',
          direction: 'outgoing',
          deliveryStatus: 'Draft',
          paymentStatus: 'UNPAID',
          items: tmpl.items || [],
          orderTime: now.toISOString(),
        });
      }
      await repos.recurringRepo.update(sched.id, {
        lastRunAt: now,
        nextRunAt: computeNextRun(sched.frequency, sched.nextRunAt || now),
      });
      results.push({ scheduleId: sched.id, ok: true });
    } catch (e) {
      results.push({ scheduleId: sched.id, ok: false, error: e.message });
    }
  }
  return { ran: results.filter((r) => r.ok).length, total: results.length, results };
}

module.exports = { runDue, computeNextRun };
