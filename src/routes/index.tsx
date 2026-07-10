import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Landmark,
  Mail,
  Moon,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Wand2,
  Workflow,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ApiError, api } from "../api";
import { IntegrationLogo } from "../components/common/IntegrationLogo";
import { LogoLockup } from "../components/common/LogoLockup";
import { setStoredIndustry } from "../lib/industries";
import { ThemeProvider, useTheme } from "../lib/theme";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/")({
  component: Index,
});

// ---------------- Content config ----------------

type WorkflowStep = { label: string; detail: string };
type WorkflowContent = {
  title: string;
  before: string;
  after: string;
  steps: WorkflowStep[];
};

const HERO = {
  tagline: "The AI operating system for legal.",
  sub: "Automate contract review, legal research, due diligence, and compliance monitoring. AI does the first pass and drafts the work product — your attorneys review and approve before anything goes out.",
};

// The single, legal-specific workflow shown in the before/after section.
const CLOSE_WORKFLOW: WorkflowContent = {
  title: "Contract review, done in minutes.",
  before: "60+ minutes per contract, redlining clause by clause against your playbook.",
  after: "10 minutes: AI reviews against your playbook — you refine and send.",
  steps: [
    { label: "Contract arrives", detail: "A counterparty emails a draft agreement for review." },
    { label: "Extract", detail: "Document intelligence reads clauses, parties, and key dates." },
    { label: "Compare", detail: "Each clause checked against your playbook and precedent." },
    { label: "Flag risk", detail: "Missing protections, off-market terms, and red flags surfaced." },
    { label: "Review", detail: "Your attorney reviews the redline and edits in one view." },
    { label: "Send", detail: "Approved redline returned to the counterparty." },
  ],
};

// ---------------- Copilot library (interactive catalog) ----------------

type CopilotGroup = "review" | "research" | "compliance";

type Copilot = {
  group: CopilotGroup;
  label: string;
  title: string;
  goal: string;
  persona: string;
  approver: string;
  trigger: string;
  actions: string[];
  value: string[];
  // The live trace shown in the modal — each line mirrors what the copilot does.
  trace: { kind: "run" | "ok" | "wait" | "done"; text: string }[];
  runtime: string;
};

const COPILOT_GROUPS: { slug: CopilotGroup | "all"; label: string }[] = [
  { slug: "all", label: "All" },
  { slug: "review", label: "Contract & Review" },
  { slug: "research", label: "Research & Drafting" },
  { slug: "compliance", label: "Compliance & Risk" },
];

const GROUP_META: Record<CopilotGroup, { label: string; accent: string }> = {
  // Restrained, profession-appropriate accents so each family reads distinctly
  // without leaving the neutral theme.
  review: { label: "Contract & Review", accent: "#4f9dde" },
  research: { label: "Research & Drafting", accent: "#3f9a7f" },
  compliance: { label: "Compliance & Risk", accent: "#8a7fd0" },
};

