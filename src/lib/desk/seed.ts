type Sql = {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
};

export async function seedDesk(
  sql: Sql,
  ctx: {
    userId: string;
    name: string;
    company: string;
    deskCode: string;
    nextTicketNumber: (sql: Sql, userId: string) => Promise<number>;
    slaHours: (priority: string) => number;
  },
) {
  const { userId, name, company, deskCode, nextTicketNumber, slaHours } = ctx;
  await sql`
    insert into profiles (user_id, role, name, company, desk_code)
    values (${userId}, 'staff', ${name}, ${company}, ${deskCode})
    on conflict (user_id) do nothing
  `;
  const existing = await sql<{ n: number }>`select count(*)::int as n from clients where user_id = ${userId}`;
  if ((existing[0]?.n ?? 0) > 0) return;

  await sql`insert into ticket_seq (user_id, last_number) values (${userId}, 1041) on conflict do nothing`;

  const clientSeed = [
    {
      company: "Meridian Legal",
      contact: "Priya Naidoo",
      email: "priya@meridianlegal.example",
      phone: "+27 21 555 0142",
      plan: "sla-gold",
      city: "Cape Town",
      notes: "Partners on hybrid M365. Strict after-hours SLA. Primary site on Adderley.",
    },
    {
      company: "Kestrel Logistics",
      contact: "Daniel Okoye",
      email: "daniel@kestrel-log.example",
      phone: "+27 11 555 2208",
      plan: "managed",
      city: "Johannesburg",
      notes: "Warehouse Wi-Fi + handheld scanners. Night shift coverage on WhatsApp.",
    },
    {
      company: "Oak & Pine Hotels",
      contact: "Sofia Martins",
      email: "sofia@oakpine.example",
      phone: "+27 21 555 7730",
      plan: "break-fix",
      city: "Stellenbosch",
      notes: "Front-desk PCs, PMS, guest Wi-Fi. Prefers Facebook for guest-facing issues.",
    },
    {
      company: "Brightpath Schools",
      contact: "Thabo Mokoena",
      email: "thabo@brightpath.example",
      phone: "+27 12 555 4419",
      plan: "managed",
      city: "Pretoria",
      notes: "1:1 Chromebooks. Term-time change freeze except P1.",
    },
    {
      company: "Harbor Medical Group",
      contact: "Dr. Elena Voss",
      email: "elena@harbormed.example",
      phone: "+27 21 555 9081",
      plan: "sla-gold",
      city: "Green Point",
      notes: "Clinical network isolated. Never remote into imaging without a change ticket.",
    },
    {
      company: "Volt Retail",
      contact: "Marcus Bell",
      email: "marcus@voltretail.example",
      phone: "+27 31 555 6621",
      plan: "project",
      city: "Durban",
      notes: "POS rollout across 14 stores. Project channel on email.",
    },
    {
      company: "CapeGrid Energy",
      contact: "Lila Botha",
      email: "lila@capegrid.example",
      phone: "+27 21 555 3004",
      plan: "managed",
      city: "Paarl",
      notes: "SCADA jump boxes. Change windows Fridays 18:00–22:00.",
    },
    {
      company: "Linden & Co",
      contact: "James Linden",
      email: "james@lindenandco.example",
      phone: "+27 11 555 1180",
      plan: "break-fix",
      city: "Sandton",
      notes: "Seasonal close calendar. Busy March/Feb year-end.",
    },
  ];

  const clientIds: number[] = [];
  for (const c of clientSeed) {
    const rows = await sql<{ id: number }>`
      insert into clients (user_id, company, contact_name, email, phone, status, plan, notes, city)
      values (${userId}, ${c.company}, ${c.contact}, ${c.email}, ${c.phone}, 'active', ${c.plan}, ${c.notes}, ${c.city})
      returning id
    `;
    clientIds.push(rows[0]!.id);
  }

  const [meridian, kestrel, oak, bright, harbor, volt, cape, linden] = clientIds;

  type Msg = { type: string; name: string; body: string; channel: string; agoMin: number };
  const tickets: Array<{
    clientId: number;
    subject: string;
    status: string;
    priority: string;
    channel: string;
    assignee: string;
    requester: string;
    email: string;
    agoMin: number;
    messages: Msg[];
  }> = [
    {
      clientId: meridian!,
      subject: "VPN drops every 12 minutes for remote partners",
      status: "open",
      priority: "urgent",
      channel: "whatsapp",
      assignee: name,
      requester: "Priya Naidoo",
      email: "priya@meridianlegal.example",
      agoMin: -38,
      messages: [
        { type: "channel", name: "Priya Naidoo", body: "Hi — three partners just got kicked off the VPN again. Same 12-minute loop as last month. Can you look now?", channel: "whatsapp", agoMin: -38 },
        { type: "agent", name, body: "On it. Checking the FortiGate session TTL and the Always-On profile.", channel: "whatsapp", agoMin: -32 },
        { type: "channel", name: "Priya Naidoo", body: "James is in a deposition. If it drops again we lose the room.", channel: "whatsapp", agoMin: -18 },
      ],
    },
    {
      clientId: kestrel!,
      subject: "Warehouse scanners cannot reach WMS after AP swap",
      status: "open",
      priority: "high",
      channel: "whatsapp",
      assignee: "Lebo Nkosi",
      requester: "Daniel Okoye",
      email: "daniel@kestrel-log.example",
      agoMin: -95,
      messages: [
        { type: "channel", name: "Daniel Okoye", body: "Night shift scanners stuck on associating. We swapped AP-04 this afternoon. Aisle 7–9 dead.", channel: "whatsapp", agoMin: -95 },
        { type: "agent", name: "Lebo Nkosi", body: "Likely a VLAN/SSID mismatch on the new AP. I'll push the warehouse profile.", channel: "whatsapp", agoMin: -80 },
      ],
    },
    {
      clientId: oak!,
      subject: "Guest Wi-Fi landing page showing last year's promo",
      status: "pending",
      priority: "medium",
      channel: "facebook",
      assignee: "Aisha Rahman",
      requester: "Sofia Martins",
      email: "sofia@oakpine.example",
      agoMin: -220,
      messages: [
        { type: "channel", name: "Oak & Pine Hotels", body: "A guest posted that the Wi-Fi splash still advertises summer 2025. Can we refresh the captive portal?", channel: "facebook", agoMin: -220 },
        { type: "agent", name: "Aisha Rahman", body: "Yes — I'll update the guest portal art. Need the current brand file from marketing.", channel: "facebook", agoMin: -200 },
        { type: "system", name: "Helix", body: "Status set to Pending — waiting on client artwork.", channel: "facebook", agoMin: -199 },
      ],
    },
    {
      clientId: harbor!,
      subject: "PACS workstation frozen during afternoon clinic",
      status: "open",
      priority: "urgent",
      channel: "email",
      assignee: name,
      requester: "Dr. Elena Voss",
      email: "elena@harbormed.example",
      agoMin: -22,
      messages: [
        { type: "client", name: "Dr. Elena Voss", body: "Imaging 02 is frozen on a prior study. Reboot didn't help. Clinic is stacked until 18:00 — treat as P1. Do not remote into the modality, only the review station.", channel: "email", agoMin: -22 },
      ],
    },
    {
      clientId: bright!,
      subject: "MFA prompt loop for three Grade 11 teachers",
      status: "waiting",
      priority: "high",
      channel: "portal",
      assignee: "James Chen",
      requester: "Thabo Mokoena",
      email: "thabo@brightpath.example",
      agoMin: -410,
      messages: [
        { type: "client", name: "Thabo Mokoena", body: "Ms. Dlamini, Mr. Botha and Ms. Pillay are stuck in an Authenticator loop after the weekend Conditional Access change.", channel: "portal", agoMin: -410 },
        { type: "agent", name: "James Chen", body: "The new CA policy requires compliant devices — Chromebooks aren't registering. Workaround is a named location exclusion until Friday.", channel: "portal", agoMin: -360 },
        { type: "system", name: "Helix", body: "Status set to Waiting — third party (Microsoft).", channel: "portal", agoMin: -359 },
      ],
    },
    {
      clientId: volt!,
      subject: "Store 09 POS printer skipping receipts",
      status: "open",
      priority: "medium",
      channel: "email",
      assignee: "Unassigned",
      requester: "Marcus Bell",
      email: "marcus@voltretail.example",
      agoMin: -540,
      messages: [
        { type: "client", name: "Marcus Bell", body: "Epson TM-T88 at Store 09 (Umhlanga) is dropping every third receipt. Can we swap the unit from spares?", channel: "email", agoMin: -540 },
      ],
    },
    {
      clientId: cape!,
      subject: "Change window: firewall firmware Friday 18:00",
      status: "pending",
      priority: "low",
      channel: "portal",
      assignee: "Lebo Nkosi",
      requester: "Lila Botha",
      email: "lila@capegrid.example",
      agoMin: -1200,
      messages: [
        { type: "client", name: "Lila Botha", body: "Please schedule FortiOS 7.4.5 on the edge pair this Friday 18:00–22:00. Need a rollback note.", channel: "portal", agoMin: -1200 },
        { type: "agent", name: "Lebo Nkosi", body: "Change 8841 drafted. I'll attach the rollback and send for sign-off tomorrow.", channel: "portal", agoMin: -1100 },
      ],
    },
    {
      clientId: linden!,
      subject: "New starter laptop — associate join Monday",
      status: "open",
      priority: "medium",
      channel: "web",
      assignee: "Aisha Rahman",
      requester: "James Linden",
      email: "james@lindenandco.example",
      agoMin: -80,
      messages: [
        { type: "client", name: "James Linden", body: "Nora Patel starts Monday. Need a 14\" laptop, Intune, Adobe, and access to the tax share. Desk is 4th floor, bay 12.", channel: "web", agoMin: -80 },
      ],
    },
    {
      clientId: meridian!,
      subject: "Phishing mail slipped past the gateway this morning",
      status: "resolved",
      priority: "high",
      channel: "email",
      assignee: name,
      requester: "Priya Naidoo",
      email: "priya@meridianlegal.example",
      agoMin: -1600,
      messages: [
        { type: "client", name: "Priya Naidoo", body: "A fake SharePoint invoice reached two partners. One clicked. Password rotated already.", channel: "email", agoMin: -1600 },
        { type: "agent", name, body: "Isolated the mailbox and pushed a tenant-wide block. No token grants on the clicked account. Marking resolved.", channel: "email", agoMin: -1500 },
        { type: "system", name: "Helix", body: "Ticket resolved.", channel: "email", agoMin: -1499 },
      ],
    },
    {
      clientId: kestrel!,
      subject: "Request: extra DHCP scope for overflow yard",
      status: "closed",
      priority: "low",
      channel: "portal",
      assignee: "James Chen",
      requester: "Daniel Okoye",
      email: "daniel@kestrel-log.example",
      agoMin: -4200,
      messages: [
        { type: "client", name: "Daniel Okoye", body: "We're parking 40 extra trailers this quarter. Need a /24 for the overflow yard APs.", channel: "portal", agoMin: -4200 },
        { type: "agent", name: "James Chen", body: "Scope 10.48.12.0/24 live, helper on core, documented in the network pack. Closing.", channel: "portal", agoMin: -4000 },
      ],
    },
    {
      clientId: bright!,
      subject: "Printer queue jammed in the staff room",
      status: "pending",
      priority: "low",
      channel: "whatsapp",
      assignee: "Unassigned",
      requester: "Thabo Mokoena",
      email: "thabo@brightpath.example",
      agoMin: -70,
      messages: [
        { type: "channel", name: "Thabo Mokoena", body: "Staff room HP is spitting blank pages. Kids' reports due Friday.", channel: "whatsapp", agoMin: -70 },
      ],
    },
    {
      clientId: oak!,
      subject: "PMS slow after night audit",
      status: "open",
      priority: "high",
      channel: "facebook",
      assignee: name,
      requester: "Sofia Martins",
      email: "sofia@oakpine.example",
      agoMin: -12,
      messages: [
        { type: "channel", name: "Oak & Pine Hotels", body: "Front desk says Opera is crawling after the night audit. Check-outs start in 40 minutes.", channel: "facebook", agoMin: -12 },
      ],
    },
    {
      clientId: volt!,
      subject: "Need a quote for SD-WAN at four coastal stores",
      status: "open",
      priority: "low",
      channel: "email",
      assignee: "Unassigned",
      requester: "Marcus Bell",
      email: "marcus@voltretail.example",
      agoMin: -1800,
      messages: [
        { type: "client", name: "Marcus Bell", body: "Can you price dual-link SD-WAN (fibre + LTE) for stores 02, 05, 09 and 11?", channel: "email", agoMin: -1800 },
      ],
    },
    {
      clientId: harbor!,
      subject: "Onboarding: two locum clinicians next week",
      status: "open",
      priority: "medium",
      channel: "portal",
      assignee: "Aisha Rahman",
      requester: "Dr. Elena Voss",
      email: "elena@harbormed.example",
      agoMin: -300,
      messages: [
        { type: "client", name: "Dr. Elena Voss", body: "Locums start Wednesday. Need clinical desktops, badges, and EHR roles — no internet from those VLANs.", channel: "portal", agoMin: -300 },
      ],
    },
  ];

  for (const t of tickets) {
    const number = await nextTicketNumber(sql, userId);
    const hours = slaHours(t.priority);
    const lastAgo = t.messages[t.messages.length - 1]?.agoMin ?? t.agoMin;
    const created = await sql<{ id: number }>`
      insert into tickets (
        user_id, client_id, number, subject, status, priority, channel, assignee,
        requester_name, requester_email, sla_due_at, first_response_at, created_at, updated_at
      )
      values (
        ${userId}, ${t.clientId}, ${number}, ${t.subject}, ${t.status}, ${t.priority}, ${t.channel},
        ${t.assignee}, ${t.requester}, ${t.email},
        now() + ${`${t.agoMin} minutes`}::interval + ${`${hours} hours`}::interval,
        null,
        now() + ${`${t.agoMin} minutes`}::interval,
        now() + ${`${lastAgo} minutes`}::interval
      )
      returning id
    `;
    const ticketId = created[0]!.id;
    if (t.messages.some((m) => m.type === "agent")) {
      await sql`update tickets set first_response_at = created_at + interval '8 minutes' where id = ${ticketId} and user_id = ${userId}`;
    }
    for (const m of t.messages) {
      await sql`
        insert into ticket_messages (user_id, ticket_id, author_type, author_name, body, is_internal, channel, created_at)
        values (
          ${userId}, ${ticketId}, ${m.type}, ${m.name}, ${m.body}, false, ${m.channel},
          now() + ${`${m.agoMin} minutes`}::interval
        )
      `;
    }
  }

  const articles = [
    { title: "Connect to the company VPN", category: "Access", excerpt: "Install the client, sign in with your work account, and enable always-on.", body: "Download the FortiClient from the company portal. Sign in with your work email. Toggle Always-On. If the tunnel drops, forget the Wi-Fi network, reconnect, and retry. Still stuck? Open a ticket with your public IP and the exact error string." },
    { title: "Reset Microsoft 365 multifactor authentication", category: "Identity", excerpt: "How to re-register Authenticator if you have a new phone.", body: "From another signed-in device visit aka.ms/mfasetup. Remove the old method, add Authenticator, and scan the QR. If you have no other device, your IT desk must clear the registration — submit a ticket, do not share one-time codes in chat." },
    { title: "Report a suspicious email", category: "Security", excerpt: "Use Report Message. Never forward the mail to a colleague.", body: "In Outlook, select the message → Report → Report phishing. Do not click links or open invoices you did not expect. If you already clicked, change your password from a different device and open an urgent ticket." },
    { title: "Guest Wi-Fi for visitors", category: "Network", excerpt: "Visitors use the guest SSID. Staff should stay on the corporate network.", body: "SSID: Guest. Password rotates weekly and is printed at reception. Staff devices must not join Guest — it has no printers, shares, or line-of-business apps." },
    { title: "Request a new starter device", category: "Hardware", excerpt: "Five working days’ notice. Include role, site, and software.", body: "Open a portal ticket with start date, role, desk location, and required apps. Standard kit is a 14\" laptop, headset, and badge. Non-standard hardware needs manager approval on the ticket." },
    { title: "Printers and follow-me printing", category: "Hardware", excerpt: "Print to Follow-Me, badge in at any device.", body: "Install the Follow-Me queue from the portal. Badge at the device to release. Jams and toner are facilities unless the queue itself is missing — then open a ticket." },
  ];
  for (const a of articles) {
    await sql`
      insert into kb_articles (user_id, title, category, excerpt, body, published)
      values (${userId}, ${a.title}, ${a.category}, ${a.excerpt}, ${a.body}, true)
    `;
  }

  const handleEmail = "support@" + company.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".example";
  const chans = [
    { kind: "whatsapp", handle: "+27 60 555 0199" },
    { kind: "facebook", handle: "Helix Desk" },
    { kind: "email", handle: handleEmail },
    { kind: "web", handle: "Widget on helix.app" },
    { kind: "portal", handle: "Client portal" },
  ];
  for (const ch of chans) {
    const token = `${ch.kind}-${userId.slice(0, 8)}-${Math.random().toString(36).slice(2, 10)}`;
    await sql`
      insert into channels (user_id, kind, status, handle, verify_token)
      values (${userId}, ${ch.kind}, 'connected', ${ch.handle}, ${token})
      on conflict (user_id, kind) do nothing
    `;
  }
}
