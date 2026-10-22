(() => {
  "use strict";
  const D = window.SOUTHBOUND;
  if (!D) return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escape = (value = "") => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const icon = name => '<svg class="icon" aria-hidden="true"><use href="#i-' + name + '"/></svg>';
  const countryName = country => country === "nz" ? "新西兰" : country === "au" ? "澳大利亚" : "两国通用";
  const external = (url, label, className = "text-link") => '<a class="' + className + '" href="' + escape(url) + '" target="_blank" rel="noopener noreferrer">' + escape(label) + icon("external") + '</a>';
  const number = value => new Intl.NumberFormat("en-NZ", { maximumFractionDigits: 2 }).format(value);
  const views = $$(".view");
  const main = $("#main-content");
  let current = { view: "overview", tab: "" };
  let initialized = false;
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); }
      catch {
        $("#storage-notice").hidden = false;
      }
    }
  };
  const taskIds = new Set(D.checklist.map(item => item.id));
  const legacyIds = ["cv", "agent", "nz-employer", "au-employer", "offer", "docs", "english", "partnership", "arrival", "source-review"];
  let savedTasks = store.get("southbound-checklist-v2", null);
  if (!Array.isArray(savedTasks)) {
    const old = store.get("nz-tech-route-checklist-v1", []);
    savedTasks = Array.isArray(old) ? old.filter(i => Number.isInteger(i) && legacyIds[i]).map(i => legacyIds[i]) : [];
  }
  const completed = new Set(savedTasks.filter(id => taskIds.has(id)));
  const companyIds = new Set(D.companies.map(item => item.id));
  const savedCompanies = store.get("southbound-companies-v1", []);
  const favorites = new Set((Array.isArray(savedCompanies) ? savedCompanies : []).filter(id => companyIds.has(id)));
  const employerFilters = { country: "all", evidence: "all", search: "", saved: false };
  let resourceCountry = "all";
  let checklistCountry = "all";
  let sourceCountry = "all";

  function sourceLinks(ids = []) {
    const links = [...new Set(ids)].map(id => {
      const s = D.sources[id];
      if (!s) return "";
      return '<a class="source-link" href="' + escape(s.url) + '" target="_blank" rel="noopener noreferrer" title="' + escape(s.title) + '"><span class="source-owner">' + escape(s.owner) + '</span><span class="source-title">' + escape(s.title) + '</span>' + icon("external") + '</a>';
    }).join("");
    return links ? '<div class="source-links">' + links + '</div>' : "";
  }

  function heading(title, description, breadcrumb = "") {
    return '<header class="view-heading">' + (breadcrumb ? '<p class="breadcrumb">' + escape(breadcrumb) + '</p>' : "") + '<h1>' + escape(title) + '</h1><p>' + escape(description) + '</p></header>';
  }

  function table(data, className = "") {
    return '<table class="data-table ' + className + '"><thead><tr>' + data.headers.map(h => '<th scope="col">' + escape(h) + '</th>').join("") + '</tr></thead><tbody>' + data.rows.map(row => '<tr>' + row.map((cell, i) => i === 0 ? '<th scope="row">' + escape(cell) + '</th>' : '<td data-label="' + escape(data.headers[i]) + '">' + escape(cell) + '</td>').join("") + '</tr>').join("") + '</tbody></table>';
  }

  function section(item) {
    const copy = (item.paragraphs || []).map(p => '<p>' + escape(p) + '</p>').join("");
    const bullets = item.bullets ? '<ul>' + item.bullets.map(b => '<li>' + escape(b) + '</li>').join("") + '</ul>' : "";
    return '<section class="content-section"><h2>' + escape(item.title) + '</h2>' + (item.table ? table(item.table) : "") + '<div class="prose">' + copy + bullets + '</div>' + sourceLinks(item.sources) + (item.editorial ? '<p class="source-review">求职与生活准备建议 · 按个人情况调整</p>' : "") + '</section>';
  }

  function renderOverview() {
    $("#overview-insights").innerHTML = D.insights.map(item => '<article class="insight-card"><h3>' + escape(item.title) + '</h3><p>' + escape(item.text) + '</p><a class="text-link" href="' + item.href + '">查看这条路线 ' + icon("arrow") + '</a>' + sourceLinks(item.sources) + '</article>').join("");
  }

  function renderCountry(country, selectedTab) {
    const c = D.countries[country];
    const tab = c.tabs[selectedTab] ? selectedTab : "routes";
    current.tab = tab;
    const t = c.tabs[tab];
    let html = heading(c.name, c.lead, c.english + " / 国家指南");
    html += '<nav class="guide-tabs" aria-label="' + c.name + '指南主题">' + Object.entries(c.tabs).map(([id, item]) => '<a href="#' + country + "/" + id + '"' + (tab === id ? ' aria-current="page"' : "") + '>' + escape(item.label) + '</a>').join("") + '</nav>';
    html += '<div class="guide-panel"><div class="rule-note"><strong>' + escape(t.label) + '</strong><p>' + escape(t.intro) + '</p></div>';
    if (t.routes) {
      html += '<section class="content-section"><h2>选择适用的路线</h2><div class="route-cards">' + t.routes.map((route, i) => '<details class="route-card"' + (i === 0 ? " open" : "") + '><summary><strong>' + escape(route.title) + '</strong><small>' + escape(route.sub) + '</small>' + icon("close") + '</summary><div class="route-body"><ul>' + route.bullets.map(b => '<li>' + escape(b) + '</li>').join("") + '</ul>' + sourceLinks(route.sources) + '</div></details>').join("") + '</div></section>';
    }
    html += (t.sections || []).map(section).join("");
    if (t.calculator) {
      html += '<section class="salary-calculator" aria-labelledby="calculator-title"><h2 id="calculator-title">把年薪换成时薪</h2><p>核对 Software Engineer / Developer Programmer 等组的 NZD 70/小时工资线。</p><form id="salary-form" novalidate><div class="calculator-fields"><label class="field" for="annual-salary">合同税前年薪（NZD）<input id="annual-salary" type="number" inputmode="decimal" min="0" max="10000000" step="100" value="145600" aria-describedby="salary-error"/></label><label class="field" for="weekly-hours">每周保证工时<input id="weekly-hours" type="number" inputmode="decimal" min="1" max="168" step="0.5" value="40" aria-describedby="salary-error"/></label></div><p class="error-text" id="salary-error" role="status"></p><output class="salary-output" id="salary-output" for="annual-salary weekly-hours" aria-live="polite"></output></form><p class="table-caption">年薪 ÷ 52 ÷ 每周工时；仅比较这一项工资条件。雇主、职责、合同与个人资格仍需分别核对。</p>' + sourceLinks(["nz-green"]) + '</section>';
    }
    if (tab === "jobs") html += '<a class="button" href="#employers/' + country + '">查看' + c.name + '雇主 ' + icon("arrow") + '</a>';
    if (tab === "arrival") html += '<a class="button" href="#resources/' + country + '">打开' + c.name + '生活导航 ' + icon("arrow") + '</a>';
    if (tab === "english") html += '<a class="text-link" href="#' + (country === "nz" ? "au" : "nz") + '/english">对照' + (country === "nz" ? "澳洲" : "新西兰") + '英语要求 ' + icon("arrow") + '</a>';
    html += '</div>';
    $("#" + country).innerHTML = html;
    if (t.calculator) setupCalculator();
  }

  function setupCalculator() {
    const form = $("#salary-form");
    const fields = [$("#annual-salary"), $("#weekly-hours")];
    const output = $("#salary-output");
    const error = $("#salary-error");
    function update() {
      const salary = fields[0].valueAsNumber;
      const hours = fields[1].valueAsNumber;
      const validSalary = Number.isFinite(salary) && salary >= 0 && salary <= 10000000;
      const validHours = Number.isFinite(hours) && hours >= 1 && hours <= 168;
      fields[0].setAttribute("aria-invalid", String(!validSalary));
      fields[1].setAttribute("aria-invalid", String(!validHours));
      if (!validSalary || !validHours) {
        error.textContent = !validSalary ? "请填入 0 至 10,000,000 的合同年薪。" : "请填入 1 至 168 的每周保证工时。";
        output.textContent = "补全有效数字后即可换算。";
        return;
      }
      error.textContent = "";
      const hourly = salary / 52 / hours;
      const required = 70 * 52 * hours;
      output.innerHTML = 'NZD ' + number(hourly) + ' / 小时<small>' + (salary >= required ? "达到这组职业的工资参考线。" : '距这组工资参考线还差约 NZD ' + number(required - salary) + ' / 年。') + '</small>';
    }
    let timer;
    fields.forEach(field => field.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(update, 180); }));
    form.addEventListener("submit", e => { e.preventDefault(); update(); });
    update();
  }

  function countryOptions(selected, allLabel = "两国全部") {
    return [["all", allLabel], ["nz", "新西兰"], ["au", "澳大利亚"]].map(([id, label]) => '<option value="' + id + '"' + (selected === id ? " selected" : "") + '>' + label + '</option>').join("");
  }

  function employerCard(c) {
    const saved = favorites.has(c.id);
    return '<article class="company-card"><div class="company-head"><span class="company-monogram" aria-hidden="true">' + escape(c.name[0]) + '</span><div><h2>' + escape(c.name) + '</h2><p>' + escape(countryName(c.country) + " · " + c.cities) + '</p></div><button class="icon-button save-button" data-save-company="' + c.id + '" aria-label="' + escape((saved ? "取消收藏 " : "收藏 ") + c.name) + '" aria-pressed="' + saved + '">' + icon("save") + '</button></div><p>' + escape(c.focus) + '</p><div class="tag-list">' + c.tags.map(tag => '<span class="tag">' + escape(tag) + '</span>').join("") + '</div><span class="evidence-badge">' + icon(c.status === "historical" ? "info" : "check") + escape(c.badge) + '</span><p class="company-evidence">' + escape(c.evidence) + ' <a href="' + escape(c.evidenceUrl) + '" target="_blank" rel="noopener noreferrer">查看证据 ↗</a></p><p class="company-entity">' + escape(c.entity) + (c.nzbn ? '<br>NZBN ' + c.nzbn + '<br>查询记录到期日 ' + c.validUntil : "") + '</p>' + sourceLinks(c.sources) + '<div class="company-footer">' + external(c.careers, "打开招聘页") + '<small>核验 ' + D.reviewed + '</small></div></article>';
  }

  function renderEmployers(deepCountry) {
    if (["nz", "au"].includes(deepCountry)) employerFilters.country = deepCountry;
    $("#employers").innerHTML = heading("雇主雷达", "从可核实的证据开始筛选：查得到的认证法人、官方签证支持，以及需要重新确认的历史线索。", "你的工具箱 / 找公司") +
      '<div class="filter-bar"><label class="field search-field" for="company-search">搜索公司或技术方向<input type="search" id="company-search" placeholder="如 Xero、Platform、Python" value="' + escape(employerFilters.search) + '"/></label><label class="field" for="company-country">目的地<select id="company-country">' + countryOptions(employerFilters.country) + '</select></label><label class="field" for="company-evidence">证据类型<select id="company-evidence">' + [["all", "所有证据"], ["accredited", "INZ 认证已核验"], ["sponsorship", "官方岗位签证支持"], ["relocation", "官方搬迁支持"], ["historical", "历史线索"]].map(([id, name]) => '<option value="' + id + '"' + (id === employerFilters.evidence ? " selected" : "") + '>' + name + '</option>').join("") + '</select></label><button class="button" id="only-saved" aria-pressed="' + employerFilters.saved + '">' + icon("save") + '只看收藏</button></div>' +
      '<p class="results-meta" id="company-result-count" aria-live="polite"></p><div class="company-grid" id="company-results"></div><div class="rule-note directory-note"><strong>证据标签怎么读</strong><p>NZ 认证结论来自核验当日的 INZ 查询，接受 offer 前请用法律实体/NZBN 复核。澳洲岗位级签证承诺、搬迁支持与历史资质分别列示；均不代表所有职位当前承诺担保。</p></div>';
    $("#company-search").addEventListener("input", e => { employerFilters.search = e.target.value; updateEmployers(); });
    $("#company-country").addEventListener("change", e => { employerFilters.country = e.target.value; updateEmployers(); });
    $("#company-evidence").addEventListener("change", e => { employerFilters.evidence = e.target.value; updateEmployers(); });
    $("#only-saved").addEventListener("click", e => { employerFilters.saved = !employerFilters.saved; e.currentTarget.setAttribute("aria-pressed", String(employerFilters.saved)); updateEmployers(); });
    updateEmployers();
  }

  function updateEmployers() {
    const query = employerFilters.search.trim().toLocaleLowerCase();
    const items = D.companies.filter(c =>
      (employerFilters.country === "all" || c.country === employerFilters.country) &&
      (employerFilters.evidence === "all" || c.status === employerFilters.evidence) &&
      (!employerFilters.saved || favorites.has(c.id)) &&
      (!query || [c.name, c.cities, c.focus, c.entity, ...c.tags].join(" ").toLocaleLowerCase().includes(query))
    );
    $("#company-result-count").textContent = "找到 " + items.length + " 家 / 共 " + D.companies.length + " 家 · 招聘支持须按具体职位确认";
    $("#company-results").innerHTML = items.length ? items.map(employerCard).join("") : '<div class="empty-state"><h2>没有符合筛选的公司</h2><p>试试其他国家、证据类型，或清除搜索条件。</p><button class="button" id="reset-companies">清除筛选</button></div>';
    const reset = $("#reset-companies");
    if (reset) reset.addEventListener("click", () => { Object.assign(employerFilters, { country: "all", evidence: "all", search: "", saved: false }); renderEmployers(); });
    $$("[data-save-company]", $("#company-results")).forEach(button => button.addEventListener("click", () => {
      const id = button.dataset.saveCompany;
      if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
      store.set("southbound-companies-v1", [...favorites]);
      if (employerFilters.saved) updateEmployers();
      else {
        const company = D.companies.find(c => c.id === id);
        button.setAttribute("aria-pressed", String(favorites.has(id)));
        button.setAttribute("aria-label", (favorites.has(id) ? "取消收藏 " : "收藏 ") + company.name);
      }
    }));
  }

  function renderCompare() {
    $("#compare").innerHTML = heading("两种目的地，放在一起看。", "以境外申请技术岗位为起点，比较签证结构、申请条件和家庭安排。具体 offer 到手后，再计算净收入、成本与可行时间。", "你的工具箱 / 澳新对比") +
      '<div class="comparison-summary"><article><h2>新西兰</h2><p>优先核对认证雇主与 Green List 条目。合格 Tier 1 offer 可直接评估居民申请。</p><a class="text-link" href="#nz">打开新西兰指南 ' + icon("arrow") + '</a></article><article><h2>澳大利亚</h2><p>优先确认海外招聘意愿与岗位提名。482、186 与打分路线分别评估。</p><a class="text-link" href="#au">打开澳洲指南 ' + icon("arrow") + '</a></article></div>' +
      '<table class="data-table comparison-table"><thead><tr><th scope="col">比较项</th><th scope="col" class="comparison-country">新西兰 NZ</th><th scope="col" class="comparison-country">澳大利亚 AU</th></tr></thead><tbody>' + D.comparison.map(row => '<tr><th scope="row">' + escape(row.title) + '</th><td data-label="新西兰">' + escape(row.nz) + sourceLinks(row.sources.filter(id => D.sources[id].country === "nz")) + '</td><td data-label="澳大利亚">' + escape(row.au) + sourceLinks(row.sources.filter(id => D.sources[id].country === "au")) + '</td></tr>').join("") + '</tbody></table><div class="rule-note directory-note"><strong>怎么把比较变成决策</strong><p>同步投递两国岗位，分别记录雇主资质、基本工资、保证工时、城市生活成本、工签支持和后续居民条件。不要仅凭公司名气或某一条最低工资线决定去向。</p></div>';
  }

  function resourceItems(country = "all") {
    return D.resources.filter(item => country === "all" || item.country === country || item.country === "all");
  }

  function renderResources(deepCountry) {
    if (["nz", "au"].includes(deepCountry)) resourceCountry = deepCountry;
    $("#resources").innerHTML = heading("把生活，也提前准备好。", "按国家找工作、看房、办税号和核对医疗资格。政府页面确认规则，平台与社区帮助发现信息。", "你的工具箱 / 生活导航") +
      '<div class="filter-bar"><label class="field resource-country-field" for="resource-country">目的地<select id="resource-country">' + countryOptions(resourceCountry) + '</select></label></div><div id="resource-results" class="resource-groups"></div>';
    $("#resource-country").addEventListener("change", e => { resourceCountry = e.target.value; updateResources(); });
    updateResources();
  }

  function updateResources() {
    const items = resourceItems(resourceCountry);
    const groups = [...new Set(items.map(item => item.group))];
    $("#resource-results").innerHTML = groups.map(group => '<section class="resource-group"><h2>' + escape(group) + '</h2><div class="resource-list">' + items.filter(item => item.group === group).map(item => '<a class="resource-item" href="' + escape(item.url) + '" target="_blank" rel="noopener noreferrer"><div><strong>' + escape(item.title) + '</strong><small class="resource-country">' + countryName(item.country) + '</small></div><p>' + escape(item.text) + '</p><small>' + (item.official ? "政府 / 官方服务" : "信息平台 / 社区") + '</small>' + icon("external") + '</a>').join("") + '</div></section>').join("");
  }

  function visibleTasks() {
    return D.checklist.filter(t => checklistCountry === "all" || t.country === "all" || t.country === checklistCountry);
  }

  function updateProgress() {
    $("#nav-progress").textContent = completed.size + "/" + D.checklist.length;
    const tasks = visibleTasks();
    const done = tasks.filter(t => completed.has(t.id)).length;
    const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
    const ring = $("#checklist-percent");
    if (ring) ring.textContent = percent + "%";
    const label = $("#checklist-progress-label");
    if (label) label.textContent = "已完成 " + done + " / " + tasks.length + " 项";
  }

  function renderChecklist() {
    $("#checklist").innerHTML = heading("下一步，做得到。", "把准备过程拆成小事。进度只保存在当前浏览器，切换设备时可导出一份清单。", "你的工具箱 / 准备清单") +
      '<div class="progress-panel"><span class="progress-ring" id="checklist-percent" aria-hidden="true"></span><div class="progress-copy"><strong id="checklist-progress-label" aria-live="polite"></strong><p>按自己的节奏推进，接受 offer 和递交前再复核。</p></div><button class="button" id="export-checklist">' + icon("download") + '导出清单</button></div><div class="filter-bar"><label class="field resource-country-field" for="checklist-country">我的目的地<select id="checklist-country">' + countryOptions(checklistCountry, "两国一起准备") + '</select></label></div><div class="checklist-groups" id="checklist-items"></div>';
    $("#checklist-country").addEventListener("change", e => { checklistCountry = e.target.value; updateChecklistItems(); });
    $("#export-checklist").addEventListener("click", exportChecklist);
    updateChecklistItems();
  }

  function updateChecklistItems() {
    const tasks = visibleTasks();
    const stages = [...new Set(tasks.map(t => t.stage))];
    $("#checklist-items").innerHTML = stages.map(stage => '<section class="checklist-group"><h2>' + escape(stage) + '</h2>' + tasks.filter(t => t.stage === stage).map(task => '<label class="checklist-row"><input type="checkbox" data-task="' + task.id + '"' + (completed.has(task.id) ? " checked" : "") + '/><span><strong>' + escape(task.title) + '</strong><small>' + escape(task.text) + ' · ' + countryName(task.country) + '</small></span></label>').join("") + '</section>').join("");
    $$("[data-task]").forEach(box => box.addEventListener("change", () => {
      if (box.checked) completed.add(box.dataset.task); else completed.delete(box.dataset.task);
      store.set("southbound-checklist-v2", [...completed]);
      updateProgress();
    }));
    updateProgress();
  }

  function exportChecklist() {
    const lines = ["# 南向 Southbound · 准备清单", "", "参考资料核验日期：" + D.reviewed, "目的地：" + countryName(checklistCountry), ""];
    visibleTasks().forEach(task => lines.push("- [" + (completed.has(task.id) ? "x" : " ") + "] " + task.title + "（" + countryName(task.country) + "）", "  " + task.text));
    lines.push("", "指南：https://nz.yusenleo.top");
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "southbound-checklist.md";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    const button = $("#export-checklist");
    button.innerHTML = icon("check") + "已导出";
    setTimeout(() => { if (button.isConnected) button.innerHTML = icon("download") + "导出清单"; }, 2200);
  }

  function allSources() {
    return Object.entries(D.sources).map(([id, source]) => ({ id, ...source })).concat(D.companies.map(c => ({
      id: "company-" + c.id, title: c.name + " · " + c.badge, owner: c.status === "historical" ? "Home Affairs 历史 FOI" : c.name + " / INZ",
      country: c.country, kind: c.status === "historical" ? "historical" : "company", url: c.evidenceUrl,
      note: c.evidence + (c.nzbn ? " 认证法人：" + c.entity + "，NZBN " + c.nzbn + "。" : "")
    })));
  }

  function renderSources() {
    $("#sources").innerHTML = heading("每条路线，都有来处。", "政策以澳新政府与相关官方机构原文为依据。下面保留来源、用途和复核日期，便于你在关键决定前自己确认。", "资料库 / 来源与更新") +
      '<div class="source-method"><article><h2>政策与公司证据分开</h2><p>签证条件引用 INZ、Home Affairs、联邦法规及 NZQA / ACS 等原文。公司招聘与搬迁承诺使用一手页面；政府历史名录明确标记日期。当前网页内容核验于 ' + D.reviewed + '，不进行实时资格认证。</p></article><article><h2>你的资料留在你的浏览器</h2><p>本站不要求姓名、雇主、学校、收入或家庭身份。清单与公司收藏通过本地存储保存；没有账户和第三方统计脚本。静态托管及外部链接仍适用各自的访问日志与隐私规则。</p></article></div>' +
      '<section class="content-section"><h2>本次更新 · 2026.10.22</h2><div class="prose"><ul><li>重核 SMC 现行三类路径与海外学历计分。</li><li>补充 Parent Resident EOI 新机制及该类别十年 PRV 条件。</li><li>补充澳洲 2026–27 收入门槛及两种生效日期的 PTE 分项表。</li><li>核验新西兰五家雇主认证法人与 NZBN；将澳洲当前岗位、搬迁支持和历史资质分开呈现。</li></ul></div></section>' +
      '<div class="filter-bar"><label class="field resource-country-field" for="source-country">按国家查看<select id="source-country">' + countryOptions(sourceCountry) + '</select></label></div><p class="results-meta" id="source-count"></p><div class="source-list" id="source-results"></div><section class="content-section faq-section"><h2>几个常见问题</h2><div class="faq-list">' + D.faq.map(item => '<details><summary>' + escape(item.q) + '</summary><p>' + escape(item.a) + '</p><a class="text-link" href="' + item.href + '">查看相关内容 ' + icon("arrow") + '</a></details>').join("") + '</div></section>';
    $("#source-country").addEventListener("change", e => { sourceCountry = e.target.value; updateSources(); });
    updateSources();
  }

  function updateSources() {
    const sources = allSources().filter(s => sourceCountry === "all" || s.country === sourceCountry);
    $("#source-count").textContent = sources.length + " 条来源记录 · 复核 " + D.reviewed;
    $("#source-results").innerHTML = sources.map(s => '<article class="source-entry"><span class="source-type">' + (s.kind === "official" ? "官方政策 / 服务" : s.kind === "historical" ? "历史政府记录" : "公司一手资料 / 认证核验") + ' · ' + countryName(s.country) + '</span><h2>' + escape(s.title) + '</h2><p>' + escape(s.note) + '</p><small>' + escape(s.owner) + ' · ' + D.reviewed + '</small>' + external(s.url, "查看原文") + '</article>').join("");
  }

  function closeMenu() {
    $("#site-nav").classList.remove("is-open");
    main.inert = false;
    $("[data-menu-toggle]").setAttribute("aria-expanded", "false");
    $("[data-menu-toggle]").setAttribute("aria-label", "打开导航");
  }

  function route() {
    let hash;
    try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = "overview"; }
    const aliases = { job: "nz/jobs", visa: "nz/routes", family: "nz/family" };
    hash = aliases[hash] || hash;
    const [requested, tab = ""] = hash.split("/");
    const view = views.some(item => item.id === requested) ? requested : "overview";
    const sameCountry = current.view === view && ["nz", "au"].includes(view);
    current = { view, tab };
    views.forEach(item => { item.hidden = item.id !== view; });
    $$("[data-nav]").forEach(link => {
      if (link.dataset.nav === view) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
    });
    if (view === "nz" || view === "au") renderCountry(view, tab);
    else if (view === "employers") renderEmployers(tab);
    else if (view === "compare") renderCompare();
    else if (view === "resources") renderResources(tab);
    else if (view === "checklist") renderChecklist();
    else if (view === "sources") renderSources();
    closeMenu();
    const title = { overview: "澳新工作与生活指南", nz: "新西兰指南", au: "澳大利亚指南", employers: "雇主雷达", compare: "澳新对比", resources: "生活导航", checklist: "准备清单", sources: "来源与更新" }[view];
    document.title = title + " — 南向 Southbound";
    $("#route-announcement").textContent = title + (D.countries[view] ? "，" + D.countries[view].tabs[current.tab].label : "");
    if (initialized) {
      if (sameCountry) {
        $(".guide-tabs", $("#" + view)).scrollIntoView({ block: "start", behavior: "instant" });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" });
        main.focus({ preventScroll: true });
      }
    }
    initialized = true;
  }

  const searchDialog = $("#search-dialog");
  const searchInput = $("#global-search");
  let searchResults = [];
  let selectedResult = 0;
  const searchIndex = [
    { title: "澳新路线对比", text: "签证 雇主 工资 语言 PR 永居", group: "工具箱", href: "#compare" },
    { title: "找可支持海外工签的公司", text: "雇主 认证 担保 签证 公司 工作 外国人", group: "雇主雷达", href: "#employers" },
    { title: "我的准备清单", text: "简历 材料 任务 进度", group: "工具箱", href: "#checklist" },
    ...Object.entries(D.countries).flatMap(([country, c]) => Object.entries(c.tabs).map(([id, t]) => ({ title: c.name + " · " + t.label, text: JSON.stringify(t), group: c.english, href: "#" + country + "/" + id }))),
    ...D.companies.map(c => ({ title: c.name, text: c.focus + " " + c.tags.join(" ") + " " + c.entity, group: countryName(c.country) + "雇主", href: "#employers/" + c.country })),
    ...D.resources.map(r => ({ title: r.title, text: r.text + " " + r.group, group: countryName(r.country) + " · " + r.group, href: r.url, external: true })),
    ...Object.values(D.sources).map(s => ({ title: s.title, text: s.note, group: s.owner + " · 官方来源", href: s.url, external: true }))
  ];

  function openSearch() {
    closeMenu();
    searchDialog.showModal();
    searchInput.value = "";
    selectedResult = 0;
    updateSearch();
    searchInput.focus();
  }

  function updateSearch() {
    const query = searchInput.value.trim().toLocaleLowerCase();
    searchResults = (query ? searchIndex.filter(item => (item.title + " " + item.text + " " + item.group).toLocaleLowerCase().includes(query)).sort((a, b) => Number(b.title.toLocaleLowerCase().includes(query)) - Number(a.title.toLocaleLowerCase().includes(query))) : searchIndex.slice(0, 9)).slice(0, 12);
    selectedResult = 0;
    $("#search-status").textContent = query ? (searchResults.length ? "找到 " + searchResults.length + " 条相关入口" : "没有找到相关内容，试试公司名、签证编号或“英语”。") : "常用入口 · 也可以搜索 482、SMC、父母、租房等";
    $("#search-results").innerHTML = searchResults.map((item, i) => '<div class="search-result" id="search-result-' + i + '" role="option" aria-selected="' + (i === 0) + '" data-search-index="' + i + '"><strong>' + escape(item.title) + '</strong><small>' + escape(item.group) + '</small>' + icon(item.external ? "external" : "arrow") + '</div>').join("");
    syncSearchSelection();
  }

  function syncSearchSelection() {
    $$(".search-result").forEach((result, i) => result.setAttribute("aria-selected", String(i === selectedResult)));
    if (searchResults.length) searchInput.setAttribute("aria-activedescendant", "search-result-" + selectedResult);
    else searchInput.removeAttribute("aria-activedescendant");
  }

  function openResult(index) {
    const item = searchResults[index];
    if (!item) return;
    searchDialog.close();
    if (item.external) window.open(item.href, "_blank", "noopener,noreferrer");
    else {
      if (item.href.startsWith("#employers")) {
        const company = D.companies.find(c => c.name === item.title);
        if (company) employerFilters.search = company.name;
      }
      if (location.hash === item.href) route(); else location.hash = item.href;
    }
  }

  $$("[data-open-search]").forEach(button => button.addEventListener("click", openSearch));
  $("[data-close-search]").addEventListener("click", () => searchDialog.close());
  searchInput.addEventListener("input", updateSearch);
  searchInput.addEventListener("keydown", e => {
    if (["ArrowDown", "ArrowUp"].includes(e.key) && searchResults.length) {
      e.preventDefault();
      selectedResult = (selectedResult + (e.key === "ArrowDown" ? 1 : -1) + searchResults.length) % searchResults.length;
      syncSearchSelection();
      $("#search-result-" + selectedResult).scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter") { e.preventDefault(); openResult(selectedResult); }
  });
  $("#search-results").addEventListener("click", e => {
    const item = e.target.closest("[data-search-index]");
    if (item) openResult(Number(item.dataset.searchIndex));
  });
  searchDialog.addEventListener("click", e => { if (e.target === searchDialog) { const r = searchDialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) searchDialog.close(); } });
  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (searchDialog.open) searchDialog.close(); else openSearch(); }
    if (e.key === "Escape") closeMenu();
  });
  $("[data-menu-toggle]").addEventListener("click", e => {
    const open = !$("#site-nav").classList.contains("is-open");
    $("#site-nav").classList.toggle("is-open", open);
    main.inert = open;
    e.currentTarget.setAttribute("aria-expanded", String(open));
    e.currentTarget.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
  });
  $("#site-nav").addEventListener("click", e => { if (e.target.closest("a")) closeMenu(); });
  window.matchMedia("(min-width: 64rem)").addEventListener("change", closeMenu);
  window.addEventListener("hashchange", route);
  renderOverview();
  updateProgress();
  route();
})();