const COPILOTS: Copilot[] = [
  {
    group: "review",
    label: "Contract & Review",
    title: "Contract Review & Redlining Copilot",
    goal: "Review incoming contracts against your playbook, redline deviations, and flag missing protections.",
    persona: "Associate",
    approver: "Partner",
    trigger: "A counterparty emails a draft agreement for review.",
    actions: [
      "Extracts clauses, parties, defined terms, and key dates",
      "Compares each clause against your playbook positions",
      "Flags missing protections and off-market terms",
      "Drafts a redline with suggested language",
      "Writes a plain-language risk summary",
    ],
    value: [
      "Faster turnaround on every draft",
      "Consistent playbook enforcement",
      "Nothing missed on the first pass",
      "A defensible review record",
    ],
    runtime: "3m 12s",
    trace: [
      { kind: "run", text: "connecting to document store…" },
      { kind: "ok", text: "reading MSA_Acme_v3.docx" },
      { kind: "ok", text: "42 clauses extracted" },
      { kind: "ok", text: "compared against playbook (SaaS · vendor)" },
      { kind: "ok", text: "6 deviations · 2 missing clauses flagged" },
      { kind: "ok", text: "redline + risk summary drafted" },
      { kind: "wait", text: "waiting on approval (Partner)" },
      { kind: "ok", text: "approved by R. Mehta" },
      { kind: "ok", text: "redline returned to counterparty" },
      { kind: "done", text: "done in 3m 12s" },
    ],
  },
  {
    group: "review",
    label: "Contract & Review",
    title: "Due Diligence Copilot",
    goal: "Review a deal data room, extract key terms, and surface risks across hundreds of documents.",
    persona: "M&A Associate",
    approver: "Partner",
    trigger: "A deal data room is shared for review.",
    actions: [
      "Classifies and indexes every document in the data room",
      "Extracts change-of-control, assignment, and termination terms",
      "Flags required consents and liability exposure",
      "Builds an issues list ranked by severity",
      "Drafts sections of the diligence memo",
    ],
    value: [
      "Weeks of review compressed into days",
      "Nothing overlooked in the data room",
      "Consistent issue-spotting",
      "A ready-to-edit diligence memo",
    ],
    runtime: "6m 40s",
    trace: [
      { kind: "run", text: "connecting to data room…" },
      { kind: "ok", text: "318 documents classified" },
      { kind: "ok", text: "key terms extracted from 41 contracts" },
      { kind: "ok", text: "9 change-of-control clauses flagged" },
      { kind: "ok", text: "3 required consents identified" },
      { kind: "ok", text: "issues list + memo draft ready" },
      { kind: "wait", text: "waiting on approval (Partner)" },
      { kind: "done", text: "done in 6m 40s" },
    ],
  },
  {
    group: "review",
    label: "Contract & Review",
    title: "Lease & Document Abstraction Copilot",
    goal: "Abstract leases and long-form agreements into structured summaries of key terms and dates.",
    persona: "Paralegal",
    approver: "Associate",
    trigger: "A lease or agreement is uploaded for abstraction.",
    actions: [
      "Reads the full document, including exhibits",
      "Extracts rent, term, renewal, and option dates",
      "Captures obligations, restrictions, and notice periods",
      "Flags ambiguous or non-standard provisions",
      "Produces a structured abstract for review",
    ],
    value: [
      "No manual data entry",
      "Key dates never missed",
      "A consistent abstract format",
      "A searchable record of every term",
    ],
    runtime: "2m 05s",
    trace: [
      { kind: "run", text: "reading lease_1200_Market.pdf" },
      { kind: "ok", text: "3 exhibits parsed" },
      { kind: "ok", text: "rent, term & renewal dates extracted" },
      { kind: "ok", text: "4 critical dates captured" },
      { kind: "ok", text: "1 non-standard clause flagged" },
      { kind: "ok", text: "abstract drafted" },
      { kind: "wait", text: "waiting on approval (Associate)" },
      { kind: "done", text: "done in 2m 05s" },
    ],
  },
  {
    group: "research",
    label: "Research & Drafting",
    title: "Legal Research Copilot",
    goal: "Research a legal question across primary sources and return a cited memo.",
    persona: "Associate",
    approver: "Supervising Attorney",
    trigger: "You pose a research question or issue.",
    actions: [
      "Searches case law, statutes, and secondary sources",
      "Identifies controlling and persuasive authority",
      "Checks whether cases are still good law",
      "Synthesizes findings into a memo with citations",
      "Notes counter-arguments and open questions",
    ],
    value: [
      "Faster research turnaround",
      "Grounded in cited authority",
      "Fewer missed precedents",
      "A ready-to-edit memo",
    ],
    runtime: "4m 18s",
    trace: [
      { kind: "run", text: "searching case law + statutes…" },
      { kind: "ok", text: "214 sources reviewed" },
      { kind: "ok", text: "12 on-point authorities identified" },
      { kind: "ok", text: "citations validated (still good law)" },
      { kind: "ok", text: "memo drafted with citations" },
      { kind: "wait", text: "waiting on approval (Supervising Attorney)" },
      { kind: "done", text: "done in 4m 18s" },
    ],
  },
  {
    group: "research",
    label: "Research & Drafting",
    title: "Contract Drafting Copilot",
    goal: "Draft a first-pass agreement from your templates and the deal terms.",
    persona: "Associate",
    approver: "Partner",
    trigger: "You provide the deal terms or a term sheet.",
    actions: [
      "Selects the right template and playbook clauses",
      "Fills in parties, terms, and defined terms",
      "Assembles a complete first draft",
      "Flags open items needing a business decision",
      "Produces a clause-by-clause summary",
    ],
    value: [
      "First drafts in minutes",
      "Built on your approved templates",
      "Consistent clause language",
      "More time for judgment calls",
    ],
    runtime: "2m 48s",
    trace: [
      { kind: "run", text: "loading template library…" },
      { kind: "ok", text: "template selected: Services Agreement" },
      { kind: "ok", text: "deal terms mapped to clauses" },
      { kind: "ok", text: "first draft assembled" },
      { kind: "ok", text: "3 open items flagged" },
      { kind: "wait", text: "waiting on approval (Partner)" },
      { kind: "done", text: "done in 2m 48s" },
    ],
  },
  {
    group: "research",
    label: "Research & Drafting",
    title: "Matter Intake & Triage Copilot",
    goal: "Intake new matters, run a preliminary conflicts check, and route them to the right team.",
    persona: "Intake Coordinator",
    approver: "General Counsel",
    trigger: "A new matter request or client inquiry arrives.",
    actions: [
      "Captures parties, matter type, and key facts",
      "Runs a preliminary conflicts check",
      "Classifies and routes to the right practice group",
      "Drafts the engagement scope for review",
      "Opens the matter record on approval",
    ],
    value: [
      "Faster intake",
      "No conflicts slip through",
      "Consistent matter data",
      "Less administrative load",
    ],
    runtime: "1m 55s",
    trace: [
      { kind: "run", text: "reading intake request…" },
      { kind: "ok", text: "parties + matter type captured" },
      { kind: "ok", text: "conflicts check: no conflict found" },
      { kind: "ok", text: "routed to Commercial group" },
      { kind: "ok", text: "engagement scope drafted" },
      { kind: "wait", text: "waiting on approval (General Counsel)" },
      { kind: "done", text: "done in 1m 55s" },
    ],
  },
  {
    group: "compliance",
    label: "Compliance & Risk",
    title: "Compliance Monitoring Copilot",
    goal: "Monitor regulatory changes and map them to your policies and obligations.",
    persona: "Compliance Analyst",
    approver: "Compliance Officer",
    trigger: "A regulator publishes an update, or on your weekly scan.",
    actions: [
      "Tracks changes across relevant regulators",
      "Maps each change to affected policies and controls",
      "Assesses impact and required action",
      "Drafts update notes for stakeholders",
      "Logs the assessment for the record",
    ],
    value: [
      "Nothing missed on regulatory change",
      "Clear ownership of each obligation",
      "Faster policy updates",
      "An audit-ready trail",
    ],
    runtime: "3m 30s",
    trace: [
      { kind: "run", text: "scanning regulatory feeds…" },
      { kind: "ok", text: "7 updates identified this week" },
      { kind: "ok", text: "mapped to 4 policies" },
      { kind: "ok", text: "2 flagged as high impact" },
      { kind: "ok", text: "update notes drafted" },
      { kind: "wait", text: "waiting on approval (Compliance Officer)" },
      { kind: "done", text: "done in 3m 30s" },
    ],
  },
  {
    group: "compliance",
    label: "Compliance & Risk",
    title: "E-Discovery Copilot",
    goal: "Cull, review, and tag documents for relevance and privilege in discovery.",
    persona: "Litigation Paralegal",
    approver: "Litigation Associate",
    trigger: "A document set is loaded for review.",
    actions: [
      "De-duplicates and threads the document set",
      "Ranks documents by relevance to the issues",
      "Flags potentially privileged material",
      "Suggests responsiveness and issue tags",
      "Produces a review summary with metrics",
    ],
    value: [
      "Faster, lower-cost review",
      "Privilege caught early",
      "Consistent tagging",
      "A defensible review record",
    ],
    runtime: "5m 12s",
    trace: [
      { kind: "run", text: "loading document set…" },
      { kind: "ok", text: "24,180 docs de-duplicated → 9,412" },
      { kind: "ok", text: "relevance ranking complete" },
      { kind: "ok", text: "137 privileged docs flagged" },
      { kind: "ok", text: "issue tags suggested" },
      { kind: "wait", text: "waiting on approval (Litigation Associate)" },
      { kind: "done", text: "done in 5m 12s" },
    ],
  },
  {
    group: "compliance",
    label: "Compliance & Risk",
    title: "Obligation & Risk Tracking Copilot",
    goal: "Extract obligations and key dates from executed contracts and track them to term.",
    persona: "Contracts Manager",
    approver: "General Counsel",
    trigger: "A contract is executed, or on your renewal review.",
    actions: [
      "Extracts obligations, deadlines, and renewal dates",
      "Assigns owners and reminder schedules",
      "Flags upcoming renewals and auto-renewals",
      "Surfaces risk and non-compliance exposure",
      "Drafts a status report for the business",
    ],
    value: [
      "No missed renewals or deadlines",
      "Clear obligation ownership",
      "Early warning on risk",
      "A single source of truth",
    ],
    runtime: "2m 34s",
    trace: [
      { kind: "run", text: "reading executed contracts…" },
      { kind: "ok", text: "58 obligations extracted" },
      { kind: "ok", text: "owners + reminders assigned" },
      { kind: "ok", text: "3 auto-renewals flagged" },
      { kind: "ok", text: "status report drafted" },
      { kind: "wait", text: "waiting on approval (General Counsel)" },
      { kind: "done", text: "done in 2m 34s" },
    ],
  },
];

