import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, BarChart3, BriefcaseBusiness, ChevronDown, CircleDollarSign, Globe2, Layers3, Search, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import { fetchJobs } from "./api";
import { formatSalary, relativeTime } from "./format";
import type { JobResponse } from "./types";

type Market = "global" | "china";
type View = "overview" | "demand" | "salary";

const marketData = {
  global: {
    label: "海外市场", jobs: "1,353", jobsNote: "LiftmyCV · 2026.08.16 活跃岗位", active: "18.5K", salary: "$150K", salaryNote: "公开岗位薪资中位数 · P75 $204K", remote: "60.76%", growth: "2026", demand: "市场 / 社区 / 增长", demandShare: "49.8%",
    roles: [["市场 / 社区 / 增长", 50, "675"], ["产品 / 项目", 29, "392"], ["工程 / 协议", 26, "351"], ["创意 / 设计", 23, "311"], ["研究 / 合规", 14, "189"], ["其他", 10, "135"]],
    salaryRows: [["智能合约审计", "$179K", "$210K", "高需求"], ["Solidity 开发", "$120K", "$230K", "高需求"], ["DeFi 工程师", "$160K", "$280K", "高需求"], ["产品 / 增长", "$68K", "$220K", "区间宽"]],
  },
  china: {
    label: "中国市场", jobs: "13.27%", jobsNote: "Bitget 2026 人才调研中的中国样本", active: "60.76%", salary: "¥28–42万", salaryNote: "按 $40K–60K 期望区间折算", remote: "60.76%", growth: "2026", demand: "市场 / 社区 / 增长", demandShare: "49.8%",
    roles: [["市场 / 社区 / 增长", 50, "样本主导"], ["产品 / 项目", 29, "样本"], ["工程 / 协议", 26, "样本"], ["创意 / 设计", 23, "样本"], ["研究 / 合规", 14, "样本"], ["其他", 10, "样本"]],
    salaryRows: [["国际远程初级岗位", "$40K", "$60K", "主流期望"], ["协议 / 智能合约工程师", "¥35万", "¥65万", "估算"], ["产品 / 运营", "¥25万", "¥50万", "估算"], ["增长 / 社区", "¥20万", "¥42万", "估算"]],
  },
} as const;
const recentRoles = [["Senior Smart Contract Engineer", "Scroll", "Remote · Worldwide", "$140K–190K", "2h ago", "SOLIDITY"], ["生态增长负责人", "某头部交易平台", "上海 / Remote", "¥45万–70万", "5h ago", "GROWTH"], ["Protocol Product Manager", "EigenLayer", "Remote · EU time", "$120K–170K", "8h ago", "PRODUCT"]] as const;

function StatCard({ icon: Icon, label, value, note, accent }: { icon: typeof BriefcaseBusiness; label: string; value: string; note: string; accent?: string }) { return <div className="stat-card"><div className={`stat-icon ${accent ?? ""}`}><Icon size={17} /></div><p>{label}</p><strong>{value}</strong><span>{note}</span></div>; }

