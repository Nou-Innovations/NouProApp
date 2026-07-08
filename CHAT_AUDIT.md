# NouPro Chat System — Full Audit (2026-07-08)

> Deep audit of the chat/messaging system and everything that feeds it (orders, invoices,
> estimates, procurement, contact sharing). Produced by tracing the full stack: frontend UI
> (`src/features/inbox/`), the Socket.IO client (`src/shared/services/chat.ts`), the backend
> routes + Socket.IO server (`backend/server.js`), the event-message bridge
> (`backend/src/services/eventMessages.js`), the chat repository
> (`backend/src/repositories/prisma/chatRepo.prisma.js`), and the data model
> (`backend/prisma/schema.prisma`).
>
> **Severity:** **P0** = core feature broken or a security hole • **P1** = major but has a
> workaround / not a security issue • **P2** = polish, cosmetic, or hygiene.
> Every item cites `file:line` so it is directly actionable.

---

## How to read this (plain language)

The chat *itself* — sending/receiving text, images, PDFs, locations, reading, typing, forwarding,
searching — **works**. The parts that are broken cluster in three places:

1. **Orders/invoices/estimates don't show up live in chat** and their cards render blank or as bare
   text. This is the single biggest gap and almost certainly what you're feeling. (Theme A)
2. **Three server-side permission holes** *(now ✅ fixed — Phase 1)* let any colleague in a company
   post into private chats, bypass blocking, and kick people out of groups. (Theme B)
3. **Two fully-built features are unreachable** (voice recording, the offline outbox), plus a set of
   smaller correctness bugs (edit window, double push notifications, unread badges). (Themes C–E)

Nothing here requires throwing anything away — every broken feature is *finishable*.

---

## What already works (verified)

- Text messages: links, @mentions, inline timestamp, "edited" tag, reply/quote preview.
- Image send + fullscreen viewer; PDF send + download/share; location send + open-in-Maps.
- **Voice playback** of received messages (only *recording* is unreachable — see A-DEAD).
- Contact-card and profile-card sharing **end-to-end** (compose → persist → re-hydrate → render →
  deep-link to the profile). This is the one business-object integration that is correct.
- Read-receipt ticks, typing indicator, date separators, forward, in-chat search.
- Socket.IO lifecycle: JWT-verified handshake, connect on login, disconnect on logout, room
  re-join on reconnect, listener cleanup (no duplicate-listener leaks).
- Invoice/estimate deep-links (`InvoiceDetails {invoiceId}`) and profile deep-links resolve to real
  screens with correct params.

---

## Theme A — Orders / Invoices / Estimates ↔ Chat (the core breakage)

The bridge is `backend/src/services/eventMessages.js`. It was built to a **different data contract
than the frontend cards expect**, and it has **no access to Socket.IO**, so nothing it produces
appears in real time. Verified by reading the service directly.