// ---------------- Integrations (legal-focused) ----------------

type LandingIntegrationCategory =
  | "DMS & Matter Mgmt"
  | "Contract & Signature"
  | "Research & Litigation"
  | "Docs & Comms";

type LandingIntegration = {
  slug: string;
  name: string;
  domain: string;
  category: LandingIntegrationCategory;
  logo?: string;
};

const INTEGRATION_CATEGORIES: LandingIntegrationCategory[] = [
  "DMS & Matter Mgmt",
  "Contract & Signature",
  "Research & Litigation",
  "Docs & Comms",
];

const LANDING_INTEGRATIONS: LandingIntegration[] = [
  // DMS & Matter Mgmt
  { slug: "imanage", name: "iManage", domain: "imanage.com", category: "DMS & Matter Mgmt" },
  { slug: "netdocuments", name: "NetDocuments", domain: "netdocuments.com", category: "DMS & Matter Mgmt" },
  { slug: "clio", name: "Clio", domain: "clio.com", category: "DMS & Matter Mgmt" },
  { slug: "mycase", name: "MyCase", domain: "mycase.com", category: "DMS & Matter Mgmt" },
  { slug: "litera", name: "Litera", domain: "litera.com", category: "DMS & Matter Mgmt" },
  { slug: "sharepoint", name: "SharePoint", domain: "sharepoint.com", category: "DMS & Matter Mgmt" },

  // Contract & Signature
  { slug: "docusign", name: "DocuSign", domain: "docusign.com", category: "Contract & Signature" },
  { slug: "ironclad", name: "Ironclad", domain: "ironcladapp.com", category: "Contract & Signature" },
  { slug: "icertis", name: "Icertis", domain: "icertis.com", category: "Contract & Signature" },
  { slug: "adobe-sign", name: "Adobe Acrobat Sign", domain: "adobe.com", category: "Contract & Signature" },
  { slug: "pandadoc", name: "PandaDoc", domain: "pandadoc.com", category: "Contract & Signature" },
  { slug: "agiloft", name: "Agiloft", domain: "agiloft.com", category: "Contract & Signature" },

  // Research & Litigation
  { slug: "westlaw", name: "Westlaw", domain: "thomsonreuters.com", category: "Research & Litigation" },
  { slug: "lexisnexis", name: "LexisNexis", domain: "lexisnexis.com", category: "Research & Litigation" },
  { slug: "relativity", name: "Relativity", domain: "relativity.com", category: "Research & Litigation" },
  { slug: "everlaw", name: "Everlaw", domain: "everlaw.com", category: "Research & Litigation" },
  { slug: "casetext", name: "Casetext", domain: "casetext.com", category: "Research & Litigation" },
  { slug: "logikcull", name: "Logikcull", domain: "logikcull.com", category: "Research & Litigation" },

  // Docs & Comms
  {
    slug: "gmail",
    name: "Gmail",
    domain: "gmail.com",
    category: "Docs & Comms",
    logo: "https://ssl.gstatic.com/images/branding/product/2x/gmail_2020q4_48dp.png",
  },
  { slug: "outlook", name: "Outlook", domain: "outlook.com", category: "Docs & Comms" },
  {
    slug: "gdrive",
    name: "Google Drive",
    domain: "drive.google.com",
    category: "Docs & Comms",
    logo: "https://ssl.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png",
  },
  { slug: "sharepoint", name: "SharePoint", domain: "sharepoint.com", category: "Docs & Comms" },
  { slug: "dropbox", name: "Dropbox", domain: "dropbox.com", category: "Docs & Comms" },
  { slug: "slack", name: "Slack", domain: "slack.com", category: "Docs & Comms" },
];