export default function App() {
  const [market, setMarket] = useState<Market>("global");
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [liveJobs, setLiveJobs] = useState<JobResponse | null>(null);
  const data = marketData[market];
  const filteredRoles = useMemo(() => recentRoles.filter((role) => role.join(" ").toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetchJobs({ query, location: "", remoteScope: "", source: "", page: 1 }, controller.signal)
        .then(setLiveJobs)
        .catch(() => setLiveJobs(null));
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  const liveRoles = liveJobs?.items.map((job) => [job.title, job.company, job.location, formatSalary(job), relativeTime(job.publishedAt ?? job.firstSeenAt), job.tags[0] ?? "WEB3", job.sources[0]?.url ?? ""] as const) ?? [];
  const displayedRoles = liveRoles.length ? liveRoles : filteredRoles;
  return <div className="terminal-shell">
    <header className="topbar"><a className="brand" href="/"><span className="brand-mark"><Globe2 size={19} /></span><span>GLOBORTUNITY</span><em>RESEARCH</em></a><nav><button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}>总览</button><button className={view === "demand" ? "active" : ""} onClick={() => setView("demand")}>需求分析</button><button className={view === "salary" ? "active" : ""} onClick={() => setView("salary")}>薪资坐标</button></nav><div className="live-indicator"><i />LIVE INDEX <span>2026.08</span></div></header>
    <main className="content">
      <section className="hero"><div><p className="kicker"><Sparkles size={14} /> WEB3 TALENT INTELLIGENCE</p><h1>人才流向，<span>链上可见。</span></h1><p className="hero-copy">追踪 2026 年 Web3 招聘需求、技术栈与薪资溢价。为下一次职业决策，提供一张更清晰的地图。</p></div><div className="hero-meta"><span>数据快照</span><strong>2026 / 08 / 16</strong><small>公开岗位 + 人才调研</small></div></section>
      <div className="control-bar"><div className="market-switch"><button className={market === "global" ? "selected" : ""} onClick={() => setMarket("global")}><span>◉</span>海外市场</button><button className={market === "china" ? "selected" : ""} onClick={() => setMarket("china")}><span>中</span>中国市场</button></div><label className="terminal-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索岗位、技能或协议…" /></label><button className="export-button"><ArrowUpRight size={15} /> 导出快照</button></div>
      <section className="stat-grid"><StatCard icon={BriefcaseBusiness} label="可观测岗位" value={data.jobs} note={data.jobsNote} accent="green" /><StatCard icon={Users} label="当前活跃岗位" value={data.active} note="过去 30 天仍在招聘" /><StatCard icon={CircleDollarSign} label="技术岗薪资中位数" value={data.salary} note={data.salaryNote} accent="yellow" /><StatCard icon={TrendingUp} label="薪资同比变化" value={data.growth} note="相较 2024 H2" accent="purple" /></section>
      <section className="dashboard-grid">
        <article className="panel demand-panel"><div className="panel-head"><div><span className="panel-label">01 / DEMAND MAP</span><h2>岗位需求结构</h2></div><button className="small-select">近 12 个月 <ChevronDown size={13} /></button></div><div className="demand-highlight"><div><span>需求最高的方向</span><strong>{data.demand}</strong><small>占全部岗位 <b>{data.demandShare}</b></small></div><div className="demand-ring"><span>{data.demandShare}</span><small>SHARE</small></div></div><div className="bars">{data.roles.map(([name, value, count]) => <div className="bar-row" key={name}><span>{name}</span><div><i style={{ width: `${value * 2.8}%` }} /></div><b>{count}</b><em>{value}%</em></div>)}</div><p className="source-line"><ShieldCheck size={13} /> 需求量为岗位样本去重后的估算值</p></article>
        <article className="panel premium-panel"><div className="panel-head"><div><span className="panel-label">02 / GEOGRAPHIC PREMIUM</span><h2>地域薪资坐标</h2></div><BarChart3 size={18} className="muted-icon" /></div><div className="premium-chart"><div className="chart-y"><span>¥160万</span><span>¥120万</span><span>¥80万</span><span>¥40万</span><span>¥0</span></div><div className="chart-area"><div className="grid-lines" />{(market === "global" ? [[34, 62], [47, 77], [40, 69], [63, 88]] as const : [[28, 51], [38, 64], [32, 56], [48, 74]] as const).map(([a, b], i) => <div className="chart-column" key={i}><div className="column-stack"><i style={{ height: `${a}%` }} /><b style={{ height: `${b - a}%` }} /></div><span>{(["亚太", "欧洲", "北美", "远程"] as const)[i] ?? ""}</span></div>)}</div></div><div className="legend"><span><i className="legend-low" />中位数</span><span><i className="legend-high" />P75</span><strong>{data.remote} <small>岗位支持远程</small></strong></div></article>
      </section>
      {(view === "overview" || view === "salary") && <section className="panel salary-panel"><div className="panel-head"><div><span className="panel-label">03 / SALARY BENCHMARK</span><h2>热门岗位薪资基准</h2></div><span className="unit-note">单位：{market === "global" ? "USD / 年" : "CNY / 年"}</span></div><div className="salary-table"><div className="table-row table-head"><span>岗位类别</span><span>中位数</span><span>P75 上限</span><span>同比</span></div>{data.salaryRows.map((row) => <div className="table-row" key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><b>{row[3]}</b></div>)}</div><p className="source-line"><ShieldCheck size={13} /> 薪资为公开职位描述、Web3.Career 与 Calyptus 报告交叉样本，未披露职位不纳入分母</p></section>}
      {(view === "overview" || view === "demand") && <section className="roles-section"><div className="section-title"><div><span className="panel-label">04 / LIVE ROLE FEED</span><h2>{liveJobs ? `已汇总岗位 · ${liveJobs.total.toLocaleString()}` : "岗位样本"}</h2></div><button className="all-roles">查看全部岗位 <ArrowUpRight size={14} /></button></div><div className="role-list">{displayedRoles.map((role) => <article className="role-row" key={role[0]}><div className="role-logo">{role[1].slice(0, 2).toUpperCase()}</div><div className="role-main"><strong>{role[0]}</strong><span>{role[1]} · {role[2]}</span></div><code>{role[5]}</code><b>{role[3]}</b><small>{role[4]}</small>{role[6] ? <a className="role-link" href={role[6]} target="_blank" rel="noreferrer" aria-label={`打开 ${role[0]}`}><ArrowUpRight size={16} /></a> : <ArrowUpRight size={16} className="role-arrow" />}</article>)}</div></section>}
      <footer className="footer"><span><Layers3 size={14} /> GLOBORTUNITY RESEARCH DESK</span><span>数据来源：LiftmyCV Web3 Jobs Aug 2026 · Web3.Career Remote Jobs 2026 · Bitget Talent Intelligence 2026 · gm.careers Salaries 2026</span><a href="https://www.liftmycv.com/jobs/web3-jobs/" target="_blank" rel="noreferrer">查看方法论 <ArrowUpRight size={13} /></a></footer>
    </main>
  </div>;
}