> **STATUS — Phase 2 shipped (2026-07-08, ORDERS only):** A0–A4 + A6/A8 are **fixed for orders** via a
> dedicated `eventMessages.postOrderEvent()` path: order create + status change now build a full
> `OrderEventPayload` and post a rich, **live** (socket + push), tappable order card into a canonical
> deterministic buyer↔seller chat with real **user** participants (dedup + direction fixed); the card
> is crash-proofed and its fabricated timelines removed; `handleOrderPress` deep-links to
> `OrderDetails`; `MessageBubble` no longer renders blank bubbles for any type.
>
> **STATUS — Phase 2b shipped (2026-07-08, INVOICES + ESTIMATES):** A0–A5 now also fixed for invoices via
> `eventMessages.postInvoiceEvent()` (shares `resolveBusinessPairChat` + `broadcastEventMessage` with
> orders, so a business's orders + invoices land in **one** chat). Added a nullable `Invoice.clientBusinessId`
> (migration `20260708130000_add_invoice_client_business`) populated from the client the invoice form
> already picks (`CreateInvoiceScreen`); recipient resolves via `clientBusinessId` → else linked
> `order.buyerBusinessId` → else the seller's activity feed. Invoice/estimate create + send post a live
> `InvoiceEventCard`; estimate acceptance/conversion posts a system line.
>
> **STATUS — Theme A COMPLETE (2026-07-08, procurement/stock):** `eventMessages.postProcurementEvent()`
> posts purchase-request / purchase-order / goods-received / low-stock events as live `event` system
> lines into the business's own `chat-actfeed-<businessId>` team feed (all members, socket + push), with
> proper text. 7 sites rewired (server.js + orderStatus.js). The legacy `createEventMessage` /
> `findOrCreateChat` / `generateMessageContent` are now **deleted** (all domains use `post*Event`). **All
> of Theme A is now live in chat** (orders + invoices/estimates + procurement). Deferred enhancement:
> route `purchase_order_sent` to a platform supplier's chat when `Supplier.supplierBusinessId` is set.

### A0 · [P0] Event messages never appear live — no socket emit, no push
`createEventMessage` calls `chatRepo.addMessage` (`eventMessages.js:45`) but **never** calls
`io.to('chat:'+id).emit('message', …)` and never triggers a push. The service has no `io` handle.
Normal user messages *do* emit (`server.js:9966`). **Result:** an "order created / status changed /
invoice sent" card is written to the DB but only materialises when the recipient does a full manual
refetch of that chat — it never streams in, and the inbox list never updates live.
Called from ~20 sites (`server.js:5905, 6127, 6420, 9180, 9403, 9542, 9566, 9652, 14324`,
`orderStatus.js:284`, procurement `6998–7555`).
**Fix:** give the event pipeline access to `io` (pass it in, or emit at each call site with the
returned message), and call the same offline-push helper the normal send path uses.

### A1 · [P0] Order cards render blank or crash (payload contract mismatch)
`eventMessages` stores order data **flat** in `meta` (`eventMessages.js:51-56`). `mapMessageToApi`
sets `mapped.payload = meta.payload` (`chatRepo.prisma.js:75`) — but **nothing ever writes
`meta.payload`**. `OrderEventCard` destructures `const { payload } = message` and dereferences
`payload.status`, `payload.orderRef`, `payload.itemsPreview.map(...)`, `payload.delivery.expectedDate`
(`OrderEventCard.tsx:234, 255, 259, 379, 388`). With `payload === undefined` this throws
`Cannot read property 'status' of undefined` → blank/red card.
**Fix:** in `eventMessages`, fetch the order and build a full `OrderEventPayload`
(`orderRef / itemsPreview / subtotal / vatAmount / vatPercent / deliveryFee / totalAmount /
currency / delivery / buyer / seller`), store it as `meta.payload`.

### A2 · [P0] Many event types have no renderer → invisible bubbles
`mapMessageToApi` only specially maps `order_event` among the event types; `status_update`,
`estimate_confirmed`, `stock_alert` (written by `eventMessages.js:124-133`) pass through unchanged
and hit `MessageBubble`'s `default: return null` (`MessageBubble.tsx:876`). `video_call` and
`delivery` are accepted by the POST allow-list (`server.js:825`) but likewise have no renderer.
**Result:** every **order status change** — the most important chat event — and every stock alert /
estimate-conversion renders as **nothing at all** (or a bare text line).
**Fix:** normalise these to a rendered type (`order_event` for status changes, `event` for
procurement/stock activity) in the writer or in `mapMessageToApi`; and add a generic `event`
renderer fallback so no known type can ever render `null`.

### A3 · [P0] Order status-change messages land in the wrong conversation
`createEventMessage` at `server.js:6127` passes `fromBusinessId: updated.businessId,
toBusinessId: updated.buyerBusinessId`. Order **creation** (`5905`) uses the **opposite** direction.
`findOrCreateChat` (`eventMessages.js:64-114`) searches owner→participant, and creation makes the
chat with `companyId: buyerBusinessId` while the update searches from `businessId` → the update
frequently **creates a second, seller-owned chat** instead of posting into the existing buyer↔seller
thread. **Result:** the buyer never sees status updates in the original conversation.
**Fix:** normalise buyer/seller direction so every event for one order resolves to one stable chat.

### A4 · [P1] Event-chats use **business** IDs as participants, not **user** IDs
`findOrCreateChat` creates chats with `participants: [businessA, businessB]` (`eventMessages.js:97`)
and single-party `[businessA]` (`:109`). Everywhere else participants are **user** IDs
(`ChatParticipant.userId`, `user:${userId}` socket rooms). **Result:** (a) these chats never appear
in `getByUserId` (the user/personal inbox), (b) no `ChatParticipant` rows are created so per-user
unread never tracks, and (c) even once A0 emits, the `user:${userId}` targeted updates won't match.
**Fix:** resolve the actual member user IDs of each business (or the specific buyer/seller users) and
store those as participants + create `ChatParticipant` rows.

### A5 · [P1] Estimate→invoice conversion produces a header-only card
The estimate-confirm / estimate-accept paths (`server.js:9542, 9652`) pass only
`amount/currency/clientName` and **don't** call `buildInvoiceCardDetails` (`server.js:8993`), so the
resulting `InvoiceEventCard` has no `details` → shows only "Tap to view invoice details". Also the
card infers tax as `total - subtotal` (`InvoiceEventCard.tsx:188`) because there is **no explicit tax
field** in the contract; when `amount == totalAmount` the "Tax & fees" row is wrong or vanishes.
**Fix:** call `buildInvoiceCardDetails` on the confirm/accept paths; add an explicit tax field to the
card contract.

### A6 · [P1] Tapping an order card never opens the order
`handleOrderPress` (`ChatScreen.tsx:387-410`) navigates to **`DeliveryDetail`** only when
`payload.delivery.id` exists, otherwise shows an alert. It **never** navigates to `OrderDetails`
(which exists — `App.tsx:476`, params `{orderId}`). Today `payload` is undefined (A1) so every tap is
just an alert reading "Status: Unknown".
**Fix:** deep-link to `OrderDetails {orderId}` as the reliable target (fall back to delivery when a
delivery id is present).

### A7 · [P2] `findOrCreateChat` can spam "Activity Feed" chats
For every single-party event (`toBusinessId: null` — most invoices/estimates/procurement),
`findOrCreateChat` (`eventMessages.js:102-112`) creates a **brand-new** internal chat keyed only by a
timestamp id when no prior chat is found — no dedupe on a stable per-business activity chat.
**Fix:** look up (or create-once) a stable "Activity Feed" chat per business and reuse it.

### A8 · [P2] Legacy order adapter fabricates data
`MessageBubble.renderOrderEventMessage` (`:781-820`) converts legacy `type:'order'` with hardcoded
`buyer/seller = {name:'Buyer'/'Seller'}`, and `OrderEventCard.getPaymentTimeline/getActivityTimeline`
(`OrderEventCard.tsx:302-342`) **fabricate** payment splits (`totalAmount*0.3`) and proportional
timestamps that are not real data. Not a crash, but users are shown fictional payment history.
**Fix:** drop the fabricated timelines or drive them from real order events.

---

## Theme B — Security / authorization holes (all P0) — ✅ FIXED

> **Status (2026-07-08):** All three original holes were closed in commit `53e8c1bf` (verified against
> current code). The personal-mode residual (B4) was closed as part of Phase 1. Line numbers below are
> current.

### B1 · [P0] ✅ FIXED — Company send route now checks chat membership
`POST /api/companies/:companyId/chats/:chatId/messages` previously verified only `requireCompanyMember`
+ `chat.companyId === companyId`, so any company member could post into any chat the company owns
(including private 1:1s between two *other* colleagues). **Now guarded** at `server.js:10082`:
`Array.isArray(chat.participants) && chat.participants.includes(senderId)` → 403.

### B2 · [P0] ✅ FIXED — Company send route now enforces blocking
The company send route had no `blockRepo` check, so blocking was bypassable via the `/companies/...`
endpoint. **Now guarded** at `server.js:10087-10094`: for `chat.type === 'direct'`,
`blockRepo.isBlocked(senderId, other)` → 403.

### B3 · [P0] ✅ FIXED — `remove-participant` now requires business admin
Company `POST .../remove-participant` was guarded only by `requireCompanyMember` (any member could
remove anyone). **Now guarded** at `server.js:10477`: `requireBusinessAdmin(req, res, companyId)`.
(There is no per-chat admin/owner in the schema, so business-admin is the authority bar.)

### B4 · [P1] ✅ FIXED — personal-mode `remove-participant` now requires participation
The personal-mode twin `POST /api/users/:userId/chats/:chatId/remove-participant` (`server.js:11146`)
checked only `req.user.id === :userId`, never that the requester was **in** the chat — so any user who
knew a `chatId` + a member id could remove that member from a group they didn't belong to. **Now
guarded** (added 2026-07-08): `chat.participants.includes(userId)` → 403, mirroring the send routes.
Personal chats have no admin concept, so participation is the correct bar; `leave` routes only remove
the caller, so they need no guard.

---

## Theme C — Message-operation bugs

> **STATUS — Phase 3 shipped (2026-07-08): the Theme C/D P1 bugs are fixed.** ✅ **C1** edit routes now
> use `message.timestamp` (was the non-existent `createdAt`) so the 24h window enforces. ✅ **C2** the
> duplicate `pushService.sendToUsers` on the company send route was removed (one correct push; the
> "Sent a message" body bug is gone). ✅ **D2** `offlineQueue.init()` + `flush()` now wired at app boot
> (`App.tsx`) so the offline outbox sends on reconnect. ✅ **D3/D4** `useChatMessages` always marks a
> chat read on open (idempotent) and optimistically zeroes the store count, so notification/deep-link
> opens mark read and badges stay accurate across restart.
>
> **STATUS — P2 polish shipped (2026-07-08).** ✅ **C3** pagination fetches `limit+1` (no phantom empty
> page); ✅ **C4** leave/remove now emit the mapped message shape; ✅ **C5** forward emits `chat_update`
> with `lastMessage` (inbox preview updates); ✅ **C6** typing requires room membership
> (`socket.rooms.has`); ✅ **D5b** "Copy link" writes the clipboard (`expo-clipboard`); ✅ **D5c** the
> leaked debug/stub alerts are gone (invoice action → OrderDetails, unknown action → dev-log); ✅ **D5d**
> `chat_read` updates only changed rows via `store.updateMessage`; ✅ **D5a** the reply/quote header now
> renders on media messages too (`renderReplyContext` un-gated + wired into image/voice + the shared
> attachment-bubble helper; `replyingTo` hoisted onto `BaseMessage`). **All Theme C/D P2 items done.**
> The only remaining audit item is the **data-model migration (E1/E2, Phase 5)**.

### C1 · [P1] The 24-hour edit window is never enforced (verified)
Edit route `server.js:10095`: `messageAge = Date.now() - new Date(message.createdAt).getTime()`. The
`Message` model has **no `createdAt`** — only `timestamp` (`schema.prisma:510`). So `message.createdAt`
is `undefined` → `new Date(undefined)` → `NaN` → `NaN > 24h` is always `false`. **Any message is
editable forever.** Same bug in the user-mode edit route (`10745`).
**Fix:** use `message.timestamp`.

### C2 · [P1] Double push + wrong push body on company messages (verified)
The company send route calls **both** `sendPushToOfflineParticipants(...)` (`server.js:9969`) **and**
an unconditional `pushService.sendToUsers({ userIds: otherParticipantIds, ... })` (`9996-10004`).
**Result:** offline recipients get **two** notifications; online recipients get one (defeating the
"offline-only" intent). And the second block's `body: created.content` is `undefined` for text
messages → every text push reads **"Sent a message"**. The user-mode route (`10654`) correctly calls
only the offline helper.
**Fix:** delete the duplicate block (`9992-10004`).

### C3 · [P2] Pagination off-by-one → phantom `nextCursor`
`chatRepo.getMessages` uses `take: limit` (no `+1`) (`chatRepo.prisma.js:273`), but callers set
`nextCursor = messages.length === limit ? last.id : null` (`server.js:9819`). A chat with exactly
`limit` messages returns a non-null cursor → one extra fetch returning `[]`. Chat-*list* pagination
correctly uses `limit+1` — inconsistent.
**Fix:** fetch `limit+1`, return `limit`, derive `hasMore` from the extra row.

### C4 · [P2] Leave/remove emit the **raw** (unmapped) event message
`leave` (`10243`), `remove-participant` (`10298`) and their user-mode twins `emit('message',
eventMessage)` — the **local** object — instead of the mapped `addMessage` return. Clients get a shape
missing the normalised `sender`/`isOutgoing` fields the normal path provides.
**Fix:** emit the mapped return value.

### C5 · [P2] Event-name inconsistency: `unread_update` vs `chat_update`
Forward routes emit `unread_update` (`server.js:10197, 10884`) while every other send/read/delete path
emits `chat_update`, and the client listens for both — but forwarded-message unread badges rely on the
odd one out. Standardise on `chat_update`.

### C6 · [P2] `typing_start`/`typing_stop` do no membership check
`server.js:1014, 1023` — unlike `join_chat`, a socket can emit typing into any `chat:${chatId}` room
it knows. Low impact; add the same membership guard for consistency.

---

## Theme D — Frontend UX / unreachable features

### D1 · [P0-feature] Voice **recording** is dead (playback works)
The whole record→upload→send pipeline exists (`useVoiceRecorder`, `VoiceRecorder.tsx`,
`handleSendVoice`, upload effect `ChatScreen.tsx:649-710`) but **nothing calls `startRecording`** —
the attachment sheet (`ChatScreen.tsx:1643-1671`) has no voice entry and the comment at `:164` says
it's "disabled for now". `startRecording` has **zero call sites**.
**Decision needed:** finish it (add the mic entry point) — per your "finish, don't hide" preference —
or remove the recorder UI. Playback of received voice is unaffected either way.

### D2 · [P1] Offline outbox never sends
`offlineQueue.init()` (which registers the NetInfo reconnect-flush listener, `offlineQueue.ts:32-38`)
is **never called anywhere**; only `enqueue` is used (`ChatScreen.tsx:563`). Messages composed offline
are saved to disk and **stranded**, and `logout` wipes the queue key (`profileStore.ts:338`),
silently discarding them. The "will be sent when back online" banner (`ChatScreen.tsx:1737`) is a
false promise.
**Fix:** call `offlineQueue.init()` at app boot (and `flush()` on reconnect / chat open); don't wipe
undelivered messages on logout.

### D3 · [P1] Unread badges drift
"Already read" is tracked in an **in-memory** `Set` in `NotificationContext` (`:51`) with no
persistence → wiped on app restart, so any chat whose stored `unreadCount` is still >0 re-shows the
badge even though you read it. The global counter also does a blind `-1` per opened chat
(`ChatScreen.tsx:251-253`) which drifts from the real per-chat totals.
**Fix:** drive the badge from the authoritative per-chat `unreadCount` (from `ChatParticipant`);
persist or stop relying on `viewedItems`.

### D4 · [P1] Deep-link / notification entry never marks the chat read
`useChatMessages` gates the mark-read API call on the store's `unreadCount` for that chat
(`:108/:127`); if the chat was opened via a notification/deep-link **before** the inbox list was
fetched, it's not in the store, `unreadCount` defaults to 0, and the chat is **never marked read**
on the backend.
**Fix:** always call mark-read on open (idempotent), independent of the cached count.

### D5 · [P2] Smaller UX bugs
- **Reply quote only for text** (`MessageBubble.tsx:355`): replies to an image/pdf/voice/location show
  no quote header, though the reply context is captured and sent.
- **Fake "Copy link"** (`MessageBubble.tsx:210`): shows "Copied" but never writes to the clipboard.
- **Debug alerts leak to users**: unknown order action → `AppAlert('Action', …)` (`ChatScreen.tsx:1089`);
  order "invoice" action is a stub alert (`:781`).
- **`chat_read` rewrites the whole message array** (`chat.ts:358-369`) → O(n) re-diff on every read
  receipt in long chats.

---

## Theme E — Data model / integrity

> **STATUS — Phase 5 DONE (2026-07-08): E1 + E2 shipped.** ✅ **E1** `Message.senderId` → `User` (SET
> NULL, keeps history), `ChatParticipant.userId` / `ReadReceipt.userId` → `User` (Cascade), plus User
> back-relations — via migration `20260708190000_chat_user_integrity`, which nulls `'system'`/orphan
> senders + deletes orphaned participant/receipt rows *before* each FK, so it can't fail on data. System
> messages now write `senderId: null` (the "System" name is kept). ✅ **E2** the dead
> `ReadReceipt @@index([messageId])` is dropped. **This was the last open audit item — the entire
> CHAT_AUDIT.md is now addressed (every P0/P1/P2); voice recording left as-is per owner.**

### E1 · [P1] No referential integrity from chat rows to `User`
`Message.senderId`, `ChatParticipant.userId`, `ReadReceipt.userId` are bare `String` with **no FK**
to `User` (`schema.prisma:503-548`); `User` has zero chat back-relations. Deleting a user **orphans**
authorship, participant rows, and receipts — no cascade, no integrity. *(Requires a migration.)*

### E2 · [P1] `ReadReceipt` is half-built
`@@unique([chatId,userId])` (`schema.prisma:545`) means **one row per user per chat** — a last-read
pointer, not per-message receipts — yet the model name, the `messageId` FK, and `@@index([messageId])`
all imply per-message. The `messageId` index is dead weight. Per-message read state is impossible
without a schema change. *(Requires a migration to change.)*

### E3 · [P1] Send allow-list rejects two renderable types
`VALID_MESSAGE_TYPES` (`server.js:825`) omits `order_event` and `deleted`, which the frontend renders
and the backend writes internally — so a client POST with `type:'order_event'` is rejected 400.
Minor inconsistency; align the list.

### E4 · [P2] `lastMessage.type` vocabulary mismatch → missing preview icons
`addMessage` writes `lastMessage.type = <raw message type>` (`chatRepo.prisma.js:337`, e.g. `image`,
`voice`), but `ChatLastMessage.type` is `PreviewMessageType` (`photo`, `voice_note`, …) and
`MessageCard.getStatusIcon` only matches the preview vocabulary → **image/voice/contact/profile
previews show no media icon** in the conversation list.
**Fix:** map raw type → preview type when writing `lastMessage`, or broaden `getStatusIcon`.

### E5 · [P2] Message-level `sender.avatar` is always empty
Every send-site sets `sender.avatar = ''` (`server.js:9905, 10164, 10578`; `eventMessages.js` omits
it) and `mapMessageToApi` can't recover it → group chats fall back to initials everywhere. The type
says `avatar: string` (non-optional) but it's a meaningless empty string.
**Fix:** populate from the sender's user record (or resolve avatars client-side by `sender.id`).

### E6 · [P2] Duplicate sources of truth
`Chat.participants` (JSON) **and** `ChatParticipant` (table); `Chat.unreadCount` (single Int) **and**
`ChatParticipant.unreadCount` (per-user). The send path uses the per-user table (correct); the JSON /
single-Int copies are legacy and can drift. Pick the table as canonical and stop writing the JSON
copy (or keep it as a denormalised cache updated in one place only).

---

## Recommended fix roadmap

**Phase 1 — Security (P0, backend-only, no migration)** — ✅ DONE (2026-07-08)
B1, B2, B3 fixed in commit `53e8c1bf`; B4 (personal-mode residual) fixed after. All chat authz holes closed.

**Phase 2 — Make orders/invoices actually work in chat (P0, the headline)**
A0 (emit + push), A1 (populate `meta.payload`), A2 (renderers for every event type), A3 (one chat per
order), A4 (user-ID participants). This is the bulk of the work and what "chat doesn't fully work"
really means. Frontend + backend, no migration.

**Phase 3 — Correctness bugs (P1, no migration)**
C1 (edit window), C2 (double push), D2 (offline outbox), D3/D4 (unread + mark-read), A5/A6
(estimate details + order deep-link).

**Phase 4 — Polish (P2)**
C3–C6, D5, E3, E4, E5, E6, A7, A8.

**Phase 5 — Data-model hardening (P1, requires a Prisma migration → applies on deploy)**
E1 (User FKs + cascade), E2 (per-message receipts, if wanted). Riskier because it touches prod schema;
do it deliberately per the migration procedure, separate from the code fixes.

**Two decisions for the owner**
1. **Voice recording (D1):** finish it (add the mic button) or remove the recorder UI?
2. **Data-model migration (Phase 5):** do the integrity/receipts migration now, or defer as hardening?

---

*Line references were current at audit time (`server.js` was 14,891 lines). Re-confirm each location
before editing — the file grows.*