// ---------------- Page ----------------

function Index() {
  // The landing page owns its own theme state (light/dark) via the shared
  // ThemeProvider, so the toggle in the nav can switch the whole marketing page.
  return (
    <ThemeProvider>
      <IndexContent />
    </ThemeProvider>
  );
}

function IndexContent() {
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const onAuthenticated = () => {
    // The app is scoped to legal.
    setStoredIndustry("legal");
    navigate({ to: "/app" });
  };

  return (
    <div
      className={cn(
        "landing-root min-h-screen bg-background text-foreground",
        theme === "dark" && "dark",
      )}
    >
      <Nav onLogin={() => setAuthOpen(true)} />
      <Hero onLogin={() => setAuthOpen(true)} />
      <IntegrationCatalog />
      <CopilotLibrary />
      <CoreDiagram />
      <WorkflowSection content={CLOSE_WORKFLOW} />
      <PlatformGrid />
      <CTASection onLogin={() => setAuthOpen(true)} />
      <Footer />
      {authOpen && (
        <AuthModal onClose={() => setAuthOpen(false)} onAuthenticated={onAuthenticated} />
      )}
    </div>
  );
}

// ---------------- Nav ----------------

function Nav({ onLogin }: { onLogin: () => void }) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <a href="#" className="flex items-center">
          <LogoLockup className="ml-2" />
        </a>
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#copilots" className="transition hover:text-foreground">
            Copilots
          </a>
          <a href="#platform" className="transition hover:text-foreground">
            Platform
          </a>
          <a href="#workflow" className="transition hover:text-foreground">
            How it works
          </a>
          <a href="#integrations" className="transition hover:text-foreground">
            Integrations
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={onLogin}
            className="rounded-lg px-3.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-secondary"
          >
            Log in
          </button>
          <button
            onClick={onLogin}
            className="brand-gradient rounded-lg px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/30 transition hover:opacity-90"
          >
            Book a demo
          </button>
        </div>
      </div>
    </header>
  );
}

// ---------------- Hero ----------------

const HERO_TRUST: { icon: LucideIcon; label: string }[] = [
  { icon: Landmark, label: "Works with iManage, NetDocuments & Clio" },
  { icon: ShieldCheck, label: "Attorney review before anything is sent" },
  { icon: ScrollText, label: "Full audit trail on every document" },
];

