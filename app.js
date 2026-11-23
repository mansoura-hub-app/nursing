(function () {
  const C = window.APP_CONFIG;
  const DEMO = !C.SUPABASE_URL || !C.SUPABASE_ANON_KEY || new URLSearchParams(location.search).has("demo");
  const $app = document.getElementById("app");
  document.title = C.APP_NAME;
  const THEME = new URLSearchParams(location.search).get("theme") || C.THEME || "clinic";
  document.documentElement.dataset.theme = THEME;
  const S = (d) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const ICONS = {
    tasks: S('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/>'),
    book: S('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19V5.5"/>'),
    chart: S('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    users: S('<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 14.8c1.9.6 3 2.2 3 4.7"/>'),
    user: S('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>'),
  };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toast = (m) => { const t = document.getElementById("toast"); t.textContent = m; t.className = "show"; setTimeout(() => (t.className = ""), 2200); };
  const emailOf = (phone) => phone.replace(/\D/g, "") + "@hub-students.app";
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("ar-EG", { day: "numeric", month: "long" }) : "");

  // ---------- data layer ----------
  let db;
  if (!DEMO) {
    const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
    const must = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };
    db = {
      async me() {
        const { data } = await sb.auth.getSession();
        if (!data.session) return null;
        const p = await sb.from("profiles").select("*").eq("id", data.session.user.id).single();
        return p.data || null;
      },
      async signUp(name, phone, pw) {
        const r = await sb.auth.signUp({ email: emailOf(phone), password: pw, options: { data: { name, phone } } });
        if (r.error) throw new Error(r.error.message);
        if (!r.data.session) { const s = await sb.auth.signInWithPassword({ email: emailOf(phone), password: pw }); if (s.error) throw new Error(s.error.message); }
      },
      async signIn(phone, pw) { const r = await sb.auth.signInWithPassword({ email: emailOf(phone), password: pw }); if (r.error) throw new Error("الرقم أو كلمة السر غلط"); },
      signOut: () => sb.auth.signOut(),
      async materials() { return must(await sb.from("materials").select("*").order("created_at", { ascending: false })); },
      async addMaterial(m, file, uid) {
        let url = m.url || null;
        if (file) {
          const ext = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "");
          const path = crypto.randomUUID() + "." + ext;
          const up = await sb.storage.from("materials").upload(path, file, { contentType: file.type || undefined });
          if (up.error) throw new Error(up.error.message);
          url = sb.storage.from("materials").getPublicUrl(path).data.publicUrl;
        }
        must(await sb.from("materials").insert({ title: m.title, course: m.course, url, created_by: uid }));
      },
      async delMaterial(id) { must(await sb.from("materials").delete().eq("id", id)); },
      async tasks() { return must(await sb.from("tasks").select("*").order("due_at", { ascending: true, nullsFirst: false })); },
      async addTask(t, uid) { must(await sb.from("tasks").insert({ ...t, created_by: uid })); },
      async delTask(id) { must(await sb.from("tasks").delete().eq("id", id)); },
      async completions() { return must(await sb.from("completions").select("*")); },
      async setDone(taskId, uid, done) {
        if (done) must(await sb.from("completions").insert({ task_id: taskId, user_id: uid }));
        else must(await sb.from("completions").delete().eq("task_id", taskId).eq("user_id", uid));
      },
      async profiles() { return must(await sb.from("profiles").select("*").order("name")); },
      async setRole(id, role) { must(await sb.from("profiles").update({ role }).eq("id", id)); },
    };
  } else {
    // وضع تجريبي: بيانات على الجهاز بس، لمعاينة الشكل
    const K = "hub-demo-v1";
    const iso = (n) => new Date(Date.now() + n * 864e5).toISOString();
    const seed = {
      cur: null,
      profiles: [
        { id: "a", name: "حازم (مدير)", phone: "01000000000", role: "admin" },
        { id: "b", name: "أحمد علي", phone: "01111111111", role: "student" },
        { id: "c", name: "منى محمود", phone: "01222222222", role: "student" },
        { id: "d", name: "يوسف سامي", phone: "01555555555", role: "comanager" },
        { id: "e", name: "سارة خالد", phone: "01012345678", role: "student" },
      ],
      materials: [
        { id: 1, title: "محاضرة 1: مقدمة في التشريح", course: "تشريح", url: "#", created_at: iso(-3) },
        { id: 2, title: "ملخص الفصل الثاني", course: "فسيولوجي", url: "#", created_at: iso(-1) },
      ],
      tasks: [
        { id: 1, title: "تسليم تكليف الفسيولوجي", details: "ورقة من صفحتين، تتسلم للمعيد", course: "فسيولوجي", due_at: iso(2) },
        { id: 2, title: "كويز التشريح", details: "المحاضرات من 1 لـ 3", course: "تشريح", due_at: iso(5) },
        { id: 3, title: "سكشن الكيمياء الحيوية", details: "", course: "كيمياء", due_at: iso(-1) },
      ],
      completions: [
        { task_id: 1, user_id: "b" }, { task_id: 1, user_id: "c" }, { task_id: 2, user_id: "b" }, { task_id: 3, user_id: "c" }, { task_id: 3, user_id: "e" }, { task_id: 3, user_id: "b" },
      ],
    };
    let S = JSON.parse(localStorage.getItem(K) || "null") || seed;
    const save = () => localStorage.setItem(K, JSON.stringify(S));
    const nid = (a) => Math.max(0, ...a.map((x) => x.id)) + 1;
    db = {
      async me() { return S.profiles.find((p) => p.id === S.cur) || null; },
      async signUp(name, phone) { const p = { id: crypto.randomUUID(), name, phone, role: "student" }; S.profiles.push(p); S.cur = p.id; save(); },
      async signIn(phone) { const p = S.profiles.find((x) => x.phone === phone); if (!p) throw new Error("الرقم أو كلمة السر غلط"); S.cur = p.id; save(); },
      async signOut() { S.cur = null; save(); },
      async materials() { return [...S.materials].reverse(); },
      async addMaterial(m, file) { S.materials.push({ id: nid(S.materials), ...m, url: m.url || "#", title: m.title + (file ? " (" + file.name + ")" : ""), created_at: iso(0) }); save(); },
      async delMaterial(id) { S.materials = S.materials.filter((x) => x.id !== id); save(); },
      async tasks() { return [...S.tasks].sort((a, b) => new Date(a.due_at) - new Date(b.due_at)); },
      async addTask(t) { S.tasks.push({ id: nid(S.tasks), ...t }); save(); },
      async delTask(id) { S.tasks = S.tasks.filter((x) => x.id !== id); S.completions = S.completions.filter((c) => c.task_id !== id); save(); },
      async completions() { return S.completions; },
      async setDone(t, u, d) { S.completions = S.completions.filter((c) => !(c.task_id === t && c.user_id === u)); if (d) S.completions.push({ task_id: t, user_id: u }); save(); },
      async profiles() { return S.profiles; },
      async setRole(id, role) { S.profiles.find((p) => p.id === id).role = role; save(); },
    };
    window.__demoLogin = async (id) => { S.cur = id; save(); await boot(); };
  }

  // ---------- UI ----------
  let me = null, tab = "tasks", cache = {};
  const isStaff = () => me && (me.role === "admin" || me.role === "comanager");
  const roleName = { admin: "مدير", comanager: "مساعد المدير", student: "طالب" };

  async function boot() {
    try { me = await db.me(); } catch (e) { me = null; }
    render();
  }

  function renderAuth(mode) {
    $app.innerHTML = `<div class="auth"><h1>${esc(C.APP_NAME)}</h1>
      ${DEMO ? '<div class="card mut">نسخة تجريبية للمعاينة: البيانات على موبايلك بس. دخّل أي رقم من الأرقام الموجودة أو سجّل جديد.</div>' : ""}
      <div class="tabs"><button class="${mode === "in" ? "" : "sec"}" id="t-in">دخول</button><button class="${mode === "up" ? "" : "sec"}" id="t-up">حساب جديد</button></div>
      <form id="f">
        ${mode === "up" ? '<label>الاسم</label><input name="name" required autocomplete="name">' : ""}
        <label>رقم الموبايل</label><input name="phone" required inputmode="numeric" autocomplete="tel" placeholder="01xxxxxxxxx">
        <label>كلمة السر (٦ حروف أو أرقام على الأقل)</label><input name="pw" type="password" required minlength="6" autocomplete="${mode === "up" ? "new-password" : "current-password"}">
        <button class="full" type="submit">${mode === "up" ? "إنشاء الحساب" : "دخول"}</button>
      </form></div>`;
    document.getElementById("t-in").onclick = () => renderAuth("in");
    document.getElementById("t-up").onclick = () => renderAuth("up");
    document.getElementById("f").onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const phone = String(f.get("phone")).trim();
      try {
        if (mode === "up") await db.signUp(String(f.get("name")).trim(), phone, String(f.get("pw")));
        else await db.signIn(phone, String(f.get("pw")));
        await boot();
      } catch (err) { toast(err.message.includes("already") ? "الرقم ده مسجل قبل كده" : err.message); }
    };
  }

  async function render() {
    if (!me) return renderAuth("in");
    const I = ICONS;
    const tabs = [["tasks", I.tasks, "المهام"], ["materials", I.book, "المواد"]];
    if (isStaff()) tabs.push(["dash", I.chart, "المتابعة"]);
    if (me.role === "admin") tabs.push(["team", I.users, "الفريق"]);
    tabs.push(["me", I.user, "حسابي"]);
    if (!tabs.some((t) => t[0] === tab)) tab = "tasks";
    $app.innerHTML = `<header><h1>${esc(C.APP_NAME)}</h1><span class="badge">${esc(roleName[me.role])}</span></header>
      <main id="main"><div class="empty">...</div></main>
      <nav><div>${tabs.map((t) => `<button data-t="${t[0]}" class="${t[0] === tab ? "on" : ""}"><span class="ic">${t[1]}</span>${t[2]}</button>`).join("")}</div></nav>`;
    $app.querySelectorAll("nav button").forEach((b) => (b.onclick = () => { tab = b.dataset.t; render(); }));
    try {
      const v = { tasks: viewTasks, materials: viewMaterials, dash: viewDash, team: viewTeam, me: viewMe }[tab];
      document.getElementById("main").innerHTML = await v();
      bind();
    } catch (e) { document.getElementById("main").innerHTML = `<div class="empty">حصلت مشكلة: ${esc(e.message)}</div>`; }
  }

  const act = {}; // data-act handlers
  function bind() {
    document.querySelectorAll("[data-act]").forEach((el) => {
      const h = act[el.dataset.act];
      if (!h) return;
      if (el.tagName === "FORM") el.onsubmit = (e) => { e.preventDefault(); h(el, el.dataset.id); };
      else el.onclick = () => h(el, el.dataset.id);
      if (el.tagName === "SELECT") { el.onclick = null; el.onchange = () => h(el, el.dataset.id); }
    });
  }
  const run = async (fn, ok) => { try { await fn(); if (ok) toast(ok); await render(); } catch (e) { toast(e.message); } };

  async function viewTasks() {
    const [tasks, comps] = await Promise.all([db.tasks(), db.completions()]);
    const mine = new Set(comps.filter((c) => c.user_id === me.id).map((c) => c.task_id));
    const done = tasks.filter((t) => mine.has(t.id)).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    let h = `<div class="card"><div class="row"><b>إنجازك</b><span>${done} من ${tasks.length}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
    if (isStaff()) h += `<details class="card"><summary>+ إضافة مهمة أو ميعاد</summary>
      <form data-act="addTask"><input name="title" placeholder="عنوان المهمة" required>
      <input name="course" placeholder="المادة"><textarea name="details" rows="2" placeholder="تفاصيل (اختياري)"></textarea>
      <label>آخر ميعاد</label><input name="due" type="date"><button class="full">نشر للطلبة</button></form></details>`;
    if (!tasks.length) return h + `<div class="empty">مفيش مهام لسه</div>`;
    h += tasks.map((t) => {
      const on = mine.has(t.id), late = t.due_at && new Date(t.due_at) < new Date() && !on;
      return `<div class="card"><div class="row"><div><h3>${esc(t.title)}</h3><div class="mut">${esc(t.course || "")}</div>
        ${t.details ? `<div class="mut">${esc(t.details)}</div>` : ""}
        ${t.due_at ? `<span class="due ${late ? "late" : ""}">${late ? "فات: " : "لحد: "}${fmtDate(t.due_at)}</span>` : ""}</div>
        <button class="chk ${on ? "on" : ""}" data-act="toggle" data-id="${t.id}" aria-label="تم">${on ? "✓" : ""}</button></div>
        ${isStaff() ? `<button class="bad" data-act="delTask" data-id="${t.id}">حذف</button>` : ""}</div>`;
    }).join("");
    return h;
  }
  act.toggle = (el, id) => run(async () => { await db.setDone(isNaN(id) ? id : Number(id), me.id, !el.classList.contains("on")); });
  act.addTask = (f) => run(async () => {
    const d = new FormData(f), due = d.get("due");
    await db.addTask({ title: d.get("title").trim(), course: d.get("course").trim(), details: d.get("details").trim(), due_at: due ? new Date(due + "T23:59:00").toISOString() : null }, me.id);
  }, "اتنشرت");
  act.delTask = (el, id) => confirm("تحذف المهمة؟") && run(() => db.delTask(isNaN(id) ? id : Number(id)));

  async function viewMaterials() {
    const list = await db.materials();
    let h = "";
    if (isStaff()) h += `<details class="card"><summary>+ رفع ملف أو لينك</summary>
      <form data-act="addMat"><input name="title" placeholder="اسم الملف (مثلا: محاضرة 3)" required><input name="course" placeholder="المادة">
      <label>اختار ملف (PDF أو صورة، لحد 50 ميجا)</label><input name="file" type="file">
      <label>أو حط لينك بدل الملف</label><input name="url" type="url" placeholder="https://">
      <button class="full">رفع</button></form></details>`;
    if (!list.length) return h + `<div class="empty">مفيش ملفات لسه</div>`;
    const by = {};
    list.forEach((m) => (by[m.course || "عام"] = by[m.course || "عام"] || []).push(m));
    Object.keys(by).forEach((c) => {
      h += `<h3 style="margin:16px 0 8px">${esc(c)}</h3>` + by[c].map((m) => `<div class="card"><div class="row"><div><b>${esc(m.title)}</b><div class="mut">${fmtDate(m.created_at)}</div></div>
        ${m.url ? `<a class="file" href="${esc(m.url)}" target="_blank" rel="noopener">فتح</a>` : ""}</div>
        ${isStaff() ? `<button class="bad" data-act="delMat" data-id="${m.id}">حذف</button>` : ""}</div>`).join("");
    });
    return h;
  }
  act.addMat = (f) => run(async () => {
    const d = new FormData(f), file = d.get("file");
    const url = String(d.get("url") || "").trim();
    if (!(file && file.size) && !url) throw new Error("اختار ملف أو حط لينك");
    if (file && file.size > 50 * 1024 * 1024) throw new Error("الملف أكبر من 50 ميجا");
    toast("جاري الرفع...");
    await db.addMaterial({ title: d.get("title").trim(), course: d.get("course").trim(), url }, file && file.size ? file : null, me.id);
  }, "اترفع");
  act.delMat = (el, id) => confirm("تحذف الملف؟") && run(() => db.delMaterial(isNaN(id) ? id : Number(id)));

  async function viewDash() {
    const [tasks, comps, profs] = await Promise.all([db.tasks(), db.completions(), db.profiles()]);
    const students = profs.filter((p) => p.role === "student");
    if (!tasks.length) return `<div class="empty">ضيف مهام الأول</div>`;
    let h = `<div class="card mut">عدد الطلبة: ${students.length}</div>`;
    h += tasks.map((t) => {
      const doneIds = new Set(comps.filter((c) => c.task_id === t.id).map((c) => c.user_id));
      const y = students.filter((s) => doneIds.has(s.id)), n = students.filter((s) => !doneIds.has(s.id));
      const pct = students.length ? Math.round((y.length / students.length) * 100) : 0;
      return `<div class="card"><div class="row"><h3>${esc(t.title)}</h3><b>${pct}%</b></div><div class="bar"><i style="width:${pct}%"></i></div>
        <details><summary>خلّصوا (${y.length})</summary>${y.map((s) => `<span class="pill y">${esc(s.name)}</span>`).join("") || '<div class="mut">لا أحد</div>'}</details>
        <details open><summary>لسه (${n.length})</summary>${n.map((s) => `<span class="pill n">${esc(s.name)}</span>`).join("") || '<div class="mut">الكل خلّص</div>'}</details></div>`;
    }).join("");
    return h;
  }

  async function viewTeam() {
    const profs = await db.profiles();
    return `<div class="card mut">كل واحد سجّل هيظهر هنا. اختار "مساعد المدير" لأي حد عايزه يضيف مهام وملفات معاك. إنت بس اللي تقدر تغيّر الأدوار.</div>` +
      profs.map((p) => `<div class="card"><div class="row"><div><b>${esc(p.name)}</b><div class="mut">${esc(p.phone || "")}</div></div>
        ${p.id === me.id ? '<span class="badge">إنت</span>' : `<select data-act="role" data-id="${esc(p.id)}" style="width:auto"><option value="student" ${p.role === "student" ? "selected" : ""}>طالب</option><option value="comanager" ${p.role === "comanager" ? "selected" : ""}>مساعد المدير</option></select>`}</div></div>`).join("");
  }
  act.role = (el, id) => run(() => db.setRole(id, el.value), "اتغيّر");

  async function viewMe() {
    return `<div class="card"><h3>${esc(me.name)}</h3><div class="mut">${esc(me.phone || "")} · ${esc(roleName[me.role])}</div></div>
      <button class="full sec" data-act="out">تسجيل خروج</button>
      ${DEMO ? `<div class="card" style="margin-top:14px"><b>معاينة الأدوار (تجريبي)</b><div class="mut">اضغط عشان تدخل كأي حساب</div>${(await db.profiles()).map((p) => `<button class="sec full" data-act="demo" data-id="${esc(p.id)}">${esc(p.name)} (${roleName[p.role]})</button>`).join("")}</div>` : ""}`;
  }
  act.out = () => run(async () => { await db.signOut(); me = null; });
  act.demo = (el, id) => window.__demoLogin(id);

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (DEMO) { const q = new URLSearchParams(location.search); if (q.get("as")) { tab = q.get("tab") || "tasks"; window.__demoLogin(q.get("as")); } else boot(); } else boot();
})();
