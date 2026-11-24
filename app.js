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
    home: S('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>'),
    cal: S('<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
    exam: S('<circle cx="12" cy="13" r="8"/><path d="M12 8.5V13l3 2M9.5 2.5h5"/>'),
    quiz: S('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>'),
    cap: S('<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5"/>'),
    ai: S('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>'),
    bell: S('<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z"/><path d="M10 21a2 2 0 0 0 4 0"/>'),
    star: S('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    cards: S('<rect x="3" y="6" width="14" height="13" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v11"/>'),
    timer: S('<circle cx="12" cy="13" r="8"/><path d="M12 9v4M9 2h6M19 5l1.5-1.5"/>'),
    back: S('<path d="M9 5l7 7-7 7"/>'),
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
      async list(t, o = {}) {
        let q = sb.from(t).select(o.sel || "*");
        if (o.eq) for (const k in o.eq) q = q.eq(k, o.eq[k]);
        if (o.order) q = q.order(o.order[0], { ascending: o.order[1] !== false });
        return must(await q.limit(o.limit || 1000));
      },
      async insert(t, row) { const d = must(await sb.from(t).insert(row).select()); return Array.isArray(d) && !Array.isArray(row) ? d[0] : d; },
      async del(t, id) { must(await sb.from(t).delete().eq("id", id)); },
      async upsert(t, rows) { must(await sb.from(t).upsert(rows)); },
      async delWhere(t, eq, col, ids) { let q = sb.from(t).delete(); for (const k in eq) q = q.eq(k, eq[k]); if (col) q = q.in(col, ids); must(await q); },
      async setProfile(id, patch) { must(await sb.from("profiles").update(patch).eq("id", id)); },
    };
    // نسخة محفوظة للقراءة بدون إنترنت (بتتمسح عند الخروج)
    ["materials", "tasks", "completions", "list"].forEach((n) => {
      const orig = db[n].bind(db);
      db[n] = async (...a) => {
        const key = "nc:" + n + JSON.stringify(a);
        try { const r = await orig(...a); try { localStorage.setItem(key, JSON.stringify(r)); } catch (e) {} return r; }
        catch (e) { const c = localStorage.getItem(key); if (c && !navigator.onLine) { window.__offline = true; return JSON.parse(c); } throw e; }
      };
    });
    const so = db.signOut; db.signOut = async () => { Object.keys(localStorage).filter((k) => k.startsWith("nc:") || k.startsWith("fav") || k.startsWith("recent")).forEach((k) => localStorage.removeItem(k)); return so(); };
  } else {
    // وضع تجريبي: بيانات على الجهاز بس، لمعاينة الشكل
    const K = "hub-demo-v4";
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
      courses: [
        { id: 1, name: "تشريح", doctor: "د. محمد", year: "الفرقة الأولى", exam_at: iso(12), exam_info: "المحاضرات 1 إلى 6 + السكاشن العملية. ركز على الجهاز العصبي." },
        { id: 2, name: "فسيولوجي", doctor: "د. هالة", exam_at: iso(20), exam_info: "الفصول 1 إلى 4 من الكتاب المقرر." },
        { id: 3, name: "كيمياء", doctor: "", exam_at: null, exam_info: "" },
      ],
      lectures: [
        { id: 1, course: "تشريح", doctor: "د. محمد", place: "قاعة 3", dow: 6, start_time: "09:00", end_time: "11:00" },
        { id: 2, course: "فسيولوجي", doctor: "د. هالة", place: "قاعة 1", dow: 0, start_time: "10:00", end_time: "12:00" },
        { id: 3, course: "كيمياء", doctor: "", place: "معمل", dow: 2, start_time: "12:00", end_time: "14:00" },
      ],
      quizzes: [{ id: 1, title: "كويز تشريح 1", course: "تشريح", created_at: iso(-2) }],
      questions: [
        { id: 1, quiz_id: 1, q: "أكبر عضو في الجسم؟", options: ["الجلد", "الكبد", "الرئة"], answer: 0 },
        { id: 2, quiz_id: 1, q: "عدد عظام الجسم عند البالغ؟", options: ["186", "206", "226"], answer: 1, explain: "الجسم البالغ فيه 206 عظمة." },
      ],
      announcements: [{ id: 1, title: "تغيير قاعة محاضرة التشريح", body: "المحاضرة القادمة في قاعة 5 بدل قاعة 3.", pinned: true, created_at: iso(-1) }],
      topics: [{ id: 1, course: "تشريح", title: "الجهاز العصبي", ord: 1 }, { id: 2, course: "تشريح", title: "الجهاز العضلي", ord: 2 }, { id: 3, course: "تشريح", title: "الهيكل العظمي", ord: 3 }],
      topic_done: [{ topic_id: 1, user_id: "b" }],
      wrong_questions: [{ user_id: "b", question_id: 2 }],
      glossary: [{ id: 1, en: "Tachycardia", ar: "سرعة ضربات القلب", course: "علامات حيوية" }, { id: 2, en: "Edema", ar: "وذمة (تورم)", course: "عام" }, { id: 3, en: "Anterior", ar: "أمامي", course: "تشريح" }],
      checklists: [{ id: 1, title: "غسل الأيدي: 5 لحظات", course: "مكافحة العدوى", steps: "قبل لمس المريض\nقبل أي إجراء نظيف أو معقم\nبعد التعرض لسوائل الجسم\nبعد لمس المريض\nبعد لمس محيط المريض", created_at: iso(-3) }],
      rotations: [{ id: 1, name: "باطنة", place: "مستشفى الجامعة", year: "", grp: "", start_date: iso(-2).slice(0, 10), end_date: iso(12).slice(0, 10), notes: "الحضور 8 صباحا" }],
      cases: [{ id: 1, title: "مريض بيشكو من ضيق تنفس (حالة افتراضية)", course: "باطنة", scenario: "مريض عنده 60 سنة، شاكي من ضيق تنفس من يومين.", questions: "إيه أول حاجة تقيّمها؟", answer: "التنفس والعلامات الحيوية وبلّغ المسؤول.", created_at: iso(-1) }],
      training_log: [{ id: 1, user_id: "b", day: iso(-1).slice(0, 10), hours: 6, dept: "باطنة", note: "" }],
      decks: [{ id: 1, title: "مصطلحات التشريح", course: "تشريح" }],
      cards: [{ id: 1, deck_id: 1, front: "Anterior", back: "أمامي" }, { id: 2, deck_id: 1, front: "Posterior", back: "خلفي" }, { id: 3, deck_id: 1, front: "Proximal", back: "قريب من الجذع" }],
      card_progress: [{ user_id: "b", card_id: 1, box: 3, due_at: iso(5) }],
      mock_results: [{ id: 1, user_id: "b", course: "تشريح", score: 7, total: 10, secs: 420, created_at: iso(-1) }],
      attempts: [{ id: 1, quiz_id: 1, user_id: "b", score: 2, total: 2, created_at: iso(-1) }, { id: 2, quiz_id: 1, user_id: "c", score: 1, total: 2, created_at: iso(-1) }],
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
      async list(t, o = {}) {
        let a = [...(S[t] || [])];
        if (["attempts", "topic_done", "wrong_questions", "card_progress", "mock_results", "training_log"].includes(t) && me && me.role === "student") a = a.filter((x) => x.user_id === me.id);
        if (o.eq) for (const k in o.eq) a = a.filter((x) => String(x[k]) === String(o.eq[k]));
        if (o.order) { const [k, asc] = o.order; a.sort((x, y) => (x[k] > y[k] ? 1 : x[k] < y[k] ? -1 : 0) * (asc === false ? -1 : 1)); }
        return a;
      },
      async insert(t, row) {
        S[t] = S[t] || [];
        const mk = (r) => ({ id: nid(S[t]), created_at: iso(0), ...r });
        if (Array.isArray(row)) { row.forEach((r) => S[t].push(mk(r))); save(); return row; }
        const r = mk(row); S[t].push(r); save(); return r;
      },
      async upsert(t, rows) { S[t] = S[t] || []; const kk = t === "card_progress" ? "card_id" : "question_id"; rows.forEach((r) => { const i = S[t].findIndex((x) => x.user_id === r.user_id && x[kk] === r[kk]); if (i >= 0) S[t][i] = r; else S[t].push(r); }); save(); },
      async delWhere(t, eq, col, ids) { S[t] = (S[t] || []).filter((x) => !(Object.keys(eq).every((k) => String(x[k]) === String(eq[k])) && (!col || ids.map(String).includes(String(x[col]))))); save(); },
      async setProfile(id, patch) { Object.assign(S.profiles.find((p) => p.id === id), patch); save(); },
      async del(t, id) { S[t] = S[t].filter((x) => String(x.id) !== String(id)); if (t === "quizzes") S.questions = S.questions.filter((q) => String(q.quiz_id) !== String(id)); save(); },
    };
    window.__demoLogin = async (id) => { S.cur = id; save(); await boot(); };
  }

  // ---------- UI ----------
  let me = null, tab = "home", cache = {};
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

  const act = {}; // data-act handlers
  const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربع", "الخميس", "الجمعة", "السبت"];
  const DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];
  let param = null, COURSES = [];
  const YEARS = ["الفرقة الأولى", "الفرقة الثانية", "الفرقة الثالثة", "الفرقة الرابعة"];
  // محتوى فرقتي بس (لو اخترت فرقتك)، والمحتوى العام بيظهر للكل
  const vis = (name) => { if (!me || !me.year || isStaff()) return true; const c = COURSES.find((x) => x.name === name); return !c || !c.year || c.year === me.year; };
  const lsj = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const go = (t, p) => { tab = t; param = p == null ? null : p; render(); window.scrollTo(0, 0); };
  const NAVT = ["home", "tasks", "materials", "dash", "me"];
  const TITLES = { gloss: "قاموس المصطلحات", skills: "قوايم المهارات", rot: "جدول التدريب", tlog: "ساعات التدريب", prep: "جهّز للتدريب", cases: "حالات تعليمية", decks: "كروت الحفظ", deck: "مراجعة", mock: "امتحان تجريبي", focus: "مؤقت التركيز", progress: "تقدمي", ann: "الإعلانات", mistakes: "بنك الأخطاء", schedule: "جدول المحاضرات", courses: "المقررات والامتحانات", course: "المقرر", quizzes: "الكويزات", quiz: "كويز", ai: "أدوات الذكاء الاصطناعي", team: "الفريق" };

  async function render() {
    if (!me) return renderAuth("in");
    const I = ICONS;
    const tabs = [["home", I.home, "الرئيسية"], ["tasks", I.tasks, "المهام"], ["materials", I.book, "المواد"]];
    if (isStaff()) tabs.push(["dash", I.chart, "المتابعة"]);
    tabs.push(["me", I.user, "حسابي"]);
    const known = ["gloss", "skills", "rot", "tlog", "prep", "cases", "decks", "deck", "mock", "focus", "progress", "mistakes", "ann", "home", "tasks", "materials", "dash", "me", "schedule", "courses", "course", "quizzes", "quiz", "ai", "team"];
    if (!known.includes(tab) || (tab === "dash" && !isStaff()) || (tab === "team" && me.role !== "admin")) tab = "home";
    const sub = !NAVT.includes(tab);
    const head = tab === "home"
      ? `<img class="logo" src="${window.APP_LOGO || ""}" alt=""><h1>${esc(C.APP_NAME)}</h1>`
      : sub ? `<button class="backb" data-go="home" aria-label="رجوع">${I.back}</button><h1>${esc(TITLES[tab] || "")}</h1>`
      : `<h1>${esc(C.APP_NAME)}</h1>`;
    $app.innerHTML = `<header>${head}<span class="badge">${esc(roleName[me.role])}</span></header>
      <main id="main"><div class="empty">...</div></main>
      <nav><div>${tabs.map((t) => `<button data-t="${t[0]}" class="${t[0] === tab || (sub && t[0] === "home") ? "on" : ""}"><span class="ic">${t[1]}</span>${t[2]}</button>`).join("")}</div></nav>`;
    $app.querySelectorAll("nav button").forEach((b) => (b.onclick = () => go(b.dataset.t)));
    $app.querySelectorAll("header [data-go]").forEach((b) => (b.onclick = () => go(b.dataset.go)));
    try {
      try { COURSES = await db.list("courses"); } catch (e) { COURSES = []; }
      const v = { gloss: viewGlossary, skills: viewChecklists, rot: viewRotations, tlog: viewTlog, prep: viewPrep, cases: viewCases, decks: viewDecks, deck: viewDeck, mock: viewMock, focus: viewFocus, progress: viewProgress, ann: viewAnn, home: viewHome, tasks: viewTasks, materials: viewMaterials, dash: viewDash, team: viewTeam, me: viewMe, schedule: viewSchedule, courses: viewCourses, course: viewCourse, quizzes: viewQuizzes, quiz: viewQuiz, mistakes: () => { param = "mistakes"; return viewQuiz(); }, ai: viewAI }[tab];
      document.getElementById("main").innerHTML = await v();
      bind();
      if (tab === "materials") bindMaterials();
      document.querySelectorAll("[data-go2]").forEach((el) => (el.onclick = () => go(el.dataset.go2, el.dataset.p)));
      tick();
      if (window.__offline) { window.__offline = false; toast("مفيش إنترنت: بتشوف آخر بيانات محفوظة"); }
    } catch (e) { document.getElementById("main").innerHTML = `<div class="empty">حصلت مشكلة: ${esc(e.message)}</div>`; }
  }

  // عدّاد تنازلي حي
  const cd = (iso) => {
    const ms = new Date(iso) - Date.now();
    if (ms <= 0) return "الامتحان بدأ أو خلص";
    const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
    return `${d} يوم ${h} ساعة ${m} دقيقة`;
  };
  let tickT;
  function tick() {
    clearInterval(tickT);
    const up = () => document.querySelectorAll("[data-cd]").forEach((el) => (el.textContent = cd(el.dataset.cd)));
    up(); tickT = setInterval(up, 30000);
  }
  const hhmm = (t) => { const [h, m] = String(t).split(":").map(Number); const p = h >= 12 ? "م" : "ص"; return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${p}`; };
  function nextLecture(ls) {
    const now = new Date();
    let best = null;
    ls.forEach((l) => {
      const [h, m] = l.start_time.split(":").map(Number);
      for (let add = 0; add < 8; add++) {
        const d = new Date(now); d.setDate(now.getDate() + add); d.setHours(h, m, 0, 0);
        if (d.getDay() === l.dow && d > now) { if (!best || d < best.at) best = { l, at: d }; break; }
      }
    });
    return best;
  }
  const untilTxt = (d) => {
    const mins = Math.round((d - Date.now()) / 6e4);
    if (mins < 60) return `بعد ${mins} دقيقة`;
    if (mins < 1440) return `بعد ${Math.floor(mins / 60)} ساعة`;
    return `بعد ${Math.floor(mins / 1440)} يوم`;
  };

  async function viewHome() {
    let [tasks, comps, courses, lects, atts, anns] = await Promise.all([db.tasks(), db.completions(), db.list("courses"), db.list("lectures"), db.list("attempts", { eq: { user_id: me.id } }), db.list("announcements", { order: ["created_at", false], limit: 20 })]);
    tasks = tasks.filter((t) => vis(t.course)); courses = courses.filter((c) => vis(c.name)); lects = lects.filter((l) => vis(l.course));
    const mine = new Set(comps.filter((c) => c.user_id === me.id).map((c) => c.task_id));
    const done = tasks.filter((t) => mine.has(t.id)).length;
    const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    const alerts = [];
    const now = Date.now();
    tasks.filter((t) => !mine.has(t.id) && t.due_at).forEach((t) => {
      const ms = new Date(t.due_at) - now;
      if (ms < 0) alerts.push(["bad", `فات ميعاد: ${t.title}`, "tasks"]);
      else if (ms < 2 * 864e5) alerts.push(["warn", `ميعاد قريب: ${t.title} (${fmtDate(t.due_at)})`, "tasks"]);
    });
    courses.filter((c) => c.exam_at && new Date(c.exam_at) > now && new Date(c.exam_at) - now < 14 * 864e5).sort((a, b) => new Date(a.exam_at) - new Date(b.exam_at))
      .forEach((c) => alerts.push(["warn", `امتحان ${c.name} ${untilTxt(new Date(c.exam_at))}`, "courses"]));
    const nl = nextLecture(lects);
    const exams = courses.filter((c) => c.exam_at && new Date(c.exam_at) > now).sort((a, b) => new Date(a.exam_at) - new Date(b.exam_at));
    const ex = exams[0];
    const ini = (me.name || "?").trim().charAt(0);
    const boxes = [["ann", ICONS.bell, "الإعلانات"], ["tasks", ICONS.tasks, "المهام"], ["materials", ICONS.book, "المواد"], ["schedule", ICONS.cal, "جدول المحاضرات"], ["courses", ICONS.exam, "الامتحانات والمقررات"], ["quizzes", ICONS.quiz, "الكويزات"], ["mistakes", ICONS.cap, "بنك الأخطاء"], ["decks", ICONS.cards, "كروت الحفظ"], ["mock", ICONS.exam, "امتحان تجريبي"], ["focus", ICONS.timer, "مؤقت التركيز"], ["progress", ICONS.chart, "تقدمي"], ["gloss", ICONS.book, "قاموس المصطلحات"], ["skills", ICONS.tasks, "قوايم المهارات"], ["rot", ICONS.cal, "جدول التدريب"], ["tlog", ICONS.timer, "ساعات التدريب"], ["prep", ICONS.cap, "جهّز للتدريب"], ["cases", ICONS.quiz, "حالات تعليمية"], ["ai", ICONS.ai, "الذكاء الاصطناعي", "قريبًا"]];
    if (isStaff()) boxes.push(["dash", ICONS.chart, "المتابعة"]);
    if (me.role === "admin") boxes.push(["team", ICONS.users, "الفريق"]);
    return `<div class="card prof"><div class="avatar">${esc(ini)}</div><div style="flex:1;min-width:0"><h3>${esc(me.name)}</h3>
      <div class="mut">${esc(me.phone || "")} · ${esc(roleName[me.role])}</div>
      <div class="row mut" style="margin-top:6px"><span>إنجاز المهام</span><b>${done}/${tasks.length}</b></div><div class="bar"><i style="width:${pct}%"></i></div>
      <div class="mut">كويزات خلصتها: ${new Set(atts.map((a) => a.quiz_id)).size}</div></div></div>
      ${nl ? `<div class="card next" data-go2="schedule"><span class="ic">${ICONS.cal}</span><div><div class="mut">المحاضرة الجاية</div><b>${esc(nl.l.course)}</b> · ${DAYS[nl.l.dow]} ${hhmm(nl.l.start_time)}${nl.l.place ? " · " + esc(nl.l.place) : ""}<div class="due">${untilTxt(nl.at)}</div></div></div>` : ""}
      ${ex ? `<div class="card next" data-go2="course" data-p="${ex.id}"><span class="ic">${ICONS.exam}</span><div><div class="mut">أقرب امتحان: ${esc(ex.name)}</div><b data-cd="${ex.exam_at}"></b></div></div>` : ""}
      ${(() => { const seen = Number(localStorage.getItem("annseen") || 0); const un = anns.filter((a) => new Date(a.created_at) > seen).length; const top = anns.filter((a) => a.pinned)[0] || anns[0];
        return top ? `<div class="card next" data-go2="ann"><span class="ic">${ICONS.bell}</span><div><div class="mut">إعلان${un ? ` · ${un} جديد` : ""}</div><b>${esc(top.title)}</b></div></div>` : ""; })()}
      ${(() => { const r = lsj("recent", [])[0]; return r ? `<a class="card next" href="${esc(r.url)}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit"><span class="ic">${ICONS.book}</span><div><div class="mut">كمّل من حيث وقفت</div><b>${esc(r.title)}</b></div></a>` : ""; })()}
      ${alerts.length ? `<div class="card"><b>تنبيهات</b>${alerts.slice(0, 5).map((a) => `<div class="alert ${a[0]}" data-go2="${a[2]}">${esc(a[1])}</div>`).join("")}</div>` : ""}
      <div class="grid">${boxes.map((b) => `<button class="box" data-go2="${b[0]}"><span class="ic">${b[1]}</span><span>${b[2]}</span>${b[3] ? `<small>${b[3]}</small>` : ""}</button>`).join("")}</div>`;
  }

  async function viewAnn() {
    const list = await db.list("announcements", { order: ["created_at", false], limit: 50 });
    localStorage.setItem("annseen", String(Date.now()));
    let h = "";
    if (isStaff()) h += `<details class="card"><summary>+ إعلان جديد</summary><form data-act="addAnn"><input name="title" placeholder="العنوان (مثلا: تغيير قاعة)" required>
      <textarea name="body" rows="3" placeholder="التفاصيل"></textarea><label><input type="checkbox" name="pin" style="width:auto;margin:0 0 0 6px"> تثبيت</label><button class="full">نشر</button></form></details>`;
    if (!list.length) return h + `<div class="empty">مفيش إعلانات</div>`;
    list.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    return h + list.map((a) => `<div class="card"><div class="row"><h3>${a.pinned ? "📌 " : ""}${esc(a.title)}</h3>${isStaff() ? `<button class="bad" data-act="delAnn" data-id="${a.id}">حذف</button>` : ""}</div>
      ${a.body ? `<div class="info">${esc(a.body)}</div>` : ""}<div class="mut">${fmtDate(a.created_at)}</div></div>`).join("");
  }
  act.addAnn = (f) => run(async () => { const d = new FormData(f); await db.insert("announcements", { title: d.get("title").trim(), body: d.get("body").trim() || null, pinned: !!d.get("pin"), created_by: me.id }); }, "اتنشر");
  act.delAnn = (el, id) => confirm("تحذف الإعلان؟") && run(() => db.del("announcements", id));


  // ---- كروت الحفظ (تكرار متباعد بسيط) ----
  const BOX_DAYS = [0, 1, 3, 7, 14, 30];
  let rv = null;
  async function viewDecks() {
    const [decks, cards, prog] = await Promise.all([db.list("decks"), db.list("cards", { sel: "id,deck_id" }), db.list("card_progress", { eq: { user_id: me.id } })]);
    const pm = {}; prog.forEach((p) => (pm[p.card_id] = p));
    const now = Date.now();
    let h = "";
    if (isStaff()) h += `<details class="card"><summary>+ مجموعة كروت جديدة</summary><form data-act="addDeck"><input name="title" placeholder="اسم المجموعة (مثلا: مصطلحات)" required>
      <input name="course" list="dcl" placeholder="المادة"><datalist id="dcl">${COURSES.map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist>
      <textarea name="body" rows="7" placeholder="كارت في كل سطر: السؤال | الإجابة&#10;Anterior | أمامي&#10;Posterior | خلفي"></textarea><button class="full">حفظ</button></form></details>`;
    const vd = decks.filter((d) => vis(d.course));
    if (!vd.length) return h + `<div class="empty">مفيش كروت لسه</div>`;
    return h + vd.map((d) => {
      const cs = cards.filter((c) => String(c.deck_id) === String(d.id));
      const due = cs.filter((c) => !pm[c.id] || new Date(pm[c.id].due_at) <= now).length;
      const known = cs.filter((c) => pm[c.id] && pm[c.id].box >= 3).length;
      return `<div class="card clk" data-go2="deck" data-p="${d.id}"><div class="row"><div><h3>${esc(d.title)}</h3><div class="mut">${esc(d.course || "")} · ${cs.length} كارت · حفظت ${known}</div></div>
        <span class="pill ${due ? "n" : "y"}">${due ? "للمراجعة " + due : "خلصت ✓"}</span></div></div>`;
    }).join("");
  }
  act.addDeck = (f) => run(async () => {
    const d = new FormData(f);
    const rows = String(d.get("body")).split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((a) => a.length >= 2 && a[0] && a[1]);
    if (!rows.length) throw new Error("اكتب كارت في كل سطر: السؤال | الإجابة");
    const deck = await db.insert("decks", { title: d.get("title").trim(), course: d.get("course").trim() || null, created_by: me.id });
    await db.insert("cards", rows.map((a) => ({ deck_id: deck.id, front: a[0], back: a.slice(1).join(" | ") })));
  }, "اتحفظت");
  async function viewDeck() {
    if (!rv || String(rv.id) !== String(param)) {
      const [cards, prog] = await Promise.all([db.list("cards", { eq: { deck_id: param } }), db.list("card_progress", { eq: { user_id: me.id } })]);
      const pm = {}; prog.forEach((p) => (pm[p.card_id] = p));
      const q = cards.filter((c) => !pm[c.id] || new Date(pm[c.id].due_at) <= Date.now()).map((c) => ({ ...c, box: pm[c.id] ? pm[c.id].box : 0 }));
      rv = { id: param, q, i: 0, shown: false, knew: 0, total: q.length };
    }
    if (!rv.q.length || rv.i >= rv.q.length) {
      const t = rv.total, k = rv.knew; rv = null;
      return `<div class="card" style="text-align:center"><div class="bigic">${ICONS.cap}</div><h3>${t ? "خلصت المراجعة" : "مفيش كروت للمراجعة دلوقتي"}</h3>${t ? `<div class="mut">عرفت ${k} من ${t}</div>` : '<div class="mut">ارجع بعدين، الكروت بتظهر تاني في ميعادها.</div>'}</div><button class="full" data-go2="decks">رجوع للمجموعات</button>`;
    }
    const c = rv.q[rv.i];
    return `<div class="mut" style="text-align:center">${rv.i + 1} / ${rv.q.length}</div><div class="card fc" style="text-align:center;min-height:180px;display:flex;flex-direction:column;justify-content:center">
      <h2 style="margin:0">${esc(c.front)}</h2>${rv.shown ? `<div class="fcb">${esc(c.back)}</div>` : ""}</div>
      ${rv.shown ? `<div class="row"><button class="full sec" data-act="fcAns" data-id="0">نسيتها</button><button class="full" data-act="fcAns" data-id="1">عرفتها</button></div>` : `<button class="full" data-act="fcShow">اعرض الإجابة</button>`}`;
  }
  act.fcShow = () => { rv.shown = true; render(); };
  act.fcAns = (el, v) => run(async () => {
    const c = rv.q[rv.i], knew = v === "1";
    const box = knew ? Math.min(5, c.box + 1) : 0;
    await db.upsert("card_progress", [{ user_id: me.id, card_id: c.id, box, due_at: new Date(Date.now() + (knew ? BOX_DAYS[box] : 0) * 864e5).toISOString() }]);
    if (knew) rv.knew++; else rv.q.push({ ...c, box: 0 });
    rv.i++; rv.shown = false;
  });

  // ---- امتحان تجريبي بوقت ----
  let mk = null, mkT = null;
  async function viewMock() {
    if (mk && mk.done) {
      const r = mk; mk = null;
      return `<div class="card" style="text-align:center"><h3>النتيجة</h3><div class="bigcd">${r.score} / ${r.qs.length}</div><div class="mut">${Math.round((r.score / r.qs.length) * 100)}% · ${Math.floor(r.secs / 60)} دقيقة</div></div>` +
        r.qs.map((q, i) => `<div class="card"><b>${i + 1}. ${esc(q.q)}</b>${q.options.map((o, j) => `<div class="opt ${j === q.answer ? "right" : r.picks[i] === j ? "wrong" : ""}">${esc(o)}${j === q.answer ? " ✓" : r.picks[i] === j ? " ✗" : ""}</div>`).join("")}${q.explain ? `<div class="expl">${esc(q.explain)}</div>` : ""}</div>`).join("") +
        `<div class="mut" style="margin:8px 2px">أسئلة تدريب غير رسمية، مش بديل لامتحان الكلية. الأسئلة اللي غلطت فيها اتحفظت في بنك الأخطاء.</div><button class="full" data-go2="mock">امتحان تاني</button>`;
    }
    if (mk) {
      const left = Math.max(0, Math.round((mk.end - Date.now()) / 1000));
      return `<div class="card row" style="position:sticky;top:64px;z-index:3"><b>الوقت المتبقي</b><b class="bigcd" id="mkt">${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}</b></div>
        <form data-act="mockSubmit">${mk.qs.map((q, i) => `<div class="card"><b>${i + 1}. ${esc(q.q)}</b>${q.options.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}"> ${esc(o)}</label>`).join("")}</div>`).join("")}<button class="full">تسليم</button></form>`;
    }
    const [res, qz] = await Promise.all([db.list("mock_results", { eq: { user_id: me.id }, order: ["created_at", false], limit: 5 }), db.list("quizzes")]);
    const courses = [...new Set(qz.map((q) => q.course).filter(Boolean))].filter(vis);
    return `<form class="card" data-act="mockStart"><b>ابدأ امتحان تجريبي</b><label>المادة</label><select name="course"><option value="">كل المواد</option>${courses.map((c) => `<option>${esc(c)}</option>`).join("")}</select>
      <label>عدد الأسئلة</label><select name="n"><option>5</option><option selected>10</option><option>20</option><option>30</option></select>
      <label>الوقت بالدقايق</label><input name="min" type="number" min="1" max="120" value="10"><button class="full">ابدأ</button></form>
      ${res.length ? `<div class="card"><b>آخر محاولاتك</b>${res.map((r) => `<div class="row li"><span>${esc(r.course || "كل المواد")}</span><span>${r.score}/${r.total} · ${fmtDate(r.created_at)}</span></div>`).join("")}</div>` : ""}`;
  }
  act.mockStart = (f) => run(async () => {
    const d = new FormData(f), course = d.get("course"), n = Number(d.get("n")), min = Number(d.get("min")) || 10;
    const qz = (await db.list("quizzes")).filter((q) => (!course || q.course === course) && vis(q.course));
    const ids = new Set(qz.map((q) => String(q.id)));
    let qs = (await db.list("questions")).filter((q) => ids.has(String(q.quiz_id)));
    if (!qs.length) throw new Error("مفيش أسئلة كفاية للمادة دي");
    qs = qs.map((q) => [Math.random(), q]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
    mk = { qs, start: Date.now(), end: Date.now() + min * 60000, course: course || null };
    clearInterval(mkT);
    mkT = setInterval(() => { const el = document.getElementById("mkt"); if (!mk || mk.done || tab !== "mock") { clearInterval(mkT); return; } const l = Math.max(0, Math.round((mk.end - Date.now()) / 1000)); if (el) el.textContent = String(Math.floor(l / 60)).padStart(2, "0") + ":" + String(l % 60).padStart(2, "0"); if (l <= 0) { clearInterval(mkT); const fm = document.querySelector("form[data-act=mockSubmit]"); if (fm) fm.requestSubmit(); } }, 1000);
  });
  act.mockSubmit = (f) => run(async () => {
    clearInterval(mkT);
    const d = new FormData(f), qs = mk.qs;
    const picks = qs.map((q, i) => (d.get("q" + i) == null ? -1 : Number(d.get("q" + i))));
    const score = qs.filter((q, i) => q.answer === picks[i]).length;
    const secs = Math.round((Date.now() - mk.start) / 1000);
    await db.insert("mock_results", { user_id: me.id, course: mk.course, score, total: qs.length, secs });
    const bad = qs.filter((q, i) => q.answer !== picks[i]).map((q) => ({ user_id: me.id, question_id: q.id }));
    if (bad.length) await db.upsert("wrong_questions", bad);
    const good = qs.filter((q, i) => q.answer === picks[i]).map((q) => q.id);
    if (good.length) await db.delWhere("wrong_questions", { user_id: me.id }, "question_id", good);
    mk = { done: true, score, qs, picks, secs };
  });

  // ---- مؤقت التركيز (بيشتغل والتطبيق مفتوح بس) ----
  let fz = null, fzT = null;
  const fzLog = () => lsj("focuslog", {});
  const todayKey = () => new Date().toISOString().slice(0, 10);
  async function viewFocus() {
    const lg = fzLog(), mins = lg[todayKey()] || 0;
    const week = Object.keys(lg).filter((k) => Date.now() - new Date(k) < 7 * 864e5).reduce((a, k) => a + lg[k], 0);
    return `<div class="card" style="text-align:center"><div class="bigcd" id="fzt">${fz ? "" : "25:00"}</div><div class="mut" id="fzl">${fz ? "" : "جلسة مذاكرة 25 دقيقة ثم راحة 5"}</div>
      <div class="row" style="margin-top:10px"><button class="full" data-act="fzStart" data-id="25">مذاكرة 25</button><button class="full sec" data-act="fzStart" data-id="5">راحة 5</button></div>
      <button class="full sec" data-act="fzStop">إيقاف</button><div class="mut" style="margin-top:8px">المؤقت بيشتغل والتطبيق مفتوح بس. لو قفلته مش هيرن. للتنبيه وهو مقفول استخدم منبه الموبايل.</div></div>
      <div class="card"><div class="row"><span>مذاكرة النهارده</span><b>${mins} دقيقة</b></div><div class="row"><span>آخر 7 أيام</span><b>${week} دقيقة</b></div></div>`;
  }
  const fzTick = () => {
    const t = document.getElementById("fzt"); if (!fz) return;
    const l = Math.max(0, Math.round((fz.end - Date.now()) / 1000));
    if (t) t.textContent = String(Math.floor(l / 60)).padStart(2, "0") + ":" + String(l % 60).padStart(2, "0");
    if (l <= 0) {
      clearInterval(fzT); if (fz.study) { const lg = fzLog(); lg[todayKey()] = (lg[todayKey()] || 0) + fz.min; localStorage.setItem("focuslog", JSON.stringify(lg)); }
      toast(fz.study ? "خلصت جلسة المذاكرة! خد راحة" : "الراحة خلصت"); try { navigator.vibrate && navigator.vibrate([300, 150, 300]); } catch (e) {}
      fz = null; if (tab === "focus") render();
    }
  };
  act.fzStart = (el, m) => { clearInterval(fzT); fz = { end: Date.now() + Number(m) * 60000, min: Number(m), study: m === "25" }; const l = document.getElementById("fzl"); if (l) l.textContent = fz.study ? "ركّز..." : "راحة"; fzTick(); fzT = setInterval(fzTick, 1000); };
  act.fzStop = () => { clearInterval(fzT); fz = null; render(); };

  // ---- تقدمي (خاص بالطالب) ----
  async function viewProgress() {
    const [tasks, comps, atts, topics, tdone, prog, mocks, wr, qs, quizzes] = await Promise.all([db.tasks(), db.completions(), db.list("attempts", { eq: { user_id: me.id } }), db.list("topics"), db.list("topic_done", { eq: { user_id: me.id } }), db.list("card_progress", { eq: { user_id: me.id } }), db.list("mock_results", { eq: { user_id: me.id } }), db.list("wrong_questions", { eq: { user_id: me.id } }), db.list("questions", { sel: "id,quiz_id" }), db.list("quizzes")]);
    const vt = tasks.filter((t) => vis(t.course)), mineT = new Set(comps.filter((c) => c.user_id === me.id).map((c) => c.task_id));
    const td = vt.filter((t) => mineT.has(t.id)).length;
    const avg = (a) => (a.length ? Math.round(a.reduce((s2, x) => s2 + (x.score / x.total) * 100, 0) / a.length) : null);
    const doneT = new Set(tdone.map((x) => String(x.topic_id)));
    const byC = {}; topics.filter((t) => vis(t.course)).forEach((t) => { const c = (byC[t.course] = byC[t.course] || { n: 0, d: 0 }); c.n++; if (doneT.has(String(t.id))) c.d++; });
    const q2c = {}; qs.forEach((q) => { const z = quizzes.find((x) => String(x.id) === String(q.quiz_id)); q2c[q.id] = z && z.course; });
    const weak = {}; wr.forEach((w) => { const c = q2c[w.question_id]; if (c) weak[c] = (weak[c] || 0) + 1; });
    const bar = (p) => `<div class="bar"><i style="width:${p}%"></i></div>`;
    return `<div class="card"><div class="row"><b>المهام</b><span>${td}/${vt.length}</span></div>${bar(vt.length ? Math.round((td / vt.length) * 100) : 0)}</div>
      <div class="card"><div class="row"><b>الكويزات</b><span>${atts.length ? "متوسطك " + avg(atts) + "%" : "لسه"}</span></div><div class="mut">${new Set(atts.map((a) => a.quiz_id)).size} كويز اتحل</div></div>
      <div class="card"><div class="row"><b>الامتحانات التجريبية</b><span>${mocks.length ? "متوسطك " + avg(mocks) + "%" : "لسه"}</span></div><div class="mut">${mocks.length} محاولة</div></div>
      <div class="card"><div class="row"><b>كروت الحفظ</b><span>${prog.filter((p) => p.box >= 3).length} محفوظة</span></div><div class="mut">${prog.length} كارت اتراجع</div></div>
      <div class="card"><b>خريطة المذاكرة</b>${Object.keys(byC).map((c) => `<div class="row li"><span>${esc(c)}</span><span>${byC[c].d}/${byC[c].n}</span></div>${bar(Math.round((byC[c].d / byC[c].n) * 100))}`).join("") || '<div class="mut">لسه</div>'}</div>
      <div class="card"><b>محتاج مراجعة أكتر</b>${Object.keys(weak).sort((a, b) => weak[b] - weak[a]).map((c) => `<div class="row li"><span>${esc(c)}</span><span class="pill n">${weak[c]} غلطة</span></div>`).join("") || '<div class="mut">مفيش حاجة لسه</div>'}${wr.length ? `<button class="full sec" data-go2="mistakes">راجع أخطاءك</button>` : ""}</div>
      <div class="mut" style="margin:6px 2px">التقدم ده ليك إنت بس ومحدش من زمايلك بيشوفه.</div>`;
  }


  // ---- أدوات تمريض (مرحلة 4) ----
  const NOPHI = `<div class="mut" style="margin:6px 2px">⚠️ للتدريب فقط. ممنوع كتابة أي اسم مريض أو رقم ملف أو بيانات تعرّف أي حد. اتبع دايما تعليمات الكلية والمستشفى.</div>`;
  async function viewGlossary() {
    const list = await db.list("glossary", { order: ["en", true], limit: 2000 });
    let h = `<input id="gq" placeholder="ابحث بالإنجليزي أو العربي..." style="margin-bottom:8px">`;
    if (isStaff()) h += `<details class="card"><summary>+ إضافة مصطلحات</summary><form data-act="addGl"><input name="course" placeholder="المادة (اختياري)">
      <textarea name="body" rows="6" placeholder="مصطلح في كل سطر: English | عربي&#10;Edema | وذمة"></textarea><button class="full">حفظ</button></form></details>`;
    h += `<div id="gl">` + list.map((g) => `<div class="card row li" data-s="${esc((g.en + " " + g.ar).toLowerCase())}"><div><b dir="ltr">${esc(g.en)}</b><div>${esc(g.ar)}</div>${g.course ? `<div class="mut">${esc(g.course)}</div>` : ""}</div>${isStaff() ? `<button class="bad" data-act="delGl" data-id="${g.id}">حذف</button>` : ""}</div>`).join("") + `</div>`;
    setTimeout(() => { const q = document.getElementById("gq"); if (q) q.oninput = () => { const v = q.value.trim().toLowerCase(); document.querySelectorAll("#gl [data-s]").forEach((e) => (e.style.display = e.dataset.s.includes(v) ? "" : "none")); }; }, 0);
    return h + `<div class="mut" style="margin:6px 2px">المصطلحات من إعداد الفريق وبتتراجع مع الدكتور.</div>`;
  }
  act.addGl = (f) => run(async () => {
    const d = new FormData(f);
    const rows = String(d.get("body")).split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((a) => a.length >= 2 && a[0] && a[1]);
    if (!rows.length) throw new Error("اكتب: English | عربي في كل سطر");
    await db.insert("glossary", rows.map((a) => ({ en: a[0], ar: a.slice(1).join(" | "), course: d.get("course").trim() || null, created_by: me.id })));
  }, "اتحفظت");
  act.delGl = (el, id) => confirm("تحذف المصطلح؟") && run(() => db.del("glossary", id));

  const ckKey = (id) => "ck" + id;
  async function viewChecklists() {
    const list = await db.list("checklists", { order: ["created_at", true] });
    let h = "";
    if (isStaff()) h += `<details class="card"><summary>+ قائمة مهارة جديدة</summary><form data-act="addCk"><input name="title" placeholder="اسم المهارة" required><input name="course" placeholder="المادة (اختياري)">
      <textarea name="steps" rows="8" placeholder="خطوة في كل سطر" required></textarea><button class="full">حفظ</button></form></details>`;
    h += NOPHI;
    return h + list.map((c) => {
      const st = c.steps.split("\n").map((x) => x.trim()).filter(Boolean), on = lsj(ckKey(c.id), []);
      return `<details class="card"><summary><b>${esc(c.title)}</b> <span class="mut">${on.length}/${st.length}</span></summary>
        ${st.map((s2, i) => `<label class="row li" style="gap:8px"><input type="checkbox" style="width:auto" data-act="ckTog" data-id="${c.id}:${i}" ${on.includes(i) ? "checked" : ""}><span style="flex:1">${i + 1}. ${esc(s2)}</span></label>`).join("")}
        <div class="row"><button class="full sec" data-act="ckReset" data-id="${c.id}">إعادة</button>${isStaff() ? `<button class="bad" data-act="delCk" data-id="${c.id}">حذف</button>` : ""}</div>
        <div class="mut">تقدمك في القايمة محفوظ على موبايلك بس.</div></details>`;
    }).join("") || `<div class="empty">مفيش قوايم لسه</div>`;
  }
  act.addCk = (f) => run(async () => { const d = new FormData(f); await db.insert("checklists", { title: d.get("title").trim(), course: d.get("course").trim() || null, steps: d.get("steps").trim(), created_by: me.id }); }, "اتحفظت");
  act.delCk = (el, id) => confirm("تحذف القايمة؟") && run(() => db.del("checklists", id));
  act.ckTog = (el, id) => { const [c, i] = id.split(":"), a = lsj(ckKey(c), []), n = Number(i), k = a.indexOf(n); if (k >= 0) a.splice(k, 1); else a.push(n); localStorage.setItem(ckKey(c), JSON.stringify(a)); const s2 = el.closest("details").querySelector("summary .mut"); if (s2) s2.textContent = a.length + "/" + el.closest("details").querySelectorAll("input[type=checkbox]").length; };
  act.ckReset = (el, id) => { localStorage.removeItem(ckKey(id)); render(); };

  async function viewRotations() {
    const list = await db.list("rotations", { order: ["start_date", true] });
    let h = "";
    if (isStaff()) h += `<details class="card"><summary>+ تدريب / تبديل جديد</summary><form data-act="addRo"><input name="name" placeholder="القسم (مثلا: باطنة)" required><input name="place" placeholder="المستشفى / المكان">
      <select name="year"><option value="">كل الفرق</option>${YEARS.map((y) => `<option>${y}</option>`).join("")}</select><input name="grp" placeholder="المجموعة (اختياري)">
      <label>من</label><input name="s" type="date"><label>إلى</label><input name="e" type="date"><textarea name="notes" rows="2" placeholder="ملاحظات (مواعيد الحضور، اللبس...)"></textarea><button class="full">حفظ</button></form></details>`;
    const mine = list.filter((r) => isStaff() || ((!r.year || !me.year || r.year === me.year) && (!r.grp || !me.grp || r.grp === me.grp)));
    const today = todayKey();
    return h + (mine.map((r) => { const st = r.end_date && r.end_date < today ? "خلص" : r.start_date && r.start_date > today ? "جاي" : "شغال";
      return `<div class="card"><div class="row"><h3>${esc(r.name)}</h3><span class="pill ${st === "شغال" ? "y" : "n"}">${st}</span></div>
      <div class="mut">${esc(r.place || "")}${r.year ? " · " + esc(r.year) : ""}${r.grp ? " · مجموعة " + esc(r.grp) : ""}</div>
      <div class="info">${r.start_date ? fmtDate(r.start_date) : "?"} ← ${r.end_date ? fmtDate(r.end_date) : "?"}</div>${r.notes ? `<div class="mut">${esc(r.notes)}</div>` : ""}
      ${isStaff() ? `<button class="bad" data-act="delRo" data-id="${r.id}">حذف</button>` : ""}</div>`; }).join("") || `<div class="empty">مفيش جدول تدريب لسه</div>`);
  }
  act.addRo = (f) => run(async () => { const d = new FormData(f); await db.insert("rotations", { name: d.get("name").trim(), place: d.get("place").trim() || null, year: d.get("year") || null, grp: d.get("grp").trim() || null, start_date: d.get("s") || null, end_date: d.get("e") || null, notes: d.get("notes").trim() || null, created_by: me.id }); }, "اتحفظ");
  act.delRo = (el, id) => confirm("تحذف؟") && run(() => db.del("rotations", id));

  async function viewTlog() {
    const list = await db.list("training_log", { eq: { user_id: me.id }, order: ["day", false], limit: 500 });
    const tot = list.reduce((a, x) => a + Number(x.hours), 0);
    return `<div class="card" style="text-align:center"><div class="bigcd">${tot}</div><div class="mut">ساعة تدريب مسجلة (سجلك الخاص، محدش بيشوفه)</div></div>
      <details class="card" open><summary>+ تسجيل ساعات</summary><form data-act="addTl"><label>اليوم</label><input name="day" type="date" value="${todayKey()}" required>
      <input name="hours" type="number" step="0.5" min="0.5" max="24" placeholder="عدد الساعات" required><input name="dept" maxlength="60" placeholder="القسم (مثلا: باطنة)">
      <input name="note" maxlength="80" placeholder="ملاحظة قصيرة (من غير أي بيانات مريض)"><button class="full">حفظ</button></form></details>${NOPHI}
      ${list.map((x) => `<div class="card row li"><div><b>${x.hours} ساعة</b> · ${fmtDate(x.day)}<div class="mut">${esc(x.dept || "")} ${esc(x.note || "")}</div></div><button class="bad" data-act="delTl" data-id="${x.id}">حذف</button></div>`).join("")}`;
  }
  act.addTl = (f) => run(async () => { const d = new FormData(f); await db.insert("training_log", { user_id: me.id, day: d.get("day"), hours: Number(d.get("hours")), dept: d.get("dept").trim() || null, note: d.get("note").trim() || null }); }, "اتسجلت");
  act.delTl = (el, id) => confirm("تحذف التسجيل؟") && run(() => db.del("training_log", id));

  const PREP = ["يونيفورم نضيف ومكوي حسب لوائح الكلية", "بطاقة الكلية / الهوية معاك", "سماعة طبية", "ساعة بعقرب ثواني", "قلم أزرق وأسود وأحمر + نوتة صغيرة", "كمامة وجوانتي احتياطي", "شعر متلم، أظافر قصيرة من غير طلاء، من غير إكسسوارات", "تعرف قسمك ومكان الاجتماع وميعاد الحضور", "راجعت المهارات المطلوبة (قوايم المهارات في التطبيق)", "تطعيماتك والمطلوب من الكلية جاهز", "مياه وأكل خفيف", "فلوس مواصلات وشاحن موبايل"];
  async function viewPrep() {
    const on = lsj("prep", []);
    return `<div class="card"><div class="row"><b>جهّز نفسك للتدريب</b><span class="mut">${on.length}/${PREP.length}</span></div>${PREP.map((p, i) => `<label class="row li" style="gap:8px"><input type="checkbox" style="width:auto" data-act="prepTog" data-id="${i}" ${on.includes(i) ? "checked" : ""}><span style="flex:1">${esc(p)}</span></label>`).join("")}
      <div class="mut">قايمة عامة. راجع متطلبات كليتك بالظبط. التحديد محفوظ على موبايلك.</div></div>`;
  }
  act.prepTog = (el, id) => { const a = lsj("prep", []), n = Number(id), k = a.indexOf(n); if (k >= 0) a.splice(k, 1); else a.push(n); localStorage.setItem("prep", JSON.stringify(a)); };

  async function viewCases() {
    const list = await db.list("cases", { order: ["created_at", false], limit: 200 });
    let h = "";
    if (isStaff()) h += `<details class="card"><summary>+ حالة تعليمية</summary><form data-act="addCase"><input name="title" placeholder="عنوان الحالة" required><input name="course" placeholder="المادة">
      <textarea name="scenario" rows="5" placeholder="وصف الحالة (حالة افتراضية بدون أي بيانات حقيقية)" required></textarea><textarea name="questions" rows="3" placeholder="الأسئلة (سطر لكل سؤال)"></textarea><textarea name="answer" rows="4" placeholder="الإجابة النموذجية (بتظهر بعد ما الطالب يفكر)"></textarea><button class="full">حفظ</button></form></details>`;
    h += `<div class="mut" style="margin:6px 2px">حالات افتراضية للتعلم. مش بيانات مرضى حقيقية.</div>`;
    return h + (list.filter((c) => vis(c.course)).map((c) => `<details class="card"><summary><b>${esc(c.title)}</b> <span class="mut">${esc(c.course || "")}</span></summary>
      <div class="info" style="white-space:pre-wrap">${esc(c.scenario)}</div>${c.questions ? `<div style="white-space:pre-wrap"><b>أسئلة:</b>\n${esc(c.questions)}</div>` : ""}
      ${c.answer ? `<details><summary>شوف الإجابة</summary><div class="info" style="white-space:pre-wrap">${esc(c.answer)}</div></details>` : ""}${isStaff() ? `<button class="bad" data-act="delCase" data-id="${c.id}">حذف</button>` : ""}</details>`).join("") || `<div class="empty">مفيش حالات لسه</div>`);
  }
  act.addCase = (f) => run(async () => { const d = new FormData(f); await db.insert("cases", { title: d.get("title").trim(), course: d.get("course").trim() || null, scenario: d.get("scenario").trim(), questions: d.get("questions").trim() || null, answer: d.get("answer").trim() || null, created_by: me.id }); }, "اتحفظت");
  act.delCase = (el, id) => confirm("تحذف الحالة؟") && run(() => db.del("cases", id));

  async function viewAI() {
    return `<div class="card" style="text-align:center"><div class="bigic">${ICONS.ai}</div><h3>قريبًا</h3>
      <div class="mut">تلخيص المحاضرات وعمل أسئلة منها بالذكاء الاصطناعي. بنجهزها وهتظهر هنا أول ما تجهز.</div></div>`;
  }

  // ---- المقررات والامتحانات ----
  async function viewCourses() {
    const cs = (await db.list("courses")).filter((c) => vis(c.name));
    cs.sort((a, b) => (a.exam_at ? new Date(a.exam_at) : 9e15) - (b.exam_at ? new Date(b.exam_at) : 9e15));
    let h = "";
    if (isStaff()) h += `<details class="card"><summary>+ إضافة مقرر</summary><form data-act="addCourse"><input name="name" placeholder="اسم المقرر" required>
      <select name="year"><option value="">كل الفرق</option>${YEARS.map((y) => `<option>${y}</option>`).join("")}</select><input name="doctor" placeholder="الدكتور (اختياري)"><label>ميعاد الامتحان (اختياري)</label><input name="exam" type="datetime-local">
      <textarea name="info" rows="4" placeholder="المطلوب للامتحان: المحاضرات، الفصول، ملاحظات"></textarea><button class="full">حفظ</button></form></details>`;
    if (!cs.length) return h + `<div class="empty">مفيش مقررات لسه</div>`;
    return h + cs.map((c) => `<div class="card clk" data-go2="course" data-p="${c.id}"><div class="row"><div><h3>${esc(c.name)}</h3><div class="mut">${esc(c.doctor || "")}</div></div>
      ${c.exam_at ? `<div style="text-align:left"><div class="mut">${fmtDate(c.exam_at)}</div><b class="cdv" data-cd="${c.exam_at}"></b></div>` : '<span class="mut">بدون ميعاد</span>'}</div></div>`).join("");
  }
  act.addCourse = (f) => run(async () => {
    const d = new FormData(f), ex = d.get("exam");
    await db.insert("courses", { year: d.get("year") || null, name: d.get("name").trim(), doctor: d.get("doctor").trim() || null, exam_at: ex ? new Date(ex).toISOString() : null, exam_info: d.get("info").trim() || null });
  }, "اتضاف");

  async function viewCourse() {
    const cs = await db.list("courses", { eq: { id: param } });
    const c = cs[0];
    if (!c) return `<div class="empty">المقرر مش موجود</div>`;
    const [mats, tasks, lects, quizzes, topics, tdone] = await Promise.all([db.materials(), db.tasks(), db.list("lectures"), db.list("quizzes"), db.list("topics", { eq: { course: c.name }, order: ["ord"] }), db.list("topic_done", { eq: { user_id: me.id } })]);
    const doneT = new Set(tdone.map((x) => String(x.topic_id)));
    const tdn = topics.filter((x) => doneT.has(String(x.id))).length;
    const m = mats.filter((x) => x.course === c.name), t = tasks.filter((x) => x.course === c.name), l = lects.filter((x) => x.course === c.name), q = quizzes.filter((x) => x.course === c.name);
    let h = `<div class="card"><h3>${esc(c.name)}</h3><div class="mut">${esc(c.doctor || "")}</div>
      ${c.exam_at ? `<div style="margin-top:8px"><div class="mut">الامتحان: ${fmtDate(c.exam_at)}</div><div class="bigcd" data-cd="${c.exam_at}"></div></div>` : ""}</div>`;
    h += `<div class="card"><b>المطلوب للامتحان</b><div class="info">${c.exam_info ? esc(c.exam_info) : '<span class="mut">لسه ما اتحددش</span>'}</div></div>`;
    h += `<div class="card"><div class="row"><b>خريطة المذاكرة</b><span class="mut">${tdn}/${topics.length}</span></div><div class="bar"><i style="width:${topics.length ? Math.round((tdn / topics.length) * 100) : 0}%"></i></div>
      ${topics.map((x) => `<div class="row li"><span>${esc(x.title)}</span><div class="row"><button class="chk ${doneT.has(String(x.id)) ? "on" : ""}" data-act="topic" data-id="${x.id}">${doneT.has(String(x.id)) ? "✓" : ""}</button>${isStaff() ? `<button class="bad" data-act="delTopic" data-id="${x.id}">حذف</button>` : ""}</div></div>`).join("") || '<div class="mut">لسه ما اتضافتش</div>'}
      ${isStaff() ? `<form data-act="addTopics" data-id="${esc(c.name)}"><textarea name="t" rows="3" placeholder="موضوع في كل سطر"></textarea><button class="full sec">إضافة مواضيع</button></form>` : ""}</div>`;
    h += `<div class="card"><b>الملفات (${m.length})</b>${m.map((x) => `<div class="row li"><span>${esc(x.title)}</span>${x.url ? `<a class="file" href="${esc(x.url)}" target="_blank" rel="noopener">فتح</a>` : ""}</div>`).join("") || '<div class="mut">مفيش</div>'}</div>`;
    h += `<div class="card"><b>المحاضرات</b>${l.map((x) => `<div class="li">${DAYS[x.dow]} ${hhmm(x.start_time)}${x.place ? " · " + esc(x.place) : ""}</div>`).join("") || '<div class="mut">مفيش</div>'}</div>`;
    h += `<div class="card"><b>المهام</b>${t.map((x) => `<div class="li">${esc(x.title)} ${x.due_at ? `<span class="mut">(${fmtDate(x.due_at)})</span>` : ""}</div>`).join("") || '<div class="mut">مفيش</div>'}</div>`;
    h += `<div class="card"><b>الكويزات</b>${q.map((x) => `<button class="sec full" data-go2="quiz" data-p="${x.id}">${esc(x.title)}</button>`).join("") || '<div class="mut">مفيش</div>'}</div>`;
    if (isStaff()) h += `<button class="bad" data-act="delCourse" data-id="${c.id}">حذف المقرر</button>`;
    return h;
  }
  act.topic = (el, id) => run(async () => { if (el.classList.contains("on")) await db.delWhere("topic_done", { user_id: me.id, topic_id: id }); else await db.insert("topic_done", { topic_id: Number(id), user_id: me.id }); });
  act.delTopic = (el, id) => run(() => db.del("topics", id));
  act.addTopics = (f, course) => run(async () => { const ls = String(new FormData(f).get("t")).split("\n").map((x) => x.trim()).filter(Boolean); if (!ls.length) throw new Error("اكتب موضوع"); await db.insert("topics", ls.map((t, i) => ({ course, title: t, ord: Date.now() % 1e9 + i }))); });
  act.delCourse = (el, id) => confirm("تحذف المقرر؟") && run(async () => { await db.del("courses", id); go("courses"); });

  // ---- جدول المحاضرات ----
  async function viewSchedule() {
    let [ls, cs] = await Promise.all([db.list("lectures"), db.list("courses")]);
    ls = ls.filter((l) => vis(l.course));
    let h = "";
    if (isStaff()) h += `<details class="card"><summary>+ إضافة محاضرة</summary><form data-act="addLect">
      <input name="course" list="cl" placeholder="المادة" required><datalist id="cl">${cs.map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist>
      <select name="dow">${DAY_ORDER.map((d) => `<option value="${d}">${DAYS[d]}</option>`).join("")}</select>
      <label>من</label><input name="st" type="time" required><label>إلى</label><input name="en" type="time">
      <input name="place" placeholder="المكان (قاعة / معمل)"><input name="doctor" placeholder="الدكتور"><button class="full">إضافة</button></form></details>`;
    const nl = nextLecture(ls);
    if (nl) h += `<div class="card next"><span class="ic">${ICONS.cal}</span><div><div class="mut">المحاضرة الجاية</div><b>${esc(nl.l.course)}</b> · ${untilTxt(nl.at)}</div></div>`;
    if (ls.length) h += `<button class="sec full" data-act="ics">نزّل تنبيهات المحاضرات والامتحانات في تقويم الموبايل</button><div class="mut" style="margin:6px 2px 12px">بيرن عليك قبل المحاضرة بربع ساعة حتى والتطبيق مقفول.</div>`;
    const today = new Date().getDay();
    DAY_ORDER.forEach((d) => {
      const day = ls.filter((l) => l.dow === d).sort((a, b) => a.start_time.localeCompare(b.start_time));
      if (!day.length) return;
      h += `<h3 class="dh ${d === today ? "today" : ""}">${DAYS[d]}${d === today ? " (النهارده)" : ""}</h3>` + day.map((l) => `<div class="card"><div class="row"><div><b>${esc(l.course)}</b>
        <div class="mut">${hhmm(l.start_time)}${l.end_time ? " - " + hhmm(l.end_time) : ""}${l.place ? " · " + esc(l.place) : ""}${l.doctor ? " · " + esc(l.doctor) : ""}</div></div>
        ${isStaff() ? `<button class="bad" data-act="delLect" data-id="${l.id}">حذف</button>` : ""}</div></div>`).join("");
    });
    if (!ls.length) h += `<div class="empty">مفيش محاضرات لسه</div>`;
    return h;
  }
  act.addLect = (f) => run(async () => {
    const d = new FormData(f);
    await db.insert("lectures", { course: d.get("course").trim(), dow: Number(d.get("dow")), start_time: d.get("st"), end_time: d.get("en") || null, place: d.get("place").trim() || null, doctor: d.get("doctor").trim() || null });
  }, "اتضافت");
  act.delLect = (el, id) => confirm("تحذف المحاضرة؟") && run(() => db.del("lectures", id));
  act.ics = async () => {
    const [ls, cs] = await Promise.all([db.list("lectures"), db.list("courses")]);
    const p2 = (n) => String(n).padStart(2, "0");
    const loc = (d) => `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}T${p2(d.getHours())}${p2(d.getMinutes())}00`;
    const ev = [];
    ls.forEach((l) => {
      const [h, m] = l.start_time.split(":").map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0);
      while (d.getDay() !== l.dow) d.setDate(d.getDate() + 1);
      const e = new Date(d); if (l.end_time) { const [eh, em] = l.end_time.split(":").map(Number); e.setHours(eh, em); } else e.setHours(h + 1);
      ev.push(`BEGIN:VEVENT\r\nUID:lec${l.id}@nursing\r\nDTSTAMP:${loc(new Date())}\r\nDTSTART;TZID=Africa/Cairo:${loc(d)}\r\nDTEND;TZID=Africa/Cairo:${loc(e)}\r\nRRULE:FREQ=WEEKLY\r\nSUMMARY:${l.course}\r\nLOCATION:${l.place || ""}\r\nBEGIN:VALARM\r\nTRIGGER:-PT15M\r\nACTION:DISPLAY\r\nDESCRIPTION:${l.course}\r\nEND:VALARM\r\nEND:VEVENT`);
    });
    cs.filter((c) => c.exam_at && new Date(c.exam_at) > new Date()).forEach((c) => {
      const d = new Date(c.exam_at), e = new Date(d.getTime() + 2 * 36e5);
      ev.push(`BEGIN:VEVENT\r\nUID:exam${c.id}@nursing\r\nDTSTAMP:${loc(new Date())}\r\nDTSTART;TZID=Africa/Cairo:${loc(d)}\r\nDTEND;TZID=Africa/Cairo:${loc(e)}\r\nSUMMARY:امتحان ${c.name}\r\nBEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY\r\nDESCRIPTION:امتحان ${c.name} بكرة\r\nEND:VALARM\r\nEND:VEVENT`);
    });
    const txt = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Nursing//AR\r\n${ev.join("\r\n")}\r\nEND:VCALENDAR`.replace(/\\r\\n/g, "\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([txt], { type: "text/calendar;charset=utf-8" }));
    a.download = "nursing.ics"; document.body.appendChild(a); a.click(); a.remove();
  };

  // ---- الكويزات ----
  async function viewQuizzes() {
    const [qs, atts, cs] = await Promise.all([db.list("quizzes", { order: ["created_at", false] }), db.list("attempts", { eq: { user_id: me.id } }), db.list("courses")]);
    let h = "";
    if (isStaff()) h += `<details class="card"><summary>+ كويز جديد</summary><form data-act="addQuiz">
      <input name="title" placeholder="اسم الكويز" required><input name="course" list="cl2" placeholder="المادة"><datalist id="cl2">${cs.map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist>
      <label>الأسئلة: سطر للسؤال، وكل سطر بعده اختيار، حط * قبل الإجابة الصح. سيب سطر فاضي بين كل سؤال.</label>
      <textarea name="body" rows="9" placeholder="أكبر عضو في الجسم؟&#10;*الجلد&#10;الكبد&#10;الرئة&#10;&#10;سؤال تاني؟&#10;اختيار&#10;*الصح&#10;# شرح الإجابة (اختياري)"></textarea><button class="full">نشر</button></form></details>`;
    if (!qs.length) return h + `<div class="empty">مفيش كويزات لسه</div>`;
    return h + qs.map((q) => {
      const my = atts.filter((a) => String(a.quiz_id) === String(q.id));
      const best = my.length ? Math.max(...my.map((a) => Math.round((a.score / a.total) * 100))) : null;
      return `<div class="card clk" data-go2="quiz" data-p="${q.id}"><div class="row"><div><h3>${esc(q.title)}</h3><div class="mut">${esc(q.course || "")}</div></div>
        ${best != null ? `<span class="pill y">أحسن نتيجة ${best}%</span>` : '<span class="pill n">لسه</span>'}</div></div>`;
    }).join("");
  }
  act.addQuiz = (f) => run(async () => {
    const d = new FormData(f);
    const blocks = String(d.get("body")).split(/\n\s*\n/).map((b) => b.split("\n").map((x) => x.trim()).filter(Boolean)).filter((b) => b.length);
    if (!blocks.length) throw new Error("اكتب الأسئلة");
    const qs = blocks.map((b, i) => {
      const ex = b.find((x, i) => i > 0 && x.startsWith("#"));
      const opts = b.slice(1).filter((x) => !x.startsWith("#"));
      const ans = opts.findIndex((o) => o.startsWith("*"));
      if (opts.length < 2 || ans < 0 || opts.filter((o) => o.startsWith("*")).length !== 1) throw new Error("السؤال " + (i + 1) + ": لازم اختيارين على الأقل وإجابة واحدة عليها *");
      return { q: b[0], options: opts.map((o) => o.replace(/^\*\s*/, "")), answer: ans, explain: ex ? ex.replace(/^#\s*/, "") : null };
    });
    const quiz = await db.insert("quizzes", { title: d.get("title").trim(), course: d.get("course").trim() || null, created_by: me.id });
    await db.insert("questions", qs.map((q) => ({ ...q, quiz_id: quiz.id })));
  }, "اتنشر");

  let lastRes = null;
  async function viewQuiz() {
    const MIS = param === "mistakes";
    let quiz, qs;
    if (MIS) {
      const wr = (await db.list("wrong_questions", { eq: { user_id: me.id } })).map((x) => String(x.question_id));
      qs = (await db.list("questions", { order: ["id"] })).filter((q) => wr.includes(String(q.id)));
      quiz = { id: "mistakes", title: "بنك الأخطاء", course: "الأسئلة اللي غلطت فيها قبل كده" };
      if (!qs.length) return `<div class="empty">مفيش أخطاء محفوظة. كل إجاباتك صح لحد دلوقتي 👏</div>`;
    } else {
      quiz = (await db.list("quizzes", { eq: { id: param } }))[0];
      if (!quiz) return `<div class="empty">الكويز مش موجود</div>`;
      qs = (await db.list("questions", { eq: { quiz_id: param }, order: ["id"] }));
    }
    if (lastRes && String(lastRes.quiz) === String(param)) {
      const r = lastRes;
      return `<div class="card" style="text-align:center"><h3>${esc(quiz.title)}</h3><div class="bigcd">${r.score} / ${qs.length}</div><div class="mut">${Math.round((r.score / qs.length) * 100)}%</div></div>` +
        qs.map((q, i) => `<div class="card"><b>${i + 1}. ${esc(q.q)}</b>${q.options.map((o, j) => `<div class="opt ${j === q.answer ? "right" : r.picks[i] === j ? "wrong" : ""}">${esc(o)}${j === q.answer ? " ✓" : r.picks[i] === j ? " ✗" : ""}</div>`).join("")}${q.explain ? `<div class="expl">${esc(q.explain)}</div>` : ""}</div>`).join("") +
        `<button class="full" data-act="again">حاول تاني</button>` +
        (isStaff() ? "" : "");
    }
    let h = `<div class="card"><h3>${esc(quiz.title)}</h3><div class="mut">${esc(quiz.course || "")} · ${qs.length} سؤال</div></div>`;
    if (!qs.length) return h + `<div class="empty">مفيش أسئلة</div>`;
    h += `<form data-act="submitQuiz" data-id="${quiz.id}">` + qs.map((q, i) => `<div class="card"><b>${i + 1}. ${esc(q.q)}</b>${q.options.map((o, j) => `<label class="opt"><input type="radio" name="q${i}" value="${j}" required> ${esc(o)}</label>`).join("")}</div>`).join("") + `<button class="full">تسليم</button></form>`;
    if (isStaff() && !MIS) h += `<button class="bad" data-act="delQuiz" data-id="${quiz.id}">حذف الكويز</button>`;
    return h;
  }
  act.submitQuiz = (f, id) => run(async () => {
    const MIS = id === "mistakes";
    let qs;
    if (MIS) { const wr = (await db.list("wrong_questions", { eq: { user_id: me.id } })).map((x) => String(x.question_id)); qs = (await db.list("questions", { order: ["id"] })).filter((q) => wr.includes(String(q.id))); }
    else qs = await db.list("questions", { eq: { quiz_id: id }, order: ["id"] });
    const d = new FormData(f);
    const picks = qs.map((q, i) => Number(d.get("q" + i)));
    const score = qs.filter((q, i) => q.answer === picks[i]).length;
    if (!MIS) await db.insert("attempts", { quiz_id: Number(id), user_id: me.id, score, total: qs.length });
    const bad = qs.filter((q, i) => q.answer !== picks[i]).map((q) => ({ user_id: me.id, question_id: q.id }));
    if (bad.length) await db.upsert("wrong_questions", bad);
    const good = qs.filter((q, i) => q.answer === picks[i]).map((q) => q.id);
    if (good.length) await db.delWhere("wrong_questions", { user_id: me.id }, "question_id", good);
    lastRes = { quiz: id, score, picks };
  });
  act.again = () => { lastRes = null; render(); };
  act.delQuiz = (el, id) => confirm("تحذف الكويز؟") && run(async () => { await db.del("quizzes", id); go("quizzes"); });

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
    let [tasks, comps] = await Promise.all([db.tasks(), db.completions()]);
    tasks = tasks.filter((t) => vis(t.course));
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
    const list = (await db.materials()).filter((m) => vis(m.course));
    const favs = lsj("fav", []);
    let h = "";
    if (isStaff()) h += `<details class="card"><summary>+ رفع ملف أو لينك</summary>
      <form data-act="addMat"><input name="title" placeholder="اسم الملف (مثلا: محاضرة 3)" required><input name="course" list="mcl" placeholder="المادة"><datalist id="mcl">${COURSES.map((c) => `<option value="${esc(c.name)}">`).join("")}</datalist>
      <label>اختار ملف (PDF أو صورة، لحد 50 ميجا)</label><input name="file" type="file">
      <label>أو حط لينك بدل الملف</label><input name="url" type="url" placeholder="https://">
      <button class="full">رفع</button></form></details>`;
    if (!list.length) return h + `<div class="empty">مفيش ملفات لسه</div>`;
    h += `<input id="msearch" type="search" placeholder="دوّر على ملف أو مادة..."><div class="chips"><button class="sec on" data-f="all">الكل</button><button class="sec" data-f="fav">⭐ المفضلة</button>${[...new Set(list.map((m) => m.course || "عام"))].map((c) => `<button class="sec" data-f="c:${esc(c)}">${esc(c)}</button>`).join("")}</div><div id="mlist">`;
    const by = {};
    list.forEach((m) => (by[m.course || "عام"] = by[m.course || "عام"] || []).push(m));
    Object.keys(by).forEach((c) => {
      h += `<div class="grp" data-c="${esc(c)}"><h3 style="margin:16px 0 8px">${esc(c)}</h3>` + by[c].map((m) => `<div class="card mi" data-s="${esc((m.title + " " + c).toLowerCase())}" data-fav="${favs.includes(String(m.id)) ? 1 : 0}"><div class="row"><div><b>${esc(m.title)}</b><div class="mut">${fmtDate(m.created_at)}</div></div>
        <div class="row"><button class="star ${favs.includes(String(m.id)) ? "on" : ""}" data-act="fav" data-id="${m.id}" aria-label="مفضلة">${ICONS.star}</button>
        ${m.url ? `<a class="file" data-open="${m.id}" data-t="${esc(m.title)}" href="${esc(m.url)}" target="_blank" rel="noopener">فتح</a>` : ""}</div></div>
        ${isStaff() ? `<button class="bad" data-act="delMat" data-id="${m.id}">حذف</button>` : ""}</div>`).join("") + `</div>`;
    });
    return h + `</div><div class="empty" id="mnone" hidden>مفيش نتيجة</div>`;
  }
  let mFilter = "all";
  function bindMaterials() {
    const q = document.getElementById("msearch"); if (!q) return;
    const apply = () => {
      const t = q.value.trim().toLowerCase(); let any = false;
      document.querySelectorAll(".mi").forEach((el) => {
        const g = el.closest(".grp").dataset.c;
        const ok = (!t || el.dataset.s.includes(t)) && (mFilter === "all" || (mFilter === "fav" && el.dataset.fav === "1") || mFilter === "c:" + g);
        el.hidden = !ok; if (ok) any = true;
      });
      document.querySelectorAll(".grp").forEach((g) => (g.hidden = !g.querySelector(".mi:not([hidden])")));
      document.getElementById("mnone").hidden = any;
    };
    q.oninput = apply;
    document.querySelectorAll(".chips button").forEach((b) => (b.onclick = () => { mFilter = b.dataset.f; document.querySelectorAll(".chips button").forEach((x) => x.classList.toggle("on", x === b)); apply(); }));
    document.querySelectorAll("[data-open]").forEach((a) => (a.onclick = () => { const r = lsj("recent", []).filter((x) => x.id !== a.dataset.open); r.unshift({ id: a.dataset.open, title: a.dataset.t, url: a.href }); localStorage.setItem("recent", JSON.stringify(r.slice(0, 5))); }));
    mFilter = "all";
  }
  act.fav = (el, id) => { const f = lsj("fav", []); const i = f.indexOf(String(id)); if (i >= 0) f.splice(i, 1); else f.push(String(id)); localStorage.setItem("fav", JSON.stringify(f)); el.classList.toggle("on"); el.closest(".mi").dataset.fav = i >= 0 ? 0 : 1; };
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
    const [qz, at] = await Promise.all([db.list("quizzes"), db.list("attempts")]);
    let h = `<div class="card mut">عدد الطلبة: ${students.length}</div>`;
    if (qz.length) h += qz.map((q) => { const a = at.filter((x) => String(x.quiz_id) === String(q.id)); const avg = a.length ? Math.round(a.reduce((s2, x) => s2 + (x.score / x.total) * 100, 0) / a.length) : 0;
      return `<div class="card"><div class="row"><h3>${esc(q.title)}</h3><b>${avg}%</b></div><details><summary>النتائج (${a.length})</summary>${a.map((x) => `<span class="pill y">${esc((profs.find((p) => p.id === x.user_id) || {}).name || "؟")}: ${x.score}/${x.total}</span>`).join("")}</details></div>`; }).join("");
    if (!tasks.length) return h + `<div class="empty">ضيف مهام الأول</div>`;
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
      <form class="card" data-act="saveCohort"><b>فرقتي</b><select name="year"><option value="">اختار الفرقة</option>${YEARS.map((y) => `<option ${me.year === y ? "selected" : ""}>${y}</option>`).join("")}</select>
      <input name="grp" placeholder="المجموعة / السكشن (اختياري)" value="${esc(me.grp || "")}"><div class="mut">لما تختار فرقتك بتشوف مواد ومواعيد فرقتك بس.</div><button class="full">حفظ</button></form>
      <button class="full sec" data-act="out">تسجيل خروج</button>
      ${DEMO ? `<div class="card" style="margin-top:14px"><b>معاينة الأدوار (تجريبي)</b><div class="mut">اضغط عشان تدخل كأي حساب</div>${(await db.profiles()).map((p) => `<button class="sec full" data-act="demo" data-id="${esc(p.id)}">${esc(p.name)} (${roleName[p.role]})</button>`).join("")}</div>` : ""}`;
  }
  act.saveCohort = (f) => run(async () => { const d = new FormData(f); await db.setProfile(me.id, { year: d.get("year") || null, grp: d.get("grp").trim() || null }); me = await db.me(); }, "اتحفظ");
  act.out = () => run(async () => { await db.signOut(); me = null; });
  act.demo = (el, id) => window.__demoLogin(id);

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
  if (DEMO) { const q = new URLSearchParams(location.search); if (q.get("as")) { tab = q.get("tab") || "home"; param = q.get("p"); window.__demoLogin(q.get("as")); } else boot(); } else boot();
})();