function Hero({ onLogin }: { onLogin: () => void }) {
  return (
    <section className="relative border-b border-border/60">
      {/* Decorative layer is clipped on its own so it never overflows the section. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute -top-44 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -top-10 right-0 h-80 w-80 rounded-full bg-primary-2/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-7xl px-5 py-20 md:py-28">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Built for law firms, in-house legal & compliance teams
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          {HERO.tagline}
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">{HERO.sub}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <button
            onClick={onLogin}
            className="brand-gradient inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:opacity-95"
          >
            Book a demo
          </button>
          <a
            href="#copilots"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-6 py-3 text-sm font-semibold uppercase tracking-wide text-foreground transition hover:border-primary hover:text-primary"
          >
            See the copilots
          </a>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3">
          {HERO_TRUST.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                {t.label}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ---------------- Core diagram ----------------

type CoreCapability = {
  name: string;
  icon: LucideIcon;
  desc: string;
  detail: string;
  points: string[];
};

const CORE_CAPABILITIES: CoreCapability[] = [
  {
    name: "Document Intelligence",
    icon: FileText,
    desc: "Reads contracts, filings, and discovery documents, then extracts clauses, parties, and dates.",
    detail:
      "Turns any inbound document — contracts, briefs, leases, or scanned discovery — into structured, review-ready data without manual reading. Every extraction comes with a confidence score, so uncertain terms are flagged for an attorney instead of relied on blindly.",
    points: [
      "OCR for contracts, filings, and discovery sets",
      "Clause, party, defined-term, and date extraction",
      "Handles scans, PDFs, and long-form agreements",
      "Confidence scoring with attorney review on exceptions",
    ],
  },
  {
    name: "Playbook & Precedent",
    icon: Landmark,
    desc: "Your clause library, playbooks, and prior matters — so every review reflects your standards.",
    detail:
      "A living knowledge base of your firm's positions. Copilots read your fallback clauses, playbooks, precedent, and prior matters, then apply them consistently — so every review and draft reflects how your team actually works, not a generic template.",
    points: [
      "Central clause and template library",
      "Negotiation playbooks with fallback positions",
      "Precedent and prior-matter retrieval",
      "Grounded in your firm's own standards",
    ],
  },
  {
    name: "Clause & Risk Analysis",
    icon: Workflow,
    desc: "Compares every clause against your positions and surfaces deviations, gaps, and red flags.",
    detail:
      "Compares each clause against your playbook, flags deviations and missing protections, and explains the risk in plain language — so the issues that need a lawyer's judgment reach your desk first, and the routine ones are already handled.",
    points: [
      "Clause-by-clause comparison to your positions",
      "Missing-clause and off-market term detection",
      "Risk explained in plain language, ranked by severity",
      "Suggested language grounded in your playbook",
    ],
  },
  {
    name: "Review & Approval Controls",
    icon: ShieldCheck,
    desc: "Conflicts, privilege, and attorney sign-off enforced before anything leaves the firm.",
    detail:
      "Every action a copilot proposes runs through your controls before anything is sent. Conflicts checks, privilege protection, and approval routing are enforced automatically, and nothing goes out without the right attorney signing off.",
    points: [
      "Configurable approval routing by matter and role",
      "Conflicts checks and privilege protection",
      "Role-based access to matters and documents",
      "Attorney sign-off required before anything is sent",
    ],
  },
  {
    name: "Audit Trail",
    icon: ScrollText,
    desc: "Every extraction, edit, and approval is logged and traceable back to source.",
    detail:
      "A complete, tamper-evident record of everything the platform does. Each extraction, edit, and approval is logged with the user and timestamp and linked back to its source document — defensible and review-ready by default.",
    points: [
      "Every action logged with user and timestamp",
      "One-click trace from a finding back to source",
      "Immutable history of edits and approvals",
      "Exportable record for audits and disputes",
    ],
  },
  {
    name: "Matter Insights",
    icon: BarChart3,
    desc: "Obligations, key dates, and risk exposure across your matters, summarized for you.",
    detail:
      "Turns your matter and contract data into a clear view on demand. Obligations and key dates are tracked, risk exposure is surfaced, and status is summarized in plain language — ready for you to review and act on.",
    points: [
      "Obligation and key-date tracking across matters",
      "Renewal and deadline alerts",
      "Risk and exposure summaries",
      "Status reports ready to share with the business",
    ],
  },
];

function CoreDiagram() {
  const [selected, setSelected] = useState<CoreCapability | null>(null);
  return (
    <section id="platform" className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-12 flex max-w-2xl flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">
            The legal core
          </span>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Every copilot runs on the same legal operating system.
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Instead of rebuilding the basics for every task, each copilot inherits the same six
            building blocks — document intelligence, playbook &amp; precedent, clause &amp; risk
            analysis, review controls, audit trail, and matter insights — already wired together and
            tuned for legal work. Click any block to see what it does.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
          {CORE_CAPABILITIES.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => setSelected(s)}
                aria-label={`Learn more about ${s.name}`}
                className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 text-left transition duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:p-6"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <div className="text-base font-semibold md:text-[17px]">{s.name}</div>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">
                  Learn more
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {selected && <CoreModal capability={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function CoreModal({ capability, onClose }: { capability: CoreCapability; onClose: () => void }) {
  const Icon = capability.icon;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="core-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="nice-scroll max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div className="flex items-center gap-4">
            <span className="brand-gradient grid h-12 w-12 shrink-0 place-items-center rounded-xl text-primary-foreground shadow-md shadow-primary/25">
              <Icon className="h-6 w-6" />
            </span>
            <div>
              <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
                Legal core
              </span>
              <h3 id="core-title" className="mt-0.5 text-xl font-semibold tracking-tight">
                {capability.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <p className="text-sm leading-relaxed text-foreground/90">{capability.detail}</p>
          <div>
            <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              What it does
            </div>
            <ul className="space-y-2">
              {capability.points.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm text-foreground/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <a
            href="#copilots"
            onClick={onClose}
            className="brand-gradient inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:opacity-95"
          >
            See the copilots that use it
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------- Workflow ----------------

// Adds an `in-view` class the first time the element scrolls into the viewport,
// so CSS-driven reveal/draw animations fire on scroll. No-op re-observes after.
function useInView<T extends HTMLElement>(rootMargin = "0px 0px -12% 0px") {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin, threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

function WorkflowSection({ content }: { content: WorkflowContent }) {
  const workflow = content;
  const heading = useInView<HTMLDivElement>();
  const before = useInView<HTMLDivElement>();
  const after = useInView<HTMLDivElement>();
  const timeline = useInView<HTMLDivElement>();

  return (
    <section
      id="workflow"
      className="relative overflow-hidden border-b border-border/60 bg-surface-2 py-20"
    >
      {/* soft ambient glow behind the section */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-80 w-[46rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-5xl px-5">
        <div
          ref={heading.ref}
          className={cn(
            "reveal mb-12 flex flex-col items-center gap-3 text-center",
            heading.inView && "in-view",
          )}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 font-mono text-xs uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> How it works
          </span>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            {workflow.title}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            The same six steps every time — AI does the work, your team stays in control.
          </p>
        </div>

        {/* Before → After contrast */}
        <div className="relative mb-16 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <div
            ref={before.ref}
            className={cn(
              "reveal rounded-2xl border border-border bg-surface/40 p-6 transition duration-300 hover:-translate-y-1 hover:border-border/80",
              before.inView && "in-view",
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Before
              </span>
            </div>
            <p className="text-sm text-foreground/80">{workflow.before}</p>
          </div>
          <div className="flex items-center justify-center py-2 md:py-0">
            {/* dashed connector + arrow node */}
            <span
              aria-hidden
              className="absolute left-1/2 hidden h-px w-24 -translate-x-1/2 border-t border-dashed border-border md:block"
            />
            <div className="relative z-10 grid h-11 w-11 place-items-center rounded-full border border-primary/40 bg-background text-primary shadow-[0_0_0_5px_var(--surface-2)]">
              <ArrowRight className="arrow-float h-5 w-5" />
            </div>
          </div>
          <div
            ref={after.ref}
            className={cn(
              "reveal rounded-2xl border border-primary/40 bg-primary/5 p-6 shadow-[0_0_30px_-8px_var(--primary)] transition duration-300 hover:-translate-y-1",
              after.inView && "in-view",
            )}
            style={{ transitionDelay: after.inView ? "120ms" : "0ms" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                After
              </span>
            </div>
            <p className="text-sm text-foreground/90">{workflow.after}</p>
          </div>
        </div>

        {/* Connected step timeline */}
        <div ref={timeline.ref} className="relative">
          {/* far-left vertical rail + terminating arrow */}
          <span
            aria-hidden
            className={cn(
              "rail-draw absolute left-[19px] top-5 bottom-8 w-0.5 bg-gradient-to-b from-primary/50 via-border to-border",
              timeline.inView && "in-view",
            )}
          />

          <ol className="relative space-y-3">
            {workflow.steps.map((s, i) => {
              const Icon = STEP_ICONS[i] ?? Sparkles;
              return (
                <li key={s.label} className="relative flex items-center gap-3">
                  {/* numbered badge sitting on the rail */}
                  <div className="relative z-10 flex w-10 shrink-0 justify-center">
                    <span
                      className={cn(
                        "reveal grid h-8 w-8 place-items-center rounded-full border border-primary/50 bg-background text-xs font-semibold text-primary shadow-[0_0_0_4px_var(--surface-2),0_0_12px_-2px_var(--primary)]",
                        timeline.inView && "in-view",
                      )}
                      style={{ transitionDelay: `${i * 80}ms` }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  {/* connector dot */}
                  <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                  {/* step card */}
                  <div
                    className={cn(
                      "reveal grid flex-1 grid-cols-1 overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-surface/70 to-surface-2/50 transition duration-300 hover:-translate-y-0.5 hover:border-primary/30 sm:grid-cols-[minmax(180px,240px)_1fr]",
                      timeline.inView && "in-view",
                    )}
                    style={{ transitionDelay: `${i * 80 + 60}ms` }}
                  >
                    <div className="flex items-center gap-4 px-5 py-4">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="text-[15px] font-semibold text-foreground">{s.label}</span>
                    </div>
                    <div className="flex items-center border-t border-border/60 px-5 py-4 text-sm text-muted-foreground sm:border-l sm:border-t-0">
                      {s.detail}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

// Icons for the six-step flow, assigned by position (intake → extract → match →
// validate → approve → post).
const STEP_ICONS: LucideIcon[] = [Mail, FileText, Workflow, Wand2, User, CheckCircle2];

// ---------------- Copilot library (interactive catalog + modal) ----------------

function CopilotLibrary() {
  const [active, setActive] = useState<CopilotGroup | "all">("all");
  const [selected, setSelected] = useState<Copilot | null>(null);

  const items = useMemo(
    () => (active === "all" ? COPILOTS : COPILOTS.filter((c) => c.group === active)),
    [active],
  );

  return (
    <section id="copilots" className="border-b border-border/60 bg-surface-2/40 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-8 flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">
            Copilot library
          </span>
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Pick the copilot for the work you want off your plate.
          </h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Every copilot follows the same shape: it starts on a trigger, handles the busywork with
            AI, and stops for your approval before anything is sent. Click any card to see how it
            runs.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-5">
          <div className="flex flex-wrap gap-1.5">
            {COPILOT_GROUPS.map((g) => (
              <CatalogChip
                key={g.slug}
                label={g.label}
                active={active === g.slug}
                onClick={() => setActive(g.slug)}
              />
            ))}
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            Showing <b className="font-medium text-primary">{items.length}</b> of {COPILOTS.length}{" "}
            copilots
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <button
              key={c.title}
              onClick={() => setSelected(c)}
              className="group flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-mono text-[10px] font-medium uppercase tracking-wider"
                  style={{ color: GROUP_META[c.group].accent }}
                >
                  {c.label}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
              <h3 className="text-[17px] font-semibold leading-snug tracking-tight">{c.title}</h3>
              <p className="flex-1 text-sm text-muted-foreground">{c.goal}</p>
              <div className="flex items-center justify-between border-t border-dashed border-border pt-3 font-mono text-[11px] text-muted-foreground">
                <span>{c.persona}</span>
                <span className="flex items-center gap-1 text-primary">
                  <ShieldCheck className="h-3 w-3" />
                  {c.approver}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && <CopilotModal copilot={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function CopilotModal({ copilot, onClose }: { copilot: Copilot; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const accent = GROUP_META[copilot.group].accent;

  // Reveal the run trace line by line so the flow reads as something that
  // actually executes, not a static list.
  useEffect(() => {
    setStep(0);
    if (reduceMotion) {
      setStep(copilot.trace.length);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= copilot.trace.length) clearInterval(id);
    }, 340);
    return () => clearInterval(id);
  }, [copilot, reduceMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="copilot-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="nice-scroll max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-6">
          <div>
            <span
              className="font-mono text-[10px] font-medium uppercase tracking-wider"
              style={{ color: accent }}
            >
              {copilot.label}
            </span>
            <h3 id="copilot-title" className="mt-1.5 text-2xl font-semibold tracking-tight">
              {copilot.title}
            </h3>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{copilot.goal}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-0 md:grid-cols-[1fr_320px]">
          {/* Left: explanation */}
          <div className="space-y-6 p-6">
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <Zap className="h-3.5 w-3.5" style={{ color: accent }} /> Starts when
              </div>
              <p className="text-sm text-foreground/90">{copilot.trigger}</p>
            </div>

            <div>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                What the AI does
              </div>
              <ul className="space-y-2">
                {copilot.actions.map((a) => (
                  <li key={a} className="flex gap-2.5 text-sm text-foreground/90">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent }} />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground/90">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              You stay in control — <b className="font-semibold text-primary">
                {copilot.approver}
              </b>{" "}
              approves before anything is sent.
            </div>

            <div>
              <div className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                What you get
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {copilot.value.map((v) => (
                  <li key={v} className="flex gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: live run trace */}
          <div className="border-t border-border bg-surface-2/60 p-6 md:border-l md:border-t-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Live run
              </span>
              <span className="font-mono text-[11px] text-primary">{copilot.runtime}</span>
            </div>
            <div className="space-y-2 font-mono text-[12.5px] leading-relaxed">
              {copilot.trace.map((line, i) => {
                const shown = i < step;
                return (
                  <div
                    key={i}
                    className={cn(
                      "flex items-start gap-2 transition-opacity duration-300",
                      shown ? "opacity-100" : "opacity-0",
                    )}
                  >
                    <TraceIcon kind={line.kind} />
                    <span
                      className={cn(
                        line.kind === "wait" && "text-amber-500 dark:text-amber-400",
                        line.kind === "done" && "font-semibold text-foreground",
                        line.kind === "run" && "text-muted-foreground",
                        line.kind === "ok" && "text-foreground/80",
                      )}
                    >
                      {line.text}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <a
                href="#cta"
                onClick={onClose}
                className="brand-gradient inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition hover:opacity-95"
              >
                Get this copilot
              </a>
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/50"
              >
                Browse more
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TraceIcon({ kind }: { kind: Copilot["trace"][number]["kind"] }) {
  if (kind === "wait")
    return <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />;
  if (kind === "done") return <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />;
  if (kind === "run")
    return <span className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground">▸</span>;
  return <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />;
}

// ---------------- Integration catalog ----------------

function IntegrationCatalog() {
  const [active, setActive] = useState<LandingIntegrationCategory | "all">("all");

  const items = useMemo(
    () =>
      active === "all"
        ? LANDING_INTEGRATIONS
        : LANDING_INTEGRATIONS.filter((i) => i.category === active),
    [active],
  );

  return (
    <section id="integrations" className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">
            Integrations
          </span>
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Connects to the tools your legal team already runs on.
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
            Authenticate once, then read and work across your document management system, contract
            and signature tools, research and litigation platforms, and inboxes — no re-keying, no
            exports.
          </p>
        </div>

        <div className="mb-8 flex flex-wrap justify-center gap-1.5">
          <CatalogChip label="All" active={active === "all"} onClick={() => setActive("all")} />
          {INTEGRATION_CATEGORIES.map((c) => (
            <CatalogChip key={c} label={c} active={active === c} onClick={() => setActive(c)} />
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((i) => (
            <div
              key={i.slug}
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface p-5 text-center transition hover:border-primary/50 hover:shadow-sm"
            >
              <IntegrationLogo
                name={i.name}
                domain={i.domain}
                logo={i.logo}
                className="h-12 w-12"
              />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{i.name}</div>
                <div className="text-[11px] text-muted-foreground">{i.category}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CatalogChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ---------------- Platform grid ----------------

function PlatformGrid() {
  const rows = [
    { k: "Document Intelligence", v: "OCR and clause extraction for contracts, filings, and discovery sets." },
    { k: "Playbook & Precedent", v: "Your clause library, playbooks, and prior matters as living context." },
    { k: "Clause & Risk Analysis", v: "Deviation, missing-clause, and red-flag detection against your positions." },
    { k: "Controls", v: "Conflicts checks, privilege protection, and attorney approval routing." },
    { k: "Audit Trail", v: "Every action logged and traceable back to source." },
    { k: "Security", v: "SSO, role-based access, encryption, and data residency controls." },
  ];
  return (
    <section className="border-b border-border/60 py-20">
      <div className="mx-auto max-w-7xl px-5">
        <div className="mb-10">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">
            Under the hood
          </span>
          <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight md:text-4xl">
            Enterprise-grade, built for the controls legal requires.
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border">
          {rows.map((r, i) => (
            <div
              key={r.k}
              className={`grid grid-cols-1 gap-2 px-5 py-4 md:grid-cols-[220px_1fr] ${
                i !== rows.length - 1 ? "border-b border-border" : ""
              } bg-surface`}
            >
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {r.k}
              </div>
              <div className="text-sm text-foreground/90">{r.v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------- CTA ----------------

function CTASection({ onLogin }: { onLogin: () => void }) {
  return (
    <section id="cta" className="py-20">
      <div className="mx-auto max-w-4xl px-5 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Give your legal team back their time.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          See how contract review, research, and due-diligence copilots run on your own systems.
          Book a demo, or sign in to your workspace.
        </p>
        <button
          onClick={onLogin}
          className="brand-gradient mt-6 inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:-translate-y-0.5 hover:opacity-95"
        >
          Book a demo
        </button>
      </div>
    </section>
  );
}

// ---------------- Footer ----------------

function Footer() {
  const columns: { title: string; links: string[] }[] = [
    { title: "Product", links: ["Copilots", "Platform", "Integrations", "Security"] },
    { title: "Solutions", links: ["Contract review", "Legal research", "Due diligence", "In-house teams"] },
    { title: "Company", links: ["About", "Customers", "Careers", "Contact"] },
  ];
  return (
    <footer className="border-t border-border bg-surface-2">
      <div className="mx-auto max-w-7xl px-5 py-14">
        <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <div className="flex items-center">
              <LogoLockup />
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The AI operating system for legal — contract review, research, due diligence, and
              compliance, with an attorney in control of every document.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">
                {col.title}
              </div>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                {col.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="transition hover:text-foreground">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} Counsel AI OS. All rights reserved.</div>
          <div className="font-mono">The AI operating system for legal</div>
        </div>
      </div>
    </footer>
  );
}

// ---------------- Auth modal ----------------

function AuthModal({
  onClose,
  onAuthenticated,
}: {
  onClose: () => void;
  onAuthenticated: () => void;
}) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [status, setStatus] = useState<null | string>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    firstFieldRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    firstFieldRef.current?.focus();
    setStatus(null);
  }, [tab]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="auth-title" className="text-lg font-semibold">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {tab === "login"
                ? "Sign in to your workspace."
                : "Get access to your legal copilots."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-background p-1">
          <button
            onClick={() => setTab("login")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "login" ? "bg-surface text-foreground" : "text-muted-foreground"
            }`}
          >
            Log in
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === "signup" ? "bg-surface text-foreground" : "text-muted-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        {status ? (
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 text-sm">
            {status}
            <div className="mt-4">
              <button
                onClick={onClose}
                className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        ) : tab === "login" ? (
          <LoginForm firstFieldRef={firstFieldRef} onAuthenticated={onAuthenticated} />
        ) : (
          <SignupForm firstFieldRef={firstFieldRef} onSuccess={(m) => setStatus(m)} />
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
      {error && <div className="mt-1 text-xs text-destructive">{error}</div>}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary";

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

async function handleSignup(_: { name: string; email: string; company: string; password: string }) {
  // NOTE: self-serve signup is not backed yet — the backend has no public
  // registration endpoint (Keycloak registration is disabled; users are created
  // by a tenant admin via the identity service). Left as a stub until that
  // decision is made. See PROJECT_MEMORY.md.
  await new Promise((r) => setTimeout(r, 400));
  return { ok: true };
}

function LoginForm({
  firstFieldRef,
  onAuthenticated,
}: {
  firstFieldRef: React.RefObject<HTMLInputElement | null>;
  onAuthenticated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email) errs.email = "Email is required";
    else if (!isEmail(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      await api.login(email, password);
      onAuthenticated(); // navigates into the workspace (/app)
    } catch (err) {
      let msg = "Could not reach the platform. Is the backend running?";
      if (err instanceof ApiError) {
        // The backend replied — show why (bad credentials, no tenant/org, etc.).
        msg = err.status === 401 ? "Invalid email or password." : err.message;
      }
      setErrors({ form: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field label="Work email" error={errors.email}>
        <input
          ref={firstFieldRef}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </Field>
      <div className="flex items-center justify-between">
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
          Forgot password?
        </button>
      </div>
      {errors.form && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errors.form}
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Log in"}
      </button>
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="h-px w-full bg-border" />
        </div>
        <div className="relative text-center">
          <span className="bg-surface px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            or
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setErrors({ form: "SSO isn't wired yet — sign in with email + password." })}
        className="w-full rounded-md border border-border bg-background py-2 text-sm font-medium hover:border-primary"
      >
        Continue with SSO
      </button>
    </form>
  );
}

function SignupForm({
  firstFieldRef,
  onSuccess,
}: {
  firstFieldRef: React.RefObject<HTMLInputElement | null>;
  onSuccess: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email) errs.email = "Email is required";
    else if (!isEmail(email)) errs.email = "Enter a valid work email";
    if (!company.trim()) errs.company = "Company is required";
    if (!password || password.length < 8) errs.password = "Password must be at least 8 characters";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    await handleSignup({ name, email, company, password });
    setLoading(false);
    onSuccess(`Check your email — we sent a confirmation link to ${email}.`);
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field label="Full name" error={errors.name}>
        <input
          ref={firstFieldRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Ada Lovelace"
        />
      </Field>
      <Field label="Work email" error={errors.email}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputCls}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </Field>
      <Field label="Company" error={errors.company}>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className={inputCls}
          placeholder="Acme LLP"
        />
      </Field>
      <Field label="Password" error={errors.password}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          placeholder="At least 8 characters"
          autoComplete="new-password"
        />
      </Field>
      <button
        type="submit"
        disabled={loading}
        className="mt-2 w-full rounded-md bg-primary py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
